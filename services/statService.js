const knex = require("./db");
const {getUserByAthleteId} = require("./userService");
const {parseISO} = require("date-fns");
const {t} = require("./langService");

async function getAvailableMonths(userId, lang = "ru") {
  const sessions = await knex("athlete_session")
    .where("athlete", userId)
    .select("datetime_intervals");

  const monthsSet = new Set();

  for (const s of sessions) {
    const start = s.datetime_intervals?.split("|")[0];
    if (!start) continue;

    const date = new Date(start);
    const engMonth = date.toLocaleString("en-US", {month: "long"}); // "March"
    const year = date.getFullYear();
    const localizedMonth = t(lang, `months.${engMonth}`) || engMonth;

    const label = `${localizedMonth} ${year}`;
    const value = `${year}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    monthsSet.add(JSON.stringify({label, value}));
  }

  return [...monthsSet].map((s) => JSON.parse(s));
}
async function getAspData(athleteId, month) {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const allSessions = await knex("athlete_session as a")
    .join("team_session as t", "a.teamsession", "t.id")
    .where("a.athlete", athleteId)
    .whereIn("t.category", [5272, 5275, 3792, 3795])
    .select("a.*");

  // Фильтрация по дате через datetime_intervals
  const sessions = allSessions.filter((session) => {
    if (
      !session.datetime_intervals ||
      !session.datetime_intervals.includes("|")
    )
      return false;
    const [startStr] = session.datetime_intervals.split("|");
    const date = parseISO(startStr);
    return date.getFullYear() === year && date.getMonth() + 1 === monthNum;
  });

  if (!sessions.length) return null;

  const totalTime = sessions.reduce((sum, s) => sum + (s.total_time || 0), 0);
  const sessionCount = sessions.length;

  const avgMaxSpeed =
    sessions.reduce((sum, s) => sum + (s.max_speed || 0), 0) / sessionCount;
  const avgMaxAcc =
    sessions.reduce((sum, s) => sum + (s.max_acc || 0), 0) / sessionCount;
  const avgMaxDec =
    sessions.reduce((sum, s) => sum + (s.max_dec || 0), 0) / sessionCount;

  const totalZ4Z5 = sessions.reduce(
    (sum, s) =>
      sum + (s.distance_speed_zone_4 || 0) + (s.distance_speed_zone_5 || 0),
    0
  );

  const z4z5Distance = totalZ4Z5 / (totalTime / 60);

  const totalEnergy = sessions.reduce(
    (sum, s) => sum + (s.total_energy || 0),
    0
  );

  const user = await getUserByAthleteId(athleteId);
  const weight = user?.weight;

  let metabolicPower = null;

  if (weight && sessionCount > 0) {
    metabolicPower = (totalEnergy + totalTime) / weight / sessionCount;
    metabolicPower =
      sessions.reduce((sum, s) => sum + (s.average_p || 0), 0) / sessionCount;
  }

  return {
    minutes: Math.round(totalTime / 60),
    avgMaxSpeed,
    avgMaxAcc,
    avgMaxDec,
    z4z5Distance,
    metabolicPower: metabolicPower || 0,
  };
}

async function getMppData(athleteId, month) {
  const result = await knex("athlete_session as a")
    .join("track as t", "a.track", "t.id")
    .join("team_session as ts", "a.teamsession", "ts.id")
    .where("a.athlete", athleteId)
    .whereIn("ts.category", [5272, 5275, 3792, 3795])
    .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
    .select(
      knex.raw("AVG(a.average_p) AS average_p"),
      knex.raw("SUM(a.total_energy) AS total_energy"),
      knex.raw("SUM(a.anaerobic_energy) AS anaerobic_energy"),
      knex.raw("SUM(a.equivalent_distance) AS equivalent_distance")
    )
    .first();

  if (!result || !result.average_p) return null;

  return {
    average_p: parseFloat(result.average_p.toFixed(2)),
    total_energy: Math.round(result.total_energy),
    anaerobic_energy: Math.round(result.anaerobic_energy),
    equivalent_distance: Math.round(result.equivalent_distance),
  };
}
module.exports = {getAvailableMonths, getAspData, getMppData};

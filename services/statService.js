const knex = require("./db");
const {getUserByAthleteId} = require("./userService");
const {parseISO} = require("date-fns");

async function getAvailableMonths(userId) {
  const sessions = await knex("athlete_session")
    .where("athlete", userId)
    .select("datetime_intervals");

  const monthsSet = new Set();

  for (const s of sessions) {
    const start = s.datetime_intervals?.split("|")[0];
    if (!start) continue;
    const date = new Date(start);
    const label = date.toLocaleString("ru-RU", {
      month: "long",
      year: "numeric",
    });
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;

    monthsSet.add(JSON.stringify({label, value}));
  }

  return [...monthsSet].map((s) => JSON.parse(s));
}
async function getAspData(athleteId, month) {
  const [yearStr, monthStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthNum = parseInt(monthStr, 10);

  const allSessions = await knex("athlete_session").where("athlete", athleteId);

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
module.exports = {getAvailableMonths, getAspData};

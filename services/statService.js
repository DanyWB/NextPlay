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
    .whereIn("t.category", [5272, 5275, 3792, 3795, 2933])
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
  const allowedCategories = [1111];

  try {
    // Диагностика: объёмы выборок
    const totalMonth = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .where("a.athlete", athleteId)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .count({cnt: "*"})
      .first();

    const afterTeamInner = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .join("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .count({cnt: "*"})
      .first();

    const distCategories = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .leftJoin("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .select({category: "ts.category"})
      .count({rows_cnt: "*"})
      .groupBy("ts.category")
      .orderBy("rows_cnt", "desc");

    const allowedRows = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .join("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .whereIn("ts.category", allowedCategories)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .count({cnt: "*"})
      .first();

    const allowedWithAvgpRows = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .join("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .whereIn("ts.category", allowedCategories)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .whereNotNull("a.average_p")
      .count({cnt: "*"})
      .first();

    // Диагностика: примеры строк, которые реально войдут в расчёт
    const sampleRows = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .join("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .whereIn("ts.category", allowedCategories)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .select(
        "a.id as athlete_session_id",
        "a.teamsession",
        "ts.category as ts_category",
        "t.timestamp as track_ts",
        "a.average_p",
        "a.total_energy",
        "a.anaerobic_energy",
        "a.equivalent_distance"
      )
      .orderBy("t.timestamp", "asc")
      .limit(10);

    // Итоговая агрегация (без изменения логики)
    const result = await knex("athlete_session as a")
      .join("track as t", "a.track", "t.id")
      .join("team_session as ts", "a.teamsession", "ts.id")
      .where("a.athlete", athleteId)
      .whereIn("ts.category", allowedCategories)
      .andWhereRaw("strftime('%Y-%m', t.timestamp) = ?", [month])
      .select(
        knex.raw("AVG(a.average_p) AS average_p"),
        knex.raw("SUM(a.total_energy) AS total_energy"),
        knex.raw("SUM(a.anaerobic_energy) AS anaerobic_energy"),
        knex.raw("SUM(a.equivalent_distance) AS equivalent_distance"),
        knex.raw("GROUP_CONCAT(DISTINCT ts.category) AS used_categories")
      )
      .first();

    // Большой лог
    console.log("[getMppData DIAG]", {
      athleteId,
      month,
      allowedCategories,
      totals: {
        totalMonth: Number(totalMonth?.cnt ?? 0),
        afterTeamInner: Number(afterTeamInner?.cnt ?? 0),
      },
      categories: distCategories,
      allowed: {
        rows: Number(allowedRows?.cnt ?? 0),
        rowsWithAvgP: Number(allowedWithAvgpRows?.cnt ?? 0),
      },
      sampleRows,
      aggregate: result,
    });

    // Корректная проверка на null (не отбрасываем 0)
    if (!result || result.average_p == null) return null;

    return {
      average_p: Number(Number(result.average_p).toFixed(2)),
      total_energy: Math.round(Number(result.total_energy || 0)),
      anaerobic_energy: Math.round(Number(result.anaerobic_energy || 0)),
      equivalent_distance: Math.round(Number(result.equivalent_distance || 0)),
      categories: result.used_categories || null,
    };
  } catch (err) {
    console.error("[getMppData ERROR]", {
      athleteId,
      month,
      allowedCategories,
      message: err?.message,
      stack: err?.stack,
    });
    return null;
  }
}

module.exports = {getAvailableMonths, getAspData, getMppData};

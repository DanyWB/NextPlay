const db = require("./db");

function formatMonth(dateStr) {
  const date = new Date(dateStr + "Z");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

async function getAvailableMatchMonths(athleteId) {
  const rows = await db("team_session")
    .distinct("team_session.id", "team_session.start_timestamp")
    .join("athlete_session", "team_session.id", "athlete_session.teamsession")
    .where("athlete_session.athlete", athleteId)
    .whereNotNull("team_session.category")
    .whereIn("team_session.category", [5273, 5274])
    .orderBy("team_session.start_timestamp", "desc");

  const uniqueMonths = new Map();
  for (const row of rows) {
    const month = formatMonth(row.start_timestamp);
    if (!uniqueMonths.has(month)) {
      uniqueMonths.set(month, {
        label: new Date(row.start_timestamp).toLocaleString("ru-RU", {
          month: "long",
          year: "numeric",
        }),
        value: month,
      });
    }
  }

  return Array.from(uniqueMonths.values()).slice(0, 6); // последние 6 месяцев
}

async function getMatchesByMonth(athleteId, monthStr) {
  const [year, month] = monthStr.split("-");
  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const startStr = start.toISOString().split(".")[0];
  const endStr = end.toISOString().split(".")[0];

  return await db("team_session")
    .select("team_session.id", "team_session.name")
    .join("athlete_session", "team_session.id", "athlete_session.teamsession")
    .where("athlete_session.athlete", athleteId)
    .whereNotNull("team_session.category")
    .whereIn("team_session.category", [5273, 5274])
    .andWhere("team_session.start_timestamp", ">=", startStr)
    .andWhere("team_session.start_timestamp", "<", endStr)
    .groupBy("team_session.id")
    .orderBy("team_session.start_timestamp", "desc");
}

async function getMatchStats(athleteId, teamSessionId) {
  const session = await db("athlete_session")
    .where("athlete", athleteId)
    .andWhere("teamsession", teamSessionId)
    .first();

  if (!session) return null;

  const z4z5 =
    ((session.distance_speed_zone_4 || 0) +
      (session.distance_speed_zone_5 || 0)) /
    (session.total_time / 60);

  return {
    minutes: session.total_time / 60,
    totalDistance: session.total_distance,
    maxSpeed: session.max_speed,
    acc: session.acc_events_count,
    dec: session.dec_events_count,
    z4z5: z4z5,
    metabolicPower: session.average_p,
  };
}

module.exports = {
  getAvailableMatchMonths,
  getMatchesByMonth,
  getMatchStats,
};

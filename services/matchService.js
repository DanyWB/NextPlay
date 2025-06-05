const db = require("./db");
const {t} = require("./langService"); // путь подкорректируй по своему проекту
const {format} = require("date-fns"); // если используешь formatMonth оттуда
function formatMonth(dateStr) {
  const date = new Date(dateStr + "Z");
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}`;
}

async function getAvailableMatchMonths(athleteId, lang = "ru") {
  const rows = await db("team_session")
    .distinct("team_session.id", "team_session.start_timestamp")
    .join("athlete_session", "team_session.id", "athlete_session.teamsession")
    .where("athlete_session.athlete", athleteId)
    .whereNotNull("team_session.category")
    .whereIn("team_session.category", [5273, 5274, 3793, 3794])
    .orderBy("team_session.start_timestamp", "desc");

  const uniqueMonths = new Map();

  for (const row of rows) {
    const date = new Date(row.start_timestamp);
    const month = formatMonth(row.start_timestamp); // возвращает строку типа "2024-03"

    if (!uniqueMonths.has(month)) {
      const engMonth = date.toLocaleString("en-US", {month: "long"}); // "March"
      const year = date.getFullYear();
      const localizedMonth = t(lang, `months.${engMonth}`) || engMonth;

      uniqueMonths.set(month, {
        label: `${localizedMonth} ${year}`,
        value: month,
      });
    }
  }

  return Array.from(uniqueMonths.values()).slice(0, 6).reverse();
}
async function getMatchesByMonth(athleteId, monthStr) {
  const [year, month] = monthStr.split("-");
  const start = new Date(`${year}-${month}-01`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);

  const startStr = start.toISOString().split(".")[0];
  const endStr = end.toISOString().split(".")[0];

  const matches = await db("team_session")
    .select(
      "team_session.id",
      "team_session.name", // [OFFICIAL MATCH] ...
      "team_session.notes", // пользовательское название
      "team_session.start_timestamp"
    )
    .join("athlete_session", "team_session.id", "athlete_session.teamsession")
    .where("athlete_session.athlete", athleteId)
    .whereNotNull("team_session.category")
    .whereIn("team_session.category", [5273, 5274, 3793, 3794])
    .andWhere("team_session.start_timestamp", ">=", startStr)
    .andWhere("team_session.start_timestamp", "<", endStr)
    .groupBy("team_session.id")
    .orderBy("team_session.start_timestamp", "desc");

  return matches.map((match) => {
    // Извлекаем только [CATEGORY] и дату из name
    const categoryMatch = match.name.match(/^\[(.*?)\]/);
    let category = categoryMatch ? categoryMatch[1] : "";
    category = category.replace(/match/i, "").trim(); // убираем "match" (без учёта регистра)
    if (category) category = `[${category.toUpperCase()}]`;
    else category = "[UNKNOWN]"; // если не удалось извлечь категорию

    const date = new Date(match.start_timestamp);
    const dateStr = date.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    }); // например: 3 May 2025

    const notes = match.notes?.trim();

    return {
      id: match.id,
      name: `${category} ${dateStr}${notes ? ` (${notes})  ` : ""}`,
    };
  });
}

async function getMatchStats(athleteId, teamSessionId) {
  const session = await db("athlete_session")
    .where("athlete", athleteId)
    .andWhere("teamsession", teamSessionId)
    .first();

  const teamSession = await db("team_session")
    .where("id", teamSessionId)
    .first();

  const sessionNotes = teamSession?.notes || null;

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
    notes: sessionNotes || "Профиль матча",
    z4: session.distance_speed_zone_4,
    z5: session.distance_speed_zone_5,
  };
}

module.exports = {
  getAvailableMatchMonths,
  getMatchesByMonth,
  getMatchStats,
};

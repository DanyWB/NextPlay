const db = require("./db");
const {getMonday} = require("../utils/dateUtils");
const POSSIBLE_INDEXES = [
  "anaerobic_index",
  "eccentric_index",
  "edwards_tl",
  "datetime_intervals",
];
async function getAvailableIndexes(athleteId) {
  const rows = await db("athlete_session")
    .select(POSSIBLE_INDEXES)
    .where({athlete: athleteId})
    .orderBy("id", "desc")
    .limit(50);

  const available = new Set();

  rows.forEach((row) => {
    for (const key of POSSIBLE_INDEXES) {
      if (key !== "datetime_intervals" && row[key] !== null) {
        available.add(key);
      }
    }
  });

  return [...available];
}
async function getWeeksWithData(athleteId, index) {
  const sessions = await db("athlete_session")
    .select("datetime_intervals")
    .whereNotNull(index)
    .andWhere({athlete: athleteId});

  const weekSet = new Set();

  sessions.forEach((s) => {
    const startStr = s.datetime_intervals.split("|")[0];
    const monday = getMonday(new Date(startStr));
    weekSet.add(monday.toISOString().split("T")[0]); // YYYY-MM-DD
  });

  return [...weekSet]
    .sort((a, b) => b.localeCompare(a)) // по убыванию
    .slice(0, 8); // последние 8 недель
}

module.exports = {
  getAvailableIndexes,
  getWeeksWithData,
};

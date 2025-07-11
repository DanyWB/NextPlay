const db = require("./db");

async function searchAthletesByName(query, clubId) {
  return db("athlete")
    .where({club: clubId})
    .andWhere((builder) => {
      builder
        .where("first_name", "like", `%${query}%`)
        .orWhere("last_name", "like", `%${query}%`);
    })
    .limit(25);
}
async function getAthletesByClubId(clubId) {
  return await db("athlete")
    .where("club", clubId)
    .join("player", "athlete.id", "player.athlete")
    .whereNotNull("player.playingrole")
    .select("athlete.id", "athlete.first_name", "athlete.last_name");
}
async function getAthleteById(id) {
  return await db("athlete").where("id", id).first();
}
async function getClubById(id) {
  return await db("club").where({id}).first();
}

module.exports = {
  searchAthletesByName,
  getAthletesByClubId,
  getAthleteById,
  getClubById,
};

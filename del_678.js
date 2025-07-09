// purge_team_678.js
require("dotenv").config();
const knex = require("./services/db");

async function purgeTeam(teamId = 678) {
  try {
    console.log(
      `⛔️ Удаление всех данных, связанных с командой team=${teamId}`
    );

    // Получаем id всех атлетов из этой команды
    const athleteIds = await knex("player")
      .where({team: teamId})
      .pluck("athlete");

    if (!athleteIds.length) {
      console.log("Нет атлетов, связанных с этой командой.");
      return;
    }

    // Удаляем сессии этих атлетов
    const delSessions = await knex("athlete_session")
      .whereIn("athlete", athleteIds)
      .del();
    console.log(`Удалено сессий: ${delSessions}`);

    // Удаляем пороги этих атлетов
    const delThresholds = await knex("athlete_threshold")
      .whereIn("athlete", athleteIds)
      .del();
    console.log(`Удалено порогов: ${delThresholds}`);

    // Удаляем игроков из этой команды
    const delPlayers = await knex("player").where({team: teamId}).del();
    console.log(`Удалено игроков: ${delPlayers}`);

    // Удаляем самих атлетов
    const delAthletes = await knex("athlete").whereIn("id", athleteIds).del();
    console.log(`Удалено атлетов: ${delAthletes}`);

    console.log("✅ Операция завершена успешно!");

    process.exit(0);
  } catch (err) {
    console.error("❌ Ошибка при удалении:", err.message);
    process.exit(1);
  }
}

purgeTeam();

const db = require("./db");

async function run() {
  const cutoff = "2025-02-01";

  console.log("🧹 Удаляем старые данные до", cutoff);

  await db("athlete_session")
    .whereRaw("substr(datetime_intervals, 1, 10) < ?", [cutoff])
    .del();

  await db("team_session")
    .whereRaw("substr(start_timestamp, 1, 10) < ?", [cutoff])
    .del();

  console.log("✅ Очистка завершена");

  process.exit();
}

run().catch((err) => {
  console.error("❌ Ошибка при очистке:", err);
  process.exit(1);
});

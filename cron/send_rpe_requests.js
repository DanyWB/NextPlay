// cron/send_rpe_requests.js

const {Bot} = require("grammy");
const db = require("../services/db");
require("dotenv").config();

// Подключаем токен бота
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Bot(BOT_TOKEN);

// Настройки категорий
const CATEGORIES = [5272, 5273, 5274, 3792, 3793, 3794];

// --- MAIN LOGIC ---
console.log(`[${new Date().toISOString()}] ==== RPE CRON ЗАПУЩЕН ====`);
(async () => {
  try {
    const now = new Date();
    const hour = now.getHours();
    const isMorning = hour < 12;

    const fromDate = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);

    // Лог: когда ищем сессии
    console.log(
      `Ищем athlete_session с category=${CATEGORIES.join(
        ", "
      )} после ${fromDate.toISOString()}`
    );

    const sessions = await db("athlete_session")
      .select(
        "athlete_session.athlete",
        "athlete_session.teamsession",
        "athlete_session.total_time",
        "team_session.start_timestamp"
      )
      .join("team_session", "athlete_session.teamsession", "team_session.id")
      .whereIn("team_session.category", CATEGORIES)
      .andWhere("team_session.start_timestamp", ">=", fromDate.toISOString())
      .orderBy("team_session.start_timestamp", "desc");

    console.log(`Найдено сессий для проверки: ${sessions.length}`);

    let sent = 0,
      skipped = 0,
      notFound = 0;

    for (const sess of sessions) {
      const already = await db("athlete_rpe")
        .where({athlete_id: sess.athlete, team_session_id: sess.teamsession})
        .first();
      if (already) {
        skipped++;
        continue;
      }

      // Ищем telegram_id пользователя
      const user = await db("users").where({athlete_id: sess.athlete}).first();
      if (!user || !user.id) {
        notFound++;
        console.log(
          `[SKIP] Не найден telegram_id для athlete_id=${sess.athlete}`
        );
        continue;
      }

      let duration = null;
      if (sess.total_time)
        duration = Math.round((sess.total_time / 60) * 100) / 100;

      const sessionDate = sess.start_timestamp.toLocaleString
        ? sess.start_timestamp.toLocaleString()
        : sess.start_timestamp;
      const text =
        `🟠 Оцените, пожалуйста, субъективную нагрузку за сессию (${sessionDate})\n\n` +
        `По шкале Борга 0–10 (0 — очень легко, 10 — максимально тяжело).\n\n` +
        (duration ? `Длительность: ${duration} мин.\n\n` : "") +
        (isMorning
          ? "Ответьте до 18:00 сегодня, чтобы мы знали ваш статус!"
          : "Это напоминание: оцените, пожалуйста, сессию. Если не ответите — больше не напомним.");

      const keyboard = {
        inline_keyboard: [
          [0, 1, 2, 3, 4, 5].map((v) => ({
            text: v.toString(),
            callback_data: `rpe_${v}_${sess.teamsession}`,
          })),
          [6, 7, 8, 9, 10].map((v) => ({
            text: v.toString(),
            callback_data: `rpe_${v}_${sess.teamsession}`,
          })),
          [{text: "Не отвечу", callback_data: `rpe_skip_${sess.teamsession}`}],
        ],
      };

      try {
        await bot.api.sendMessage(user.id, text, {
          reply_markup: keyboard,
        });
        sent++;
        console.log(
          `[OK] RPE запрос отправлен athlete_id=${sess.athlete}, telegram_id=${user.id}, teamsession=${sess.teamsession}`
        );
      } catch (err) {
        console.error(
          `[ERR] Ошибка отправки для telegram_id=${user.d}:`,
          err.description || err
        );
      }
    }

    console.log(
      `Всего отправлено: ${sent}, пропущено (уже есть оценка): ${skipped}, не найдено telegram_id: ${notFound}`
    );
    console.log(`[${new Date().toISOString()}] ==== RPE CRON ЗАВЕРШЁН ====`);
    process.exit(0);
  } catch (err) {
    console.error("Ошибка в рассылке RPE:", err);
    process.exit(1);
  }
})();

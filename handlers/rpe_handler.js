const db = require("../services/db");

// Обработка нажатия на RPE-кнопки (0–10)
module.exports = function setupRpeHandler(bot) {
  // Оценка RPE
  bot.callbackQuery(/^rpe_(\d{1,2})_(\d+)$/, async (ctx) => {
    const rpe = Number(ctx.match[1]);
    const teamSessionId = Number(ctx.match[2]);
    const telegramId = ctx.from.id;

    // Получаем athlete_id по telegram_id
    const user = await db("users").where({id: telegramId}).first();
    if (!user || !user.athlete_id) {
      return ctx.answerCallbackQuery("Ошибка: профиль игрока не найден.");
    }

    // Проверяем — не было ли уже оценки!
    const already = await db("athlete_rpe")
      .where({athlete_id: user.athlete_id, team_session_id: teamSessionId})
      .first();
    if (already) {
      return ctx.answerCallbackQuery(
        "Вы уже отправили свою оценку за эту сессию."
      );
    }

    // Достаём duration из athlete_session
    const session = await db("athlete_session")
      .where({athlete: user.athlete_id, teamsession: teamSessionId})
      .first();
    if (!session || !session.total_time) {
      return ctx.editMessageText(
        "Не удалось найти длительность сессии. Оценка не сохранена."
      );
    }
    const duration = Math.round((session.total_time / 60) * 100) / 100;

    // Сохраняем в БД
    await db("athlete_rpe").insert({
      athlete_id: user.athlete_id,
      team_session_id: teamSessionId,
      rpe,
      duration,
      created_at: new Date(),
    });

    // Благодарим игрока
    await ctx.editMessageText(
      `Спасибо! Ваша оценка RPE: *${rpe}* за сессию длиной *${duration}* мин сохранена.`,
      {parse_mode: "Markdown"}
    );
  });

  // Обработка "Не отвечу"
  bot.callbackQuery(/^rpe_skip_(\d+)$/, async (ctx) => {
    await ctx.editMessageText(
      "Вы решили не оценивать эту сессию. Спасибо за честность!"
    );
  });
};

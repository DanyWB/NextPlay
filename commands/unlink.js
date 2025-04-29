const db = require("../services/db");
const {InlineKeyboard} = require("grammy");
const {unlinkUserFromAthlete} = require("../services/userService");

module.exports = (bot) => {
  bot.command("unlink", async (ctx) => {
    const fromId = ctx.from.id;
    const admin = await db("users").where({id: fromId, is_admin: true}).first();

    if (!admin) return ctx.reply("❌ Только для админа.");

    // Список всех привязанных пользователей
    const users = await db("users")
      .select("id", "username")
      .whereNotNull("athlete_id");

    if (users.length === 0) {
      return ctx.reply("✅ Нет пользователей для отвязки.");
    }

    const keyboard = new InlineKeyboard();
    for (const user of users) {
      const displayName = `${user.username || ""}`.trim() || user.id;
      keyboard.text(displayName, `admin_unlink_${user.id}`).row();
    }

    await ctx.reply("👤 Выберите пользователя для отвязки:", {
      reply_markup: keyboard,
    });
  });

  // Обработка нажатия на кнопку
  bot.callbackQuery(/^admin_unlink_(\d+)$/, async (ctx) => {
    const fromId = ctx.from.id;
    const admin = await db("users").where({id: fromId, is_admin: true}).first();

    if (!admin)
      return ctx.answerCallbackQuery({
        text: "❌ Только для админа.",
        show_alert: true,
      });

    const tgId = ctx.match[1];

    try {
      await unlinkUserFromAthlete(tgId);
      await ctx.answerCallbackQuery({text: "✅ Пользователь отвязан."});
      await ctx.editMessageText(`✅ Пользователь ${tgId} успешно отвязан.`);
    } catch (err) {
      console.error(err);
      await ctx.answerCallbackQuery({
        text: "❌ Ошибка при отвязке.",
        show_alert: true,
      });
    }
  });
};

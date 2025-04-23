const {InlineKeyboard} = require("grammy");

module.exports = (bot) => {
  bot.command("stats", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("⚡ ASP (Профиль скорости)", "stats_asp")
      .row()
      .text("📊 Сравнить два месяца ASP", "asp_compare") // ← добавили эту кнопку
      .row()
      .text("🔙 Назад", "stats_back");

    await ctx.reply("📊 Выберите тип статистики:", {
      reply_markup: keyboard,
    });
  });
};

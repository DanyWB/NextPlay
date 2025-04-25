const {InlineKeyboard} = require("grammy");

async function showStatsMenu(ctx) {
  const keyboard = new InlineKeyboard()
    .text("⚡ ASP (Профиль скорости)", "stats_asp")
    .row()
    .text("📊 Сравнить два месяца ASP", "asp_compare")
    .row();
  // .text("🔙 Назад", "main_back");

  await ctx.reply("📊 Выберите тип статистики:", {
    reply_markup: keyboard,
  });
}

// регистрируем команду
module.exports = (bot) => {
  bot.command("stats", showStatsMenu);
};

// ⬅️ экспортируем функцию отдельно
module.exports.showStatsMenu = showStatsMenu;

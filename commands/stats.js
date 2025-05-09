const {InlineKeyboard} = require("grammy");
const {getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

async function showStatsMenu(ctx) {
  const lang = await getUserLang(ctx.from.id);

  const keyboard = new InlineKeyboard()
    .text(t(lang, "stats.asp"), "stats_asp")
    .text(t(lang, "stats.asp_compare"), "asp_compare")
    .row()
    .text(t(lang, "stats.mpp"), "stats_mpp")
    .text(t(lang, "stats.mpp_compare"), "stats_mpp_compare");

  await ctx.reply(t(lang, "stats.choose_type"), {
    reply_markup: keyboard,
  });
}

module.exports = (bot) => {
  bot.command("stats", showStatsMenu);
};

module.exports.showStatsMenu = showStatsMenu;

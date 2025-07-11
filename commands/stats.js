const {InlineKeyboard} = require("grammy");
const {getUserLang} = require("../services/userService");
const {t} = require("../services/langService");
const {getFullUser, getAthleteIdsForUser} = require("../services/userService");
const db = require("../services/db");

async function showStatsMenu(ctx) {
  const lang = await getUserLang(ctx);
  const user = await getFullUser(ctx.from.id);
  const athleteIds = await getAthleteIdsForUser(user);

  if (athleteIds.length === 0) {
    return ctx.reply(t(lang, "stats.no_access"));
  }

  // Если один атлет — сохраняем и показываем меню
  if (athleteIds.length === 1) {
    ctx.session.selectedAthleteId = athleteIds[0];
    return renderStatsMenu(ctx, lang);
  }

  // Иначе — показать выбор игрока
  const athletes = await db("athlete")
    .join("player", "athlete.id", "player.athlete")
    .whereNotNull("player.playingrole")
    .whereIn("id", athleteIds)
    .select("athlete.id", "athlete.first_name", "athlete.last_name");

  const keyboard = new InlineKeyboard();
  for (const a of athletes) {
    keyboard
      .text(`${a.last_name} ${a.first_name}`, `select_athlete_${a.id}`)
      .row();
  }

  await ctx.reply(t(lang, "stats.choose_athlete"), {
    reply_markup: keyboard,
  });
}
function renderStatsMenu(ctx, lang) {
  const keyboard = new InlineKeyboard()
    .text(t(lang, "stats.asp"), "stats_asp")
    .text(t(lang, "stats.asp_compare"), "asp_compare")
    .row()
    .text(t(lang, "stats.mpp"), "stats_mpp")
    .text(t(lang, "stats.mpp_compare"), "stats_mpp_compare");

  return ctx.reply(t(lang, "stats.choose_type"), {
    reply_markup: keyboard,
  });
}

module.exports = (bot) => {
  bot.command("stats", showStatsMenu);
  bot.callbackQuery(/^select_athlete_(\d+)$/, async (ctx) => {
    const athleteId = Number(ctx.match[1]);
    ctx.session.selectedAthleteId = athleteId;
    const lang = await getUserLang(ctx);

    try {
      await ctx.deleteMessage();
    } catch (_) {}

    return renderStatsMenu(ctx, lang);
  });
};

module.exports.showStatsMenu = showStatsMenu;

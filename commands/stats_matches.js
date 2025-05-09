const {InlineKeyboard, InputFile} = require("grammy");
const {getUser, getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

const {
  getAvailableMatchMonths,
  getMatchesByMonth,
  getMatchStats,
} = require("../services/matchService");
const {generateMatchChartImage} = require("../utils/chartGenerator");
const {
  formatMatchStats,
  formatMatchComparison,
} = require("../utils/matchFormatter");

module.exports = (bot) => {
  bot.command("stats_matches", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user?.athlete_id) {
      return (
        ctx.answerCallbackQuery?.({
          text: t(lang, "match_stats.not_verified"),
          show_alert: true,
        }) ?? ctx.reply(t(lang, "match_stats.not_verified"))
      );
    }

    const keyboard = new InlineKeyboard()
      .text(t(lang, "match_stats.single_button"), "match_single")
      .row()
      .text(t(lang, "match_stats.compare_button"), "match_compare")
      .row();

    await ctx.reply(t(lang, "match_stats.select_mode"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery("match_single", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: t(lang, "match_stats.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(user.athlete_id, lang);
    if (!months.length) {
      return ctx.reply(t(lang, "match_stats.no_matches"));
    }

    const keyboard = new InlineKeyboard();
    for (const month of months) {
      keyboard.text(month.label, `match_month_${month.value}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "stats_matches");

    await ctx.editMessageText(t(lang, "match_stats.select_month"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_month_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const month = ctx.match[1];

    if (!user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    const matches = await getMatchesByMonth(user.athlete_id, month);
    if (!matches.length) {
      return ctx.reply(t(lang, "match_stats.no_matches_month"));
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_view_${match.id}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "match_single");

    await ctx.editMessageText(t(lang, "match_stats.select_match"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_view_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    const teamSessionId = Number(ctx.match[1]);
    const data = await getMatchStats(user.athlete_id, teamSessionId);
    if (!data) {
      return ctx.reply(t(lang, "match_stats.not_enough_data"));
    }

    const {image} = await generateMatchChartImage(data);
    const caption = formatMatchStats(data, lang);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "match_stats.back_to_matches"),
        "stats_matches"
      ),
    });
  });

  bot.callbackQuery("match_compare", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: t(lang, "match_stats.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(user.athlete_id, lang);
    if (!months.length) {
      return ctx.reply(t(lang, "match_stats.no_matches"));
    }

    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month1_${m.value}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "stats_matches");

    await ctx.editMessageText(t(lang, "match_stats.select_month1"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_month1_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const month = ctx.match[1];

    if (!user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    ctx.session.matchCompare = {month1: month};

    const matches = await getMatchesByMonth(user.athlete_id, month);
    if (!matches.length) {
      return ctx.reply(t(lang, "match_stats.no_matches_month"));
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match1_${match.id}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "match_compare");

    await ctx.editMessageText(t(lang, "match_stats.select_match1"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_match1_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    ctx.session.matchCompare.match1 = Number(ctx.match[1]);

    const months = await getAvailableMatchMonths(user.athlete_id, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month2_${m.value}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "match_compare");

    await ctx.editMessageText(t(lang, "match_stats.select_month2"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_month2_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const month2 = ctx.match[1];

    if (!user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    ctx.session.matchCompare.month2 = month2;

    const matches = await getMatchesByMonth(user.athlete_id, month2);
    if (!matches.length) {
      return ctx.reply(t(lang, "match_stats.no_matches_month"));
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match2_${match.id}`).row();
    }
    keyboard.text(t(lang, "match_stats.back_to_matches"), "match_compare");

    await ctx.editMessageText(t(lang, "match_stats.select_match2"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_match2_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const match1 = ctx.session.matchCompare?.match1;
    const match2 = Number(ctx.match[1]);

    if (!match1 || !user?.athlete_id) {
      return ctx.reply(t(lang, "match_stats.compare_error"));
    }

    const [data1, data2] = await Promise.all([
      getMatchStats(user.athlete_id, match1),
      getMatchStats(user.athlete_id, match2),
    ]);

    if (!data1 || !data2) {
      return ctx.reply(t(lang, "match_stats.compare_insufficient"));
    }

    const {image} = await generateMatchChartImage(data1, data2);
    const caption = formatMatchComparison(data1, data2);

    ctx.session.matchCompare = null;

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "match_stats.back_to_matches"),
        "stats_matches"
      ),
    });
  });
};

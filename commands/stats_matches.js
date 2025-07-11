const {InlineKeyboard, InputFile} = require("grammy");
const {
  getFullUser,
  getAthleteIdsForUser,
  getUserLang,
  getUser,
} = require("../services/userService");
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

async function showStatsMatchesMenu(ctx) {
  const user = await getFullUser(ctx.from.id);
  const lang = await getUserLang(ctx);
  const athleteIds = await getAthleteIdsForUser(user);

  if (athleteIds.length === 0) {
    return ctx.reply(t(lang, "match_stats.not_verified"));
  }

  if (athleteIds.length === 1) {
    ctx.session.selectedAthleteId = athleteIds[0];
  } else {
    const db = require("../services/db");
    const athletes = await db("athlete")
      .join("player", "athlete.id", "player.athlete")
      .whereNotNull("player.playingrole")
      .whereIn("id", athleteIds)
      .select("athlete.id", "athlete.first_name", "athlete.last_name");

    const keyboard = new InlineKeyboard();
    for (const a of athletes) {
      keyboard
        .text(`${a.last_name} ${a.first_name}`, `select_match_athlete_${a.id}`)
        .row();
    }

    return ctx.reply(t(lang, "stats.choose_athlete"), {
      reply_markup: keyboard,
    });
  }

  const keyboard = new InlineKeyboard()
    .text(t(lang, "match_stats.single_button"), "match_single")
    .row()
    .text(t(lang, "match_stats.compare_button"), "match_compare");

  await ctx.reply(t(lang, "match_stats.select_mode"), {
    reply_markup: keyboard,
  });
}

module.exports = (bot) => {
  bot.command("stats_matches", async (ctx) => {
    showStatsMatchesMenu(ctx);
  });

  bot.callbackQuery(/^select_match_athlete_(\d+)$/, async (ctx) => {
    const athleteId = Number(ctx.match[1]);
    const lang = await getUserLang(ctx);
    ctx.session.selectedAthleteId = athleteId;

    const keyboard = new InlineKeyboard()
      .text(t(lang, "match_stats.single_button"), "match_single")
      .row()
      .text(t(lang, "match_stats.compare_button"), "match_compare");

    await ctx.editMessageText(t(lang, "match_stats.select_mode"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery("match_single", async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    if (!athleteId) {
      return ctx.answerCallbackQuery({
        text: t(lang, "match_stats.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(athleteId, lang);
    if (!months.length) {
      return ctx.reply(t(lang, "match_stats.no_matches"));
    }

    const keyboard = new InlineKeyboard();
    for (const month of months) {
      keyboard.text(month.label, `match_month_${month.value}`).row();
    }
    keyboard.text(
      t(lang, "match_stats.back_to_matches"),
      "stats_back_to_mathches"
    );

    await ctx.editMessageText(t(lang, "match_stats.select_month"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_month_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    const month = ctx.match[1];

    if (!athleteId) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    const matches = await getMatchesByMonth(athleteId, month);
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
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;

    if (!athleteId) {
      return ctx.reply(t(lang, "match_stats.not_verified"));
    }

    const teamSessionId = Number(ctx.match[1]);
    const data = await getMatchStats(athleteId, teamSessionId);
    if (!data) {
      return ctx.reply(t(lang, "match_stats.not_enough_data"));
    }

    const {image} = await generateMatchChartImage(data, null, lang);
    const caption = formatMatchStats(data, lang);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "match_stats.back_to_matches"),
        "stats_back_to_mathches"
      ),
    });
  });

  bot.callbackQuery("match_compare", async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    if (!athleteId) {
      return ctx.answerCallbackQuery({
        text: t(lang, "match_stats.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(athleteId, lang);
    if (!months.length) {
      return ctx.reply(t(lang, "match_stats.no_matches"));
    }

    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month1_${m.value}`).row();
    }
    keyboard.text(
      t(lang, "match_stats.back_to_matches"),
      "stats_back_to_mathches"
    );

    await ctx.editMessageText(t(lang, "match_stats.select_month1"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_month1_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    const month = ctx.match[1];

    if (!athleteId) return ctx.reply(t(lang, "match_stats.not_verified"));

    ctx.session.matchCompare = {month1: month};
    const matches = await getMatchesByMonth(athleteId, month);

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match1_${match.id}`).row();
    }
    await ctx.editMessageText(t(lang, "match_stats.select_match1"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_match1_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    ctx.session.matchCompare.match1 = Number(ctx.match[1]);

    const athleteId = ctx.session?.selectedAthleteId;
    const months = await getAvailableMatchMonths(athleteId, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month2_${m.value}`).row();
    }
    await ctx.editMessageText(t(lang, "match_stats.select_month2"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_month2_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    const month2 = ctx.match[1];

    ctx.session.matchCompare.month2 = month2;
    const matches = await getMatchesByMonth(athleteId, month2);
    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match2_${match.id}`).row();
    }
    await ctx.editMessageText(t(lang, "match_stats.select_match2"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^match_compare_match2_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;
    const match1 = ctx.session.matchCompare?.match1;
    const match2 = Number(ctx.match[1]);

    if (!match1 || !match2 || !athleteId) {
      return ctx.reply(t(lang, "match_stats.compare_error"));
    }

    const [data1, data2] = await Promise.all([
      getMatchStats(athleteId, match1),
      getMatchStats(athleteId, match2),
    ]);

    if (!data1 || !data2) {
      return ctx.reply(t(lang, "match_stats.compare_insufficient"));
    }

    const {image} = await generateMatchChartImage(data1, data2, lang);
    const caption = formatMatchComparison(data1, data2);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "match_stats.back_to_matches"),
        "stats_back_to_mathches"
      ),
    });
  });

  bot.callbackQuery(/^stats_back_to_mathches$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    showStatsMatchesMenu(ctx);
  });
};

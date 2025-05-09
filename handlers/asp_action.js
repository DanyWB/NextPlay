const {InlineKeyboard, InputFile} = require("grammy");
const {getUser, getUserLang} = require("../services/userService");
const {getAvailableMonths, getAspData} = require("../services/statService");
const {generateChartImage} = require("../utils/chartGenerator");
const {monthsNames, getMonthLabel} = require("../utils/months");
const {
  formatAspComparison,
  formatAspSummary,
} = require("../utils/aspFormatter");
const {showStatsMenu} = require("../commands/stats");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.callbackQuery(/^stats_asp$/, async (ctx) => {
    const tgId = ctx.from.id;
    const lang = await getUserLang(tgId);
    const user = await getUser(tgId);

    if (!user || !user.athlete_id) {
      return ctx.answerCallbackQuery({
        text: t(lang, "asp.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(user.athlete_id, lang);
    const keyboard = new InlineKeyboard();
    for (const month of months) {
      keyboard.text(month.label, `asp_month_${month.value}`).row();
    }
    keyboard.text(t(lang, "asp.back"), "stats_back");

    const messageText = t(lang, "asp.select_month");

    if (ctx.callbackQuery?.message?.text) {
      await ctx.editMessageText(messageText, {
        reply_markup: keyboard,
      });
    } else {
      await ctx.reply(messageText, {
        reply_markup: keyboard,
      });
    }
  });

  bot.callbackQuery(/^asp_month_(.+)$/, async (ctx) => {
    const month = ctx.match[1];
    const userId = ctx.from.id;
    const lang = await getUserLang(userId);

    await ctx.answerCallbackQuery();

    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.warn("Не удалось удалить сообщение с кнопками:", e.message);
    }

    const waitMsg = await ctx.reply(t(lang, "asp.generating"));

    try {
      const user = await getUser(userId);
      if (!user || !user.athlete_id) {
        return ctx.reply(t(lang, "asp.not_verified_chart"));
      }

      const aspData = await getAspData(user.athlete_id, month);
      if (!aspData) {
        return ctx.reply(t(lang, "asp.no_data"));
      }

      const {image} = await generateChartImage(aspData, "radar");

      const summary = formatAspSummary(aspData, month, lang);

      const keyboard = new InlineKeyboard().text(
        t(lang, "asp.back"),
        "stats_back_to_months"
      );
      const file = new InputFile(image);

      await ctx.api.deleteMessage(ctx.chat.id, waitMsg.message_id);

      await ctx.replyWithPhoto(file, {
        caption: summary,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } catch (err) {
      console.error("❌ Ошибка при генерации ASP:", err);
      await ctx.reply(t(lang, "asp.error"));
    }
  });

  bot.callbackQuery(/^stats_back$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}

    await showStatsMenu(ctx);
  });

  bot.callbackQuery(/^stats_back_to_months$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}

    ctx.update.callback_query.data = "stats_asp";
    await bot.handleUpdate(ctx.update);
  });

  bot.callbackQuery("asp_compare", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);

    if (!user || !user.athlete_id) {
      return ctx.answerCallbackQuery({
        text: t(lang, "asp.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(user.athlete_id, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `asp_compare_month1_${m.value}`).row();
    }
    keyboard.text(t(lang, "asp.reset"), "asp_compare_reset");

    await ctx.editMessageText(t(lang, "asp.compare_start"), {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  });

  bot.callbackQuery(/^asp_compare_month1_(.+)$/, async (ctx) => {
    const month1 = ctx.match[1];
    ctx.session.aspCompare = {month1};
    const lang = await getUserLang(ctx.from.id);

    const months = await getAvailableMonths(
      (
        await getUser(ctx.from.id)
      ).athlete_id,
      lang
    );

    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `asp_compare_month2_${m.value}`).row();
    }
    keyboard.text(t(lang, "asp.reset"), "asp_compare_reset");

    await ctx.editMessageText(
      t(lang, "asp.compare_select_second", {
        month1: getMonthLabel(month1),
      }),
      {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      }
    );
  });

  bot.callbackQuery(/^asp_compare_month2_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const month1 = ctx.session.aspCompare?.month1;
    const month2 = ctx.match[1];

    if (!month1 || !month2 || !user || !user.athlete_id) {
      return ctx.reply(t(lang, "asp.compare_error"));
    }

    await ctx.answerCallbackQuery();
    await ctx.reply(t(lang, "asp.compare_building"));

    try {
      const [data1, data2] = await Promise.all([
        getAspData(user.athlete_id, month1),
        getAspData(user.athlete_id, month2),
      ]);

      if (!data1 || !data2) {
        return ctx.reply(t(lang, "asp.compare_no_data"));
      }

      const {image} = await generateChartImage(data1, data2);
      const summary = formatAspComparison(
        data1,
        data2,
        getMonthLabel(month1, lang),
        getMonthLabel(month2, lang),
        lang
      );

      await ctx.replyWithPhoto(new InputFile(image), {
        caption: summary,
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("Ошибка сравнения ASP:", err);
      await ctx.reply(t(lang, "asp.compare_error"));
    }
  });

  bot.callbackQuery("asp_compare_reset", async (ctx) => {
    ctx.session.aspCompare = {};
    const lang = await getUserLang(ctx.from.id);
    return ctx.reply(t(lang, "asp.reset_confirm"));
  });
};

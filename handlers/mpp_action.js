﻿const {InlineKeyboard, InputFile} = require("grammy");
const {getUserLang} = require("../services/userService");
const {getAvailableMonths, getMppData} = require("../services/statService");
const {generateQuickGaugeImage} = require("../utils/chartGenerator");
const db = require("../connect");
const {
  formatMppProfile,
  formatMppComparison,
} = require("../utils/mppFormatter");
const {t} = require("../services/langService");

module.exports = (bot) => {
  // Одиночный MPP
  bot.callbackQuery("stats_mpp", async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;

    if (!athleteId) {
      return ctx.answerCallbackQuery({
        text: t(lang, "mpp.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(athleteId, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_month_${m.value}`).row();
    }
    keyboard.text(t(lang, "mpp.back"), "stats_back");

    const text = t(lang, "mpp.select_month");

    try {
      await ctx.editMessageText(text, {reply_markup: keyboard});
    } catch {
      await ctx.reply(text, {reply_markup: keyboard});
    }
  });

  bot.callbackQuery(/^stats_back_to_months_mpp$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}

    ctx.update.callback_query.data = "stats_mpp";
    await bot.handleUpdate(ctx.update);
  });

  bot.callbackQuery(/^mpp_month_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const month = ctx.match[1];
    const athleteId = ctx.session?.selectedAthleteId;

    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.error("Не удалось удалить сообщение:", e.description);
    }

    if (!athleteId) return ctx.reply(t(lang, "mpp.not_verified"));

    await ctx.answerCallbackQuery();
    const data = await getMppData(athleteId, month);
    if (!data) return ctx.reply(t(lang, "mpp.no_data"));

    const {image} = await generateQuickGaugeImage(data);
    const caption = formatMppProfile(data, month, lang);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "mpp.back"),
        "stats_back_to_months_mpp"
      ),
    });
  });

  // Сравнение двух MPP
  bot.callbackQuery("stats_mpp_compare", async (ctx) => {
    const lang = await getUserLang(ctx);
    const athleteId = ctx.session?.selectedAthleteId;

    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.error("Не удалось удалить сообщение:", e.description);
    }

    if (!athleteId) {
      return ctx.answerCallbackQuery({
        text: t(lang, "mpp.not_verified"),
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(athleteId, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_compare_month1_${m.value}`).row();
    }
    keyboard.text(t(lang, "mpp.back"), "stats_back");

    const text = t(lang, "mpp.compare_select1");

    try {
      await ctx.editMessageText(text, {reply_markup: keyboard});
    } catch {
      await ctx.reply(text, {reply_markup: keyboard});
    }
  });

  bot.callbackQuery(/^mpp_compare_month1_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    ctx.session.mppCompare = {month1: ctx.match[1]};
    const athleteId = ctx.session?.selectedAthleteId;

    if (!athleteId) return ctx.reply(t(lang, "mpp.compare_error"));

    const months = await getAvailableMonths(athleteId, lang);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_compare_month2_${m.value}`).row();
    }

    keyboard.text(t(lang, "mpp.reset"), "stats_mpp_compare");
    keyboard.text(t(lang, "mpp.back"), "stats_back");

    await ctx.editMessageText(t(lang, "mpp.compare_select2"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^mpp_compare_month2_(.+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const month1 = ctx.session.mppCompare?.month1;
    const month2 = ctx.match[1];
    const athleteId = ctx.session?.selectedAthleteId;

    try {
      await ctx.deleteMessage();
    } catch (e) {
      console.error("Не удалось удалить сообщение:", e.description);
    }

    if (!month1 || !athleteId) {
      return ctx.reply(t(lang, "mpp.compare_error"));
    }

    const [data1, data2] = await Promise.all([
      getMppData(athleteId, month1),
      getMppData(athleteId, month2),
    ]);

    if (!data1 || !data2) {
      return ctx.reply(t(lang, "mpp.compare_no_data"));
    }

    const {image} = await generateQuickGaugeImage(data1, data2);
    const caption = formatMppComparison(data1, data2, month1, month2, lang);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        t(lang, "mpp.reset"),
        "stats_mpp_compare"
      ),
    });
  });
};

// handlers/mpp_action.js
const {InlineKeyboard, InputFile} = require("grammy");
const {getUser} = require("../services/userService");
const {getAvailableMonths, getMppData} = require("../services/statService");
const {generateQuickGaugeImage} = require("../utils/chartGenerator");
const {
  formatMppProfile,
  formatMppComparison,
} = require("../utils/mppFormatter");

module.exports = (bot) => {
  // Одиночный MPP
  bot.callbackQuery("stats_mpp", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы не верифицированы.",
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(user.athlete_id);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_month_${m.value}`).row();
    }
    keyboard.text("🔙 Назад", "stats_back");

    await ctx.editMessageText("📅 Выберите месяц для MPP:", {
      reply_markup: keyboard,
    });
  });
  bot.callbackQuery(/^stats_back_to_months_mpp$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}

    // эмулируем callback 'stats_asp'
    ctx.update.callback_query.data = "stats_mpp";
    await bot.handleUpdate(ctx.update);
  });
  // Вывод одного MPP профиля
  bot.callbackQuery(/^mpp_month_(.+)$/, async (ctx) => {
    const month = ctx.match[1];
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) return ctx.reply("❌ Вы не верифицированы.");

    await ctx.answerCallbackQuery();
    const data = await getMppData(user.athlete_id, month);
    if (!data) return ctx.reply("⚠️ Недостаточно данных для MPP профиля.");

    const {image} = await generateQuickGaugeImage(data);
    const caption = formatMppProfile(data, month);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        "🔙 Назад",
        "stats_back_to_months_mpp"
      ),
    });
  });

  // Сравнение двух месяцев — шаг 1
  bot.callbackQuery("stats_mpp_compare", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id)
      return ctx.answerCallbackQuery({
        text: "❌ Вы не верифицированы.",
        show_alert: true,
      });

    const months = await getAvailableMonths(user.athlete_id);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_compare_month1_${m.value}`).row();
    }
    keyboard.text("🔙 Назад", "stats_back");

    await ctx.editMessageText("📅 Выберите первый месяц для сравнения MPP:", {
      reply_markup: keyboard,
    });
  });

  // Сравнение — выбор второго месяца
  bot.callbackQuery(/^mpp_compare_month1_(.+)$/, async (ctx) => {
    ctx.session.mppCompare = {month1: ctx.match[1]};

    const user = await getUser(ctx.from.id);
    const months = await getAvailableMonths(user.athlete_id);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `mpp_compare_month2_${m.value}`).row();
    }
    keyboard.text("🔁 Выбрать заново", "stats_mpp_compare");
    keyboard.text("🔙 Назад", "stats_back");

    await ctx.editMessageText("📅 Выберите второй месяц:", {
      reply_markup: keyboard,
    });
  });

  // Сравнение — финальный график
  bot.callbackQuery(/^mpp_compare_month2_(.+)$/, async (ctx) => {
    const month1 = ctx.session.mppCompare?.month1;
    const month2 = ctx.match[1];
    const user = await getUser(ctx.from.id);
    if (!month1 || !user?.athlete_id)
      return ctx.reply("❌ Ошибка при сравнении. Попробуйте снова.");

    const [data1, data2] = await Promise.all([
      getMppData(user.athlete_id, month1),
      getMppData(user.athlete_id, month2),
    ]);

    if (!data1 || !data2)
      return ctx.reply("⚠️ Недостаточно данных для сравнения.");

    const {image} = await generateQuickGaugeImage(data1, data2);
    const caption = formatMppComparison(data1, data2, month1, month2);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
    });
  });
};

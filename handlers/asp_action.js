const {InlineKeyboard, InputFile} = require("grammy");
const {getUser} = require("../services/userService");
const {getAvailableMonths, getAspData} = require("../services/statService");
const {generateChartImage} = require("../utils/chartGenerator");
const {monthsNames} = require("../utils/months");
const {getMonthLabel} = require("../utils/months");
const {formatAspComparison} = require("../utils/aspFormatter");
module.exports = (bot) => {
  // Этап 1: выбор месяца
  bot.callbackQuery(/^stats_asp$/, async (ctx) => {
    const tgId = ctx.from.id;
    const user = await getUser(tgId);

    if (!user || !user.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы ещё не верифицированы. Отправьте /verify_me",
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(user.athlete_id);

    const keyboard = new InlineKeyboard();
    for (const month of months) {
      keyboard.text(month.label, `asp_month_${month.value}`).row();
    }
    keyboard.text("🔙 Назад", "stats_back");

    await ctx.editMessageText("📅 Выберите месяц для ASP:", {
      reply_markup: keyboard,
    });
  });

  // Этап 3: генерация графика
  bot.callbackQuery(/^asp_month_(.+)$/, async (ctx) => {
    const month = ctx.match[1];
    const userId = ctx.from.id;

    await ctx.answerCallbackQuery(); // просто закрывает "часики"
    await ctx.reply("🛠 Генерация графика, подождите...");

    try {
      const user = await getUser(userId);
      if (!user || !user.athlete_id) {
        return ctx.reply("❌ Вы не верифицированы.");
      }
      const aspData = await getAspData(user.athlete_id, month); // ✅
      if (!aspData) {
        return ctx.reply("⚠️ Недостаточно данных для построения графика.");
      }

      //

      const chartType = "radar";

      const {image} = await generateChartImage(aspData, chartType); // ✅ деструктурируем image из объекта

      const summary = `
📊 *ASP за ${month}*

⏱️ Минут на поле: *${aspData.minutes}*
🏃‍♂️ Ср. макс. скорость: *${aspData.avgMaxSpeed.toFixed(1)} км/ч*
⚡ Ср. макс. ускорение: *${aspData.avgMaxAcc.toFixed(2)} м/с²*
🛑 Ср. макс. торможение: *${aspData.avgMaxDec.toFixed(2)} м/с²*
📏 Дист. Z4-Z5: *${aspData.z4z5Distance.toFixed(1)} м/мин*
🔥 Метаболическая сила: *${aspData.metabolicPower.toFixed(2)} Вт/кг*
`.trim();

      // const keyboard = new InlineKeyboard().text("🔙 Назад", "stats_asp");

      // await ctx.replyWithPhoto(new InputFile(imageBuffer), {
      //   caption: summary,
      //   parse_mode: "Markdown",
      // });

      const file = new InputFile(image); // ← оборачиваем Buffer

      await ctx.replyWithPhoto(file, {
        caption: summary,
        parse_mode: "Markdown",
      });
    } catch (err) {
      console.error("❌ Ошибка при генерации ASP:", err);
      await ctx.reply("❌ Не удалось построить график. Попробуйте позже.");
    }
  });

  // Возврат на шаг назад
  bot.callbackQuery(/^stats_back$/, async (ctx) => {
    await ctx.editMessageText("🔙 Назад. Вы можете снова вызвать /stats");
  });

  // Этап 1: Сравнение — выбор первого месяца
  bot.callbackQuery("asp_compare", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user || !user.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы ещё не верифицированы. Отправьте /verify_me",
        show_alert: true,
      });
    }

    const months = await getAvailableMonths(user.athlete_id);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `asp_compare_month1_${m.value}`).row();
    }
    keyboard.text("🔁 Начать заново", "asp_compare_reset");
    await ctx.editMessageText("📅 Выберите *первый* месяц для сравнения:", {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  });

  // Этап 2: Сравнение — выбор второго месяца
  bot.callbackQuery(/^asp_compare_month1_(.+)$/, async (ctx) => {
    const month1 = ctx.match[1];
    ctx.session.aspCompare = {month1};
    const months = await getAvailableMonths(
      (
        await getUser(ctx.from.id)
      ).athlete_id
    );

    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `asp_compare_month2_${m.value}`).row();
    }
    keyboard.text("🔁 Начать заново", "asp_compare_reset");

    await ctx.editMessageText(
      `Вы выбрали: *${getMonthLabel(month1)}*\nТеперь выберите *второй* месяц:`,
      {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      }
    );
  });

  // Этап 3: Построение сравнения
  bot.callbackQuery(/^asp_compare_month2_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const month1 = ctx.session.aspCompare?.month1;
    const month2 = ctx.match[1];

    if (!month1 || !month2 || !user || !user.athlete_id) {
      return ctx.reply("⚠️ Ошибка при выборе месяцев. Попробуйте сначала.");
    }

    await ctx.answerCallbackQuery();
    await ctx.reply("📊 Строим сравнение, подождите...");

    try {
      const [data1, data2] = await Promise.all([
        getAspData(user.athlete_id, month1),
        getAspData(user.athlete_id, month2),
      ]);

      if (!data1 || !data2) {
        return ctx.reply("⚠️ Недостаточно данных по выбранным месяцам.");
      }

      const {image} = await generateChartImage(data1, data2);
      const summary = formatAspComparison(
        data1,
        data2,
        getMonthLabel(month1),
        getMonthLabel(month2)
      );

      await ctx.replyWithPhoto(new InputFile(image), {
        caption: summary,
        parse_mode: "HTML",
      });
    } catch (err) {
      console.error("Ошибка сравнения ASP:", err);
      await ctx.reply("❌ Не удалось построить сравнение. Попробуйте позже.");
    }
  });

  // Сброс
  bot.callbackQuery("asp_compare_reset", async (ctx) => {
    ctx.session.aspCompare = {};
    return ctx.reply("🔁 Выбор сброшен. Отправьте команду снова.");
  });
};

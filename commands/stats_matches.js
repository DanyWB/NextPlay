const {InlineKeyboard} = require("grammy");
const {getUser} = require("../services/userService");
const {InputFile} = require("grammy");

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
  // Главное меню "Мои матчи"
  bot.command("stats_matches", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы ещё не верифицированы.",
        show_alert: true,
      });
    }

    const keyboard = new InlineKeyboard()
      .text("📊 Один матч", "match_single")
      .row()
      .text("⚖️ Сравнение матчей", "match_compare")
      .row();
    // .text("🔙 Назад", "stats_back");

    await ctx.reply("Выберите режим просмотра матчей:", {
      reply_markup: keyboard,
    });
  });

  // Один матч: выбор месяца
  bot.callbackQuery("match_single", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы ещё не верифицированы.",
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(user.athlete_id);
    if (!months.length) {
      return ctx.reply("⚠️ Матчи не найдены.");
    }

    const keyboard = new InlineKeyboard();
    for (const month of months) {
      keyboard.text(month.label, `match_month_${month.value}`).row();
    }
    keyboard.text("🔙 Назад", "stats_matches");

    await ctx.editMessageText("📅 Выберите месяц с матчами:", {
      reply_markup: keyboard,
    });
  });

  // Один матч: выбор матча по месяцу
  bot.callbackQuery(/^match_month_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const month = ctx.match[1];
    if (!user?.athlete_id) {
      return ctx.reply("❌ Вы не верифицированы.");
    }

    const matches = await getMatchesByMonth(user.athlete_id, month);
    if (!matches.length) {
      return ctx.reply("⚠️ Матчи за выбранный месяц не найдены.");
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_view_${match.id}`).row();
    }
    keyboard.text("🔙 Назад", "match_single");

    await ctx.editMessageText("🎯 Выберите матч:", {
      reply_markup: keyboard,
    });
  });

  // Один матч: отображение
  bot.callbackQuery(/^match_view_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.reply("❌ Вы не верифицированы.");
    }

    const teamSessionId = Number(ctx.match[1]);
    const data = await getMatchStats(user.athlete_id, teamSessionId);
    if (!data) {
      return ctx.reply("⚠️ Недостаточно данных для отображения матча.");
    }

    const {image} = await generateMatchChartImage(data);

    const caption = formatMatchStats(data);

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        "🔙 Назад к матчам",
        "stats_matches"
      ),
    });
  });
  // Сравнение матчей: шаг 1 — выбор первого месяца
  bot.callbackQuery("match_compare", async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.answerCallbackQuery({
        text: "❌ Вы ещё не верифицированы.",
        show_alert: true,
      });
    }

    const months = await getAvailableMatchMonths(user.athlete_id);
    if (!months.length) {
      return ctx.reply("⚠️ Матчи не найдены.");
    }

    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month1_${m.value}`).row();
    }
    keyboard.text("🔙 Назад", "stats_matches");

    await ctx.editMessageText("📅 Выберите первый месяц:", {
      reply_markup: keyboard,
    });
  });

  // Сравнение матчей: шаг 2 — выбор первого матча
  bot.callbackQuery(/^match_compare_month1_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const month = ctx.match[1];
    if (!user?.athlete_id) {
      return ctx.reply("❌ Вы не верифицированы.");
    }

    ctx.session.matchCompare = {month1: month};

    const matches = await getMatchesByMonth(user.athlete_id, month);
    if (!matches.length) {
      return ctx.reply("⚠️ В этом месяце нет матчей.");
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match1_${match.id}`).row();
    }
    keyboard.text("🔙 Назад", "match_compare");

    await ctx.editMessageText("🎯 Выберите первый матч:", {
      reply_markup: keyboard,
    });
  });
  // Сравнение матчей: шаг 3 — выбор второго месяца
  bot.callbackQuery(/^match_compare_match1_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.reply("❌ Вы не верифицированы.");
    }

    ctx.session.matchCompare.match1 = Number(ctx.match[1]);

    const months = await getAvailableMatchMonths(user.athlete_id);
    const keyboard = new InlineKeyboard();
    for (const m of months) {
      keyboard.text(m.label, `match_compare_month2_${m.value}`).row();
    }
    keyboard.text("🔙 Назад", "match_compare");

    await ctx.editMessageText("📅 Выберите второй месяц:", {
      reply_markup: keyboard,
    });
  });

  // Сравнение матчей: шаг 4 — выбор второго матча
  bot.callbackQuery(/^match_compare_month2_(.+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const month2 = ctx.match[1];
    if (!user?.athlete_id) {
      return ctx.reply("❌ Вы не верифицированы.");
    }

    ctx.session.matchCompare.month2 = month2;

    const matches = await getMatchesByMonth(user.athlete_id, month2);
    if (!matches.length) {
      return ctx.reply("⚠️ В этом месяце нет матчей.");
    }

    const keyboard = new InlineKeyboard();
    for (const match of matches) {
      keyboard.text(match.name, `match_compare_match2_${match.id}`).row();
    }
    keyboard.text("🔙 Назад", "match_compare");

    await ctx.editMessageText("🎯 Выберите второй матч:", {
      reply_markup: keyboard,
    });
  });

  // Сравнение матчей: шаг 5 — результат
  bot.callbackQuery(/^match_compare_match2_(\d+)$/, async (ctx) => {
    const user = await getUser(ctx.from.id);
    const match1 = ctx.session.matchCompare?.match1;
    const match2 = Number(ctx.match[1]);
    if (!match1 || !user?.athlete_id) {
      return ctx.reply("❌ Ошибка при сравнении. Попробуйте снова.");
    }

    const [data1, data2] = await Promise.all([
      getMatchStats(user.athlete_id, match1),
      getMatchStats(user.athlete_id, match2),
    ]);

    if (!data1 || !data2) {
      return ctx.reply("⚠️ Недостаточно данных для сравнения.");
    }

    const {image} = await generateMatchChartImage(data1, data2);
    const caption = formatMatchComparison(data1, data2);

    ctx.session.matchCompare = null;

    await ctx.replyWithPhoto(image, {
      caption,
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard().text(
        "🔙 Назад к матчам",
        "stats_matches"
      ),
    });
  });
};

const {InlineKeyboard} = require("grammy");
const {getUserLang} = require("../services/userService");
const {getUser} = require("../services/userService");
const {getWeeksWithData} = require("../services/indexService");
const {t} = require("../services/langService");
const {formatWeekRange} = require("../utils/dateUtils");
const {getAvailableIndexes} = require("../services/indexService");
const {
  generateEccentricChart,
  generateAnaerobicChart,
} = require("../utils/chartGenerator");
const db = require("../services/db");
const {InputFile} = require("grammy");
module.exports = (bot) => {
  bot.callbackQuery("index:back", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const translate = (key) => t(lang, `my_index.${key}`);

    const indexes = await getAvailableIndexes(user.athlete_id);
    if (!indexes.length) {
      return ctx.reply(translate("no_data"));
    }

    const keyboard = new InlineKeyboard();
    indexes.forEach((idx) => {
      keyboard.text(translate(idx), `index:${idx}`).row();
    });
    keyboard.text(translate("back"), "back:menu");

    await ctx.deleteMessage();
    await ctx.reply(translate("title"), {
      reply_markup: keyboard,
    });
  });
  bot.callbackQuery(/^index:([^:]+)$/, async (ctx) => {
    const indexName = ctx.match[1];
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const translate = (key) => t(lang, `my_index.${key}`);

    const weeks = await getWeeksWithData(user.athlete_id, indexName);
    if (!weeks.length) {
      return ctx.editMessageText(translate("no_data"));
    }

    const keyboard = new InlineKeyboard();
    weeks.forEach((weekStart) => {
      const label = formatWeekRange(weekStart); // 08.07 – 14.07
      keyboard.text(label, `index:${indexName}:${weekStart}`).row();
    });
    keyboard.text(translate("back"), "index:back");

    await ctx.editMessageText(translate("choose_week"), {
      reply_markup: keyboard,
    });
  });
  bot.callbackQuery(/^index:([^:]+):(\d{4}-\d{2}-\d{2})$/, async (ctx) => {
    try {
      await ctx.deleteMessage();
    } catch (_) {}
    const [_, indexName, weekStartStr] = ctx.match;
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx.from.id);
    const translate = (key) => t(lang, key);
    const athlete = await db("athlete")
      .select("first_name", "last_name")
      .where({id: user.athlete_id})
      .first();
    const fullName = athlete
      ? `${athlete.last_name?.toUpperCase() || ""} ${
          athlete.first_name || ""
        }`.trim()
      : "Атлет";

    const start = new Date(weekStartStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);

    const rows = await db("athlete_session")
      .select(indexName, "datetime_intervals")
      .where({athlete: user.athlete_id})
      .whereNotNull(indexName)
      .whereRaw("substr(datetime_intervals, 1, 10) BETWEEN ? AND ?", [
        weekStartStr,
        end.toISOString().split("T")[0],
      ]);

    const values = rows.map((r) => parseFloat(r[indexName])).filter(Boolean);
    if (!values.length) {
      return ctx.editMessageText(translate("no_data_week"));
    }

    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    if (indexName === "eccentric_index") {
      const dataByDay = rows.map((r) => ({
        date: r.datetime_intervals.split("|")[0],
        value: parseFloat(r[indexName]),
      }));

      const imageBuffer = await generateEccentricChart(
        dataByDay,
        avg,
        fullName || "Атлет",
        lang
      );
      const image = new InputFile(imageBuffer, "eccentric_index.png");

      const keyboard = new InlineKeyboard().text(
        translate("my_index.back"),
        "index:back"
      );
      return ctx.replyWithPhoto(image, {
        caption: `${translate(`my_index.${indexName}`)}\n\n${translate(
          "my_index.average_value"
        )}: *${avg.toFixed(2)}*`,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
    if (indexName === "anaerobic_index") {
      const dataByDay = rows
        .map((r) => ({
          date: r.datetime_intervals.split("|")[0].slice(0, 10),
          value: parseFloat(r[indexName]),
        }))
        .filter((d) => !isNaN(d.value));

      const athlete = await db("athlete")
        .select("first_name", "last_name")
        .where({id: user.athlete_id})
        .first();

      const fullName = athlete
        ? `${athlete.last_name?.toUpperCase() || ""} ${
            athlete.first_name || ""
          }`.trim()
        : "Атлет";

      const buffer = await generateAnaerobicChart(
        dataByDay,
        avg,
        fullName,
        lang
      );
      const photo = new InputFile(buffer, "anaerobic_index.png");

      const keyboard = new InlineKeyboard().text(
        translate("my_index.back"),
        "index:back"
      );

      return ctx.replyWithPhoto(photo, {
        caption: `${translate("my_index." + indexName)}\n\n${translate(
          "my_index.average_value"
        )}: *${avg.toFixed(2)}%*`,
        parse_mode: "Markdown",
        reply_markup: keyboard,
      });
    }
  });
};

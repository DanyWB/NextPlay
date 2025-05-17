const {InlineKeyboard} = require("grammy");
const indexService = require("../services/indexService");
const {
  getFullUser,
  getAthleteIdsForUser,
  getUserLang,
} = require("../services/userService");
const {t} = require("../services/langService");

module.exports = async (bot) => {
  bot.command("my_index", async (ctx) => {
    const lang = await getUserLang(ctx);
    const translate = (key) => t(lang, `my_index.${key}`);
    const user = await getFullUser(ctx.from.id);
    const athleteIds = await getAthleteIdsForUser(user);

    if (!athleteIds.length) {
      return ctx.reply("❌ У вас нет привязанного профиля.");
    }

    if (athleteIds.length === 1) {
      ctx.session.selectedAthleteId = athleteIds[0];
    } else {
      const db = require("../services/db");
      const athletes = await db("athlete")
        .whereIn("id", athleteIds)
        .select("id", "first_name", "last_name");

      const keyboard = new InlineKeyboard();
      for (const a of athletes) {
        keyboard
          .text(
            `${a.last_name} ${a.first_name}`,
            `select_index_athlete_${a.id}`
          )
          .row();
      }

      return ctx.reply(t(lang, "stats.choose_athlete"), {
        reply_markup: keyboard,
      });
    }

    // если дошли сюда — athlete выбран
    const indexes = await indexService.getAvailableIndexes(
      ctx.session.selectedAthleteId
    );
    if (!indexes.length) {
      return ctx.reply("❌ Нет данных по индексам.");
    }

    const keyboard = new InlineKeyboard();
    indexes.forEach((idx) => {
      keyboard.text(translate(idx), `index:${idx}`).row();
    });

    await ctx.reply(translate("title"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^select_index_athlete_(\d+)$/, async (ctx) => {
    const athleteId = Number(ctx.match[1]);
    const lang = await getUserLang(ctx);
    const translate = (key) => t(lang, `my_index.${key}`);

    ctx.session.selectedAthleteId = athleteId;

    const indexes = await indexService.getAvailableIndexes(athleteId);
    if (!indexes.length) {
      return ctx.reply("❌ Нет данных по индексам.");
    }

    const keyboard = new InlineKeyboard();
    indexes.forEach((idx) => {
      keyboard.text(translate(idx), `index:${idx}`).row();
    });

    await ctx.editMessageText(translate("title"), {
      reply_markup: keyboard,
    });
  });
};

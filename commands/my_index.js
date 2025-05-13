const {InlineKeyboard} = require("grammy");
const indexService = require("../services/indexService");
const {getUser, getUserLang} = require("../services/userService");
const {t} = require("../services/langService");
module.exports = async (bot) => {
  bot.command("my_index", async (ctx) => {
    const lang = await getUserLang(ctx.from.id);
    const translate = (key) => t(lang, `my_index.${key}`);

    const user = await getUser(ctx.from.id);
    if (!user?.athlete_id) {
      return ctx.reply("❌ У вас нет привязанного профиля.");
    }

    const indexes = await indexService.getAvailableIndexes(user.athlete_id);
    if (!indexes.length) {
      return ctx.reply("❌ Нет данных по индексам.");
    }

    const keyboard = new InlineKeyboard();
    indexes.forEach((idx) => {
      keyboard.text(translate(idx), `index:${idx}`).row();
    });

    // keyboard.text("⬅️ Назад", "back:menu");

    await ctx.reply(translate("title"), {
      reply_markup: keyboard,
    });
  });
};

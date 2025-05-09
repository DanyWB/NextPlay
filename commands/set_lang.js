const {InlineKeyboard} = require("grammy");
const {setUserLang, getUser} = require("../services/userService");
const {setUserCommands} = require("../utils/setUserCommands");
module.exports = (bot) => {
  bot.command("set_lang", async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🇷🇺 Русский", "lang_ru")
      .text("🇺🇦 Українська", "lang_ua");

    await ctx.reply("🌐 Выберите язык / Choose your language:", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^lang_(\w+)$/, async (ctx) => {
    const lang = ctx.match[1];

    await setUserLang(ctx.from.id, lang);
    const user = await getUser(ctx.from.id);
    await setUserCommands(user, lang, bot);
    await ctx.answerCallbackQuery();

    await ctx.editMessageText(
      lang === "ru"
        ? "✅ Язык установлен: русский"
        : "✅ Мову встановлено: українська"
    );
  });
};

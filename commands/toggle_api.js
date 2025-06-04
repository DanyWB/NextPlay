const {InlineKeyboard} = require("grammy");
const db = require("../services/db");
const {getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.command("toggle_api", async (ctx) => {
    const fromId = ctx.from.id;
    const lang = await getUserLang(fromId);
    const user = await db("users").where({id: fromId, is_admin: true}).first();

    if (!user) {
      return ctx.reply(t(lang, "admin_only"));
    }

    const sources = await db("api_sources").select();
    if (!sources.length) {
      return ctx.reply("📭 Нет добавленных API источников.");
    }

    const keyboard = new InlineKeyboard();
    for (const src of sources) {
      const label = src.active ? `✅ ${src.base_url}` : `❌ ${src.base_url}`;
      keyboard.text(label, `toggle_api_${src.id}`).row();
    }

    await ctx.reply("🔁 Выберите API для включения/выключения:", {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^toggle_api_(\d+)$/, async (ctx) => {
    const id = Number(ctx.match[1]);
    const user = await db("users")
      .where({id: ctx.from.id, is_admin: true})
      .first();
    if (!user)
      return ctx.answerCallbackQuery({
        text: "⛔ Только для админа",
        show_alert: true,
      });

    const source = await db("api_sources").where({id}).first();
    if (!source) return ctx.answerCallbackQuery({text: "❌ Не найдено"});

    await db("api_sources").where({id}).update({active: !source.active});
    await ctx.answerCallbackQuery({
      text: source.active ? "🔴 Отключено" : "🟢 Включено",
    });

    const sources = await db("api_sources").select();
    const keyboard = new InlineKeyboard();
    for (const src of sources) {
      const label = src.active ? `✅ ${src.base_url}` : `❌ ${src.base_url}`;
      keyboard.text(label, `toggle_api_${src.id}`).row();
    }

    try {
      await ctx.editMessageReplyMarkup({reply_markup: keyboard});
    } catch (_) {
      await ctx.reply("Обновление интерфейса не удалось. Попробуйте ещё раз.");
    }
  });
};

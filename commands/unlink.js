const db = require("../services/db");
const {InlineKeyboard} = require("grammy");
const {unlinkUser, getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.command("unlink", async (ctx) => {
    const fromId = ctx.from.id;
    const lang = await getUserLang(fromId);

    const admin = await db("users").where({id: fromId, is_admin: true}).first();
    if (!admin) return ctx.reply(t(lang, "unlink_menu.admin_only"));

    const users = await db("users")
      .select("id", "username")
      .where(function () {
        this.whereNotNull("athlete_id").orWhereNotNull("team_id");
      });

    if (users.length === 0) {
      return ctx.reply(t(lang, "unlink_menu.no_users"));
    }

    const keyboard = new InlineKeyboard();
    for (const user of users) {
      const displayName = `${user.username || ""}`.trim() || user.id;
      keyboard.text(displayName, `admin_unlink_${user.id}`).row();
    }

    await ctx.reply(t(lang, "unlink_menu.select_user"), {
      reply_markup: keyboard,
    });
  });

  bot.callbackQuery(/^admin_unlink_(\d+)$/, async (ctx) => {
    const fromId = ctx.from.id;
    const lang = await getUserLang(fromId);

    const admin = await db("users").where({id: fromId, is_admin: true}).first();
    if (!admin) {
      return ctx.answerCallbackQuery({
        text: t(lang, "unlink_menu.admin_only"),
        show_alert: true,
      });
    }

    const tgId = ctx.match[1];

    try {
      await unlinkUser(tgId);
      await ctx.answerCallbackQuery({
        text: t(lang, "unlink_menu.success_callback"),
      });

      await ctx.editMessageText(
        t(lang, "unlink_menu.success_edit").replace("${id}", tgId)
      );
    } catch (err) {
      console.error(err);
      await ctx.answerCallbackQuery({
        text: t(lang, "unlink_menu.error"),
        show_alert: true,
      });
    }
  });
};

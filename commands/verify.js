const {getUser, updateUser, getUserLang} = require("../services/userService");
const {logUserAction} = require("../services/logService");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.command("verify", async (ctx) => {
    const adminId = parseInt(process.env.ADMIN_ID);
    const isAdmin = ctx.from.id === adminId;
    const lang = await getUserLang(ctx.from.id);

    if (!isAdmin) {
      return ctx.reply(t(lang, "verify.not_admin"));
    }

    const parts = ctx.message.text.split(" ");
    if (parts.length !== 3) {
      return ctx.reply(t(lang, "verify.invalid_format"));
    }

    const userId = parseInt(parts[1]);
    const athleteId = parseInt(parts[2]);

    const user = await getUser(userId);
    if (!user) {
      return ctx.reply(t(lang, "verify.not_found"));
    }

    await updateUser(userId, {
      athlete_id: athleteId,
      verification_requested: false,
    });

    // логируем это действие
    await logUserAction(
      ctx.from.id,
      "verify_user",
      `user_id=${userId}, athlete_id=${athleteId}`
    );

    // уведомляем пользователя
    const userLang = await getUserLang(userId);
    await ctx.api.sendMessage(userId, t(userLang, "verify.notify_user"));

    await ctx.reply(
      t(lang, "verify.success")
        .replace("${username}", user.username || `user_${userId}`)
        .replace("${athlete_id}", athleteId)
    );
  });
};

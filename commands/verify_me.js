const db = require("../services/db");
const {
  isVerified,
  getUser,
  getUserLang,
  requestVerification,
} = require("../services/userService");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.command("verify_me", async (ctx) => {
    const userId = ctx.from.id;
    const user = await getUser(userId);
    const lang = await getUserLang(userId);

    if (!user) return ctx.reply(t(lang, "verify_me.not_registered"));

    const verified = await isVerified(userId);
    if (verified) return ctx.reply(t(lang, "verify_me.already_verified"));

    // Проверка на повторный запрос
    // if (user.last_verification_request) {
    //   const lastRequest = new Date(user.last_verification_request);
    //   const now = new Date();
    //   const diffMs = now - lastRequest;
    //   const diffHours = diffMs / (1000 * 60 * 60);

    //   if (diffHours < 2) {
    //     const minutesLeft = Math.ceil((2 - diffHours) * 60);
    //     return ctx.reply(
    //       `⏳ Вы уже отправляли запрос на верификацию.\nПовторно можно через ${minutesLeft} мин.\n\n⚖️ Если вы хотите обновить вес, используйте команду /set_weight`
    //     );
    //   }
    // }

    if (user.verification_requested) {
      return ctx.reply(t(lang, "verify_me.request_sent"));
    }

    ctx.session.state = "awaiting_full_name";
    return ctx.reply(t(lang, "verify_me.enter_name"), {
      parse_mode: "Markdown",
    });
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.session.state !== "awaiting_full_name") return;

    const fullName = ctx.message.text.trim();
    const userId = ctx.from.id;
    const lang = await getUserLang(userId);

    if (
      !/^[A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+ [A-Za-zА-Яа-яЁёІіЇїЄєҐґ']+$/.test(fullName)
    ) {
      return ctx.reply(t(lang, "verify_me.invalid_name"), {
        parse_mode: "Markdown",
      });
    }

    await db("users")
      .where({id: userId})
      .update({
        last_verification_request: new Date().toISOString(),
        meta: JSON.stringify({full_name: fullName}),
      });

    ctx.session.state = null;

    const userMetaCheck = await db("users").where({id: userId}).first();
    let parsedMeta;
    try {
      parsedMeta = userMetaCheck.meta ? JSON.parse(userMetaCheck.meta) : {};
    } catch {
      parsedMeta = {};
    }

    if (!parsedMeta.full_name) {
      return ctx.reply(t(lang, "verify_me.not_saved"));
    }

    const adminId = parseInt(process.env.ADMIN_ID);
    const clubs = await db("club").select("id", "name");

    const buttons = clubs.map((club) => [
      {
        text: club.name,
        callback_data: `verify_select_club_${userId}_${club.id}`,
      },
    ]);
    buttons.push([
      {
        text: t(lang, "verify_me.button_decline"),
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    function escapeMarkdownV2(text) {
      return text.replace(/[_*[\]()~`>#+=|{}.!\\]/g, "\\$&");
    }

    try {
      await bot.api.sendMessage(
        adminId,
        t(lang, "verify_me.request_admin", {
          id: userId,
          name: escapeMarkdownV2(fullName),
          username: escapeMarkdownV2(ctx.from.username || `user_${userId}`),
        }),
        {
          parse_mode: "MarkdownV2",
          reply_markup: {inline_keyboard: buttons},
        }
      );

      await ctx.reply(
        t(lang, "verify_me.request_success_user", {name: fullName}),
        {parse_mode: "Markdown"}
      );
    } catch (error) {
      console.error("❌ Ошибка при отправке сообщения админу:", error);

      await db("users")
        .where({id: userId})
        .update({
          meta: JSON.stringify({}),
        });

      await ctx.reply(t(lang, "verify_me.request_fail_user"));
    }
  });
};

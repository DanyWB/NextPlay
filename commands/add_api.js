const db = require("../services/db");
const {getUser, getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

module.exports = (bot) => {
  bot.command("add_api", async (ctx) => {
    const user = await getUser(ctx.from.id);
    const lang = await getUserLang(ctx);

    if (!user?.is_admin) {
      return ctx.reply("ONLY ADMIN");
    }

    ctx.session.apiSourceWizard = {
      step: 1,
      base_url: null,
      username: null,
      password: null,
    };

    await ctx.reply("Введите URL API:");
  });

  bot.on("message:text", async (ctx, next) => {
    const state = ctx.session.apiSourceWizard;
    const lang = await getUserLang(ctx);

    if (!state) return next();

    const input = ctx.message.text.trim();

    if (state.step === 1) {
      state.base_url = input;
      state.step = 2;
      return ctx.reply("Введите login - email:");
    }

    if (state.step === 2) {
      state.username = input;
      state.step = 3;
      return ctx.reply("Введите пароль:");
    }

    if (state.step === 3) {
      state.password = input;
      state.step = 4;

      await db("api_sources").insert({
        base_url: state.base_url,
        username: state.username,
        password: state.password,
        active: true,
      });

      ctx.session.apiSourceWizard = null;

      return ctx.reply("✅ Новый источник API успешно добавлен.");
    }
  });
};

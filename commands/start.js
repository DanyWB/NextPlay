const {createUserIfNotExists} = require("../services/userService");
const {logUserAction} = require("../services/logService");

module.exports = (bot) => {
  bot.command("start", async (ctx) => {
    const id = ctx.from.id;
    const username = ctx.from.username;

    await createUserIfNotExists(id, username);
    await logUserAction(id, "start", `username: @${username || "нет"}`);

    await ctx.reply("👋 Добро пожаловать! Вы зарегистрированы.");
  });
};

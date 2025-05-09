const {createUserIfNotExists} = require("../services/userService");
const {logUserAction} = require("../services/logService");
const {t} = require("../services/langService");
const {getUserLang, getUser} = require("../services/userService");
const {setUserCommands} = require("../utils/setUserCommands");

module.exports = (bot) => {
  bot.command("start", async (ctx) => {
    const id = ctx.from.id;
    const username = ctx.from.username;
    await createUserIfNotExists(id, username);

    await logUserAction(id, "start", `username: @${username || "нет"}`);

    const user = await getUser(id);
    const lang = await getUserLang(id);
    console.log("🔧 User language:", user);
    await setUserCommands(user, lang, bot);

    await ctx.reply(t(lang, "start.welcome"));

    const instruction = t(lang, "start.instruction").join("\n");
    await ctx.reply(instruction);
  });
};

const {setWaitingForWeight} = require("../services/weightStateService.js");

module.exports = (bot) => {
  bot.command("set_weight", async (ctx) => {
    const userId = ctx.from.id;
    setWaitingForWeight(userId);
    await ctx.reply("⚖️ Введите ваш вес в кг (например, 72.5):");
  });
};

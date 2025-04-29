require("dotenv").config();
const {Bot, session} = require("grammy");
const fs = require("fs");
const path = require("path");
const {syncData, startSyncLoop} = require("./connect");

const {updateUserWeight, setAdmin} = require("./services/userService");
const {
  isWaitingForWeight,
  clearWaitingForWeight,
} = require("./services/weightStateService.js");

// Инициализация бота
const bot = new Bot(process.env.BOT_TOKEN);

bot.use(
  session({
    initial: () => ({
      aspCompare: {}, // можно задать сразу
    }),
  })
);

// Загружаем все команды из папки commands/

require("./handlers/verify_action")(bot);
require("./handlers/asp_action")(bot);
require("./handlers/mpp_action")(bot);

const commandsPath = path.join(__dirname, "commands");

fs.readdirSync(commandsPath).forEach((file) => {
  if (file.endsWith(".js")) {
    const command = require(path.join(commandsPath, file));
    if (typeof command === "function") {
      command(bot); // передаём экземпляр бота в каждый обработчик
    }
  }
});

bot.on("message:text", async (ctx) => {
  const userId = ctx.from.id;

  if (!isWaitingForWeight(userId)) return;

  const input = parseFloat(ctx.message.text.replace(",", "."));
  if (isNaN(input) || input <= 0) {
    return ctx.reply("❌ Неверный формат. Попробуйте ещё раз.");
  }

  await updateUserWeight(userId, input);
  clearWaitingForWeight(userId);

  await ctx.reply(`✅ Вес ${input} кг сохранён.`);
});

bot.catch((err) => {
  console.error("❌ Ошибка в боте:", err);
});

(async () => {
  // Меню команд
  await bot.api.setMyCommands([
    {command: "start", description: "🔹 Зарегистрироваться в системе"},
    {command: "verify_me", description: "📥 Отправить запрос на верификацию"},
    {command: "me_status", description: "👤 Показать мой статус"},
    {command: "stats", description: "📊 Моя статистика"},
    {command: "set_weight", description: "⚖️ Установить/обновить вес"},
    {
      command: "verify",
      description: "✅ Верифицировать пользователя (только для админа)",
    },
    {
      command: "unlink",
      description: "❌ Отвязать пользователя (только для админа)",
    },
  ]);

  const adminId = process.env.ADMIN_ID;
  if (adminId) {
    await setAdmin(parseInt(adminId), "Admin");
  }
  // 🔁 Синхронизируем данные + запускаем автообновление
  const intervalMin = parseInt(process.env.SYNC_INTERVAL_MINUTES || "10", 10);
  startSyncLoop(intervalMin * 60 * 1000);
  //syncData();
  bot.start().then(() => console.log("🤖 Бот запущен и ожидает команды..."));
})();

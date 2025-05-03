require("dotenv").config();
const {Bot, session} = require("grammy");
const fs = require("fs");
const path = require("path");
const {syncData, startSyncLoop} = require("./connect");

const {setAdmin} = require("./services/userService");

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
    {command: "stats_matches", description: "📊 Моя Матчи"},
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

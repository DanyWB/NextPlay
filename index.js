require("dotenv").config();
const {Bot, session} = require("grammy");
const fs = require("fs");
const path = require("path");
const {syncData, syncOnce} = require("./connect");
const cron = require("node-cron");

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
require("./handlers/index_action")(bot);
require("./handlers/rpe_stats")(bot);
require("./handlers/rpe_handler")(bot);

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
  // await bot.api.setMyCommands(
  //   [{command: "start", description: "Start the bot"}],
  //   {
  //     scope: {type: "default"},
  //   }
  // );
  const adminId = process.env.ADMIN_ID;
  if (adminId) {
    await setAdmin(parseInt(adminId), "Admin");
  }
  // 🔁 Синхронизируем данные + запускаем автообновление
  // Запуск каждый день в 03:00
  cron.schedule("0 1 * * *", () => {
    console.log("🔁Плановая синхронизация в 03:00");
    syncOnce(); // или конкретная функция типа syncOnce()
  });
  bot.start().then(() => console.log("🤖 Бот запущен и ожидает команды..."));
})();

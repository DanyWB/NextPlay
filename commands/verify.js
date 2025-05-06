const db = require("../services/db");
const {logUserAction} = require("../services/logService");

module.exports = (bot) => {
  bot.command("verify", async (ctx) => {
    const fromId = ctx.from.id;

    // Проверка: админ?
    const admin = await db("users").where({id: fromId, is_admin: true}).first();
    if (!admin) return ctx.reply("🚫 Только для администраторов");

    // Получаем список неверифицированных пользователей
    const users = await db("users").whereNull("athlete_id");

    if (users.length === 0) {
      return ctx.reply("🎉 Нет пользователей, ожидающих верификацию.");
    }

    const buttons = users.map((u) => {
      let fullName = "Имя не указано";

      try {
        const meta = u.meta ? JSON.parse(u.meta) : {};
        if (meta.full_name) fullName = meta.full_name;
      } catch (err) {
        console.error("Ошибка парсинга meta:", err);
      }

      return [
        {
          text: `${fullName} (@${u.username || "без username"}, ${u.id})`,
          callback_data: `verify_select_user_${u.id}`,
        },
      ];
    });

    await ctx.reply("👤 Выберите пользователя для верификации:", {
      reply_markup: {inline_keyboard: buttons},
    });

    await logUserAction(fromId, "verify_list_users", "listed unverified users");
  });
};

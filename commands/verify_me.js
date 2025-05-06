const db = require("../services/db");
const {isVerified, getUser} = require("../services/userService");

module.exports = (bot) => {
  bot.command("verify_me", async (ctx) => {
    const userId = ctx.from.id;
    const user = await getUser(userId);

    if (!user)
      return ctx.reply("⚠️ Вы ещё не зарегистрированы. Отправьте /start.");

    const verified = await isVerified(userId);
    if (verified) return ctx.reply("✅ Вы уже верифицированы.");

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

    // Переход к этапу ввода ФИО
    ctx.session.state = "awaiting_full_name";
    return ctx.reply(
      "📝 Пожалуйста, введите ваше *Имя и Фамилию* через пробел (например: Иван Петров)",
      {
        parse_mode: "Markdown",
      }
    );
  });

  bot.on("message:text", async (ctx) => {
    if (ctx.session.state !== "awaiting_full_name") return;

    const fullName = ctx.message.text.trim();
    const userId = ctx.from.id;

    if (!/^[A-Za-zА-Яа-яЁё]+ [A-Za-zА-Яа-яЁё]+$/.test(fullName)) {
      return ctx.reply(
        "⚠️ Пожалуйста, введите имя и фамилию *через пробел* (например: Иван Петров)",
        {
          parse_mode: "Markdown",
        }
      );
    }

    // Сохраняем meta и дату запроса
    await db("users")
      .where({id: userId})
      .update({
        last_verification_request: new Date().toISOString(),
        meta: JSON.stringify({full_name: fullName}),
      });

    ctx.session.state = null;

    // Дополнительная проверка: имя сохранено?
    const userMetaCheck = await db("users").where({id: userId}).first();
    let parsedMeta;
    try {
      parsedMeta = userMetaCheck.meta ? JSON.parse(userMetaCheck.meta) : {};
    } catch {
      parsedMeta = {};
    }

    if (!parsedMeta.full_name) {
      return ctx.reply(
        "❌ Не удалось сохранить Имя и Фамилию. Пожалуйста, попробуйте ещё раз командой /verify_me."
      );
    }

    // Отправка запроса админу
    const adminId = parseInt(process.env.ADMIN_ID);
    const clubs = await db("club").select("id", "name");

    const buttons = clubs.map((club) => [
      {
        text: club.name,
        callback_data: `verify_select_club_${userId}_${club.id}`,
      },
    ]);
    buttons.push([
      {text: "❌ Отклонить", callback_data: `verify_decline_${userId}`},
    ]);

    function escapeMarkdownV2(text) {
      return text.replace(/[_*[\]()~`>#+=|{}.!\\]/g, "\\$&");
    }

    try {
      await bot.api.sendMessage(
        adminId,
        `📥 *Запрос на верификацию*\n👤 Telegram ID: \`${userId}\`\n📛 Имя и Фамилия: *${escapeMarkdownV2(
          fullName
        )}*\n🔹 Username: @${escapeMarkdownV2(
          ctx.from.username || `user_${userId}`
        )}\n\nВыберите клуб, к которому относится пользователь:`,
        {
          parse_mode: "MarkdownV2",
          reply_markup: {inline_keyboard: buttons},
        }
      );

      // Успешно отправлено админу → сообщаем пользователю
      await ctx.reply(
        `✅ Спасибо, *${fullName}*.\n🕓 Ваш запрос на верификацию успешно отправлен. Ожидайте ответа администратора.`,
        {parse_mode: "Markdown"}
      );
    } catch (error) {
      console.error("❌ Ошибка при отправке сообщения админу:", error);

      // Очищаем meta.full_name
      await db("users")
        .where({id: userId})
        .update({
          meta: JSON.stringify({}),
        });

      await ctx.reply(
        "🚫 Не удалось отправить запрос администратору. Попробуйте снова позже командой /verify_me."
      );
    }

    //
  });
};

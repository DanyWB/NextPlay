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

    // ⛔ Ограничение на повторный запрос — 2 часа
    if (user.last_verification_request) {
      const lastRequest = new Date(user.last_verification_request);
      const now = new Date();
      const diffMs = now - lastRequest;
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 2) {
        const minutesLeft = Math.ceil((2 - diffHours) * 60);
        return ctx.reply(
          `⏳ Вы уже отправляли запрос на верификацию.\nПовторно можно через ${minutesLeft} мин.\n\n⚖️ Если вы хотите обновить вес, используйте команду /set_weight`
        );
      }
    }

    // Обновляем время последнего запроса
    await db("users")
      .where({id: userId})
      .update({last_verification_request: new Date().toISOString()});

    await ctx.reply(
      "🕓 Запрос на верификацию отправлен. Ожидайте ответа администратора."
    );

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
      return text.replace(/[_*[\]()~`>#+=|{}.!\\]/g, "\\$&"); // экранируем все важные символы
    }

    await bot.api.sendMessage(
      adminId,
      `📥 *Запрос на верификацию*\n👤 Telegram ID: \`${userId}\`\n🔹 Username: @${escapeMarkdownV2(
        user.username || `user_${userId}`
      )}\n\nВыберите клуб, к которому относится пользователь:`,
      {
        parse_mode: "Markdown",
        reply_markup: {inline_keyboard: buttons},
      }
    );
  });
};

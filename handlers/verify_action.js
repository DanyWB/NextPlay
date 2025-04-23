const {
  getUnverifiedUsers,
  verifyUser,
  declineUser,
  getUserById,
  getAllClubs,
} = require("../services/userService");
const {
  getAthletesByClubId,
  searchAthletesByName,
  getAthleteById,
} = require("../services/athleteService");
const {
  getVerifyContext,
  updateVerifyContext,
  clearVerifyContext,
} = require("../services/stateService");
const {logAdminAction} = require("../services/logService");

module.exports = (bot) => {
  console.log("✅ verify_action.js инициализация началась...");

  // /verify — начать выбор пользователя
  bot.command("verify", async (ctx) => {
    const fromId = ctx.from.id;
    const user = await getUserById(fromId);
    if (!user?.is_admin) return ctx.reply("❌ У вас нет прав администратора");

    const unverifiedUsers = await getUnverifiedUsers();
    if (!unverifiedUsers.length)
      return ctx.reply("✅ Нет пользователей, ожидающих верификацию.");

    const buttons = unverifiedUsers.map((u) => [
      {
        text: `${u.username} (${u.id})`,
        callback_data: `verify_select_user_${u.id}`,
      },
    ]);

    await ctx.reply("Выберите пользователя для верификации:", {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  // Шаг 1: Выбор пользователя
  bot.callbackQuery(/^verify_select_user_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    updateVerifyContext(ctx.from.id, {
      stage: "select_club",
      userId,
    });

    const clubs = await getAllClubs();
    const buttons = clubs.map((club) => [
      {
        text: club.name,
        callback_data: `verify_select_club_${userId}_${club.id}`,
      },
    ]);

    buttons.push([
      {
        text: "❌ Отклонить",
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    await ctx.editMessageText(
      `📥 *Запрос на верификацию*\n👤 Telegram ID: \`${userId}\`\n\nВыберите клуб, к которому относится пользователь:`,
      {
        parse_mode: "Markdown",
        reply_markup: {inline_keyboard: buttons},
      }
    );
  });

  // Шаг 2: Выбор клуба
  bot.callbackQuery(/^verify_select_club_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const clubId = parseInt(ctx.match[2]);

    updateVerifyContext(ctx.from.id, {
      stage: "select_athlete",
      userId,
      clubId,
    });

    const athletes = await getAthletesByClubId(clubId);
    if (!athletes.length)
      return ctx.reply("🙁 Нет доступных атлетов в этом клубе.");

    const buttons = athletes.slice(0, 20).map((athlete) => [
      {
        text: `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim(),
        callback_data: `verify_final_${userId}_${athlete.id}`,
      },
    ]);

    buttons.push([
      {
        text: "🔙 Назад",
        callback_data: `verify_back_club_${userId}`,
      },
    ]);

    await ctx.editMessageText("Выберите атлета для привязки:", {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  // Шаг 2.1: Назад к выбору клуба
  bot.callbackQuery(/^verify_back_club_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const clubs = await getAllClubs();

    const clubButtons = clubs.map((club) => [
      {
        text: club.name,
        callback_data: `verify_select_club_${userId}_${club.id}`,
      },
    ]);

    clubButtons.push([
      {
        text: "❌ Отклонить",
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    await ctx.editMessageText(
      `📥 *Запрос на верификацию*\n👤 Telegram ID: \`${userId}\`\n\nВыберите клуб, к которому относится пользователь:`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: clubButtons,
        },
      }
    );

    updateVerifyContext(ctx.from.id, {stage: "select_club", userId});
  });

  // Шаг 3: Привязка к атлету
  bot.callbackQuery(/^verify_final_(\d+)_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);
    const athleteId = parseInt(ctx.match[2]);

    await verifyUser(userId, athleteId);
    clearVerifyContext(ctx.from.id);

    const athlete = await getAthleteById(athleteId);

    await ctx.editMessageText(
      `✅ Пользователь \`${userId}\` успешно привязан к атлету *${athlete.first_name} ${athlete.last_name}* (ID: ${athleteId})`,
      {parse_mode: "Markdown"}
    );

    await logAdminAction(
      ctx.from.id,
      `Верифицировал пользователя ${userId} как атлета ${athleteId}`
    );
  });

  // Отклонить
  bot.callbackQuery(/^verify_decline_(\d+)$/, async (ctx) => {
    const userId = parseInt(ctx.match[1]);

    await declineUser(userId);
    clearVerifyContext(ctx.from.id);

    await ctx.editMessageText(
      `🚫 Запрос пользователя \`${userId}\` отклонён.`,
      {parse_mode: "Markdown"}
    );

    await logAdminAction(ctx.from.id, `Отклонил запрос пользователя ${userId}`);
  });

  // Поиск по имени на этапе выбора атлета
  bot.on("message:text", async (ctx, next) => {
    const state = getVerifyContext(ctx.from.id);
    if (!state || state.stage !== "select_athlete") return await next();

    const query = ctx.message.text.trim();
    if (query.length < 2) {
      return ctx.reply("❗ Введите хотя бы 2 символа.");
    }

    const athletes = await searchAthletesByName(query, state.clubId);
    if (athletes.length === 0) {
      return ctx.reply("🙁 Атлетов не найдено, попробуйте другое имя.");
    }

    const buttons = athletes.slice(0, 20).map((athlete) => [
      {
        text: `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim(),
        callback_data: `verify_final_${state.userId}_${athlete.id}`,
      },
    ]);

    buttons.push([
      {
        text: "🔙 Назад",
        callback_data: `verify_back_club_${state.userId}`,
      },
    ]);

    await ctx.reply("🔍 Найденные атлеты:", {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  console.log("✅ verify_action.js завершён успешно.");
};

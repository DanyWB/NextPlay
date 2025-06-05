const {
  getUnverifiedUsers,
  verifyUser,
  verifyCoach,
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
const db = require("../services/db");
const {getUserLang, getUser} = require("../services/userService");
const {t} = require("../services/langService");
const {setUserCommands} = require("../utils/setUserCommands");

module.exports = (bot) => {
  console.log("✅ verify_action.js инициализация началась...");

  bot.command("verify", async (ctx) => {
    const fromId = ctx.from.id;
    const lang = await getUserLang(ctx);
    const user = await getUserById(fromId);
    if (!user?.is_admin) return ctx.reply(t(lang, "verify_action.admin_only"));

    const unverifiedUsers = await getUnverifiedUsers();
    if (!unverifiedUsers.length)
      return ctx.reply(t(lang, "verify_action.no_requests"));

    const buttons = unverifiedUsers.map((u) => [
      {
        text: `${u.username} (${u.id})`,
        callback_data: `verify_select_user_${u.id}`,
      },
    ]);

    await ctx.reply(t(lang, "verify_action.select_user"), {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  bot.callbackQuery(/^verify_select_user_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
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
        text: t(lang, "verify_action.btn_decline"),
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    buttons.push([
      {
        text: "\ud83c\udf93 Назначить тренером",
        callback_data: `verify_select_team_${userId}`,
      },
    ]);

    await ctx.editMessageText(
      t(lang, "verify_action.request_title", {id: userId}),
      {
        parse_mode: "Markdown",
        reply_markup: {inline_keyboard: buttons},
      }
    );
  });

  bot.callbackQuery(/^verify_select_club_(\d+)_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const userId = parseInt(ctx.match[1]);
    const clubId = parseInt(ctx.match[2]);

    updateVerifyContext(ctx.from.id, {
      stage: "select_athlete",
      userId,
      clubId,
    });

    const athletes = await getAthletesByClubId(clubId);
    if (!athletes.length)
      return ctx.reply(t(lang, "verify_action.no_athletes"));

    const buttons = athletes.map((athlete) => [
      {
        text: `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim(),
        callback_data: `verify_final_${userId}_${athlete.id}`,
      },
    ]);

    buttons.push([
      {
        text: t(lang, "verify_action.btn_back"),
        callback_data: `verify_back_club_${userId}`,
      },
    ]);

    await ctx.editMessageText(t(lang, "verify_action.select_athlete"), {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  bot.callbackQuery(/^verify_back_club_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
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
        text: t(lang, "verify_action.btn_decline"),
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    await ctx.editMessageText(
      t(lang, "verify_action.request_title", {id: userId}),
      {
        parse_mode: "Markdown",
        reply_markup: {inline_keyboard: clubButtons},
      }
    );

    updateVerifyContext(ctx.from.id, {stage: "select_club", userId});
  });

  bot.callbackQuery(/^verify_final_(\d+)_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);

    const userId = parseInt(ctx.match[1]);
    const athleteId = parseInt(ctx.match[2]);
    const userLang = await getUserLang(userId);
    const user = await getUser(userId);

    await verifyUser(userId, athleteId);
    await setUserCommands(user, userLang, bot);
    clearVerifyContext(ctx.from.id);

    const athlete = await getAthleteById(athleteId);

    try {
      await bot.api.sendMessage(
        userId,
        t(userLang, "verify_action.notify_user_success")
      );
    } catch (error) {
      console.error("\u274c Не удалось уведомить пользователя:", error);
    }

    await ctx.editMessageText(
      t(lang, "verify_action.verify_success", {
        id: userId,
        name: `${athlete.first_name} ${athlete.last_name}`,
        athleteId,
      }),
      {parse_mode: "Markdown"}
    );

    await logAdminAction(
      ctx.from.id,
      `Верифицировал пользователя ${userId} как атлета ${athleteId}`
    );
  });

  bot.callbackQuery(/^verify_decline_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const userId = parseInt(ctx.match[1]);

    await declineUser(bot, userId);
    clearVerifyContext(ctx.from.id);

    await db("users")
      .where({id: userId})
      .update({meta: JSON.stringify({})});

    await ctx.editMessageText(
      t(lang, "verify_action.decline_success", {id: userId}),
      {parse_mode: "Markdown"}
    );

    await logAdminAction(ctx.from.id, `Отклонил запрос пользователя ${userId}`);
  });

  bot.callbackQuery(/^verify_select_team_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const userId = Number(ctx.match[1]);

    updateVerifyContext(ctx.from.id, {
      stage: "select_team",
      userId,
    });

    const teams = await db("team").select("id", "name");
    const buttons = teams.map((team) => [
      {
        text: team.name,
        callback_data: `verify_confirm_coach_${userId}_${team.id}`,
      },
    ]);

    buttons.push([
      {
        text: t(lang, "verify_action.btn_decline"),
        callback_data: `verify_decline_${userId}`,
      },
    ]);

    await ctx.editMessageText(t(lang, "verify_action.select_team"), {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  bot.callbackQuery(/^verify_confirm_coach_(\d+)_(\d+)$/, async (ctx) => {
    const lang = await getUserLang(ctx);
    const userId = Number(ctx.match[1]);
    const teamId = Number(ctx.match[2]);
    const user = await getUser(userId);
    const userLang = await getUserLang(userId);

    await verifyCoach(userId, teamId);
    await setUserCommands(user, userLang, bot);
    clearVerifyContext(ctx.from.id);

    await bot.api.sendMessage(
      userId,
      t(userLang, "verify_action.notify_user_success")
    );

    await ctx.editMessageText(
      t(lang, "verify_action.verify_success_coach", {id: userId, teamId}),
      {parse_mode: "Markdown"}
    );

    await logAdminAction(
      ctx.from.id,
      `Верифицировал пользователя ${userId} как тренера команды ${teamId}`
    );
  });

  bot.on("message:text", async (ctx, next) => {
    const lang = await getUserLang(ctx);
    const state = getVerifyContext(ctx.from.id);
    if (!state || state.stage !== "select_athlete") return await next();

    const query = ctx.message.text.trim();
    if (query.length < 2) {
      return ctx.reply(t(lang, "verify_action.enter_min_chars"));
    }

    const athletes = await searchAthletesByName(query, state.clubId);
    if (athletes.length === 0) {
      return ctx.reply(t(lang, "verify_action.not_found"));
    }

    const buttons = athletes.slice(0, 20).map((athlete) => [
      {
        text: `${athlete.first_name || ""} ${athlete.last_name || ""}`.trim(),
        callback_data: `verify_final_${state.userId}_${athlete.id}`,
      },
    ]);

    buttons.push([
      {
        text: t(lang, "verify_action.btn_back"),
        callback_data: `verify_back_club_${state.userId}`,
      },
    ]);

    await ctx.reply(t(lang, "verify_action.found_athletes"), {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  console.log("✅ verify_action.js завершён успешно.");
};

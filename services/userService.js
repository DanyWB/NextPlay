const db = require("./db");
const HEAD_COACH_IDS = [994060036];
async function createUserIfNotExists(id, username) {
  const safeUsername = username || `user_${id}`;
  const user = await db("users").where({id}).first();

  if (!user) {
    await db("users").insert({
      id,
      username: safeUsername,
      is_admin: false,
      created_at: new Date().toISOString(),
    });
    console.log(`✅ Новый пользователь: ${safeUsername}`);
  } else if (user.username !== safeUsername) {
    await db("users").where({id}).update({username: safeUsername});
    console.log(`🔄 Username обновлён: ${user.username} → ${safeUsername}`);
  }
}
async function getUserById(id) {
  return db("users").where({id}).first();
}
async function getUnverifiedUsers() {
  return await db("users").whereNull("athlete_id");
}

async function getAllClubs() {
  return await db("club").select("id", "name");
}

async function setAdmin(id, username = null) {
  const safeUsername = username || `user_${id}`;
  const user = await db("users").where({id}).first();

  if (!user) {
    await db("users").insert({
      id,
      username: safeUsername,
      is_admin: true,
      created_at: new Date().toISOString(),
    });
    console.log(`👑 Админ ${safeUsername} создан`);
  } else if (!user.is_admin) {
    await db("users").where({id}).update({is_admin: true});
    console.log(`👑 Админ ${safeUsername} обновлён`);
  }
}

async function verifyUser(id, athlete_id) {
  await db("users").where({id}).update({
    athlete_id,
    verified_at: new Date().toISOString(),
  });
  console.log(`✅ Пользователь ${id} верифицирован с athlete_id ${athlete_id}`);
}

async function unlinkUser(userId) {
  await db("users").where({id: userId}).update({
    athlete_id: null,
    team_id: null,
    role: "user",
    verified_at: null,
  });
}

async function isAdmin(id) {
  const user = await db("users").where({id}).first();
  return user?.is_admin == true;
}

async function isVerified(id) {
  const user = await db("users").where({id}).first();
  return !!user?.athlete_id;
}

async function getUser(id) {
  return await db("users").where({id}).first();
}
async function getFullUser(id) {
  const user = await db("users").where({id}).first();
  if (!user) return null;

  return {
    ...user,
    isHeadCoach: HEAD_COACH_IDS.includes(user.id),
    athleteId: user.athlete_id || null,
    teamId: user.team_id || null,
    role: user.role || "user",
  };
}
async function getAthleteIdsForUser(user) {
  if (user.isHeadCoach) {
    const rows = await db("athlete")
      .join("player", "athlete.id", "player.athlete")
      .whereNotNull("player.playingrole")
      .select("athlete.id as athlete_id");
    return rows.map((row) => row.athlete_id);
  }

  if (user.role === "coach" && user.teamId) {
    return await db("player")
      .where({team: user.teamId})
      .whereNotNull("playingrole")
      .pluck("athlete");
  }

  if (user.role === "user" && user.athleteId) {
    return [user.athleteId];
  }

  return [];
}

async function getUserByAthleteId(athleteId) {
  return await db("users").where({athlete_id: athleteId}).first();
}

async function declineUser(bot, telegramId) {
  try {
    await bot.api.sendMessage(
      telegramId,
      "❌ Ваша заявка на верификацию была отклонена.\nВы можете попробовать снова, возможно вы ввели неверные Имя и Фамилию."
    );
  } catch (err) {
    console.warn(
      `⚠️ Не удалось отправить сообщение пользователю ${telegramId}:`,
      err.message
    );
  }
}

async function getLinkedUsers() {
  return await db("users").select("id", "username").whereNotNull("athlete_id");
}
async function setUserLang(input, lang) {
  if (typeof input === "object" && input.from?.id) {
    const ctx = input;

    // обновим в сессии
    if (ctx.session) ctx.session.lang = lang;

    // обновим в базе
    await db("users").where({id: ctx.from.id}).update({lang});
    return;
  }

  if (typeof input === "number") {
    await db("users").where({id: input}).update({lang});
    return;
  }

  throw new Error("setUserLang: ожидался либо ctx, либо userId");
}
async function getUserLang(input) {
  // Если передан ctx — пробуем из session
  if (typeof input === "object" && input.from?.id) {
    const ctx = input;

    if (ctx.session?.lang) return ctx.session.lang;

    const user = await db("users").where({id: ctx.from.id}).first();
    const lang = user?.lang || "ru";

    if (ctx.session) ctx.session.lang = lang;
    return lang;
  }

  // Иначе считаем, что передан userId
  if (typeof input === "number") {
    const user = await db("users").where({id: input}).first();
    return user?.lang || "ru";
  }

  return "ru"; // fallback
}
async function verifyCoach(userId, teamId) {
  await db("users").where({id: userId}).update({
    role: "coach",
    team_id: teamId,
    athlete_id: null,
    verified_at: new Date().toISOString(),
  });

  console.log(`✅ Тренер ${userId} верифицирован с командой ${teamId}`);
}

module.exports = {
  createUserIfNotExists,
  getUnverifiedUsers,
  getUserById,
  setAdmin,
  verifyUser,
  isAdmin,
  isVerified,
  getUser,
  getAllClubs,
  getUserByAthleteId,
  declineUser,
  unlinkUser,
  getLinkedUsers,
  setUserLang,
  getUserLang,
  getFullUser,
  getAthleteIdsForUser,
  verifyCoach,
};

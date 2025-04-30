const db = require("./db");

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

async function unlinkUserFromAthlete(userId) {
  await db("users").where({id: userId}).update({
    athlete_id: null,
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

async function getUserByAthleteId(athleteId) {
  return await db("users").where({athlete_id: athleteId}).first();
}

async function declineUser(bot, telegramId) {
  try {
    await bot.api.sendMessage(
      telegramId,
      "❌ Ваша заявка на верификацию была отклонена.\nВы можете попробовать снова позже или обратиться к администратору."
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
  unlinkUserFromAthlete,
  getLinkedUsers,
};

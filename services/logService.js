const db = require("./db");

/**
 * Логирует действие пользователя в таблицу `user_logs`
 * @param {number} user_id - Telegram ID пользователя
 * @param {string} action - Тип действия (например, 'start', 'verify', 'sync', 'error')
 * @param {string|null} details - Дополнительная информация (может быть JSON.stringify(...))
 */
async function logUserAction(user_id, action, details = null) {
  try {
    await db("user_logs").insert({
      user_id,
      action,
      details,
      created_at: new Date().toISOString(),
    });
    console.log(`📘 [ЛОГ] ${user_id}: ${action}`);
  } catch (err) {
    console.error(
      `❌ Ошибка логирования действия пользователя ${user_id}:`,
      err.message
    );
  }
}
async function logAdminAction(admin_id, action, details) {
  return await db("admin_logs").insert({
    admin_id,
    action,
    details: typeof details === "string" ? details : JSON.stringify(details),
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  logUserAction,
  logAdminAction,
};

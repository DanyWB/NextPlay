const {getUser} = require("../services/userService");
const {getAthleteById, getClubById} = require("../services/athleteService");

function escapeMarkdown(text) {
  return String(text)
    .replace(/\\/g, "\\\\") // первым — экранируем саму обратную косую
    .replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&")
    .replace(/\+/g, "\\+"); // также экранируем "+"
}

module.exports = (bot) => {
  bot.command("me_status", async (ctx) => {
    const id = ctx.from.id;

    const user = await getUser(id);
    if (!user) {
      return ctx.reply("⚠️ Вы ещё не зарегистрированы. Отправьте /start.");
    }

    const username = user.username || `user_${user.id}`;
    let status = "❌ Не верифицирован";
    let clubName = "";

    if (user.athlete_id) {
      const athlete = await getAthleteById(user.athlete_id);
      const name = athlete
        ? `${athlete.last_name || ""} ${athlete.first_name || ""}`.trim()
        : `ID ${user.athlete_id}`;
      status = `✅ Верифицирован \\(${escapeMarkdown(name)}\\)`;

      if (athlete?.club) {
        const club = await getClubById(athlete.club);
        if (club?.name) {
          clubName = club.name;
        }
      }
    }

    if (user.is_admin) {
      status = `👑 Админ${
        user.athlete_id
          ? ` \\+ верифицирован \\(${escapeMarkdown(
              status.split("(")[1] || ""
            )}`
          : ""
      }`;
    }

    let message =
      `👤 *Ваш профиль*\n` +
      `🆔 ID: \`${user.id}\`\n` +
      `📌 Username: @${escapeMarkdown(username)}\n` +
      `📌 Статус: ${status}`;

    if (clubName) {
      message += `\n🏟️ Клуб: *${escapeMarkdown(clubName)}*`;
    }

    await ctx.reply(message, {parse_mode: "MarkdownV2"});
  });
};

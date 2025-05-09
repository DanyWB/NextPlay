const {getUser} = require("../services/userService");
const {getAthleteById, getClubById} = require("../services/athleteService");
const {getUserLang} = require("../services/userService");
const {t} = require("../services/langService");

function escapeMarkdown(text) {
  return text.replace(/([\[\]()*_~`>#+=|{}.!\\\-])/g, "\\$1");
}
module.exports = (bot) => {
  bot.command("me_status", async (ctx) => {
    const id = ctx.from.id;
    const user = await getUser(id);

    if (!user) {
      const lang = "ru"; // на случай если нет пользователя
      return ctx.reply(t(lang, "me_status.not_registered"));
    }

    const lang = await getUserLang(id);
    const username = user.username || `user_${user.id}`;
    let status = t(lang, "me_status.status.unverified");
    let clubName = "";

    if (user.athlete_id) {
      const athlete = await getAthleteById(user.athlete_id);
      const name = athlete
        ? `${athlete.last_name || ""} ${athlete.first_name || ""}`.trim()
        : `ID ${user.athlete_id}`;
      status = t(lang, "me_status.status.verified", {
        name: escapeMarkdown(name),
      });

      if (athlete?.club) {
        const club = await getClubById(athlete.club);
        if (club?.name) {
          clubName = club.name;
        }
      }
    }

    if (user.is_admin) {
      let verifiedName = "";
      if (user.athlete_id) {
        const nameMatch = status.match(/\((.*)\)/);
        verifiedName = nameMatch?.[1] || "";
      }

      const rawExtra = user.athlete_id ? ` + ${verifiedName}` : "";
      const rawStatus = t(lang, "me_status.status.admin", {
        extra: rawExtra,
      });
      status = rawStatus; // НЕ экранируем — делаем это позже
    }

    let message =
      `${t(lang, "me_status.title")}\n` +
      `${t(lang, "me_status.id", {id: user.id})}\n` +
      `${t(lang, "me_status.username", {
        username: escapeMarkdown(username),
      })}\n` +
      `${t(lang, "me_status.status_label", {
        status: escapeMarkdown(status),
      })}`;

    if (clubName) {
      message += `\n${t(lang, "me_status.club", {
        club: escapeMarkdown(clubName),
      })}`;
    }

    await ctx.reply(message, {parse_mode: "MarkdownV2"});
  });
};

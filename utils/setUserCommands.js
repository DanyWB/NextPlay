// utils/setUserCommands.js
const {t} = require("../services/langService");
const {getFullUser} = require("../services/userService");
async function setUserCommands(user, lang, bot) {
  const isAthlete = !!user.athlete_id;
  const isCoach = user.role === "coach";
  const {isHeadCoach} = await getFullUser(user.id);
  console.log(getFullUser(user.id));
  let commands = [
    {command: "start", description: t(lang, "commands.start")},
    {command: "set_lang", description: t(lang, "commands.set_lang")},
  ];

  if (!isAthlete && !isCoach) {
    // не верифицирован
    commands.push({
      command: "verify_me",
      description: t(lang, "commands.verify_me"),
    });
  }

  if (isAthlete || isCoach || isHeadCoach) {
    console.log("1111");
    commands.push(
      {command: "stats", description: t(lang, "commands.stats")},
      {
        command: "stats_matches",
        description: t(lang, "commands.stats_matches"),
      },
      {command: "my_index", description: t(lang, "commands.my_index")},
      {command: "me_status", description: t(lang, "commands.me_status")}
    );
  }

  if (user.is_admin) {
    // админ
    commands.push(
      {command: "unlink", description: t(lang, "commands.unlink")},
      {command: "verify", description: t(lang, "commands.verify")},
      {command: "add_api", description: "Добавить АПИ"},
      {command: "toggle_api", description: "Вкл / Выкл Апи"}
    );
  }

  await Promise.all([
    bot.api.deleteMyCommands({
      scope: {type: "chat", chat_id: user.id},
      language_code: "ru",
    }),
    bot.api.deleteMyCommands({
      scope: {type: "chat", chat_id: user.id},
      language_code: "uk",
    }),
    bot.api.deleteMyCommands({
      scope: {type: "chat", chat_id: user.id},
      language_code: "ua",
    }),
    bot.api.deleteMyCommands({scope: {type: "chat", chat_id: user.id}}), // без языка — новый вариант
  ]);
  await bot.api.setMyCommands(commands, {
    scope: {type: "chat", chat_id: user.id},
  });
}

module.exports = {setUserCommands};

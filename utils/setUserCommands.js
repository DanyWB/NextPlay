// utils/setUserCommands.js
const {t} = require("../services/langService");

async function setUserCommands(user, lang, bot) {
  let commands = [
    {command: "start", description: t(lang, "commands.start")},
    {command: "set_lang", description: t(lang, "commands.set_lang")},
  ];

  if (!user.athlete_id) {
    // не верифицирован
    commands.push({
      command: "verify_me",
      description: t(lang, "commands.verify_me"),
    });
  }

  if (user.athlete_id) {
    // верифицированный пользователь
    commands.push(
      {command: "stats", description: t(lang, "commands.stats")},
      {
        command: "stats_matches",
        description: t(lang, "commands.stats_matches"),
      },
      {command: "me_status", description: t(lang, "commands.me_status")},
      {command: "my_index", description: t(lang, "commands.my_index")}
    );
  }

  if (user.is_admin) {
    // админ
    commands.push(
      {command: "unlink", description: t(lang, "commands.unlink")},
      {command: "verify", description: t(lang, "commands.verify")}
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

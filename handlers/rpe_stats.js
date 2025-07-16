const db = require("../services/db");
const HEAD_COACH_IDS = [994060036];
// Сценарий: тренер вызывает /rpe_stats
module.exports = function setupRpeStatsCommand(bot) {
  bot.command("rpe_stats", async (ctx) => {
    const telegramId = ctx.from.id;

    // Получаем инфу о пользователе
    const user = await db("users").where({id: telegramId}).first();
    if (!user) return ctx.reply("Вы не зарегистрированы в системе.");

    // Определяем список доступных игроков для тренера
    let athleteList;
    if (user.id == HEAD_COACH_IDS) {
      // Главный тренер видит всех спортсменов с привязкой
      athleteList = await db("athlete")
        .join("athlete_rpe", "athlete.id", "athlete_rpe.athlete_id")
        .distinct(
          "athlete.id as athlete_id",
          "athlete.first_name",
          "athlete.last_name"
        );
    } else if (user.role === "coach" && user.team_id) {
      // Обычный тренер — только игроков своей команды
      athleteList = await db("player")
        .where({team: user.team_id})
        .join("athlete", "player.athlete", "athlete.id")
        .join("athlete_rpe", "athlete.id", "athlete_rpe.athlete_id")
        .distinct(
          "athlete.id as athlete_id",
          "athlete.first_name",
          "athlete.last_name"
        );
    } else {
      return ctx.reply("У вас нет прав для просмотра этой статистики.");
    }

    if (!athleteList || athleteList.length === 0) {
      return ctx.reply("Нет доступных игроков.");
    }

    // Выбор игрока через inline-кнопки (по 3 в ряд)
    const buttons = [];
    for (let i = 0; i < athleteList.length; i += 3) {
      buttons.push(
        athleteList.slice(i, i + 3).map((a) => ({
          text: (a.first_name || "") + " " + (a.last_name || ""),
          callback_data: `rpe_stat_player_${a.athlete_id}`,
        }))
      );
    }

    await ctx.reply("Выберите игрока для просмотра RPE:", {
      reply_markup: {inline_keyboard: buttons},
    });
  });

  // Обработка выбора игрока
  bot.callbackQuery(/^rpe_stat_player_(\d+)$/, async (ctx) => {
    const athleteId = Number(ctx.match[1]);
    // Предлагаем выбор периода
    await ctx.editMessageText("Выберите период для отчёта по RPE:", {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Последние 7 дней",
              callback_data: `rpe_stat_period_${athleteId}_7`,
            },
            {
              text: "Последние 30 дней",
              callback_data: `rpe_stat_period_${athleteId}_30`,
            },
            {
              text: "Весь период",
              callback_data: `rpe_stat_period_${athleteId}_all`,
            },
          ],
        ],
      },
    });
  });

  // Обработка выбора периода и вывод статистики
  bot.callbackQuery(/^rpe_stat_period_(\d+)_(7|30|all)$/, async (ctx) => {
    const athleteId = Number(ctx.match[1]);
    const period = ctx.match[2];

    let dateFrom = null;
    if (period === "7") {
      dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (period === "30") {
      dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }
    let query = db("athlete_rpe").where({athlete_id: athleteId});
    if (dateFrom) query = query.andWhere("created_at", ">=", dateFrom);

    const data = await query.orderBy("created_at", "desc");
    if (!data || data.length === 0) {
      return ctx.editMessageText("Нет данных за выбранный период.");
    }

    // Достаём имя игрока
    const athlete = await db("athlete").where({id: athleteId}).first();

    // ...твой код выше

    let report = `*${athlete.first_name || ""} ${athlete.last_name || ""}*\n\n`;
    report += `*История оценок:*\n\n`;
    let sumRpe = 0,
      sumSrpe = 0,
      min = null,
      max = null;

    for (const r of data) {
      // Парсим дату красиво
      let dateStr;
      if (typeof r.created_at === "number") {
        // если слишком большое — это ms, делим на 1000
        let ts = r.created_at;
        if (ts > 1e12) ts = Math.floor(ts / 1000);
        const dateObj = new Date(ts * 1000);
        dateStr = dateObj.toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } else if (r.created_at instanceof Date) {
        dateStr = r.created_at.toLocaleDateString("ru-RU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        });
      } else if (typeof r.created_at === "string") {
        // формат YYYY-MM-DDTHH:mm...
        dateStr = r.created_at.split("T")[0].split("-").reverse().join(".");
      } else {
        dateStr = String(r.created_at);
      }
      const srpe = Math.round(r.rpe * r.duration);
      report += `— ${dateStr}: RPE *${r.rpe}*  |  длит. ${r.duration} мин | sRPE: *${srpe}*\n`;
      sumRpe += r.rpe;
      sumSrpe += srpe;
      min = min === null ? r.rpe : Math.min(min, r.rpe);
      max = max === null ? r.rpe : Math.max(max, r.rpe);
    }
    report += `\n*Средний RPE:* ${(sumRpe / data.length).toFixed(
      2
    )}\n*Макс.:* ${max}, *Мин.:* ${min}\n*Общий sRPE:* ${sumSrpe}`;

    await ctx.editMessageText(report, {parse_mode: "Markdown"});
  });
};

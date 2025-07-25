require("dotenv").config();
const pLimit = require("p-limit");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const knex = require("./services/db"); // ✅ теперь через knexfile.js

const ERROR_LOG_FILE = path.join(__dirname, "sync_errors.log");

const FILTER_PARAMS = {
  track: "timestamp_gte",
  team_session: "start_timestamp_gte",
  player: "created_on_gte",
  athlete_threshold: "created_at_gte",
  athlete_session: "start_timestamp_gte",
};

const DATE_FIELDS_PER_ENTITY = {
  track: ["timestamp"],
  team_session: ["start_timestamp", "updated_on"],
  player: ["created_on"],
  athlete_threshold: ["created_at"],
};

const ENTITIES_WITH_DATE_TRACKING = [
  "track",
  "athlete_session",
  "athlete_threshold",
  "team_session",
];

const TABLE_FIELDS = {
  club: [
    "id",
    "name",
    "activation_date",
    "map_service",
    "shield_text",
    "shield_text_color",
    "shield_background_color",
  ],
  team: [
    "id",
    "name",
    "season",
    "club",
    "sport",
    "start_date",
    "end_date",
    "controller_ip",
    "rpe_format",
    "default_teamsession_category",
    "locked",
    "preferred_ground",
  ],
  athlete: [
    "id",
    "name",
    "first_name",
    "last_name",
    "short_name",
    "birthdate",
    "picture",
    "custom_id",
    "club",
    "v0",
    "a0",
  ],
  player: [
    "id",
    "athlete",
    "team",
    "playingrole",
    "number",
    "custom_id",
    "role",
    "first_name",
    "last_name",
    "start_date",
    "end_date",
    "name",
  ],
  playing_role: ["id", "name", "team", "order"],
  device: [
    "id",
    "device_id",
    "unique_id",
    "serial_id",
    "club",
    "club_name",
    "athlete",
    "firmware_version",
    "memory_size",
    "athlete__first_name",
    "athlete__last_name",
    "goalkeeper",
    "supplier",
    "active",
  ],
  track: [
    "id",
    "club",
    "team",
    "tag_id",
    "athlete",
    "athlete_name",
    "device",
    "timestamp",
    "timezone",
    "dt",
    "sample_count",
    "notes",
    "event_slope",
    "duration",
    "utc_timestamp",
    "has_path",
    "has_cardio",
  ],
  team_session: [
    "id",
    "team",
    "category",
    "category_name",
    "notes",
    "start_timestamp",
    "end_timestamp",
    "union_duration",
    "total_time",
    "is_stats_valid",
    "tags",
    "drill_enabled",
    "drills_count",
    "minStart",
    "maxStop",
    "drillTags",
    "name",
    "created_on",
    "updated_on",
    "n_tracks",
    "submitted_by",
    "drills",
  ],
  athlete_session: [
    "id",
    "athlete",
    "track",
    "teamsession",
    "drill",
    "datetime_intervals",
    "sample_intervals",
    "is_stats_valid",
    "total_distance",
    "equivalent_distance",
    "average_v",
    "average_hr",
    "average_p",
    "average_power_aer",
    "total_energy",
    "anaerobic_energy",
    "recovery_average_time",
    "recovery_average_power",
    "average_satprsum",
    "average_hdop",
    "total_time",
    "power_events_count",

    // more fields
    "max_speed",
    "max_acc",
    "max_dec",
    "max_power",

    "acc_events_count",
    "dec_events_count",
    "sprint_events_count",

    "distance_speed_zone_1",
    "distance_speed_zone_2",
    "distance_speed_zone_3",
    "distance_speed_zone_4",
    "distance_speed_zone_5",

    "duration_speed_zone_1",
    "duration_speed_zone_2",
    "duration_speed_zone_3",
    "duration_speed_zone_4",
    "duration_speed_zone_5",

    "distance_power_zone_1",
    "distance_power_zone_2",
    "distance_power_zone_3",
    "distance_power_zone_4",
    "distance_power_zone_5",

    "duration_power_zone_1",
    "duration_power_zone_2",
    "duration_power_zone_3",
    "duration_power_zone_4",
    "duration_power_zone_5",

    "anaerobic_index",
    "eccentric_index",
    "edwards_tl",
  ],

  athlete_threshold: ["id", "athlete", "metric", "value", "created_at"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 📁 Путь к файлу состояния синхронизации по ID источника
function getSyncStatePath(apiId) {
  return path.join(__dirname, "last_syncs", `${apiId}.json`);
}

function hashRecord(record) {
  return crypto.createHash("md5").update(JSON.stringify(record)).digest("hex");
}

function normalizeValue(value) {
  if (value === "" || value === "null") return null;
  if (typeof value === "string" && value.trim().toLowerCase() === "null")
    return null;
  if (typeof value === "number") return parseFloat(value.toFixed(6));
  return value;
}

function cleanRecord(entity, record) {
  const allowedFields = TABLE_FIELDS[entity];
  if (!Array.isArray(allowedFields)) return {};
  const cleaned = {};
  for (const key of allowedFields) {
    const raw = record[key];
    cleaned[key] = normalizeValue(raw);
  }
  return cleaned;
}

function logStep(msg) {
  console.log(`\n🔹 ${msg}`);
}

// ⛓️ Авторизация теперь зависит от параметров API

async function fetchAll(entity, baseUrl, token, since = null) {
  logStep(`Загрузка "${entity}" с API ${baseUrl}...`);

  const results = [];
  let page = 1;
  let url = `${baseUrl}/${entity}/?limit=100`;

  const filterParam = FILTER_PARAMS[entity];
  if (filterParam && since) {
    url += `&${filterParam}=${encodeURIComponent(since)}`;
    console.log(`📍 Используется фильтр: ${filterParam} >= ${since}`);
  }

  while (url) {
    try {
      console.log(`📥 Fetching ${entity} page ${page}...`);
      await sleep(50);
      const res = await axios.get(url, {
        headers: {Authorization: `Token ${token}`},
        timeout: 100000,
      });

      const data = res.data.results || res.data;
      const chunk = Array.isArray(data) ? data : [data];
      results.push(...chunk);

      const link = res.headers.link;
      if (link && link.includes('rel="next"')) {
        const match = link.match(/<([^>]+)>;\s*rel="next"/);
        url = match ? match[1] : null;
      } else {
        url = null;
      }

      console.log(`📄 Получено: ${chunk.length}`);
      page++;
    } catch (err) {
      console.error(`❌ Ошибка при загрузке ${entity}:`, err.message);
      break;
    }
  }

  return results;
}

async function saveToDb(entity, records) {
  if (!records?.length) return;

  logStep(`Подготовка сохранения в таблицу "${entity}"...`);

  let existingRows = [];
  try {
    existingRows = await knex(entity).select("*");
    console.log(`🧠 Загружено существующих записей: ${existingRows.length}`);
  } catch (err) {
    console.error(`❌ Не удалось загрузить таблицу ${entity}:`, err.message);
    return;
  }

  const existingMap = new Map();
  for (const row of existingRows) {
    const cleaned = cleanRecord(entity, row);
    existingMap.set(cleaned.id, hashRecord(cleaned));
  }

  let inserted = 0;
  let updated = 0;

  for (const record of records) {
    const cleaned = cleanRecord(entity, record);
    if (!cleaned.id) continue;

    const hashNew = hashRecord(cleaned);
    const hashOld = existingMap.get(cleaned.id);

    if (hashNew !== hashOld) {
      try {
        await knex(entity).insert(cleaned).onConflict("id").merge();
        if (hashOld) updated++;
        else inserted++;
      } catch (err) {
        console.error(
          `❌ Ошибка при сохранении записи в ${entity}:`,
          err.message
        );
      }
      if (hashOld) updated++;
      else inserted++;
    }
  }

  console.log(
    `✅ ${entity}: скачано ${records.length}, новых ${inserted}, обновлено ${updated}`
  );
}
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(ERROR_LOG_FILE, `[${timestamp}] ${message}\n`, "utf-8");
}
async function fetchAthleteSessionMore(baseUrl, token, sessionId) {
  const url = `${baseUrl}/athlete_session/${sessionId}/more/`;
  try {
    await sleep(300);
    const res = await axios.get(url, {
      headers: {Authorization: `Token ${token}`},
      timeout: 10000,
    });
    return res.data;
  } catch (err) {
    console.warn(
      `⚠️ athlete_session/${sessionId}/more/ не загружен: ${err.message}`
    );
    logToFile(`athlete_session/${sessionId}/more/ failed: ${err.message}`);
    return null;
  }
}

function parseDurationToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const [min, sec] = str.split(":").map(Number);
  if (isNaN(min) || isNaN(sec)) return 0;
  return +(min + sec / 60).toFixed(2);
}

function mapMoreFieldsToSession(more) {
  const getDistance = (arr, index) => {
    return arr?.[index]?.distance || 0;
  };
  const getDuration = (arr, index) => {
    return parseDurationToMinutes(arr?.[index]?.time);
  };

  return {
    max_speed: parseFloat(more?.max_values?.speed?.value || 0),
    max_acc: parseFloat(more?.max_values?.acc?.value || 0),
    max_dec: parseFloat(more?.max_values?.dec?.value || 0),
    max_power: parseFloat(more?.max_values?.power?.value || 0),

    acc_events_count: parseInt(more?.events?.acceleration_events_count || 0),
    dec_events_count: parseInt(more?.events?.deceleration_events_count || 0),
    sprint_events_count: parseInt(more?.events?.speed_events_count || 0),

    // Distance in speed zones
    distance_speed_zone_1: getDistance(more?.complementary_data?.speed, 0),
    distance_speed_zone_2: getDistance(more?.complementary_data?.speed, 1),
    distance_speed_zone_3: getDistance(more?.complementary_data?.speed, 2),
    distance_speed_zone_4: getDistance(more?.complementary_data?.speed, 3),
    distance_speed_zone_5: getDistance(more?.complementary_data?.speed, 4),

    // Duration in speed zones
    duration_speed_zone_1: getDuration(more?.complementary_data?.speed, 0),
    duration_speed_zone_2: getDuration(more?.complementary_data?.speed, 1),
    duration_speed_zone_3: getDuration(more?.complementary_data?.speed, 2),
    duration_speed_zone_4: getDuration(more?.complementary_data?.speed, 3),
    duration_speed_zone_5: getDuration(more?.complementary_data?.speed, 4),

    // Distance in power zones
    distance_power_zone_1: getDistance(more?.complementary_data?.power, 0),
    distance_power_zone_2: getDistance(more?.complementary_data?.power, 1),
    distance_power_zone_3: getDistance(more?.complementary_data?.power, 2),
    distance_power_zone_4: getDistance(more?.complementary_data?.power, 3),
    distance_power_zone_5: getDistance(more?.complementary_data?.power, 4),

    // Duration in power zones
    duration_power_zone_1: getDuration(more?.complementary_data?.power, 0),
    duration_power_zone_2: getDuration(more?.complementary_data?.power, 1),
    duration_power_zone_3: getDuration(more?.complementary_data?.power, 2),
    duration_power_zone_4: getDuration(more?.complementary_data?.power, 3),
    duration_power_zone_5: getDuration(more?.complementary_data?.power, 4),
  };
}

async function syncData({baseUrl, username, password, apiId}) {
  console.log(
    `\n=== 🔁 СИНХРОНИЗАЦИЯ НАЧАЛАСЬ для API #${apiId} (${new Date().toLocaleTimeString()}) ===\n`
  );

  const AUTH_URL = `${baseUrl}-token-auth/`;
  const token = (await axios.post(AUTH_URL, {username, password})).data.token;

  const SYNC_STATE_FILE = path.join(__dirname, `last_syncs/${apiId}.json`);

  if (!fs.existsSync(path.dirname(SYNC_STATE_FILE))) {
    fs.mkdirSync(path.dirname(SYNC_STATE_FILE), {recursive: true});
  }

  const readSyncState = () => {
    if (!fs.existsSync(SYNC_STATE_FILE)) {
      fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify({}), "utf-8");
    }
    return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, "utf-8"));
  };

  const writeSyncState = (state) => {
    const allowed = ENTITIES_WITH_DATE_TRACKING;
    const filtered = Object.fromEntries(
      Object.entries(state).filter(([key]) => allowed.includes(key))
    );
    fs.writeFileSync(
      SYNC_STATE_FILE,
      JSON.stringify(filtered, null, 2),
      "utf-8"
    );
  };

  const allEntities = Object.keys(TABLE_FIELDS); // все поддерживаемые сущности

  const syncState = readSyncState();
  const newState = {...syncState};
  const allData = {};

  for (const entity of allEntities) {
    try {
      const since = syncState[entity] || null;
      const data = await fetchAll(entity, baseUrl, token, since);
      allData[entity] = data;

      const dateFields = DATE_FIELDS_PER_ENTITY[entity] || [];
      if (
        ENTITIES_WITH_DATE_TRACKING.includes(entity) &&
        entity !== "athlete_session"
      ) {
        const latest = data.reduce((max, r) => {
          for (const field of dateFields) {
            if (r[field] && typeof r[field] === "string") {
              if (!max || r[field] > max) max = r[field];
            }
          }
          return max;
        }, null);

        if (latest) {
          console.log(`📌 Последняя дата для ${entity}: ${latest}`);
          newState[entity] = latest;
        } else {
          console.log(`⚠️ Нет подходящих дат для ${entity}`);
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка при обработке ${entity}:`, err.message);
    }
  }

  if (allData.athlete_session?.length) {
    const lastSyncDate = syncState["athlete_session"] || "1970-01-01T00:00:00";
    const before = allData.athlete_session.length;

    allData.athlete_session = allData.athlete_session.filter((session) => {
      if (!session.datetime_intervals) return false;
      const startDatetime = session.datetime_intervals.split("|")[0];
      return startDatetime > lastSyncDate;
    });

    const after = allData.athlete_session.length;
    console.log(
      `✅ Фильтрация athlete_session: осталось ${after} из ${before}`
    );
  }

  // 2. Загрузка данных /more/ для athlete_session
  if (allData.athlete_session?.length) {
    logStep("📥 Загрузка athlete_session/more для каждой сессии...");

    const limit = pLimit(2); // максимум 2 параллельных запроса

    let processedCount = 0; // добавляем счётчик

    await Promise.all(
      allData.athlete_session.map((session, i) =>
        limit(async () => {
          try {
            await sleep(500); // Пауза между запросами

            const more = await fetchAthleteSessionMore(
              baseUrl,
              token,
              session.id
            );

            if (more) {
              const mapped = mapMoreFieldsToSession(more);
              allData.athlete_session[i] = {
                ...session,
                ...mapped,
              };

              processedCount++;

              if (
                processedCount % 10 === 0 ||
                processedCount === allData.athlete_session.length
              ) {
                console.log(
                  `✅ Обработано сессий: ${processedCount}/${allData.athlete_session.length}`
                );
              }
            } else {
              console.warn(`⚠️ Нет данных /more для session id=${session.id}`);
            }
          } catch (err) {
            console.warn(
              `❌ Ошибка в more() session id=${session.id}:`,
              err.message
            );
            logToFile(
              `athlete_session/${session.id}/more failed: ${err.message}`
            );
          }
        })
      )
    );

    console.log(
      `🎯 Всего обработано сессий: ${processedCount}/${allData.athlete_session.length}`
    );
    logStep("📥 Загрузка индексов по сессиям...");

    const KPI_FIELDS = ["anaerobic_index", "eccentric_index", "edwards_tl"];
    const normalize = (s) => (s || "").toUpperCase().trim();

    // 1. Строим карту фамилия → athlete.id через player
    const playerMap = {};
    for (const p of allData.player || []) {
      const lname = normalize(p.last_name);
      if (lname && p.athlete) {
        playerMap[lname] = p.athlete;
      }
    }

    // 2. Группируем athlete_session по teamsession
    const sessionsByTeamSession = {};
    for (const session of allData.athlete_session || []) {
      const teamId = session.teamsession;
      if (!teamId) continue;
      if (!sessionsByTeamSession[teamId]) sessionsByTeamSession[teamId] = [];
      sessionsByTeamSession[teamId].push(session);
    }

    // 3. Загружаем индексы для каждой team_session
    for (const [teamSessionId, sessions] of Object.entries(
      sessionsByTeamSession
    )) {
      const indexResults = {}; // athlete.id → { kpi: value }

      for (const kpi of KPI_FIELDS) {
        try {
          const res = await axios.get(
            `${baseUrl}/team_session/${teamSessionId}/series/?field=${kpi}`,
            {headers: {Authorization: `Token ${token}`}}
          );

          const entries = res.data?.[0]?.data || [];
          for (const item of entries) {
            const lname = normalize(item.athlete_name);
            const athleteId = playerMap[lname];
            if (athleteId) {
              if (!indexResults[athleteId]) indexResults[athleteId] = {};
              indexResults[athleteId][kpi] = item.y;
            }
          }

          console.log(
            `✅ ${kpi} загружен через /series для session ${teamSessionId}`
          );
        } catch (err) {
          console.warn(
            `⚠️ ${kpi} не загружен через /series для ${teamSessionId}: ${err.message}`
          );
        }
      }

      // fallback: /details/ если нет хотя бы одного kpi
      const missing = !Object.keys(indexResults).length;
      if (missing) {
        try {
          const res = await axios.get(
            `${baseUrl}/team_session/${teamSessionId}/details/`,
            {
              headers: {Authorization: `Token ${token}`},
            }
          );

          const players = res.data?.players || {};
          for (const [athleteId, obj] of Object.entries(players)) {
            if (!indexResults[athleteId]) indexResults[athleteId] = {};
            for (const kpi of KPI_FIELDS) {
              const val = obj?.[kpi]?.value;
              if (val !== undefined && val !== null) {
                indexResults[athleteId][kpi] = val;
              }
            }
          }

          console.log(
            `✅ Индексы загружены через /details для ${teamSessionId}`
          );
        } catch (err) {
          console.warn(
            `❌ Ошибка загрузки /details для ${teamSessionId}:`,
            err.message
          );
        }
      }

      // 4. Применяем к athlete_session
      for (const session of sessions) {
        const indexes = indexResults[session.athlete];
        if (indexes) {
          session.anaerobic_index = indexes.anaerobic_index ?? null;
          session.eccentric_index = indexes.eccentric_index ?? null;
          session.edwards_tl = indexes.edwards_tl ?? null;
        }
      }
    }
  }

  if (allData.athlete_session?.length) {
    const lastSessionTs = syncState["athlete_session"] || "1970-01-01T00:00:00";

    let latestSessionTs = lastSessionTs;

    for (const session of allData.athlete_session) {
      if (session.datetime_intervals) {
        const startDatetime = session.datetime_intervals.split("|")[0];
        if (startDatetime > latestSessionTs) {
          latestSessionTs = startDatetime;
        }
      }
    }

    if (latestSessionTs !== lastSessionTs) {
      console.log(`📌 Последняя дата для athlete_session: ${latestSessionTs}`);
      newState["athlete_session"] = latestSessionTs;
    } else {
      console.log("⚠️ Нет новых athlete_session для обновления даты.");
    }
  }
  // athlete_threshold
  if (allData.athlete?.length) {
    const lastThresholdDate = syncState["athlete_threshold"] || null;

    logStep("📥 Загрузка athlete_threshold для каждого спортсмена...");

    const limit = pLimit(2); // максимум 2 запроса одновременно

    const thresholds = [];

    await Promise.all(
      allData.athlete.map((athlete) =>
        limit(async () => {
          await sleep(1500); // пауза между запросами

          try {
            const res = await axios.get(
              `${baseUrl}/athlete/${athlete.id}/thresholds/`,
              {
                headers: {Authorization: `Token ${token}`},
                timeout: 10000,
              }
            );

            const data = res.data;

            const addThreshold = (metric, value, created_at) => {
              if (!value || isNaN(value)) return;
              if (
                !lastThresholdDate ||
                (created_at && created_at > lastThresholdDate)
              ) {
                thresholds.push({
                  id: parseInt(
                    `${athlete.id}${metric}`.replace(/\D/g, "").slice(0, 10)
                  ),
                  athlete: athlete.id,
                  metric,
                  value,
                  created_at: created_at || null,
                });
              }
            };

            if (Array.isArray(data)) {
              for (const t of data) {
                addThreshold(t.metric, t.value, t.created_at);
              }
            } else if (typeof data === "object") {
              const keys = [
                "vo2_max",
                "hr_max",
                "hr_min",
                "speed_max",
                "v0",
                "a0",
              ];
              const created_at = data.validity_start || null;
              keys.forEach((key) => {
                if (key in data) addThreshold(key, data[key], created_at);
              });
            }
          } catch (err) {
            console.warn(
              `⚠️ Thresholds для athlete ${athlete.id} не загружены:`,
              err.message
            );
            logToFile(`athlete_threshold/${athlete.id} failed: ${err.message}`);
          }
        })
      )
    );

    allData.athlete_threshold = thresholds;

    // Обновляем дату последнего threshold
    const latestThresholdDate = thresholds.reduce((max, t) => {
      const date = t.created_at || null;
      return date && date > max ? date : max;
    }, lastThresholdDate || null);

    if (latestThresholdDate) {
      newState["athlete_threshold"] = latestThresholdDate;
      console.log(
        `📌 Последняя дата для athlete_threshold: ${latestThresholdDate}`
      );
    }
  }
  // ИСКЛЮЧАЕМ СТАРЫЕ ИГРОКОВ
  // ID команды, которую исключаем
  const EXCLUDE_TEAM_ID = 678;

  // 1. Исключаем игроков этой команды
  if (allData.player?.length) {
    allData.player = allData.player.filter(
      (player) => player.team !== EXCLUDE_TEAM_ID
    );
  }

  // 2. Получаем id атлетов из этой команды (чтобы их тоже исключить)
  const athleteIdsFromExcludedTeam = new Set(
    (allData.player || [])
      .filter((p) => p.team === EXCLUDE_TEAM_ID)
      .map((p) => p.athlete)
  );

  // 3. Исключаем таких атлетов из athlete
  if (allData.athlete?.length) {
    allData.athlete = allData.athlete.filter(
      (athlete) => !athleteIdsFromExcludedTeam.has(athlete.id)
    );
  }

  // 4. Исключаем связанные athlete_threshold и athlete_session
  if (allData.athlete_threshold?.length) {
    allData.athlete_threshold = allData.athlete_threshold.filter(
      (t) => !athleteIdsFromExcludedTeam.has(t.athlete)
    );
  }
  if (allData.athlete_session?.length) {
    allData.athlete_session = allData.athlete_session.filter(
      (s) => !athleteIdsFromExcludedTeam.has(s.athlete)
    );
  }

  // -----------------------------
  for (const [entity, records] of Object.entries(allData)) {
    await saveToDb(entity, records);
  }

  writeSyncState(newState);
  console.log(
    `\n✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА ДЛЯ API #${apiId} (${new Date().toLocaleTimeString()})`
  );
}
async function syncOnce() {
  console.log("🔁 Запуск синхронизации (однократный)");
  try {
    const sources = await knex("api_sources").where({active: true});

    for (const source of sources) {
      console.log(
        `\n🌐 Синхронизация API ID=${source.id} (${source.base_url})`
      );

      await syncData({
        baseUrl: source.base_url,
        username: source.username,
        password: source.password,
        apiId: source.id,
      });
    }
  } catch (err) {
    console.error("❌ Ошибка синхронизации:", err.message);
  }
}

// // Если запущен напрямую: синхронизировать один раз
// if (require.main === module) {
//   syncData().catch(console.error);
// }
// Экспорт для использования в index.js
module.exports = {
  syncData,

  syncOnce,
};

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const knex = require("./services/db"); // ✅ теперь через knexfile.js

const BASE_API = "https://e05.gpexe.com/api";
const AUTH_URL = `${BASE_API}-token-auth/`;
const SYNC_STATE_FILE = path.join(__dirname, "last_sync.json");
const ERROR_LOG_FILE = path.join(__dirname, "sync_errors.log");

const ENTITY_ENDPOINTS = {
  club: `${BASE_API}/club/`,
  team: `${BASE_API}/team/`,
  athlete: `${BASE_API}/athlete/`,
  player: `${BASE_API}/player/`,
  playing_role: `${BASE_API}/playing_role/`,
  device: `${BASE_API}/device/`,
  track: `${BASE_API}/track/`,
  team_session: `${BASE_API}/team_session/`,
  athlete_session: `${BASE_API}/athlete_session/`,
};

const FILTER_PARAMS = {
  track: "timestamp_gte",
  team_session: "start_timestamp_gte",
  player: "created_on_gte",
  athlete_threshold: "created_at_gte",
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
  ],

  athlete_threshold: ["id", "athlete", "metric", "value", "created_at"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readSyncState() {
  if (!fs.existsSync(SYNC_STATE_FILE)) {
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify({}), "utf-8");
  }
  return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, "utf-8"));
}

function writeSyncState(state) {
  const allowed = ENTITIES_WITH_DATE_TRACKING;
  const filtered = Object.fromEntries(
    Object.entries(state).filter(([key]) => allowed.includes(key))
  );
  fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(filtered, null, 2), "utf-8");
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

async function authenticate() {
  const res = await axios.post(AUTH_URL, {
    username: process.env.GPEXE_USER,
    password: process.env.GPEXE_PASS,
  });
  return res.data.token;
}

async function fetchAll(entity, baseUrl, token, since = null) {
  logStep(`Загрузка "${entity}" с API...`);

  const results = [];
  let page = 1;
  let url = `${baseUrl}?limit=100`;

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
        timeout: 30000,
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
      await knex(entity).insert(cleaned).onConflict("id").merge();
      if (hashOld) updated++;
      else inserted++;
    }
  }

  console.log(
    `✅ ${entity}: скачано ${records.length}, новых ${inserted}, обновлено ${updated}`
  );
}

async function fetchAthleteThresholds(token, athletes, since = null) {
  const all = [];
  for (const athlete of athletes) {
    try {
      await sleep(300);
      const res = await axios.get(
        `${BASE_API}/athlete/${athlete.id}/thresholds/`,
        {
          headers: {Authorization: `Token ${token}`},
          timeout: 10000,
        }
      );

      const data = res.data;

      const addThreshold = (metric, value, created_at) => {
        if (!value || isNaN(value)) return;
        if (!since || (created_at && created_at > since)) {
          all.push({
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
        const keys = ["vo2_max", "hr_max", "hr_min", "speed_max", "v0", "a0"];
        const created_at = data.validity_start || null;
        keys.forEach((key) => {
          if (key in data) addThreshold(key, data[key], created_at);
        });
      }
    } catch (err) {
      console.warn(
        `⚠️ athlete_thresholds for athlete ${athlete.id} not loaded`,
        err.message
      );
    }
  }

  return all;
}
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(ERROR_LOG_FILE, `[${timestamp}] ${message}\n`, "utf-8");
}
function parseTimeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return 0;
  const parts = timeStr.split(":");
  const minutes = parseInt(parts[0] || "0", 10);
  const seconds = parseInt(parts[1] || "0", 10);
  return minutes + seconds / 60;
}

async function fetchAthleteSessionMore(token, sessionId) {
  const url = `${BASE_API}/athlete_session/${sessionId}/more/`;
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

async function syncData() {
  console.log(
    `\n=== 🔁 СИНХРОНИЗАЦИЯ НАЧАЛАСЬ (${new Date().toLocaleTimeString()}) ===\n`
  );

  const token = await authenticate();
  const syncState = readSyncState();
  const newState = {...syncState};
  const allData = {};

  for (const [entity, url] of Object.entries(ENTITY_ENDPOINTS)) {
    try {
      const since = syncState[entity] || null;
      const data = await fetchAll(entity, url, token, since);
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
          console.log(
            `⚠️ Нет подходящих дат для ${entity}, не обновляем состояние.`
          );
        }
      }
    } catch (err) {
      console.error(`❌ Ошибка при обработке ${entity}:`, err.message);
    }
  }

  // 2. Загрузка данных /more/ для athlete_session
  if (allData.athlete_session?.length) {
    logStep("📥 Загрузка athlete_session/more для каждой сессии...");

    const pLimit = require("p-limit");
    const limit = pLimit(3); // максимум 3 параллельных запроса

    await Promise.all(
      allData.athlete_session.map(async (session, i) => {
        await limit(async () => {
          await sleep(500); // сделаем еще паузу между запуском
          const more = await fetchAthleteSessionMore(token, session.id);

          if (more) {
            const mapped = mapMoreFieldsToSession(more);
            allData.athlete_session[i] = {
              ...session,
              ...mapped,
            };
          }
        });
      })
    );
  }

  // track.timestamp → athlete_session
  const athleteSessions = allData.athlete_session || [];
  const tracks = allData.track || [];
  const trackMap = new Map();
  tracks.forEach((t) => {
    if (t.id && t.timestamp) trackMap.set(t.id, t.timestamp);
  });

  const lastSessionTs = syncState["athlete_session"] || "1970-01-01T00:00:00";
  const filteredSessions = athleteSessions.filter((s) => {
    const ts = trackMap.get(s.track);
    return ts && ts > lastSessionTs;
  });

  allData.athlete_session = filteredSessions;

  const latestSessionTs = filteredSessions.reduce((max, s) => {
    const ts = trackMap.get(s.track);
    return ts && ts > max ? ts : max;
  }, lastSessionTs);

  if (latestSessionTs) {
    console.log(`📌 Последняя дата для athlete_session: ${latestSessionTs}`);
    newState["athlete_session"] = latestSessionTs;
  }

  // athlete_threshold
  if (allData.athlete?.length) {
    const lastThresholdDate = syncState["athlete_threshold"] || null;
    const thresholds = await fetchAthleteThresholds(
      token,
      allData.athlete,
      lastThresholdDate
    );
    allData.athlete_threshold = thresholds;

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

  // сохранить в БД
  for (const [entity, records] of Object.entries(allData)) {
    await saveToDb(entity, records);
  }

  writeSyncState(newState);
  console.log(
    `\n✅ СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА (${new Date().toLocaleTimeString()})`
  );
}

// Экспорт для использования в index.js
module.exports = {
  syncData,
  startSyncLoop,
};

// добавь эту функцию:
function startSyncLoop(intervalMs = 10 * 60 * 1000) {
  console.log(
    `🚀 Автосинхронизация включена. Интервал: ${intervalMs / 60000} мин.`
  );
  syncData();
  setInterval(() => {
    syncData().catch((err) => {
      console.error("❌ Ошибка автосинхронизации:", err.message);
    });
  }, intervalMs);
}

// Если запущен напрямую: синхронизировать один раз
if (require.main === module) {
  syncData().catch(console.error);
}

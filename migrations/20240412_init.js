exports.up = function (knex) {
  return (
    knex.schema

      // CLUB
      .createTable("club", (table) => {
        table.integer("id").primary();
        table.string("name");
        table.string("activation_date");
        table.string("map_service");
        table.string("shield_text");
        table.string("shield_text_color");
        table.string("shield_background_color");
      })

      // TEAM
      .createTable("team", (table) => {
        table.integer("id").primary();
        table.string("name");
        table.string("season");
        table
          .integer("club")
          .references("id")
          .inTable("club")
          .onDelete("SET NULL");
        table.string("sport");
        table.string("start_date");
        table.string("end_date");
        table.string("controller_ip");
        table.string("rpe_format");
        table.integer("default_teamsession_category");
        table.boolean("locked");
        table.integer("preferred_ground");
      })

      // ATHLETE
      .createTable("athlete", (table) => {
        table.integer("id").primary();
        table.string("name"); // может быть null
        table.string("last_name");
        table.string("first_name");
        table.string("short_name");
        table.date("birthdate");
        table.string("picture");
        table.string("custom_id");
        table.integer("club"); // внешняя связь
        table.float("v0");
        table.float("a0");
      })

      // PLAYER
      .createTable("player", (table) => {
        table.integer("id").primary();
        table
          .integer("athlete")
          .references("id")
          .inTable("athlete")
          .onDelete("CASCADE");
        table
          .integer("team")
          .references("id")
          .inTable("team")
          .onDelete("SET NULL");
        table.integer("playingrole");
        table.string("number");
        table.string("custom_id");
        table.string("role");
        table.string("first_name");
        table.string("last_name");
        table.string("start_date");
        table.string("end_date");
        table.string("name");
      })

      // PLAYING ROLE
      .createTable("playing_role", (table) => {
        table.integer("id").primary();
        table.string("name");
        table.integer("team");
        table.integer("order");
      })

      // DEVICE
      .createTable("device", (table) => {
        table.integer("id").primary();
        table.string("device_id");
        table.string("unique_id");
        table.string("serial_id");
        table.integer("club").references("id").inTable("club");
        table.string("club_name");
        table.integer("athlete").references("id").inTable("athlete");
        table.string("firmware_version");
        table.integer("memory_size");
        table.string("athlete__first_name");
        table.string("athlete__last_name");
        table.boolean("goalkeeper");
        table.string("supplier");
        table.boolean("active");
      })

      // TRACK
      .createTable("track", (table) => {
        table.integer("id").primary();
        table.integer("club");
        table.integer("team");
        table.string("tag_id");
        table.integer("athlete").references("id").inTable("athlete");
        table.string("athlete_name");
        table.integer("device").references("id").inTable("device");
        table.string("timestamp");
        table.string("timezone");
        table.float("dt");
        table.integer("sample_count");
        table.string("notes");
        table.integer("event_slope");
        table.string("duration");
        table.float("utc_timestamp");
        table.boolean("has_path");
        table.boolean("has_cardio");
      })

      .createTable("athlete_threshold", (table) => {
        table.integer("id").primary(); // сгенерирован вручную: `${athleteId}${idx}`
        table
          .integer("athlete")
          .references("id")
          .inTable("athlete")
          .onDelete("CASCADE");
        table.string("metric"); // например: 'vo2_max', 'max_speed'
        table.float("value"); // числовое значение порога
        table.timestamp("created_at"); // если приходит из API
      })
      .createTable("athlete_session", (table) => {
        table.integer("id").primary();
        table
          .integer("athlete")
          .references("id")
          .inTable("athlete")
          .onDelete("CASCADE");
        table
          .integer("track")
          .references("id")
          .inTable("track")
          .onDelete("SET NULL");
        table
          .integer("teamsession")
          .references("id")
          .inTable("team_session")
          .onDelete("SET NULL");
        table.integer("drill"); // если станет отдельной сущностью, можно будет связать
        table.string("datetime_intervals");
        table.string("sample_intervals");
        table.boolean("is_stats_valid");
        table.float("total_distance");
        table.float("equivalent_distance");
        table.float("average_v");
        table.float("average_hr");
        table.float("average_p");
        table.float("average_power_aer");
        table.float("total_energy");
        table.float("anaerobic_energy");
        table.float("recovery_average_time");
        table.float("recovery_average_power");
        table.float("average_satprsum");
        table.float("average_hdop");
        table.float("total_time");
        table.integer("power_events_count");
      })

      // TEAM SESSION
      .createTable("team_session", (table) => {
        table.integer("id").primary();
        table.integer("team").references("id").inTable("team");
        table.integer("category");
        table.string("category_name");
        table.string("notes");
        table.string("start_timestamp");
        table.string("end_timestamp");
        table.integer("union_duration");
        table.integer("total_time");
        table.boolean("is_stats_valid");
        table.text("tags"); // list[]
        table.boolean("drill_enabled");
        table.integer("drills_count");
        table.float("minStart");
        table.float("maxStop");
        table.text("drillTags"); // list[]
        table.string("name");
        table.string("created_on");
        table.string("updated_on");
        table.integer("n_tracks");
        table.string("submitted_by");
        table.text("drills"); // list[]
      })
      .createTable("users", (table) => {
        table.bigInteger("id").primary(); // Telegram ID
        table.string("username");
        table.boolean("is_admin").defaultTo(false);
        table
          .integer("athlete_id")
          .references("id")
          .inTable("athlete")
          .onDelete("SET NULL");
        table.timestamp("created_at").defaultTo(knex.fn.now());
        table.timestamp("verified_at").nullable();
      })

      .createTable("user_logs", (table) => {
        table.increments("id").primary();
        table
          .bigInteger("user_id")
          .references("id")
          .inTable("users")
          .onDelete("CASCADE");
        table.string("action").notNullable();
        table.text("details").nullable();
        table.timestamp("created_at").defaultTo(knex.fn.now());
      })
  );
};

exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("team_session")
    .dropTableIfExists("track")
    .dropTableIfExists("device")
    .dropTableIfExists("playing_role")
    .dropTableIfExists("player")
    .dropTableIfExists("athlete")
    .dropTableIfExists("athlete_threshold")
    .dropTableIfExists("team")
    .dropTableIfExists("user_logs")
    .dropTableIfExists("users")
    .dropTableIfExists("club");
};

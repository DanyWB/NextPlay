exports.up = function (knex) {
  return knex.schema.alterTable("athlete_session", (table) => {
    table.float("max_speed");
    table.float("max_acc");
    table.float("max_dec");
    table.float("max_power");

    table.integer("acc_events_count");
    table.integer("dec_events_count");
    table.integer("sprint_events_count");

    // Расстояние в зонах скорости
    table.float("distance_speed_zone_1");
    table.float("distance_speed_zone_2");
    table.float("distance_speed_zone_3");
    table.float("distance_speed_zone_4");
    table.float("distance_speed_zone_5");

    // Время в зонах скорости
    table.float("duration_speed_zone_1");
    table.float("duration_speed_zone_2");
    table.float("duration_speed_zone_3");
    table.float("duration_speed_zone_4");
    table.float("duration_speed_zone_5");

    // Расстояние в зонах мощности
    table.float("distance_power_zone_1");
    table.float("distance_power_zone_2");
    table.float("distance_power_zone_3");
    table.float("distance_power_zone_4");
    table.float("distance_power_zone_5");

    // Время в зонах мощности
    table.float("duration_power_zone_1");
    table.float("duration_power_zone_2");
    table.float("duration_power_zone_3");
    table.float("duration_power_zone_4");
    table.float("duration_power_zone_5");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("athlete_session", (table) => {
    table.dropColumns(
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
      "duration_power_zone_5"
    );
  });
};

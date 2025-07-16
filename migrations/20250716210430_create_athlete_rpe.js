exports.up = function (knex) {
  return knex.schema.createTable("athlete_rpe", function (table) {
    table.increments("id").primary();
    table.integer("athlete_id").notNullable();
    table.integer("team_session_id").notNullable();
    table.integer("rpe").notNullable(); // 0-10
    table.float("duration").notNullable(); // в минутах
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.unique(["athlete_id", "team_session_id"]); // Оценка только одна на сессию
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("athlete_rpe");
};

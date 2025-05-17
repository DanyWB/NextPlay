exports.up = function (knex) {
  return knex.schema.alterTable("users", function (table) {
    table.string("role").defaultTo("user"); // "user", "coach"
    table.integer("team_id").nullable(); // для тренеров
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", function (table) {
    table.dropColumn("role");
    table.dropColumn("team_id");
  });
};

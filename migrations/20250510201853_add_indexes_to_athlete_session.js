exports.up = function (knex) {
  return knex.schema.alterTable("athlete_session", function (table) {
    table.float("anaerobic_index");
    table.float("eccentric_index");
    table.float("edwards_tl");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("athlete_session", function (table) {
    table.dropColumn("anaerobic_index");
    table.dropColumn("eccentric_index");
    table.dropColumn("edwards_tl");
  });
};

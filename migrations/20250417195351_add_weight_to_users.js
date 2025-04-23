// migrations/YYYYMMDD_add_weight_to_users.js

exports.up = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.float("weight").nullable().comment("Вес пользователя в килограммах");
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", (table) => {
    table.dropColumn("weight");
  });
};

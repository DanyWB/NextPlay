exports.up = function (knex) {
  return knex.schema.table("users", function (table) {
    table.json("meta").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.table("users", function (table) {
    table.dropColumn("meta");
  });
};

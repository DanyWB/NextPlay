exports.up = function (knex) {
  return knex.schema.alterTable("users", function (table) {
    table.timestamp("last_verification_request").nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("users", function (table) {
    table.dropColumn("last_verification_request");
  });
};

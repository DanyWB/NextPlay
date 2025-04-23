exports.up = function (knex) {
  return knex.schema.createTable("admin_logs", (table) => {
    table.increments("id").primary();
    table.integer("admin_id").notNullable();
    table.string("action").notNullable();
    table.text("details").nullable();
    table.timestamp("timestamp").defaultTo(knex.fn.now());
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("admin_logs");
};

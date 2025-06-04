exports.up = function (knex) {
  return knex.schema.createTable("api_sources", (table) => {
    table.increments("id").primary();
    table.string("base_url").notNullable();
    table.string("username").notNullable();
    table.string("password").notNullable();
    table.boolean("active").defaultTo(true);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTableIfExists("api_sources");
};

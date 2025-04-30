exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("users", "weight");
  if (hasColumn) {
    await knex.schema.alterTable("users", (table) => {
      table.dropColumn("weight");
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.alterTable("users", (table) => {
    table.float("weight").nullable();
  });
};

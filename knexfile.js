module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: "./gpexe.db",
    },
    useNullAsDefault: true,
    migrations: {
      directory: "./migrations",
    },
    pool: {
      min: 1,
      max: 1, // 👈 очень важно для SQLite!
    },
  },
};

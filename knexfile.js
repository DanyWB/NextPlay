const path = require("path");
module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.resolve(__dirname, "gpexe.db"), // абсолютный путь
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

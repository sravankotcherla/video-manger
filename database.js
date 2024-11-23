const sqlite = require("sqlite3").verbose();

let db;
exports.initDb = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite.Database("./database.db", (err) => {
      if (err) {
        console.log(err);
        reject(err);
      } else {
        console.log("Connected to db");
        db.run(`
                  CREATE TABLE IF NOT EXISTS videos (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  filename TEXT NOT NULL,
                  filepath TEXT NOT NULL,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                  )
              `);
        resolve(db);
      }
    });
  });
};

exports.getDb = () => {
  if (!db) {
    throw new Error("Db is not initialized yet");
  } else {
    return db;
  }
};

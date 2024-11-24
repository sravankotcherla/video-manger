const Database = require("../../database");
const fs = require("fs");

exports.createRow = (rowData) => {
  const { filename, path, size, duration } = rowData;
  return new Promise((resolve, reject) => {
    Database.getDb().run(
      "INSERT INTO videos (filename, filepath, size, duration) VALUES ($name,$path,$size,$duration)",
      { $name: filename, $path: path, $size: size, $duration: duration },
      function (err) {
        if (err) {
          console.error("Failed to insert file meta data into db");
          return reject(err);
        } else {
          return resolve({ id: this.lastID });
        }
      }
    );
  });
};

exports.getRowById = (id) => {
  return new Promise((resolve, reject) => {
    Database.getDb().get(
      "SELECT * FROM videos WHERE ID=$id",
      {
        $id: id,
      },
      async function (err, row) {
        if (err) {
          console.error("Sqlite error : ", err);
          return reject({
            message: "Error while fetching video metadata from db ",
            error: err,
          });
        }

        if (!row) {
          console.error("Couln't find file with id :", id);
          return reject({ message: "Video not found with id " + id });
        }

        if (!fs.existsSync(row.filepath)) {
          console.error("Couln't find file at :", row.filepath);
          return reject({ message: "Video not found with id " + id });
        }

        return resolve(row);
      }
    );
  });
};

exports.getRowsByIds = (ids) => {
  const placeholders = ids.map(() => "?").join(",");

  const query = `SELECT * FROM videos WHERE id IN (${placeholders})`;

  return new Promise((resolve, reject) => {
    Database.getDb().all(query, ids, (err, rows) => {
      if (err) {
        console.error(err);
        return reject(err);
      } else {
        return resolve(rows);
      }
    });
  });
};

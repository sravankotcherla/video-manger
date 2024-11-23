const Database = require("../database");

exports.uploadVideo = (req, res) => {
  const { filename, path } = req.file;
  Database.getDb().run(
    "INSERT INTO videos (filename, filepath) VALUES ($name,$path)",
    { $name: filename, $path: path },
    function (err) {
      if (err) {
        console.log("Failed to insert file meta data into db");
        return res
          .status(500)
          .send("Error while trying to save metadata into db ", err);
      } else {
        return res.status(200).send({ id: this.lastID });
      }
    }
  );
};

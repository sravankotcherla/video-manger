const ffmpeg = require("fluent-ffmpeg");
const Database = require("../database");
const fs = require("fs");
const path = require("path");

exports.processAndValidateFile = (req, res, next) => {
  const { path, size } = req.file;
  const maxFileSize = process.env.MAX_UPLOAD_FILE_SIZE || 25; // in mb
  const minDuration = process.env.MIN_VIDEO_DURATION || 0;
  const maxDuration = process.env.MAX_VIDOE_DURATION || 25;

  if (size > maxFileSize * 1024 * 1024) {
    fs.unlinkSync(path);
    return res
      .status(400)
      .send(
        "File size is too large. Upload a video less than " + maxFileSize + "mb"
      );
  }
  let duration = 0;
  ffmpeg.ffprobe(path, (err, metaData) => {
    if (err) {
      fs.unlinkSync(path);
      console.error("FFmpeg error : ", err);
      return res.status(500).send("Error with ffmpeg ", err);
    }

    duration = metaData.format.duration;

    if (duration > maxDuration) {
      fs.unlinkSync(path);
      return res
        .status(400)
        .send(
          "File duration is too large. Upload a video less than " +
            maxDuration +
            " secs"
        );
    }

    if (duration < minDuration) {
      fs.unlinkSync(path);
      return res
        .status(400)
        .send(
          "File duration is too small. Upload a video greater than " +
            minDuration +
            " secs"
        );
    }

    req.file.duration = duration;
    return next();
  });
};

exports.insertVideoMetaData = (req, res) => {
  const { filename, path, size, duration } = req.file;

  Database.getDb().run(
    "INSERT INTO videos (filename, filepath) VALUES ($name,$path)",
    { $name: filename, $path: path },
    function (err) {
      if (err) {
        console.error("Failed to insert file meta data into db");
        return res
          .status(500)
          .send("Error while trying to save metadata into db ", err);
      } else {
        return res.status(200).send({ id: this.lastID });
      }
    }
  );
};

exports.getLinkToVideo = (req, res) => {
  const { id } = req.query;

  Database.getDb().get(
    "SELECT * FROM videos WHERE ID=$id",
    {
      $id: id,
    },
    function (err, row) {
      if (err) {
        console.error("Sqlite error : ", err);
        return res.status(500).send({
          message: "Error while fetching video metadata from db ",
          error: err,
        });
      }

      const filename = row.filename;
      const filepath = row.filepath;
      if (!fs.existsSync(filepath)) {
        console.error("Couln't find file with id :", id);
        return res
          .status(404)
          .send({ message: "Video not found with id " + id });
      }

      const resourceUrl = `${req.protocol}://${req.get(
        "host"
      )}/video/download/${filename}}`;

      res.status(200).send(resourceUrl);
    }
  );
};

exports.getVideo = (req, res) => {
  const { filename } = req.params;

  const filepath = path.resolve(
    __dirname,
    "../",
    process.env.UPLOAD_FOLDER_NAME,
    filename
  );
  if (!fs.existsSync(filepath)) {
    console.error("Couln't find file with name :", filename);
    return res.status(404).send({ message: "Video not found" });
  }
  return res.sendFile(filepath);
};

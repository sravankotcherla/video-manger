const ffmpeg = require("fluent-ffmpeg");
const Database = require("../database");
const fs = require("fs");
const AuthController = require("./auth.controller");
const path = require("path");
const ffmpegUtils = require("../utils/ffmpegUtils");

exports.processAndValidateFile = async (req, res, next) => {
  try {
    const { path, size } = req.file;

    const maxFileSize = process.env.MAX_UPLOAD_FILE_SIZE || 25; // in mb
    const minDuration = process.env.MIN_VIDEO_DURATION || 0;
    const maxDuration = process.env.MAX_VIDEO_DURATION || 25;

    if (size > maxFileSize * 1024 * 1024) {
      throw new Error(
        "File size is too large. Upload a video less than " + maxFileSize + "mb"
      );
    }
    let duration = 0;

    const fileMetaData = await ffmpegUtils.getMetaData(path);
    duration = fileMetaData.format.duration;

    if (duration > maxDuration) {
      throw new Error(
        "File duration is too large. Upload a video less than " +
          maxDuration +
          " secs"
      );
    }

    if (duration < minDuration) {
      throw new Error(
        "File duration is too small. Upload a video greater than " +
          minDuration +
          " secs"
      );
    }

    req.file.duration = duration;
    return next();
  } catch (err) {
    fs.unlinkSync(path);
    console.error(err);
    return res.status(400).send(err);
  }
};

exports.insertVideoMetaData = (req, res) => {
  const { filename, path, size, duration } = req.file;

  Database.getDb().run(
    "INSERT INTO videos (filename, filepath, size, duration) VALUES ($name,$path,$size,$duration)",
    { $name: filename, $path: path, $size: size, $duration: duration },
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

exports.getLinkToVideo = async (req, res) => {
  const { id } = req.query;

  Database.getDb().get(
    "SELECT * FROM videos WHERE ID=$id",
    {
      $id: id,
    },
    async function (err, row) {
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

      const token = await AuthController.generateTokenForVideoLink(
        filename,
        filepath
      );

      const resourceUrl = `${req.protocol}://${req.get(
        "host"
      )}/video/download/?token=${token}`;

      res.status(200).send(resourceUrl);
    }
  );
};

exports.getVideo = (req, res) => {
  const { filename, filepath } = req.query;

  if (!fs.existsSync(filepath)) {
    console.error("Couln't find file with name :", filename);
    return res.status(404).send({ message: "Video not found" });
  }

  return res.sendFile(filepath);
};

const ffmpeg = require("fluent-ffmpeg");
const Database = require("../database");
const fs = require("fs");

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
      console.log("FFmpeg error : ", err);
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
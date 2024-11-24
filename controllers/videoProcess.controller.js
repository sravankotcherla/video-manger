const AuthController = require("./auth.controller");
const path = require("path");
const fs = require("fs");
const ffmpegUtils = require("../utils/ffmpegUtils");
const VideoModel = require("../models/videos.model");

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

exports.insertVideoMetaData = async (req, res) => {
  try {
    const { filename, path, size, duration } = req.file;

    const createdRowId = await VideoModel.createRow({
      filename,
      path,
      size,
      duration,
    });
    return res.status(200).send({ id: createdRowId });
  } catch (err) {
    return res
      .status(500)
      .send("Error while trying to save metadata into db ", err);
  }
};

exports.getLinkToVideo = async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      console.error("Missing id in request payload");
      return res.status(400).send("Missing id in payload");
    }

    const { filename, filepath } = await VideoModel.getRowById(id);

    const token = await AuthController.generateTokenForVideoLink(
      filename,
      filepath
    );

    const resourceUrl = `${req.protocol}://${req.get(
      "host"
    )}/video/download/?token=${token}`;

    res.status(200).send(resourceUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send(err);
  }
};

exports.getVideo = (req, res) => {
  const { filename, filepath } = req.query;

  if (!fs.existsSync(filepath)) {
    console.error("Couln't find file with name :", filename);
    return res.status(404).send({ message: "Video not found" });
  }

  return res.sendFile(filepath);
};

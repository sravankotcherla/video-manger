const path = require("path");
const fs = require("fs");

const VideoModel = require("../models/videos.model");
const ffmpegUtils = require("../../utils/ffmpegUtils");

exports.trim = async (req, res) => {
  try {
    let { id } = req.params;
    let { start, duration } = req.body;

    if (!id || !start || !duration) {
      return res
        .status(400)
        .send("Invalid payload. Missing id or startTime or duration");
    }

    id = parseInt(id);
    start = parseFloat(start);
    duration = parseFloat(duration);

    const {
      filepath,
      filename,
      duration: inpFileDuration,
    } = await VideoModel.getRowById(id);

    if (start >= inpFileDuration || start + duration >= inpFileDuration) {
      return res.status(400).send({
        message: "Invalid start time or duration",
      });
    }

    const newFileName = `${Date.now()}_trimmed_${filename}`;

    const outputFilePath = path.resolve(
      __dirname,
      `../../${process.env.UPLOAD_FOLDER_NAME}`,
      newFileName
    );

    await ffmpegUtils.trim(filepath, start, duration, outputFilePath);

    const { size } = await fs.promises.stat(outputFilePath);

    const createdRow = await VideoModel.createRow({
      filename: newFileName,
      path: outputFilePath,
      size,
      duration,
    });
    return res.status(200).jsonp({ id: createdRow.id });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};

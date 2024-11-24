const ffmpegUtils = require("../../utils/ffmpegUtils");
const VideoModel = require("../models/videos.model");
const path = require("path");

exports.mergeVideos = async (req, res) => {
  try {
    const { ids, outputFileName } = req.body;
    if (!ids || !outputFileName) {
      return res
        .status(400)
        .send("Missing payload info like ids or outputFileName");
    }

    const videos = await VideoModel.getRowsByIds(ids);

    const filePathById = videos.reduce(
      (accum, video) => ({ ...accum, [video.id]: video.filepath }),
      {}
    );
    const inputFilePaths = ids.map((id) => {
      if (!filePathById[id]) {
        return res.status(400).send("Videos not found");
      }
      return filePathById[id];
    });
    const outputFilePath = path.resolve("./media", outputFileName);

    const newFileMetaData = await ffmpegUtils.mergeVideos(
      inputFilePaths,
      outputFilePath
    );

    const { size, duration } = newFileMetaData.format;

    const createdRowId = await VideoModel.createRow({
      filename: outputFileName,
      path: outputFilePath,
      size,
      duration,
    });

    res.status(200).send({ id: createdRowId });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
};

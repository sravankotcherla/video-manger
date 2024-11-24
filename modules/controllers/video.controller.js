const AuthController = require("./auth.controller");
const fs = require("fs");
const VideoModel = require("../models/videos.model");

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

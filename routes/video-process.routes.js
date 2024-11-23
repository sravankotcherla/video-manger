const express = require("express");
const multer = require("multer");
require("dotenv").config();
const VideoProcessController = require("../controllers/videoProcess.controller");

const app = express();
const mediaStorageOptions = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, process.env.UPLOAD_FOLDER);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now().toString()}_${file.originalname}`);
  },
});
const multerService = multer({ storage: mediaStorageOptions });

app
  .route("/upload")
  .all(multerService.single("video"))
  .post(
    VideoProcessController.processAndValidateFile,
    VideoProcessController.insertVideoMetaData
  );

module.exports = app;

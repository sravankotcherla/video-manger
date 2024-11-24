const express = require("express");
const multer = require("multer");
const path = require("path");
const VideoProcessController = require("../controllers/videoProcess.controller");

const app = express();
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME || "media";
const uploadFolderPath =
  process.env.NODE_ENV === "test"
    ? path.join(__dirname, "../tests/e2e/", uploadFolderName)
    : path.join(__dirname, "../", uploadFolderName);

const mediaStorageOptions = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolderPath);
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

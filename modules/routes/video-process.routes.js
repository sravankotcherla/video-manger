const express = require("express");
const multer = require("multer");
const path = require("path");
const UploadVideoController = require("../controllers/uploadVideo.controller");
const VideoController = require("../controllers/video.controller");

const AuthController = require("../controllers/auth.controller");

const app = express();
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME || "media";
const uploadFolderPath =
  process.env.NODE_ENV === "test"
    ? path.join(__dirname, "../../tests/e2e/", uploadFolderName)
    : path.join(__dirname, "../../", uploadFolderName);

const mediaStorageOptions = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadFolderPath);
  },
  filename: function (req, file, cb) {
    cb(null, `${Date.now().toString()}_${file.originalname}`);
  },
});
const multerService = multer({ storage: mediaStorageOptions });

// app.route("/trim").all(VideoProcessController.trim);

app
  .route("/download/")
  .all(AuthController.authorizeLink)
  .get(VideoController.getVideo);

app
  .route("/upload")
  .all(multerService.single("video"))
  .post(
    UploadVideoController.processAndValidateFile,
    UploadVideoController.insertVideoMetaData
  );

app.route("/link").get(VideoController.getLinkToVideo);

module.exports = app;

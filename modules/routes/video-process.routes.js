const express = require("express");
const multer = require("multer");
const path = require("path");

const UploadVideoController = require("../controllers/uploadVideo.controller");
const VideoController = require("../controllers/video.controller");
const VideoTrimController = require("../controllers/videoTrim.controller");
const VideoMergeController = require("../controllers/merge.controller");

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

app.route("/trim").all(VideoTrimController.trim);

app.route("/link").get(VideoController.getLinkToVideo);

app.route("/merge").post(VideoMergeController.mergeVideos);

module.exports = app;

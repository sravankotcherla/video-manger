const express = require("express");
require("dotenv").config();
const fs = require("fs");
const path = require("path");

const Database = require("./database");
const VideoProcessRouter = require("./routes/video-process.routes");

const port = process.env.PORT;
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME || "media";
const uploadFolderPath = path.join(__dirname, uploadFolderName);
const app = express();

const initServer = async () => {
  if (!fs.existsSync(uploadFolderPath)) {
    fs.mkdirSync(uploadFolderPath);
  }
  Database.initDb()
    .then((db) => {
      app.use("/video", VideoProcessRouter);
      app.listen(port, () => {
        console.log("Server listening on port ", port);
      });
    })
    .catch((err) => {
      console.log("Failed to connect to DB", err);
    });
};

initServer();

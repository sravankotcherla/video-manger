const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");

const env = process.env.NODE_ENV;

if (env === "test") {
  require("dotenv").config({ path: "./.env.test" });
} else {
  require("dotenv").config();
}

const Database = require("./database");
const VideoProcessRouter = require("./modules/routes/video-process.routes");

const port = process.env.PORT;
const uploadFolderName = process.env.UPLOAD_FOLDER_NAME || "media";
const uploadFolderPath =
  env === "test"
    ? path.join(__dirname, "./tests/e2e/", uploadFolderName)
    : path.join(__dirname, uploadFolderName);
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let server;
const initServer = async () => {
  if (!fs.existsSync(uploadFolderPath)) {
    fs.mkdirSync(uploadFolderPath);
  }

  return Database.initDb()
    .then((db) => {
      app.use("/videos", VideoProcessRouter);

      app.use((req, res) => {
        res.status(404).send({ error: "Not Found" });
      });

      server = app.listen(port, () => {
        console.log("Server listening on port ", port);
      });
      return server;
    })
    .catch((err) => {
      console.log("Failed to connect to DB", err);
    });
};

if (process.env.NODE_ENV !== "test") initServer();

module.exports = { app, initServer };

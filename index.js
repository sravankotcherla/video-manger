const express = require("express");
require("dotenv").config();

const Database = require("./database");
const VideoProcessRouter = require("./routes/video-process.routes");

const port = process.env.PORT;
const app = express();

const initServer = async () => {
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

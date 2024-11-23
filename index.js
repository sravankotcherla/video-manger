const express = require("express");
require("dotenv").config();

const Database = require("./database");

const port = process.env.PORT;
const app = express();

const initServer = async () => {
  Database.initDb()
    .then((db) => {
      app.get("/", (req, res) => {
        return res.send("Video Manager is up");
      });

      app.listen(port, () => {
        console.log("Server listening on port ", port);
      });
    })
    .catch((err) => {
      console.log("Failed to connect to DB", err);
    });
};

initServer();

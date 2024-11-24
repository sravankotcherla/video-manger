const ffmpeg = require("fluent-ffmpeg");
const path = require("path");

exports.trim = (filepath, start, duration, outputpath) => {
  return new Promise((resolve, reject) => {
    ffmpeg(filepath)
      .setStartTime(start)
      .setDuration(duration)
      .output(outputpath)
      .on("error", (err) => {
        console.error("Error during trimming:", err);
        reject(err);
      })
      .on("end", () => {
        console.info("Trimming finished!");
        resolve();
      })
      .run();
  });
};

exports.getMetaData = (filepath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filepath, (err, metaData) => {
      if (err) {
        console.error("FFmpeg Error : ", err);
        return reject(err);
      } else {
        return resolve(metaData);
      }
    });
  });
};

exports.mergeVideos = (filePaths, outputPath) => {
  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    filePaths.forEach((filepath) => {
      command.input(filepath);
    });

    command
      .on("start", () => {
        console.log("Starting video concatenation...");
      })
      .on("end", () => {
        console.log("Videos concatenated successfully!");
        ffmpeg.ffprobe(outputPath, function (err, metaData) {
          if (err) {
            console.error("Error while probing merged file", err);
            reject(err);
          }
          resolve(metaData);
        });
      })
      .on("error", (err) => {
        console.error("Error during concatenation:", err.message);
        reject(err);
      })
      .mergeToFile(outputPath, path.resolve("./media"));
  });
};

const ffmpeg = require("fluent-ffmpeg");

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

const ffmpeg = require("fluent-ffmpeg");

exports.trim = (filepath, start, duration, outputpath) => {
  return new Promise((resolve, reject) => {
    console.log("hii", ffmpeg);
    ffmpeg
      .input(filepath)
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

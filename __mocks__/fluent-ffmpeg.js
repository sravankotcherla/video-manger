const mockFfprobe = jest.fn((path, callback) => {
  let fakeMetadata = {
    format: {
      duration: 20,
    },
  };
  let err = null;

  switch (path) {
    case "/uploads/video.mp4":
      fakeMetadata = {
        format: {
          duration: 10,
        },
      };
      break;
    case "/uploads/video1.mp4":
      fakeMetadata = {
        format: {
          duration: 50,
        },
      };
      break;
    case "/uploads/video2.mp4":
      fakeMetadata = {
        format: {
          duration: 1,
        },
      };
      break;
    case "/uploads/video3.mp4":
      err = new Error("FFmpeg error");
      break;
  }
  callback(err, fakeMetadata);
});

const fluentFfmpeg = {
  ffprobe: mockFfprobe,
};

module.exports = fluentFfmpeg;

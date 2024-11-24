const mockFfprobe = jest.fn((path, callback) => {
  let fakeMetadata = {
    format: {
      duration: 20,
    },
  };
  let err = null;
  callback(err, fakeMetadata);
});

const fluentFfmpeg = {
  ffprobe: mockFfprobe,
};

module.exports = fluentFfmpeg;

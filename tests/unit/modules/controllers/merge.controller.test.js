const ffmpegUtils = require("../../../../utils/ffmpegUtils");
const VideoModel = require("../../../../modules/models/videos.model");
const path = require("path");
const {
  mergeVideos,
} = require("../../../../modules/controllers/merge.controller");

jest.mock("../../../../modules/models/videos.model");
jest.mock("../../../../utils/ffmpegUtils");

describe("mergeVideos", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 400 if ids or outputFileName are missing", async () => {
    const req = {
      body: {
        ids: [1, 2],
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    await mergeVideos(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "Missing payload info like ids or outputFileName"
    );
  });

  it("should return 400 if videos are not found", async () => {
    const req = {
      body: {
        ids: [1, 2],
        outputFileName: "output.mp4",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    // Mocking VideoModel.getRowsByIds to return empty array
    VideoModel.getRowsByIds.mockResolvedValue([]);

    await mergeVideos(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("Videos not found");
  });

  it("should merge videos successfully and return the created row id", async () => {
    const req = {
      body: {
        ids: [1, 2],
        outputFileName: "output.mp4",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Mocking VideoModel.getRowsByIds to return video data
    VideoModel.getRowsByIds.mockResolvedValue([
      { id: 1, filepath: "/videos/video1.mp4" },
      { id: 2, filepath: "/videos/video2.mp4" },
    ]);

    // Mocking ffmpegUtils.mergeVideos to return fake metadata
    const fakeMetaData = { format: { size: 1000000, duration: 300 } };
    ffmpegUtils.mergeVideos.mockResolvedValue(fakeMetaData);

    // Mocking VideoModel.createRow to return a fake row ID
    VideoModel.createRow.mockResolvedValue(1);

    await mergeVideos(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ id: 1 });
    expect(VideoModel.getRowsByIds).toHaveBeenCalledWith([1, 2]);
    expect(ffmpegUtils.mergeVideos).toHaveBeenCalledWith(
      ["/videos/video1.mp4", "/videos/video2.mp4"],
      path.resolve("./media", "output.mp4")
    );
    expect(VideoModel.createRow).toHaveBeenCalledWith({
      filename: "output.mp4",
      path: path.resolve("./media", "output.mp4"),
      size: 1000000,
      duration: 300,
    });
  });

  it("should return 500 if there is an error during the merge process", async () => {
    const req = {
      body: {
        ids: [1, 2],
        outputFileName: "output.mp4",
      },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    // Mocking VideoModel.getRowsByIds to return video data
    VideoModel.getRowsByIds.mockResolvedValue([
      { id: 1, filepath: "/videos/video1.mp4" },
      { id: 2, filepath: "/videos/video2.mp4" },
    ]);

    // Mocking ffmpegUtils.mergeVideos to throw an error
    ffmpegUtils.mergeVideos.mockRejectedValue(new Error("FFmpeg error"));

    await mergeVideos(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("FFmpeg error");
  });
});

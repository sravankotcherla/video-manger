const path = require("path");
const {
  trim,
} = require("../../../../modules/controllers/videoTrim.controller");
const VideoModel = require("../../../../modules/models/videos.model");
const ffmpegUtils = require("../../../../utils/ffmpegUtils");
require("dotenv").config();

jest.mock("../../../../modules/models/videos.model");
jest.mock("../../../../utils/ffmpegUtils");

jest.spyOn(console, "error").mockImplementation(() => {});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("trim controller", () => {
  let mockReq, mockRes;

  beforeEach(() => {
    mockReq = {
      body: {
        id: 1,
        start: 5,
        duration: 10,
      },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      jsonp: jest.fn(),
    };

    jest.clearAllMocks();
  });

  it("should return 400 if payload is missing fields", async () => {
    mockReq.body = {}; // Missing fields
    await trim(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith(
      "Invalid payload. Missing id or startTime or duration"
    );
  });

  it("should return 400 if start or duration is invalid", async () => {
    VideoModel.getRowById.mockResolvedValue({
      filepath: "/path/to/video.mp4",
      filename: "video.mp4",
      duration: 20,
    });
    jest.mock("fs", () => ({
      promises: {
        stats: mockStats,
      },
    }));

    mockReq.body.start = 15;
    mockReq.body.duration = 10; // Exceeds video duration

    await trim(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.send).toHaveBeenCalledWith({
      message: "Invalid start time or duration",
    });
  });

  it("should handle errors and return 500", async () => {
    const mockError = new Error("Something went wrong");

    VideoModel.getRowById.mockRejectedValue(mockError);

    await trim(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(500);
    expect(mockRes.send).toHaveBeenCalledWith(mockError.message);
  });
});

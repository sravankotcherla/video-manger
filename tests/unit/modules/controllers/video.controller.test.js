const fs = require("fs");
const AuthController = require("../../../../modules/controllers/auth.controller");
const VideoModel = require("../../../../modules/models/videos.model");
const {
  getLinkToVideo,
  getVideo,
} = require("../../../../modules/controllers/video.controller");

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

jest.mock("../../../../modules/models/videos.model", () => ({
  getRowById: jest.fn(),
}));

jest.mock("../../../../modules/controllers/auth.controller", () => ({
  generateTokenForVideoLink: jest.fn(),
}));

describe("Video Controller", () => {
  describe("getLinkToVideo", () => {
    let req, res;

    beforeEach(() => {
      req = {
        query: { id: "1" },
        protocol: "http",
        get: jest.fn().mockReturnValue("localhost:3000"),
      };
      res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      jest.clearAllMocks();
    });

    it("should return a resource URL with a valid token", async () => {
      VideoModel.getRowById.mockResolvedValue({
        filename: "video.mp4",
        filepath: "/uploads/video.mp4",
      });
      AuthController.generateTokenForVideoLink.mockResolvedValue("mock-token");

      await getLinkToVideo(req, res);

      const expectedUrl =
        "http://localhost:3000/video/download/?token=mock-token";
      expect(VideoModel.getRowById).toHaveBeenCalledWith("1");
      expect(AuthController.generateTokenForVideoLink).toHaveBeenCalledWith(
        "video.mp4",
        "/uploads/video.mp4"
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(expectedUrl);
    });

    it("should return 400 for missing id in request payload", async () => {
      req.query = {};

      await getLinkToVideo(req, res);

      expect(VideoModel.getRowById).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Missing id in payload");
    });

    it("should return 500 for errors in processing", async () => {
      VideoModel.getRowById.mockRejectedValue(new Error("Database error"));

      await getLinkToVideo(req, res);

      expect(VideoModel.getRowById).toHaveBeenCalledWith("1");
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(new Error("Database error"));
    });
  });

  describe("getVideo", () => {
    let req, res;

    beforeEach(() => {
      req = {
        query: { filename: "video.mp4", filepath: "/uploads/video.mp4" },
      };
      res = {
        status: jest.fn().mockReturnThis(),
        sendFile: jest.fn(),
        send: jest.fn(),
      };

      jest.clearAllMocks();
    });

    it("should send the video file if it exists", () => {
      fs.existsSync.mockReturnValue(true);

      getVideo(req, res);

      expect(fs.existsSync).toHaveBeenCalledWith("/uploads/video.mp4");
      expect(res.sendFile).toHaveBeenCalledWith("/uploads/video.mp4");
    });

    it("should return 404 if the video file does not exist", () => {
      fs.existsSync.mockReturnValue(false);

      getVideo(req, res);

      expect(fs.existsSync).toHaveBeenCalledWith("/uploads/video.mp4");
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({ message: "Video not found" });
    });
  });
});

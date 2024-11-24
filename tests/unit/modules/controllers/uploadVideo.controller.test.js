const fs = require("fs");
const ffmpegUtils = require("../../../../utils/ffmpegUtils");
const VideoModel = require("../../../../modules/models/videos.model");
const {
  processAndValidateFile,
  insertVideoMetaData,
} = require("../../../../modules/controllers/uploadVideo.controller");

jest.mock("fs", () => ({
  unlinkSync: jest.fn(),
}));

jest.mock("../../../../utils/ffmpegUtils", () => ({
  getMetaData: jest.fn(),
}));

jest.mock("../../../../modules/models/videos.model", () => ({
  createRow: jest.fn(),
}));

describe("Video Controller", () => {
  describe("processAndValidateFile", () => {
    const mockNext = jest.fn();
    let req, res;

    beforeEach(() => {
      process.env.MAX_UPLOAD_FILE_SIZE = "25"; // in MB
      process.env.MIN_VIDEO_DURATION = "5"; // in seconds
      process.env.MAX_VIDEO_DURATION = "30"; // in seconds

      req = { file: { path: "", size: 0 } };
      res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      jest.clearAllMocks();
    });

    it("should call next() for a valid file", async () => {
      req.file.path = "/uploads/video.mp4";
      req.file.size = 10 * 1024 * 1024; // 10 MB
      ffmpegUtils.getMetaData.mockResolvedValue({ format: { duration: 10 } });

      await processAndValidateFile(req, res, mockNext);

      expect(ffmpegUtils.getMetaData).toHaveBeenCalledWith(req.file.path);
      expect(req.file.duration).toBe(10); // Mocked duration
      expect(mockNext).toHaveBeenCalled();
    });

    it("should return an error for a file exceeding max size", async () => {
      req.file.path = "/uploads/video1.mp4";
      req.file.size = 30 * 1024 * 1024; // 30 MB

      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await processAndValidateFile(req, res, mockNext);

      expect(fs.unlinkSync).toHaveBeenCalledWith(req.file.path);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        "File size is too large. Upload a video less than 25mb"
      );
    });

    it("should return an error for a video exceeding max duration", async () => {
      req.file.path = "/uploads/video1.mp4";
      req.file.size = 10 * 1024 * 1024; // 10 MB
      ffmpegUtils.getMetaData.mockResolvedValue({ format: { duration: 50 } });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await processAndValidateFile(req, res, mockNext);

      expect(ffmpegUtils.getMetaData).toHaveBeenCalledWith(req.file.path);
      expect(fs.unlinkSync).toHaveBeenCalledWith(req.file.path);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        "File duration is too large. Upload a video less than 30 secs"
      );
    });

    it("should return an error for a video below min duration", async () => {
      req.file.path = "/uploads/video2.mp4";
      req.file.size = 10 * 1024 * 1024; // 10 MB
      ffmpegUtils.getMetaData.mockResolvedValue({ format: { duration: 1 } });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await processAndValidateFile(req, res, mockNext);

      expect(ffmpegUtils.getMetaData).toHaveBeenCalledWith(req.file.path);
      expect(fs.unlinkSync).toHaveBeenCalledWith(req.file.path);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        "File duration is too small. Upload a video greater than 5 secs"
      );
    });

    it("should handle FFmpeg errors", async () => {
      req.file.path = "/uploads/video3.mp4";
      req.file.size = 10 * 1024 * 1024; // 10 MB
      ffmpegUtils.getMetaData.mockRejectedValue(new Error("FFmpeg error"));
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await processAndValidateFile(req, res, mockNext);

      expect(ffmpegUtils.getMetaData).toHaveBeenCalledWith(req.file.path);
      expect(fs.unlinkSync).toHaveBeenCalledWith(req.file.path);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("FFmpeg error");
    });
  });

  describe("insertVideoMetaData", () => {
    it("should insert metadata and return row id", async () => {
      const req = {
        file: {
          filename: "video.mp4",
          path: "/uploads/video.mp4",
          size: 123456,
          duration: 10,
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      VideoModel.createRow.mockResolvedValue(1);

      await insertVideoMetaData(req, res);

      expect(VideoModel.createRow).toHaveBeenCalledWith({
        filename: "video.mp4",
        path: "/uploads/video.mp4",
        size: 123456,
        duration: 10,
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({ id: 1 });
    });

    it("should handle errors during metadata insertion", async () => {
      const req = {
        file: {
          filename: "video.mp4",
          path: "/uploads/video.mp4",
          size: 123456,
          duration: 10,
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      VideoModel.createRow.mockRejectedValue(new Error("DB error"));
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await insertVideoMetaData(req, res);

      expect(VideoModel.createRow).toHaveBeenCalledWith({
        filename: "video.mp4",
        path: "/uploads/video.mp4",
        size: 123456,
        duration: 10,
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        "Error while trying to save metadata into db ",
        new Error("DB error")
      );
    });
  });
});

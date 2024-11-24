const {
  processAndValidateFile,
  insertVideoMetaData,
  getLinkToVideo,
  getVideo,
} = require("../../../controllers/videoProcess.controller");
const AuthController = require("../../../controllers/auth.controller");
const fs = require("fs");
const Database = require("../../../database");

jest.mock("../../../controllers/auth.controller");
jest.mock("../../../database");
jest.mock("fs");

describe("processAndValidateFile", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      file: {
        path: "/uploads/video.mp4",
        size: 5 * 1024 * 1024, // 5 MB
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();
    process.env.MAX_UPLOAD_FILE_SIZE = 25; // MB
    process.env.MAX_VIDEO_DURATION = 25; // seconds
    process.env.MIN_VIDEO_DURATION = 2; // seconds
  });

  it("should call next() if file size and duration are valid", async () => {
    await processAndValidateFile(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.file.duration).toBe(10);
  });

  it("should return 400 if file size is too large", () => {
    req.file.size = 30 * 1024 * 1024; // 30 MB

    processAndValidateFile(req, res, next);

    expect(fs.unlinkSync).toHaveBeenCalledWith("/uploads/video.mp4");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "File size is too large. Upload a video less than 25mb"
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 400 if video duration is too long", async () => {
    req.file.path = "/uploads/video1.mp4";

    await processAndValidateFile(req, res, next);

    expect(fs.unlinkSync).toHaveBeenCalledWith("/uploads/video.mp4");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "File duration is too large. Upload a video less than 25 secs"
    );
  });

  it("should return 400 if video duration is too short", async () => {
    req.file.path = "/uploads/video2.mp4";

    await processAndValidateFile(req, res, next);

    expect(fs.unlinkSync).toHaveBeenCalledWith("/uploads/video.mp4");
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      "File duration is too small. Upload a video greater than 2 secs"
    );
  });

  it("should return 500 if ffprobe encounters an error", async () => {
    req.file.path = "/uploads/video3.mp4";

    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    await processAndValidateFile(req, res, next);

    expect(fs.unlinkSync).toHaveBeenCalledWith("/uploads/video.mp4");
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      "Error with ffmpeg ",
      new Error("FFmpeg error")
    );
  });
});

describe("insertVideoMetaData", () => {
  let req, res;

  beforeEach(() => {
    req = {
      file: {
        filename: "video.mp4",
        path: "/uploads/video.mp4",
        size: 5 * 1024 * 1024, // 5 MB
        duration: 20, // seconds
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    Database.getDb.mockReturnValue({
      run: jest.fn(),
    });
  });

  it("should return 200 with the video ID on successful insertion", () => {
    const dbMock = Database.getDb();
    dbMock.run.mockImplementation((query, params, callback) => {
      callback = callback.bind({ lastID: 1 });
      callback(null); // No error
      dbMock.run.mock.calls[0][2].apply({ lastID: 1 });
    });

    insertVideoMetaData(req, res);

    expect(dbMock.run).toHaveBeenCalledWith(
      "INSERT INTO videos (filename, filepath) VALUES ($name,$path)",
      { $name: "video.mp4", $path: "/uploads/video.mp4" },
      expect.any(Function)
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith({ id: 1 });
  });

  it("should return 500 if there is a database error", () => {
    const dbMock = Database.getDb();
    dbMock.run.mockImplementation((query, params, callback) => {
      callback(new Error("Database error"));
    });

    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    insertVideoMetaData(req, res);

    expect(dbMock.run).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      "Error while trying to save metadata into db ",
      new Error("Database error")
    );
  });
});

describe("getLinkToVideo", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        id: 1,
      },
      protocol: "http",
      get: () => "localhost:8080",
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    Database.getDb.mockReturnValue({
      get: jest.fn(),
    });
  });

  it("should return 500 if database error occurs", async () => {
    const dbMock = Database.getDb();
    dbMock.get.mockImplementation((query, params, callback) => {
      callback(new Error("Database error"));
    });

    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    await getLinkToVideo(req, res);

    expect(dbMock.get).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({
      message: "Error while fetching video metadata from db ",
      error: new Error("Database error"),
    });
  });

  it("should return 404 if file does not exist", async () => {
    const dbMock = Database.getDb();
    dbMock.get.mockImplementation((query, params, callback) => {
      callback(null, { filename: "video.mp4", filepath: "./video.mp4" });
    });

    jest.spyOn(console, "error").mockImplementationOnce(() => {});
    fs.existsSync.mockReturnValue(false);

    await getLinkToVideo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({
      message: "Video not found with id 1",
    });
  });

  it("should return video link if token generation is successful", async () => {
    const dbMock = Database.getDb();
    dbMock.get.mockImplementation((query, params, callback) => {
      callback(null, { filename: "video.mp4", filepath: "./video.mp4" });
    });

    fs.existsSync.mockReturnValue(true);
    AuthController.generateTokenForVideoLink.mockResolvedValue("mockToken");

    req.query.id = 1;

    await getLinkToVideo(req, res);

    expect(AuthController.generateTokenForVideoLink).toHaveBeenCalledWith(
      "video.mp4",
      "./video.mp4"
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      "http://localhost:8080/video/download/?token=mockToken"
    );
  });
});

describe("getVideo", () => {
  let req, res;

  beforeEach(() => {
    req = {
      query: {
        filename: "video.mp4",
        filepath: "./video.mp4",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };

    Database.getDb.mockReturnValue({
      get: jest.fn(),
    });
  });

  it("should return 404 if file does not exist", () => {
    fs.existsSync.mockReturnValue(false);

    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    getVideo(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ message: "Video not found" });
  });

  it("should send file if it exists", () => {
    fs.existsSync.mockReturnValue(true);

    res.sendFile = jest.fn();

    getVideo(req, res);

    expect(res.sendFile).toHaveBeenCalledWith("./video.mp4");
  });
});

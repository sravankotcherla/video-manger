const request = require("supertest");
const path = require("path");
const { initServer } = require("../../index");
require("dotenv").config({ path: "../../.env.test" });
const fs = require("fs");
const jwt = require("jsonwebtoken");

jest.unmock("fluent-ffmpeg");
jest
  .spyOn(jwt, "sign")
  .mockImplementation((payload, privateKey, options, callback) => {
    callback(null, "mocked.jwt.token");
  });

const mockedTimestamp = 1690000000000;
jest.spyOn(global.Date, "now").mockImplementation(() => mockedTimestamp);
const mockUploadFile1Path = path.resolve(
  __dirname,
  `./media/${mockedTimestamp}_valid-video.mp4`
);
const mockUploadFile2Path = path.resolve(
  __dirname,
  `./media/${mockedTimestamp}_trimmed_${mockedTimestamp}_valid-video.mp4`
);

// Mock database to avoid real writes during testing
jest.mock("../../database", () => ({
  initDb: jest.fn(() => Promise.resolve()),
  getDb: jest.fn(() => ({
    run: jest.fn((query, params, callback) => {
      if (query.includes("INSERT INTO")) {
        callback = callback.apply({ lastID: 1 });
        callback(null);
      }
    }),
    get: jest.fn((query, params, callback) => {
      if (params["$id"] == "999") {
        callback(null, null);
      } else if (params["$id"] == "2") {
        callback(null, {
          id: 2,
          filename: `${mockedTimestamp}_trimmed_${mockedTimestamp}_valid-video.mp4`,
          filepath: mockUploadFile2Path,
          duration: 5,
        });
      } else if (query.includes("SELECT * FROM videos WHERE ID")) {
        callback(null, {
          id: 1,
          filename: `${mockedTimestamp}_valid-video.mp4`,
          filepath: mockUploadFile1Path,
          duration: 13,
        });
      }
    }),
    all: jest.fn((query, params, callback) => {
      if (params.includes(999)) {
        callback(null, []);
      } else {
        callback(null, [
          {
            id: 1,
            filename: `${mockedTimestamp}_valid-video.mp4`,
            filepath: mockUploadFile1Path,
            duration: 13,
          },
          {
            id: 2,
            filename: `${mockedTimestamp}_trimmed_${mockedTimestamp}_valid-video.mp4`,
            filepath: mockUploadFile2Path,
            duration: 5,
          },
        ]);
      }
    }),
  })),
}));

let server;
const uploadFolder = path.resolve(
  __dirname,
  process.env.UPLOAD_FOLDER_NAME || "media"
);

beforeAll(async () => {
  server = await initServer();

  if (!server) {
    console.error("Failed to initialize the server.");
    process.exit(1);
  }

  if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder, { recursive: true });
  }
});

afterAll(async () => {
  if (server) server.close();
  if (fs.existsSync(uploadFolder)) {
    fs.rmSync(uploadFolder, { recursive: true, force: true });
  }
});

describe("Video API E2E Tests", () => {
  let uploadedVideoId;

  describe("Video Upload API", () => {
    it("should upload a valid video file and return video ID", async () => {
      const testVideoPath = path.resolve(__dirname, "assets/valid-video.mp4");

      if (!fs.existsSync(testVideoPath)) {
        throw new Error("Test video file not found at " + testVideoPath);
      }

      const response = await request(server)
        .post(`/videos/upload`)
        .attach("video", testVideoPath)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id");
      uploadedVideoId = response.body.id; // Save the video ID for subsequent tests
    });

    it("should reject a video file larger than the allowed size", async () => {
      const testLargeVideoPath = path.join(__dirname, "assets/large-video.mp4");

      if (!fs.existsSync(testLargeVideoPath)) {
        console.error(
          "test case failed. File not found at ",
          testLargeVideoPath
        );
      }
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/upload")
        .attach("video", testLargeVideoPath)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain("File size is too large");
    });

    it("should reject a video shorter than the minimum duration", async () => {
      const testShortVideoPath = path.resolve(
        __dirname,
        "assets/short-video.mp4"
      );

      if (!fs.existsSync(testShortVideoPath)) {
        console.error(
          "test case failed. File not found at ",
          testShortVideoPath
        );
      }
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/upload")
        .attach("video", testShortVideoPath)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain("File duration is too small");
    });

    it("should reject a video longer than the maximum duration", async () => {
      const testLongVideoPath = path.resolve(
        __dirname,
        "assets/long-video.mp4"
      );

      if (!fs.existsSync(testLongVideoPath)) {
        console.error(
          "test case failed. File not found at ",
          testLongVideoPath
        );
      }
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/upload")
        .attach("video", testLongVideoPath)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain("File duration is too large");
    });
    //   const testLargeVideoPath = path.resolve(
    //     __dirname,
    //     "assets/large-video.mp4"
    //   );
    //   jest.spyOn(console, "error").mockImplementationOnce(() => {});

    //   if (!fs.existsSync(testLargeVideoPath)) {
    //     throw new Error(
    //       "Test large video file not found at " + testLargeVideoPath
    //     );
    //   }

    //   const response = await request(server)
    //     .post("/videos/upload")
    //     .attach("video", testLargeVideoPath)
    //     .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

    //   expect(response.status).toBe(400);
    //   expect(response.text).toContain("File size is too large");
    // });
  });

  describe("Get Link to Video API", () => {
    it("should return a resource URL for a valid video ID", async () => {
      const response = await request(server)
        .get(`/videos/${uploadedVideoId}/link`)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(200);

      const url = response.text;
      expect(url).toContain("/videos/download/?token=");
    });

    it("should reject when an invalid ID is provided", async () => {
      const invalidId = 999;
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .get(`/videos/${invalidId}/link`)
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain("Video not found");
    });
  });

  describe("Video Trim API", () => {
    it("should trim a video and return a new video id", async () => {
      const response = await request(server)
        .post("/videos/1/trim")
        .send({ start: 5, duration: 5 })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined(); // Ensure that the ID of the trimmed video is returned
    });

    it("should return an error if the start time or duration is invalid", async () => {
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/1/trim")
        .send({ start: 30, duration: 5 })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("Invalid start time or duration");
    });

    it("should return an error if missing required fields in the request body", async () => {
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/1/trim")
        .send({ start: 5 }) // Missing duration
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain(
        "Invalid payload. Missing id or startTime or duration"
      );
    });

    it("should reject trimming with an invalid video ID", async () => {
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const response = await request(server)
        .post("/videos/999/trim")
        .send({ start: 5, duration: 5 })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain("Video not found with id");
    });
  });

  describe("Merge Videos API", () => {
    it("should merge videos and return a new video ID", async () => {
      const response = await request(server)
        .post("/videos/merge")
        .send({
          ids: [1, 2],
          outputFileName: "merged-video.mp4",
        })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("id"); // Ensure merged video ID is returned
    });

    it("should return an error if any video ID is missing", async () => {
      const response = await request(server)
        .post("/videos/merge")
        .send({
          ids: [1, 999],
          outputFileName: "merged-video.mp4",
        })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain("Videos not found");
    });

    it("should return an error if required fields are missing", async () => {
      const response = await request(server)
        .post("/videos/merge")
        .send({ ids: [1, 2] }) // Missing outputFileName
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(400);
      expect(response.text).toContain(
        "Missing payload info like ids or outputFileName"
      );
    });

    it("should handle merging failure gracefully", async () => {
      jest
        .spyOn(require("../../utils/ffmpegUtils"), "mergeVideos")
        .mockRejectedValueOnce(new Error("FFMPEG Merge Error"));

      const response = await request(server)
        .post("/videos/merge")
        .send({
          ids: [1, 2],
          outputFileName: "merged-video.mp4",
        })
        .set("Authorization", `Bearer ${process.env.AUTH_TOKEN}`);

      expect(response.status).toBe(500);
      expect(response.text).toContain("FFMPEG Merge Error");
    });
  });
});

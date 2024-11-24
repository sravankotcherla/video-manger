const request = require("supertest");
const fs = require("fs");
const path = require("path");

const { initServer } = require("../../index");
require("dotenv").config({ path: "../../.env.test" });

jest.unmock("fluent-ffmpeg");

// Mock database to avoid real writes during testing
jest.mock("../../database", () => ({
  initDb: jest.fn(() => {
    return new Promise((resolve, reject) => {
      resolve();
    });
  }),
  getDb: jest.fn(() => ({
    run: jest.fn((query, params, callback) => {
      if (query.includes("INSERT INTO")) {
        callback = callback.apply({ lastID: 1 });
        callback(null);
      }
    }),
  })),
}));

let server;
const uploadFolder = path.resolve(__dirname, process.env.UPLOAD_FOLDER_NAME);

beforeAll(async () => {
  server = await initServer();
  if (server) console.log("Test Server running ");

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

describe("Video Upload API", () => {
  it("should upload a valid video file and save metadata", async () => {
    const testVideoPath = path.resolve(__dirname, "assets/valid-video.mp4");

    if (!fs.existsSync(testVideoPath)) {
      console.error("test case failed. File not found at ", testVideoPath);
    }

    const response = await request(server)
      .post(`/video/upload`)
      .attach("video", testVideoPath);
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id");
  });

  it("should reject a video file larger than the allowed size", async () => {
    const testLargeVideoPath = path.join(__dirname, "assets/large-video.mp4");

    if (!fs.existsSync(testLargeVideoPath)) {
      console.error("test case failed. File not found at ", testLargeVideoPath);
    }
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const response = await request(server)
      .post("/video/upload")
      .attach("video", testLargeVideoPath);

    expect(response.status).toBe(400);
    expect(response.text).toContain("File size is too large");
  });

  it("should reject a video shorter than the minimum duration", async () => {
    const testShortVideoPath = path.resolve(
      __dirname,
      "assets/short-video.mp4"
    );

    if (!fs.existsSync(testShortVideoPath)) {
      console.error("test case failed. File not found at ", testShortVideoPath);
    }
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const response = await request(server)
      .post("/video/upload")
      .attach("video", testShortVideoPath);

    expect(response.status).toBe(400);
    expect(response.text).toContain("File duration is too small");
  });

  it("should reject a video longer than the maximum duration", async () => {
    const testLongVideoPath = path.resolve(__dirname, "assets/long-video.mp4");

    if (!fs.existsSync(testLongVideoPath)) {
      console.error("test case failed. File not found at ", testLongVideoPath);
    }
    jest.spyOn(console, "error").mockImplementationOnce(() => {});

    const response = await request(server)
      .post("/video/upload")
      .attach("video", testLongVideoPath);

    expect(response.status).toBe(400);
    expect(response.text).toContain("File duration is too large");
  });
});

const Database = require("../../../../database");
const fs = require("fs");
const {
  createRow,
  getRowById,
} = require("../../../../modules/models/videos.model");

jest.mock("../../../../database", () => ({
  getDb: jest.fn(() => ({
    run: jest.fn(),
    get: jest.fn(),
  })),
}));

jest.mock("fs", () => ({
  existsSync: jest.fn(),
}));

describe("Database Operations", () => {
  describe("createRow", () => {
    it("should successfully insert a row and return the id", async () => {
      const mockRun = jest.fn((query, params, callback) => callback(null));
      Database.getDb.mockReturnValue({ run: mockRun });

      const rowData = {
        filename: "video.mp4",
        path: "/uploads/video.mp4",
        size: 123456,
        duration: 60,
      };

      const result = await createRow(rowData);
      expect(result).toEqual({ id: undefined }); // `this.lastID` will be undefined in mock
      expect(mockRun).toHaveBeenCalledWith(
        "INSERT INTO videos (filename, filepath, size, duration) VALUES ($name,$path,$size,$duration)",
        {
          $name: rowData.filename,
          $path: rowData.path,
          $size: rowData.size,
          $duration: rowData.duration,
        },
        expect.any(Function)
      );
    });

    it("should reject with an error if the insert fails", async () => {
      const mockRun = jest.fn((query, params, callback) =>
        callback(new Error("DB Insert Error"))
      );
      Database.getDb.mockReturnValue({ run: mockRun });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const rowData = {
        filename: "video.mp4",
        path: "/uploads/video.mp4",
        size: 123456,
        duration: 60,
      };

      await expect(createRow(rowData)).rejects.toThrow("DB Insert Error");
    });
  });

  describe("getRowById", () => {
    it("should resolve with the row data if found and file exists", async () => {
      const mockGet = jest.fn((query, params, callback) =>
        callback(null, {
          id: 1,
          filename: "video.mp4",
          filepath: "/uploads/video.mp4",
          size: 123456,
          duration: 60,
        })
      );
      fs.existsSync.mockReturnValue(true);
      Database.getDb.mockReturnValue({ get: mockGet });

      const result = await getRowById(1);

      expect(result).toEqual({
        id: 1,
        filename: "video.mp4",
        filepath: "/uploads/video.mp4",
        size: 123456,
        duration: 60,
      });
      expect(mockGet).toHaveBeenCalledWith(
        "SELECT * FROM videos WHERE ID=$id",
        { $id: 1 },
        expect.any(Function)
      );
      expect(fs.existsSync).toHaveBeenCalledWith("/uploads/video.mp4");
    });

    it("should reject if the row is not found", async () => {
      const mockGet = jest.fn((query, params, callback) =>
        callback(null, null)
      );
      Database.getDb.mockReturnValue({ get: mockGet });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await expect(getRowById(1)).rejects.toEqual({
        message: "Video not found with id 1",
      });
    });

    it("should reject if there is a database error", async () => {
      const mockGet = jest.fn((query, params, callback) =>
        callback(new Error("DB Error"), null)
      );
      Database.getDb.mockReturnValue({ get: mockGet });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await expect(getRowById(1)).rejects.toEqual({
        message: "Error while fetching video metadata from db ",
        error: new Error("DB Error"),
      });
    });

    it("should reject if the file does not exist", async () => {
      const mockGet = jest.fn((query, params, callback) =>
        callback(null, {
          id: 1,
          filename: "video.mp4",
          filepath: "/uploads/video.mp4",
          size: 123456,
          duration: 60,
        })
      );
      fs.existsSync.mockReturnValue(false);
      Database.getDb.mockReturnValue({ get: mockGet });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      await expect(getRowById(1)).rejects.toEqual({
        message: "Video not found with id 1",
      });
      expect(fs.existsSync).toHaveBeenCalledWith("/uploads/video.mp4");
    });
  });

  const Database = require("../../../../database");
  const { getRowsByIds } = require("../../../../modules/models/videos.model");

  jest.mock("../../../../database", () => ({
    getDb: jest.fn(() => ({
      all: jest.fn(),
    })),
  }));

  describe("getRowsByIds", () => {
    it("should return rows for valid ids", async () => {
      const mockAll = jest.fn((query, params, callback) =>
        callback(null, [
          {
            id: 1,
            filename: "video1.mp4",
            filepath: "/uploads/video1.mp4",
            size: 123456,
            duration: 60,
          },
          {
            id: 2,
            filename: "video2.mp4",
            filepath: "/uploads/video2.mp4",
            size: 789012,
            duration: 120,
          },
        ])
      );
      Database.getDb.mockReturnValue({ all: mockAll });

      const ids = [1, 2];
      const result = await getRowsByIds(ids);

      expect(result).toEqual([
        {
          id: 1,
          filename: "video1.mp4",
          filepath: "/uploads/video1.mp4",
          size: 123456,
          duration: 60,
        },
        {
          id: 2,
          filename: "video2.mp4",
          filepath: "/uploads/video2.mp4",
          size: 789012,
          duration: 120,
        },
      ]);
    });

    it("should reject with an error if the query fails", async () => {
      const mockAll = jest.fn((query, params, callback) =>
        callback(new Error("DB Error"), null)
      );
      Database.getDb.mockReturnValue({ all: mockAll });
      jest.spyOn(console, "error").mockImplementationOnce(() => {});

      const ids = [1, 2];

      await expect(getRowsByIds(ids)).rejects.toEqual(new Error("DB Error"));
    });

    it("should return an empty array if no rows are found", async () => {
      const mockAll = jest.fn((query, params, callback) => callback(null, []));
      Database.getDb.mockReturnValue({ all: mockAll });

      const ids = [1, 2];
      const result = await getRowsByIds(ids);

      expect(result).toEqual([]);
    });
  });
});

const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();

const mockDb = jest.fn(() => ({
  run: mockRun,
  get: mockGet,
  all: mockAll,
  close: mockClose,
}));

const mockVerbose = jest.fn(() => ({
  Database: mockDb,
}));

const sqlite3 = {
  verbose: mockVerbose,
};

module.exports = sqlite3;

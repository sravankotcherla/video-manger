const mockRun = jest.fn();
const mockGet = jest.fn();
const mockAll = jest.fn();
const mockClose = jest.fn();

const mockDatabase = jest.fn(() => ({
  run: mockRun,
  get: mockGet,
  all: mockAll,
  close: mockClose,
}));

const mockVerbose = jest.fn(() => ({
  Database: mockDatabase,
}));

const sqlite3 = {
  Database: mockDatabase,
  verbose: mockVerbose,
};

module.exports = sqlite3;

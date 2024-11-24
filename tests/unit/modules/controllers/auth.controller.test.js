const jwt = require("jsonwebtoken");
const {
  generateTokenForVideoLink,
  authorizeLink,
} = require("../../../../modules/controllers/auth.controller");

jest.mock("jsonwebtoken");

describe("generateTokenForVideoLink", () => {
  const mockFilename = "video.mp4";
  const mockFilepath = "/videos/video.mp4";

  it("should generate a token successfully", async () => {
    const expectedToken = "mockToken123";
    jwt.sign.mockImplementation((payload, secret, options, callback) => {
      callback(null, expectedToken);
    });

    const token = await generateTokenForVideoLink(mockFilename, mockFilepath);

    expect(token).toBe(expectedToken);
    expect(jwt.sign).toHaveBeenCalledWith(
      { filename: mockFilename, filepath: mockFilepath },
      process.env.JWT_SECRET,
      expect.objectContaining({
        expiresIn: parseInt(process.env.VIDEO_LINK_EXPIRY || 60),
      }),
      expect.any(Function)
    );
  });

  it("should throw an error when generating the token fails", async () => {
    const errorMessage = "Error generating token";
    jwt.sign.mockImplementation((payload, secret, options, callback) => {
      callback(new Error(errorMessage), null);
    });

    await expect(
      generateTokenForVideoLink(mockFilename, mockFilepath)
    ).rejects.toThrow(errorMessage);
  });
});

describe("authorizeLink", () => {
  const mockRequest = (token) => ({
    query: token ? { token } : {},
  });

  const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn();

  it("should authorize the link successfully", () => {
    const mockToken = "validToken";
    const mockTokenInfo = {
      filepath: "/videos/video.mp4",
      filename: "video.mp4",
    };

    // Simulate successful verification
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, mockTokenInfo);
    });

    let mockReqObj = mockRequest(mockToken);
    authorizeLink(mockReqObj, mockResponse(), mockNext);

    expect(mockNext).toHaveBeenCalledWith(null);
    expect(mockReqObj.query).toEqual(mockTokenInfo);
  });

  it("should return 401 when the token is invalid", () => {
    const mockToken = "invalidToken";
    const mockError = new Error("Invalid token");

    // Simulate token verification failure
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(mockError, null);
    });

    const mockResObj = mockResponse();
    authorizeLink(mockRequest(mockToken), mockResObj, mockNext);

    expect(mockResObj.status).toHaveBeenCalledWith(401);
    expect(mockResObj.send).toHaveBeenCalledWith(mockError);
  });

  it("should return 401 when token does not contain filename or filepath", () => {
    const mockToken = "validToken";
    const mockTokenInfo = {};

    // Simulate corrupt token info (missing filename and filepath)
    jwt.verify.mockImplementation((token, secret, callback) => {
      callback(null, mockTokenInfo);
    });

    const mockResObj = mockResponse();
    authorizeLink(mockRequest(mockToken), mockResObj, mockNext);

    expect(mockResObj.status).toHaveBeenCalledWith(401);
    expect(mockResObj.send).toHaveBeenCalledWith({
      message: "Corrupt token",
    });
  });
});

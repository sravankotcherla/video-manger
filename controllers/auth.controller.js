const jwt = require("jsonwebtoken");

exports.generateTokenForVideoLink = async (filename, filepath) => {
  const tokenExpiryTime = process.env.VIDEO_LINK_EXPIRY || 60; // in secs
  const privateKey = process.env.JWT_SECRET;
  const token = await new Promise((resolve, reject) => {
    jwt.sign(
      { filename, filepath },
      privateKey,
      {
        expiresIn: parseInt(tokenExpiryTime),
      },
      (err, token) => {
        if (err) {
          return reject(err);
        }
        return resolve(token);
      }
    );
  });
  return token;
};

exports.authorizeLink = (req, res, next) => {
  const { token } = req.query;
  const jwtSecret = process.env.JWT_SECRET;
  jwt.verify(token, jwtSecret, function (err, tokenInfo) {
    if (err) {
      return res.status(401).send(err);
    }
    const { filepath, filename } = tokenInfo;
    if (!filepath || !filename) {
      return res.status(401).send({ message: "Corrupt token" });
    }
    req.query = { filename, filepath };
    return next(null);
  });
};

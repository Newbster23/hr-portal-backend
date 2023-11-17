const jwt = require("jsonwebtoken");
const { jwtDecode } = require("jwt-decode");
const { jwtSecretKey } = require("../services/jwtKeyService");

const verifyUser = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.json({ status: 401, Error: "User is not authenticated" });
  }

  jwt.verify(token, jwtSecretKey, (err, decoded) => {
    if (err) {
      return res.json({ status: 401, Error: "Token is not valid" });
    }

    // Check token expiration
    const decodedToken = jwtDecode(token);
    const currentTime = Date.now() / 1000;

    if (decodedToken.exp && decodedToken.exp < currentTime) {
      return res.json({ status: 401, error: "Token has expired" });
    }

    req.username = decoded.username;
    next();
  });
};

module.exports = { verifyUser };

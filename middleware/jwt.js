const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.JWT_SECRET;

const checkUserToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
// console.log('authHeader',authHeader);

  if (!authHeader) {
    return res.status(401).json({
      status: 401,
      response: "Missing User Token in the headers",
    });
  }

  // Extract the token from the authorization header
  const token = authHeader.split(' ')[1];

  try {
    // Verify and decode the token
    const decoded = jwt.verify(token, SECRET_KEY);

    // Attach the decoded user data and token to the request object
    req.userId = decoded?.userId;
    req.tokenData = decoded; // Attach the entire decoded token

    // Proceed to the next middleware or route handler
    next();
  } catch (error) {
    // Handle different token errors
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ response: "Invalid token" });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 401,
        response: "Token expired"
      });
    }
    return res.status(500).json({
      status: 500,
      response: "Internal Server Error"
    });
  }
};

module.exports = checkUserToken;

const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || 'dev_access_secret';

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>"
  console.log('Authorization header:', authHeader);
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token missing' });
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    // Access token expire ho gaya -> frontend ko /refresh call karna chahiye
    return res.status(401).json({ message: 'Access token expired or invalid' });
  }
}

module.exports = { requireAuth, ACCESS_TOKEN_SECRET };
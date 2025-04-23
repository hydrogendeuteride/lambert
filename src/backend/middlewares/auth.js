const jwt = require('jsonwebtoken');
const secretKey = process.env.SESSION_SECRET;

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  
    try {
      const decoded = jwt.verify(token, secretKey);
      req.user = decoded;
      next();
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized' });
    }
  };
  
  const authRole = (roles = []) => {
    if (typeof roles === 'string') {
      roles = [roles];
    }
  
    return (req, res, next) => {
      if (roles.length && !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      next();
    };
  };
  
  module.exports = { verifyToken, authRole };
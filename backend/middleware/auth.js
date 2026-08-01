const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-reward-points-key-999';

async function auth(req, res, next) {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization token, access denied' });
  }

  // Expecting format: Bearer <token>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ message: 'Token format is invalid, must be Bearer <token>' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.findUserById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User associated with this token no longer exists' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      facultyResponsibility: user.facultyResponsibility || null
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid or has expired' });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Administrator privileges required' });
  }
  next();
}

function adminOrFaculty(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'faculty')) {
    return res.status(403).json({ message: 'Access denied: Administrator or Faculty privileges required' });
  }
  next();
}

module.exports = {
  auth,
  adminOnly,
  adminOrFaculty,
  JWT_SECRET
};

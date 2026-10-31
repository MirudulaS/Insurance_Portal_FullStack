const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { ApiError } = require('../utils/helpers');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) return next(new ApiError(401, 'Not authenticated.'));

  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.user = payload; // { id, name, role, linkedId }
    next();
  } catch (err) {
    next(new ApiError(401, 'Session expired. Please log in again.'));
  }
}

// Usage: allowRoles('INSURER', 'ADMIN')
function allowRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'You do not have permission to perform this action.'));
    }
    next();
  };
}

module.exports = { authenticate, allowRoles };

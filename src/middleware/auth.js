const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/helpers');

const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Session expired. Please sign in again.');
  }
  const user = await User.findById(payload.id).lean();
  if (!user) throw new ApiError(401, 'Account no longer exists');
  req.user = { id: user._id.toString(), role: user.role, name: user.name, email: user.email };
  next();
});

const authorize = (...roles) => (req, _res, next) =>
  roles.includes(req.user?.role) ? next() : next(new ApiError(403, 'You do not have permission to do this'));

module.exports = { protect, authorize };

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { ApiError, asyncHandler } = require('../utils/helpers');

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  // Same message for unknown email and wrong password to avoid user enumeration.
  if (!user || !(await user.comparePassword(password))) throw new ApiError(401, 'Incorrect email or password');
  res.json({
    token: sign(user._id),
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

exports.me = asyncHandler(async (req, res) => res.json({ user: req.user }));

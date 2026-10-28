const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  let status = err.status || 500;
  let message = err.message || 'Something went wrong';
  let details = err.details;

  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyPattern || {})[0] || 'value';
    message = `A record with this ${field} already exists`;
    details = { [field]: `This ${field} is already in use` };
  } else if (err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  }

  if (status >= 500) console.error(err);
  const safe = status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message;
  res.status(status).json({ message: safe, details });
};

module.exports = { notFound, errorHandler };

const mongoose = require('mongoose');

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

/** Builds a createdAt range filter from ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive). */
function dateRange(from, to) {
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!isNaN(d)) range.$gte = d;
  }
  if (to) {
    const d = new Date(to);
    if (!isNaN(d)) {
      d.setUTCHours(23, 59, 59, 999);
      range.$lte = d;
    }
  }
  return Object.keys(range).length ? range : null;
}

/** Normalises ?page & ?limit. */
function paging(query, maxLimit = 50) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), maxLimit);
  return { page, limit, skip: (page - 1) * limit };
}

const pageMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  totalPages: Math.max(Math.ceil(total / limit), 1),
});

const SORTS = {
  newest: { createdAt: -1, _id: -1 },
  oldest: { createdAt: 1, _id: 1 },
  name: { name: 1, _id: 1 },
};
const sortFrom = (key) => SORTS[key] || SORTS.newest;

module.exports = { ApiError, asyncHandler, escapeRegex, isValidId, dateRange, paging, pageMeta, sortFrom };

const { ZodError } = require('zod');
const { ApiError } = require('../utils/helpers');

/** validate(schema) parses req.body and replaces it with the cleaned value. */
const validate = (schema) => (req, _res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      const details = {};
      err.issues.forEach((i) => {
        const key = i.path.join('.') || 'form';
        if (!details[key]) details[key] = i.message;
      });
      return next(new ApiError(422, 'Please fix the highlighted fields', details));
    }
    next(err);
  }
};

module.exports = validate;

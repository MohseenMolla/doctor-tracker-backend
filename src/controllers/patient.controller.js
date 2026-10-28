const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { ApiError, asyncHandler, escapeRegex, isValidId, dateRange, paging, pageMeta, sortFrom } = require('../utils/helpers');

const withId = (req) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  return req.params.id;
};

/** GET /patients?search=&condition=&gender=&doctor=&from=&to=&sort=&page=&limit= */
exports.list = asyncHandler(async (req, res) => {
  const { search, condition, gender, doctor, from, to, sort } = req.query;
  const { page, limit, skip } = paging(req.query);

  const filter = {};
  if (condition) filter.condition = condition;
  if (gender) filter.gender = gender;
  if (doctor) {
    if (!isValidId(doctor)) throw new ApiError(400, 'Invalid doctor id');
    filter.doctor = doctor;
  }
  const range = dateRange(from, to);
  if (range) filter.createdAt = range;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { condition: rx }, { phone: rx }, { email: rx }];
  }

  const [data, total] = await Promise.all([
    Patient.find(filter).sort(sortFrom(sort)).skip(skip).limit(limit).populate('doctor', 'name specialization').lean(),
    Patient.countDocuments(filter),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

exports.facets = asyncHandler(async (_req, res) => {
  const conditions = await Patient.distinct('condition');
  res.json({ conditions: conditions.sort() });
});

exports.create = asyncHandler(async (req, res) => {
  if (!(await Doctor.exists({ _id: req.body.doctor }))) throw new ApiError(404, 'Selected doctor does not exist');
  const patient = await Patient.create(req.body);
  res.status(201).json({ data: patient });
});

exports.update = asyncHandler(async (req, res) => {
  if (!(await Doctor.exists({ _id: req.body.doctor }))) throw new ApiError(404, 'Selected doctor does not exist');
  const patient = await Patient.findByIdAndUpdate(withId(req), req.body, { new: true, runValidators: true });
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ data: patient });
});

exports.remove = asyncHandler(async (req, res) => {
  const patient = await Patient.findByIdAndDelete(withId(req));
  if (!patient) throw new ApiError(404, 'Patient not found');
  res.json({ message: 'Patient deleted' });
});

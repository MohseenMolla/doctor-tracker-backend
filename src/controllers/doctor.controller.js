const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { ApiError, asyncHandler, escapeRegex, isValidId, dateRange, paging, pageMeta, sortFrom } = require('../utils/helpers');

const withId = (req) => {
  if (!isValidId(req.params.id)) throw new ApiError(400, 'Invalid doctor id');
  return req.params.id;
};

/** GET /doctors?search=&specialization=&hospital=&from=&to=&sort=&page=&limit= */
exports.list = asyncHandler(async (req, res) => {
  const { search, specialization, hospital, from, to, sort } = req.query;
  const { page, limit, skip } = paging(req.query);

  const filter = {};
  if (specialization) filter.specialization = specialization;
  if (hospital) filter.hospital = hospital;
  const range = dateRange(from, to);
  if (range) filter.createdAt = range;
  if (search && search.trim()) {
    const rx = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [{ name: rx }, { specialization: rx }, { hospital: rx }, { email: rx }, { phone: rx }];
  }

  const [items, total] = await Promise.all([
    Doctor.find(filter).sort(sortFrom(sort)).skip(skip).limit(limit).lean(),
    Doctor.countDocuments(filter),
  ]);

  // One grouped query (uses the doctor index) for the patient counts of this page only: avoids N+1.
  const counts = await Patient.aggregate([
    { $match: { doctor: { $in: items.map((d) => d._id) } } },
    { $group: { _id: '$doctor', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [c._id.toString(), c.count]));
  const data = items.map((d) => ({ ...d, patientCount: countMap.get(d._id.toString()) || 0 }));

  res.json({ data, meta: pageMeta(total, page, limit) });
});

/** Distinct values for the filter dropdowns. */
exports.facets = asyncHandler(async (_req, res) => {
  const [specializations, hospitals] = await Promise.all([Doctor.distinct('specialization'), Doctor.distinct('hospital')]);
  res.json({ specializations: specializations.sort(), hospitals: hospitals.sort() });
});

/** Lightweight list for <select> inputs. */
exports.options = asyncHandler(async (_req, res) => {
  const data = await Doctor.find().select('name specialization').sort({ name: 1 }).lean();
  res.json({ data });
});

exports.create = asyncHandler(async (req, res) => {
  const doctor = await Doctor.create(req.body);
  res.status(201).json({ data: doctor });
});

exports.getOne = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findById(withId(req)).lean();
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  const patientCount = await Patient.countDocuments({ doctor: doctor._id });
  res.json({ data: { ...doctor, patientCount } });
});

exports.update = asyncHandler(async (req, res) => {
  const doctor = await Doctor.findByIdAndUpdate(withId(req), req.body, { new: true, runValidators: true });
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  res.json({ data: doctor });
});

/** Deleting a doctor also removes their patients so no orphaned records remain. */
exports.remove = asyncHandler(async (req, res) => {
  const id = withId(req);
  const doctor = await Doctor.findByIdAndDelete(id);
  if (!doctor) throw new ApiError(404, 'Doctor not found');
  const { deletedCount } = await Patient.deleteMany({ doctor: id });
  res.json({ message: 'Doctor deleted', removedPatients: deletedCount });
});

/** GET /doctors/:id/patients  (paginated) */
exports.patients = asyncHandler(async (req, res) => {
  const id = withId(req);
  const { page, limit, skip } = paging(req.query);
  const [data, total] = await Promise.all([
    Patient.find({ doctor: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Patient.countDocuments({ doctor: id }),
  ]);
  res.json({ data, meta: pageMeta(total, page, limit) });
});

/** POST /doctors/:id/patients */
exports.addPatient = asyncHandler(async (req, res) => {
  const id = withId(req);
  if (!(await Doctor.exists({ _id: id }))) throw new ApiError(404, 'Doctor not found');
  const patient = await Patient.create({ ...req.body, doctor: id });
  res.status(201).json({ data: patient });
});

/** DELETE /doctors/:id/patients/:patientId */
exports.removePatient = asyncHandler(async (req, res) => {
  const { patientId } = req.params;
  if (!isValidId(withId(req)) || !isValidId(patientId)) throw new ApiError(400, 'Invalid id');
  const deleted = await Patient.findOneAndDelete({ _id: patientId, doctor: req.params.id });
  if (!deleted) throw new ApiError(404, 'Patient not found for this doctor');
  res.json({ message: 'Patient removed' });
});

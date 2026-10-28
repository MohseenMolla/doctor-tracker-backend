const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const { asyncHandler } = require('../utils/helpers');

const dayKey = (d) => d.toISOString().slice(0, 10);

/** Fills days that have no documents with zero so charts have a continuous x-axis. */
function fillDays(rows, days) {
  const map = new Map(rows.map((r) => [r._id, r.count]));
  const out = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    out.push({ date: key, count: map.get(key) || 0 });
  }
  return out;
}

const perDay = (Model, since) =>
  Model.aggregate([
    { $match: { createdAt: { $gte: since } } }, // served by the createdAt index
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
  ]);

/** GET /dashboard?days=30  – every metric is computed in the database, in parallel. */
exports.stats = asyncHandler(async (req, res) => {
  const days = [7, 30, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 30;
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  since.setUTCDate(since.getUTCDate() - (days - 1));

  const [totalDoctors, totalPatients, newDoctors, newPatients, doctorDays, patientDays, perDoctor, conditions, specializations, gender, ages, recent] =
    await Promise.all([
      Doctor.estimatedDocumentCount(),
      Patient.estimatedDocumentCount(),
      Doctor.countDocuments({ createdAt: { $gte: since } }),
      Patient.countDocuments({ createdAt: { $gte: since } }),
      perDay(Doctor, since),
      perDay(Patient, since),
      Patient.aggregate([
        { $group: { _id: '$doctor', patients: { $sum: 1 } } },
        { $sort: { patients: -1 } },
        { $limit: 8 },
        { $lookup: { from: 'doctors', localField: '_id', foreignField: '_id', as: 'doctor' } },
        { $unwind: '$doctor' },
        { $project: { _id: 0, doctorId: '$_id', name: '$doctor.name', specialization: '$doctor.specialization', patients: 1 } },
      ]),
      Patient.aggregate([{ $group: { _id: '$condition', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
      Doctor.aggregate([{ $group: { _id: '$specialization', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 6 }]),
      Patient.aggregate([{ $group: { _id: '$gender', count: { $sum: 1 } } }]),
      Patient.aggregate([
        { $bucket: { groupBy: '$age', boundaries: [0, 18, 35, 50, 65, 131], default: 'unknown', output: { count: { $sum: 1 } } } },
      ]),
      Patient.find().sort({ createdAt: -1 }).limit(6).populate('doctor', 'name').lean(),
    ]);

  const dailyDoctors = fillDays(doctorDays, days);
  const dailyPatients = fillDays(patientDays, days);
  const timeline = dailyPatients.map((p, i) => ({ date: p.date, patients: p.count, doctors: dailyDoctors[i].count }));

  const ageLabels = { 0: '0–17', 18: '18–34', 35: '35–49', 50: '50–64', 65: '65+' };

  res.json({
    totals: {
      doctors: totalDoctors,
      patients: totalPatients,
      avgPatientsPerDoctor: totalDoctors ? Number((totalPatients / totalDoctors).toFixed(1)) : 0,
      newDoctors,
      newPatients,
    },
    days,
    timeline,
    patientsPerDoctor: perDoctor,
    conditions: conditions.map((c) => ({ name: c._id, value: c.count })),
    specializations: specializations.map((s) => ({ name: s._id, value: s.count })),
    gender: gender.map((g) => ({ name: g._id, value: g.count })),
    ageGroups: ages.filter((a) => a._id !== 'unknown').map((a) => ({ name: ageLabels[a._id], value: a.count })),
    recentPatients: recent,
  });
});

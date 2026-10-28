const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, required: true, min: 0, max: 130 },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    condition: { type: String, required: true, trim: true },
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
  },
  { timestamps: true }
);

// Compound indexes follow the equality -> sort order used by the queries.
patientSchema.index({ doctor: 1, createdAt: -1 }); // a doctor's patient list + counts
patientSchema.index({ condition: 1, createdAt: -1 }); // condition filter
patientSchema.index({ gender: 1, createdAt: -1 });
patientSchema.index({ createdAt: -1 }); // date range + dashboard time series
patientSchema.index({ name: 1 }); // prefix search + name sorting

module.exports = mongoose.model('Patient', patientSchema);

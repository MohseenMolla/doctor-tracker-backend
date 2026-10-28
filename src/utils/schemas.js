const { z } = require('zod');

const phone = z
  .string({ required_error: 'Phone is required' })
  .trim()
  .min(7, 'Enter a valid phone number')
  .max(20, 'Phone number is too long')
  .regex(/^[0-9+\-()\s]+$/, 'Use digits, +, - or spaces only');
const email = z.string({ required_error: 'Email is required' }).trim().toLowerCase().email('Enter a valid email address');
const text = (label, min = 2) =>
  z.string({ required_error: `${label} is required` }).trim().min(min, `${label} is required`).max(120, `${label} is too long`);

const loginSchema = z.object({ email, password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required') });

const doctorSchema = z.object({
  name: text('Name'),
  specialization: text('Specialization'),
  hospital: text('Hospital'),
  phone,
  email,
});

const patientBase = z.object({
  name: text('Name'),
  age: z.coerce.number({ invalid_type_error: 'Age must be a number' }).int('Age must be a whole number').min(0, 'Age must be 0 or more').max(130, 'Enter a realistic age'),
  gender: z.enum(['male', 'female', 'other'], { errorMap: () => ({ message: 'Select a gender' }) }),
  phone,
  email: z.union([email, z.literal('')]).optional().default(''),
  condition: text('Condition'),
});

const objectId = z.string({ required_error: 'Select a doctor' }).regex(/^[a-f\d]{24}$/i, 'Select a doctor');
const patientSchema = patientBase.extend({ doctor: objectId });
const patientForDoctorSchema = patientBase; // doctor comes from the URL

module.exports = { loginSchema, doctorSchema, patientSchema, patientForDoctorSchema };

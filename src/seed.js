require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const daysAgo = (n) => new Date(Date.now() - n * 86400000 - Math.random() * 40000000);

const specs = ['Cardiology', 'Neurology', 'Pediatrics', 'Orthopedics', 'Dermatology', 'Oncology', 'Gynecology', 'Psychiatry'];
const hospitals = ['Square Hospital', 'United Hospital', 'Evercare Hospital', 'Labaid Hospital', 'Popular Medical College', 'Ibn Sina Hospital'];
const conditions = ['Hypertension', 'Diabetes', 'Asthma', 'Migraine', 'Arthritis', 'Anxiety', 'Anemia', 'Back pain', 'Allergy', 'Fever'];
const first = ['Ayesha', 'Rahim', 'Nusrat', 'Imran', 'Farhana', 'Tanvir', 'Sadia', 'Kamal', 'Mehjabin', 'Arif', 'Jannat', 'Shakib', 'Rima', 'Nabil', 'Tasnim', 'Hasan', 'Mim', 'Sohel', 'Lamia', 'Rafi'];
const last = ['Rahman', 'Hossain', 'Akter', 'Chowdhury', 'Islam', 'Ahmed', 'Khan', 'Begum', 'Sarker', 'Mia', 'Uddin', 'Karim'];
const docFirst = ['Anisur', 'Shirin', 'Mahbub', 'Nasreen', 'Zahid', 'Farzana', 'Mizanur', 'Rubina', 'Kabir', 'Salma'];

(async () => {
  await connectDB(process.env.MONGODB_URI);
  await Promise.all([Doctor.deleteMany(), Patient.deleteMany()]);

  const email = process.env.ADMIN_EMAIL || 'admin@doctortracker.com';
  if (!(await User.exists({ email }))) await User.create({ name: 'Administrator', email, password: process.env.ADMIN_PASSWORD || 'Admin@123' });

  const doctors = await Doctor.insertMany(
    docFirst.map((f, i) => ({
      name: `Dr. ${f} ${pick(last)}`,
      specialization: specs[i % specs.length],
      hospital: pick(hospitals),
      phone: `+88017${String(10000000 + Math.floor(Math.random() * 89999999))}`,
      email: `${f.toLowerCase()}.${i}@carehospital.com`,
      createdAt: daysAgo(Math.floor(Math.random() * 80)),
    }))
  );

  const patients = [];
  for (let i = 0; i < 120; i++) {
    const created = daysAgo(Math.floor(Math.random() * 60));
    const name = `${pick(first)} ${pick(last)}`;
    patients.push({
      name,
      age: 2 + Math.floor(Math.random() * 85),
      gender: pick(['male', 'female', 'female', 'male', 'other']),
      phone: `+88018${String(10000000 + Math.floor(Math.random() * 89999999))}`,
      email: `${name.toLowerCase().replace(/\s/g, '.')}${i}@mail.com`,
      condition: pick(conditions),
      doctor: pick(doctors)._id,
      createdAt: created,
      updatedAt: created,
    });
  }
  await Patient.insertMany(patients);
  console.log(`Seeded ${doctors.length} doctors and ${patients.length} patients. Login: ${email}`);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

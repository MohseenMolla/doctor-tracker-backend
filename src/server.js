require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Patient = require('./models/Patient');

async function ensureAdmin() {
  if (await User.estimatedDocumentCount()) return;
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return console.warn('No users exist and ADMIN_EMAIL / ADMIN_PASSWORD are not set.');
  await User.create({ name: 'Administrator', email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`Admin account created: ${ADMIN_EMAIL}`);
}

(async () => {
  for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
    if (!process.env[key]) {
      console.error(`Missing required env var ${key}`);
      process.exit(1);
    }
  }
  await connectDB(process.env.MONGODB_URI);
  await Promise.all([Doctor.init(), Patient.init(), User.init()]); // make sure indexes are built
  await ensureAdmin();
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log(`API listening on :${port}`));
})().catch((err) => {
  console.error(err);
  process.exit(1);
});

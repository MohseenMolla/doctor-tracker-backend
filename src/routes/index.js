const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const s = require('../utils/schemas');
const auth = require('../controllers/auth.controller');
const doctors = require('../controllers/doctor.controller');
const patients = require('../controllers/patient.controller');
const dashboard = require('../controllers/dashboard.controller');

router.get('/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Auth (public, but rate limited against brute force)
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { message: 'Too many attempts. Try again in a few minutes.' } });
router.post('/auth/login', loginLimiter, validate(s.loginSchema), auth.login);

// Everything below requires a valid token and the admin role.
router.use(protect, authorize('admin'));
router.get('/auth/me', auth.me);
router.get('/dashboard', dashboard.stats);

router.get('/doctors', doctors.list);
router.get('/doctors/facets', doctors.facets);
router.get('/doctors/options', doctors.options);
router.post('/doctors', validate(s.doctorSchema), doctors.create);
router.get('/doctors/:id', doctors.getOne);
router.put('/doctors/:id', validate(s.doctorSchema), doctors.update);
router.delete('/doctors/:id', doctors.remove);
router.get('/doctors/:id/patients', doctors.patients);
router.post('/doctors/:id/patients', validate(s.patientForDoctorSchema), doctors.addPatient);
router.delete('/doctors/:id/patients/:patientId', doctors.removePatient);

router.get('/patients', patients.list);
router.get('/patients/facets', patients.facets);
router.post('/patients', validate(s.patientSchema), patients.create);
router.put('/patients/:id', validate(s.patientSchema), patients.update);
router.delete('/patients/:id', patients.remove);

module.exports = router;

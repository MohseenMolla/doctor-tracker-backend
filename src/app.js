const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const routes = require('./routes');
const { notFound, errorHandler } = require('./middleware/error');

const app = express();
const origins = (process.env.CLIENT_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim().replace(/\/$/, ''));

app.set('trust proxy', 1); // correct client IPs behind Render/Vercel proxies for rate limiting
app.use(helmet());
app.use(cors({ origin: (origin, cb) => (!origin || origins.includes(origin) ? cb(null, true) : cb(new Error('Origin not allowed by CORS'))) }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ name: 'Doctor Tracker API', docs: '/api/health' }));
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;

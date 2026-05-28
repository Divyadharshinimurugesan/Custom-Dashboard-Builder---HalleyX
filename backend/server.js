// server.js
require('dotenv').config();

const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const express       = require('express');
const cors          = require('cors');
const connectDB     = require('./config/db');
const routes        = require('./routes/index');
const errorHandler  = require('./middleware/errorHandler');

const app  = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

connectDB();

// ✅ FIXED CORS — list exact origins, no wildcard
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.options('*', cors());

// ✅ Handle preflight for ALL routes
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(helmet());
app.use(mongoSanitize());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

app.use('/api', routes);

app.get('/health', (req, res) =>
  res.json({
    status: 'OK',
    timestamp: new Date(),
    allowedOrigins // helpful for debugging
  })
);

app.use(errorHandler);

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
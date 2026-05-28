require('dotenv').config();

const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

const express      = require('express');
const cors         = require('cors');
const connectDB    = require('./config/db');
const routes       = require('./routes/index');
const errorHandler = require('./middleware/errorHandler');

const app  = express();
const PORT = process.env.PORT || 5000;

connectDB();

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://YOUR_APP.vercel.app'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SECURITY MIDDLEWARE
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
    timestamp: new Date()
  })
);

app.use(errorHandler);

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
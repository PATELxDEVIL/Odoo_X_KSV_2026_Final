require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const connectDB = require('./config/db');

connectDB();

const app = express();

// ── CORS — allow frontend on file:// and localhost:* ──────
app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins for dev
  credentials: true,
}));

app.use(express.json());

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/orgs',          require('./routes/orgs'));
app.use('/api/rides',         require('./routes/rides'));
app.use('/api/trips',         require('./routes/trips'));
app.use('/api/messages',      require('./routes/messages'));
app.use('/api/vehicles',      require('./routes/vehicles'));
app.use('/api/wallet',        require('./routes/wallet'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/admin',         require('./routes/admin'));
app.use('/api/maps',          require('./routes/maps'));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// ── Global error handler ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 CarPool server running at http://localhost:${PORT}`));

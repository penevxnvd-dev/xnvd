import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import countriesRoutes from './routes/countries.js';
import citiesRoutes from './routes/cities.js';
import officesRoutes from './routes/offices.js';
import teamsRoutes from './routes/teams.js';
import realtorsRoutes from './routes/realtors.js';
import dealsRoutes from './routes/deals.js';
import diagnosesRoutes from './routes/diagnoses.js';
import trainingRoutes from './routes/training.js';
import kpiRoutes from './routes/kpi.js';
import goalsRoutes from './routes/goals.js';
import scheduleRoutes from './routes/schedule.js';
import messagesRoutes from './routes/messages.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from both server/.env and root .env
dotenv.config({ path: path.join(__dirname, '../../.env') }); // Root .env (has VITE_* variables)
dotenv.config({ path: path.join(__dirname, '../.env') }); // server/.env (overrides if exists)

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/countries', countriesRoutes);
app.use('/api/cities', citiesRoutes);
app.use('/api/offices', officesRoutes);
app.use('/api/teams', teamsRoutes);
app.use('/api/realtors', realtorsRoutes);
app.use('/api/deals', dealsRoutes);
app.use('/api/diagnoses', diagnosesRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/kpi', kpiRoutes);
app.use('/api/goals', goalsRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/messages', messagesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
});


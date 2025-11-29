import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
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
import { errorHandler } from './middleware/errorHandler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5174',
  credentials: true
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


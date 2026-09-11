import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';
import { initScheduler } from './jobs/scheduler';

// Routes
import authRoutes from './routes/authRoutes';
import jobRoutes from './routes/jobRoutes';
import recruiterRoutes from './routes/recruiterRoutes';
import candidateRoutes from './routes/candidateRoutes';
import resumeRoutes from './routes/resumeRoutes';
import aiRoutes from './routes/aiRoutes';
import campaignRoutes from './routes/campaignRoutes';
import outreachRoutes from './routes/outreachRoutes';
import followUpRoutes from './routes/followUpRoutes';
import replyRoutes from './routes/replyRoutes';
import csvRoutes from './routes/csvRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import activityRoutes from './routes/activityRoutes';
import settingsRoutes from './routes/settingsRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Trust reverse proxy (Render) so express-rate-limit and req.ip correctly resolve the client IP
app.set('trust proxy', 1);

// Security & Middlewares
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate Limiter for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { success: false, message: 'Too many authentication requests, please try again later.' }
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'UP',
    name: 'AI-Powered C2C Job Search & Candidate Outreach Platform API',
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/recruiters', recruiterRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/followups', followUpRoutes);
app.use('/api/replies', replyRoutes);
app.use('/api/csv', csvRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/settings', settingsRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Start server
const startServer = async (): Promise<void> => {
  await connectDB();

  // Initialize background jobs scheduler
  initScheduler();

  app.listen(PORT, () => {
    console.log(`[Server] Production-ready API running on http://localhost:${PORT}`);
  });
};

// Export app for test suite
export { app };

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

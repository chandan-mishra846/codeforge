import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { submissionRouter } from './routes/submissionRoutes';
import { adminRouter } from './routes/adminRoutes';
import { authRouter } from './routes/authRoutes';
import { contestRouter } from './routes/contestRoutes';
import { initPostgresTables } from '@rce/database';

const app = express();
const port = parseInt(process.env.API_GATEWAY_PORT || '4000', 10);

app.use(helmet());
app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({ service: 'API Gateway', status: 'UP', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/contests', contestRouter);
app.use('/api/v1', submissionRouter);
app.use('/api', submissionRouter); // Legacy endpoint support

async function startServer() {
  try {
    await initPostgresTables();
  } catch (err) {
    console.warn('[API Gateway] DB initialization notice:', err);
  }

  app.listen(port, () => {
    console.log(`[API Gateway] Server running on http://localhost:${port}`);
  });
}

startServer();

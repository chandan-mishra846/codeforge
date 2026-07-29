import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { submissionRouter } from './routes/submissionRoutes';

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
app.use('/api', submissionRouter);

app.listen(port, () => {
  console.log(`[API Gateway] Server running on http://localhost:${port}`);
});

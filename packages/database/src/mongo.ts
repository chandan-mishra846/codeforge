import mongoose, { Schema } from 'mongoose';

export interface IExecutionLog {
  _id: string; // Submission UUID v4
  userId: string;
  problemId: string;
  language: string;
  stdout: string;
  stderr: string;
  status: string;
  metrics: {
    timeMs: number;
    memoryKb: number;
    exitCode: number;
  };
  aiAnalysis?: {
    timeComplexity?: string;
    spaceComplexity?: string;
    suggestions?: string[];
    rawPayload?: Record<string, unknown>;
  };
  createdAt?: Date;
}

const ExecutionLogSchema: Schema = new Schema<IExecutionLog>(
  {
    _id: { type: String, required: true }, // Custom submission UUID
    userId: { type: String, required: true, index: true },
    problemId: { type: String, required: true, index: true },
    language: { type: String, required: true },
    stdout: { type: String, default: '' },
    stderr: { type: String, default: '' },
    status: { type: String, required: true },
    metrics: {
      timeMs: { type: Number, default: 0 },
      memoryKb: { type: Number, default: 0 },
      exitCode: { type: Number, default: 0 },
    },
    aiAnalysis: {
      timeComplexity: { type: String },
      spaceComplexity: { type: String },
      suggestions: [{ type: String }],
      rawPayload: { type: Schema.Types.Mixed },
    },
  },
  { timestamps: { createdAt: 'createdAt', updatedAt: false } }
);

export const ExecutionLogModel = mongoose.model<IExecutionLog>('ExecutionLog', ExecutionLogSchema);

export async function initMongoConnection(): Promise<void> {
  const user = process.env.MONGO_USER || 'rce_mongo_admin';
  const pass = process.env.MONGO_PASSWORD || 'rce_mongo_password';
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const dbName = process.env.MONGO_DB || 'rce_logs_db';

  const uri = `mongodb://${user}:${pass}@${host}:${port}/${dbName}?authSource=admin`;
  try {
    await mongoose.connect(uri);
    console.log('[MongoDB] Connected successfully.');
  } catch (err) {
    console.error('[MongoDB] Connection failed:', err);
    throw err;
  }
}

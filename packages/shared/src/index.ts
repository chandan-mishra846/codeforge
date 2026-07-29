// ==========================================
// Kafka Topics Constants
// ==========================================
export const KAFKA_TOPICS = {
  CODE_SUBMISSIONS: 'code-submissions',
  EXECUTION_RESULTS: 'execution-results',
  AI_FEEDBACK: 'ai-feedback',
} as const;

// ==========================================
// Supported Programming Languages
// ==========================================
export type SupportedLanguage = 'javascript' | 'python' | 'cpp' | 'java';

// ==========================================
// Submission Status Types
// ==========================================
export type SubmissionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';

// ==========================================
// Payload DTO Interfaces
// ==========================================
export interface CodeSubmissionPayload {
  submissionId: string; // UUID v4
  userId: string;       // UUID v4 (used as Kafka partition key)
  problemId: string;    // UUID v4
  language: SupportedLanguage;
  code: string;
  submittedAt: string;
}

export interface ExecutionMetrics {
  timeMs: number;
  memoryKb: number;
  exitCode: number;
}

export interface ExecutionResultPayload {
  submissionId: string;
  userId: string;
  problemId: string;
  language: SupportedLanguage;
  code: string;
  status: SubmissionStatus;
  stdout: string;
  stderr: string;
  metrics: ExecutionMetrics;
  executedAt: string;
}

export interface AITelemetryPayload {
  submissionId: string;
  userId: string;
  timeComplexity: string;
  spaceComplexity: string;
  suggestions: string[];
  analyzedAt: string;
}

export type ExecutionResultData = ExecutionResultPayload;
export type AIFeedbackData = AITelemetryPayload;

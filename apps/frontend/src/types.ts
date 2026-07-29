export type SupportedLanguage = 'javascript' | 'python' | 'cpp' | 'java';

export interface Problem {
  id: string;
  title: string;
  description: string;
  constraints: string;
  sampleCode: Record<string, string>;
}

export interface ExecutionMetrics {
  timeMs: number;
  memoryKb: number;
  exitCode: number;
}

export interface ExecutionResultData {
  submissionId: string;
  userId: string;
  problemId: string;
  language: SupportedLanguage;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMEOUT';
  stdout: string;
  stderr: string;
  metrics: ExecutionMetrics;
  executedAt: string;
}

export interface AIFeedbackData {
  submissionId: string;
  userId: string;
  timeComplexity: string;
  spaceComplexity: string;
  suggestions: string[];
  analyzedAt: string;
}

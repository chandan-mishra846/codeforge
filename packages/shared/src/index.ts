// ==========================================
// Kafka Topics Constants
// ==========================================
export const KAFKA_TOPICS = {
  CODE_SUBMISSIONS: 'code-submissions',
  SUBMISSION_UPDATES: 'submission-updates',
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
export type SubmissionStatus =
  | 'PENDING'
  | 'RUNNING'
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'MEMORY_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'COMPLETED'
  | 'FAILED'
  | 'TIMEOUT';

// ==========================================
// Standard Problem Topics
// ==========================================
export const STANDARD_TOPICS = [
  'Arrays',
  'Strings',
  'Linked List',
  'Stack',
  'Queue',
  'Trees',
  'Binary Trees',
  'BST',
  'Heap',
  'Graph',
  'DP',
  'Greedy',
  'Backtracking',
  'Sliding Window',
  'Two Pointers',
  'Binary Search',
  'Trie',
  'Segment Tree',
  'Math',
  'Bit Manipulation',
  'Recursion',
  'Hashing',
  'Prefix Sum',
  'Matrix',
  'System Design',
  'Miscellaneous',
] as const;

export type TopicName = (typeof STANDARD_TOPICS)[number];

// ==========================================
// User & Problem Domain Interfaces
// ==========================================
export type UserRole = 'ADMIN' | 'USER';

export interface UserDTO {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  currentStreak: number;
  questionsSolved: number;
  lastSubmissionDate?: string | null;
  createdAt?: string;
}

export interface AuthResponsePayload {
  success: boolean;
  message: string;
  token?: string;
  user?: UserDTO;
}

export interface TestCaseDTO {
  id?: string;
  problemId?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface ProblemDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMs: number;
  memoryLimitMb: number;
  constraints?: string;
  topics?: string[];
  createdAt?: string;
  testCases?: TestCaseDTO[];
  testCasesCount?: number;
  sampleCode?: Record<string, string>;
}

// ==========================================
// Contest Domain Interfaces
// ==========================================
export type ContestVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type ContestStatus = 'UPCOMING' | 'RUNNING' | 'ENDED';

export interface ContestProblemDTO {
  id: string;
  contestId: string;
  problemId: string;
  problemLabel: string; // e.g. 'A', 'B', 'C'
  points: number;
  problem?: ProblemDTO;
  solved?: boolean;
  submissionStatus?: SubmissionStatus | null;
}

export interface ContestDTO {
  id: string;
  title: string;
  slug: string;
  description: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  visibility: ContestVisibility;
  status: ContestStatus;
  rules?: string;
  createdAt?: string;
  problems?: ContestProblemDTO[];
  registeredCount?: number;
  isRegistered?: boolean;
}

export interface ContestLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  name: string;
  problemsSolved: number;
  totalScore: number;
  penaltySeconds: number;
  submissionsCount: number;
}

// ==========================================
// Payload DTO Interfaces
// ==========================================
export interface CodeSubmissionPayload {
  submissionId: string; // UUID v4
  userId: string;       // UUID v4 (used as Kafka partition key)
  problemId: string;    // UUID v4
  language: SupportedLanguage;
  code: string;
  codeHash?: string;
  submittedAt: string;
}

export interface ExecutionMetrics {
  timeMs: number;
  memoryKb: number;
  exitCode: number;
}

export interface SubmissionProgressPayload {
  submissionId: string;
  userId: string;
  problemId: string;
  currentTestCaseIndex: number;
  totalTestCases: number;
  passCount: number;
  status: SubmissionStatus;
  astCacheHit?: boolean;
  updatedAt: string;
}

export interface TestCaseExecutionResult {
  testCaseIndex: number;
  passed: boolean;
  input: string;
  expectedOutput: string;
  actualOutput: string;
  stderr: string;
  timeMs: number;
  memoryKb: number;
  status: SubmissionStatus;
}

export interface SampleRunResult {
  success: boolean;
  totalTestCases: number;
  passCount: number;
  testCaseResults: TestCaseExecutionResult[];
  maxRuntimeMs: number;
  maxMemoryMb: number;
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
  passCount?: number;
  totalTestCases?: number;
  astCacheHit?: boolean;
  cacheHit?: boolean;
  executedAt: string;
}

export interface SubmissionHistoryItem {
  id: string;
  userId: string;
  problemId: string;
  problemTitle: string;
  language: SupportedLanguage;
  status: SubmissionStatus;
  passedCount: number;
  totalCount: number;
  maxRuntimeMs: number;
  maxMemoryMb: number;
  cacheHit: boolean;
  createdAt: string;
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

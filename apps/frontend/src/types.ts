export type SupportedLanguage = 'javascript' | 'python' | 'cpp' | 'java';
export type UserRole = 'ADMIN' | 'USER';

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

export interface TestCaseDTO {
  id?: string;
  problemId?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  explanation?: string;
}

export interface Problem {
  id: string;
  title: string;
  slug?: string;
  description: string;
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
  timeLimitMs?: number;
  memoryLimitMb?: number;
  constraints?: string;
  topics?: string[];
  testCases?: TestCaseDTO[];
  testCasesCount?: number;
  sampleCode?: Record<string, string>;
  createdAt?: string;
}

export type ProblemDTO = Problem;

export type ContestVisibility = 'PUBLIC' | 'PRIVATE' | 'UNLISTED';
export type ContestStatus = 'UPCOMING' | 'RUNNING' | 'ENDED';

export interface ContestProblemDTO {
  id: string;
  contestId: string;
  problemId: string;
  problemLabel: string;
  points: number;
  problem?: Problem;
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

export interface ExecutionMetrics {
  timeMs: number;
  memoryKb: number;
  exitCode: number;
}

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

export interface SubmissionProgressData {
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

export interface ExecutionResultData {
  submissionId: string;
  userId: string;
  problemId: string;
  language: SupportedLanguage;
  status: SubmissionStatus;
  stdout: string;
  stderr: string;
  metrics: ExecutionMetrics;
  passCount?: number;
  totalTestCases?: number;
  astCacheHit?: boolean;
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

export interface AIFeedbackData {
  submissionId: string;
  userId: string;
  timeComplexity: string;
  spaceComplexity: string;
  suggestions: string[];
  analyzedAt: string;
}

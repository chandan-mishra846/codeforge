import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { SupportedLanguage, SampleRunResult, TestCaseExecutionResult, SubmissionStatus, AIFeedbackData } from '@rce/shared';
import { publishSubmission } from '../kafkaProducer';
import { slidingWindowRateLimiter } from '../middleware/rateLimiter';
import { executeInSandbox } from './sandboxRunner';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import {
  getAllProblems,
  getProblemBySlug,
  getProblemById,
  createSubmissionRecord,
  getExistingUserSubmission,
  getUserSubmissionHistory,
  updateSubmissionResult,
  updateUserStatsOnAccept,
  recordContestSubmission,
} from '@rce/database';

export const submissionRouter = Router();

function analyzeCodeComplexity(code: string, language: string, timeMs: number): {
  timeComplexity: string;
  spaceComplexity: string;
  suggestions: string[];
} {
  // Strip comments and include headers first so include statements don't trigger space complexity matches
  const codeBody = code.replace(/#include\s*<.*?>/g, '').replace(/\/\/.*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  const hasNestedLoops = /for\s*\(.*for\s*\(|while\s*\(.*while\s*\(|for\s+.*:\s*for\s+/s.test(codeBody);
  const hasSingleLoop = /for\b|while\b/s.test(codeBody);
  const hasRecursion = /def\s+(\w+).*?\1\(|function\s+(\w+).*?\2\(|(\w+)\s*\(.*?\3\(/s.test(codeBody);
  const usesMapSet = /\b(unordered_map|std::map|std::unordered_map|std::set|std::unordered_set|Map|Set|new\s+Array|vector\s*<)\b/.test(codeBody);

  let timeComplexity = 'O(1)';
  let spaceComplexity = 'O(1)';
  const suggestions: string[] = [];

  if (hasNestedLoops) {
    timeComplexity = 'O(N²)';
    suggestions.push('Nested loop detected. Consider using a Hash Map or Two-Pointer technique to reduce time complexity to O(N).');
  } else if (hasRecursion) {
    timeComplexity = 'O(2^N) or O(N)';
    spaceComplexity = 'O(N) call stack';
    suggestions.push('Recursive calls detected. Ensure memoization (Dynamic Programming) is applied to prevent redundant subproblems.');
  } else if (hasSingleLoop) {
    timeComplexity = 'O(N)';
    suggestions.push('Single loop iteration detected. Ensure memory allocation is optimal for large inputs.');
  }

  if (usesMapSet) {
    spaceComplexity = 'O(N)';
    suggestions.push('Auxiliary hash table/set or dynamic vector utilized for lookups/storage.');
  } else {
    suggestions.push('Constant auxiliary space memory allocation O(1).');
  }

  if (suggestions.length === 0) {
    suggestions.push('Code execution is optimal. Good adherence to algorithmic standards.');
  }

  return {
    timeComplexity,
    spaceComplexity,
    suggestions,
  };
}

// GET /api/v1/problems - List all public problems with optional topic filter
submissionRouter.get('/problems', async (req: Request, res: Response) => {
  try {
    const topic = req.query.topic as string | undefined;
    const problems = await getAllProblems(false, topic);
    res.json({ success: true, count: problems.length, problems });
  } catch (error: any) {
    console.error('[API Gateway] Error fetching problems:', error);
    res.status(500).json({ error: 'Failed to fetch public problems', details: error.message });
  }
});

// GET /api/v1/problems/:slug - Get problem details + ONLY sample test cases (is_hidden = false)
submissionRouter.get('/problems/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    let problem = await getProblemBySlug(slug, false);
    if (!problem) {
      // Fallback by ID if slug not found
      problem = await getProblemById(slug, false);
    }
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    res.json({ success: true, problem });
  } catch (error: any) {
    console.error('[API Gateway] Error fetching problem:', error);
    res.status(500).json({ error: 'Failed to fetch problem details', details: error.message });
  }
});

// GET /api/v1/submissions/my - Fetch user's submission history
submissionRouter.get('/submissions/my', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000002';
    const history = await getUserSubmissionHistory(userId);
    res.json({ success: true, submissions: history });
  } catch (error: any) {
    console.error('[API Gateway] Fetch submission history failed:', error);
    res.status(500).json({ error: 'Failed to fetch submission history', details: error.message });
  }
});

// POST /api/v1/problems/:id/run - Trigger "Run Code" against sample test cases (non-persistent)
submissionRouter.post('/problems/:id/run', slidingWindowRateLimiter(60, 20), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body;

    if (!language || !code) {
      return res.status(400).json({ error: 'Missing required fields: language and code are required.' });
    }

    const validLanguages: SupportedLanguage[] = ['javascript', 'python', 'cpp', 'java'];
    if (!validLanguages.includes(language as SupportedLanguage)) {
      return res.status(400).json({ error: `Unsupported language. Supported languages: ${validLanguages.join(', ')}` });
    }

    const problem = await getProblemById(id, false);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    const sampleTestCases = problem.testCases || [];
    if (sampleTestCases.length === 0) {
      return res.status(400).json({ error: 'No sample test cases found for this problem.' });
    }

    const testCaseResults: TestCaseExecutionResult[] = [];
    let passCount = 0;
    let maxRuntimeMs = 0;
    let maxMemoryMb = 0;

    for (let i = 0; i < sampleTestCases.length; i++) {
      const tc = sampleTestCases[i];
      const runRes = await executeInSandbox(
        `run-${uuidv4()}`,
        language as SupportedLanguage,
        code,
        tc.input,
        problem.timeLimitMs || 2000
      );

      const actualTrim = runRes.stdout.trim();
      const expectedTrim = tc.expectedOutput.trim();
      const passed = actualTrim === expectedTrim && runRes.metrics.exitCode === 0 && !runRes.timedOut;

      if (passed) passCount++;

      let status: SubmissionStatus = 'ACCEPTED';
      if (runRes.timedOut) {
        status = 'TIME_LIMIT_EXCEEDED';
      } else if (runRes.metrics.exitCode !== 0 && runRes.stderr && (runRes.stderr.includes('error:') || runRes.stderr.includes('Compilation'))) {
        status = 'COMPILATION_ERROR';
      } else if (runRes.metrics.exitCode !== 0) {
        status = 'RUNTIME_ERROR';
      } else if (!passed) {
        status = 'WRONG_ANSWER';
      }

      testCaseResults.push({
        testCaseIndex: i,
        passed,
        input: tc.input,
        expectedOutput: tc.expectedOutput,
        actualOutput: runRes.stdout,
        stderr: runRes.stderr,
        timeMs: runRes.metrics.timeMs,
        memoryKb: runRes.metrics.memoryKb,
        status,
      });

      if (runRes.metrics.timeMs > maxRuntimeMs) maxRuntimeMs = runRes.metrics.timeMs;
      const memMb = Math.ceil(runRes.metrics.memoryKb / 1024);
      if (memMb > maxMemoryMb) maxMemoryMb = memMb;
    }

    const runSummary: SampleRunResult = {
      success: passCount === sampleTestCases.length,
      totalTestCases: sampleTestCases.length,
      passCount,
      testCaseResults,
      maxRuntimeMs,
      maxMemoryMb,
    };

    res.json({
      success: true,
      message: `Ran ${sampleTestCases.length} sample test case(s).`,
      runResult: runSummary,
    });
  } catch (error: any) {
    console.error('[API Gateway] Run Code failed:', error);
    res.status(500).json({ error: 'Failed to run code', details: error.message });
  }
});

// POST /api/v1/problems/:id/submit - Trigger "Submit Code" with SHA-256 Duplicate Submission & Direct Fallback
submissionRouter.post('/problems/:id/submit', authenticate, slidingWindowRateLimiter(60, 15), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { language, code } = req.body;
    const effectiveUserId = req.user?.id || req.body.userId || '00000000-0000-0000-0000-000000000002';

    if (!language || !code) {
      return res.status(400).json({ error: 'Missing required fields: language and code are required.' });
    }

    const validLanguages: SupportedLanguage[] = ['javascript', 'python', 'cpp', 'java'];
    if (!validLanguages.includes(language as SupportedLanguage)) {
      return res.status(400).json({ error: `Unsupported language. Supported languages: ${validLanguages.join(', ')}` });
    }

    const problem = await getProblemById(id, true);
    if (!problem) {
      return res.status(404).json({ error: 'Problem not found' });
    }

    // 1. Compute SHA-256 Code Hash for Duplicate Submission Detection
    const normalizedCode = code.trim().replace(/\s+/g, ' ');
    const codeHash = crypto.createHash('sha256').update(`${language}:${normalizedCode}`).digest('hex');

    // Compute AI Complexity Feedback
    const aiAnalysis = analyzeCodeComplexity(code, language, 0);

    // 2. Check for Duplicate Submission by Same User for Same Problem
    const existingSubmission = await getExistingUserSubmission(effectiveUserId, id, codeHash);
    if (existingSubmission) {
      console.log(`[API Gateway] Duplicate submission detected for user ${effectiveUserId}. Returning Cache Hit.`);
      return res.status(200).json({
        success: true,
        cacheHit: true,
        message: 'Cache Hit: You have already submitted this exact solution before.',
        submissionId: existingSubmission.id,
        userId: effectiveUserId,
        problemId: id,
        status: existingSubmission.status,
        passedCount: existingSubmission.passedCount,
        totalCount: existingSubmission.totalCount,
        maxRuntimeMs: existingSubmission.maxRuntimeMs,
        maxMemoryMb: existingSubmission.maxMemoryMb,
        submittedAt: existingSubmission.createdAt,
        aiFeedback: {
          submissionId: existingSubmission.id,
          userId: effectiveUserId,
          ...aiAnalysis,
          analyzedAt: new Date().toISOString(),
        },
      });
    }

    const submissionId = uuidv4();
    const submittedAt = new Date().toISOString();

    // 3. Create DB record in submissions table with PENDING status
    await createSubmissionRecord({
      id: submissionId,
      userId: effectiveUserId,
      problemId: id,
      code,
      codeHash,
      language,
      status: 'PENDING',
      cacheHit: false,
    });

    // 4. Try publishing payload to Kafka
    try {
      await publishSubmission({
        submissionId,
        userId: effectiveUserId,
        problemId: id,
        language: language as SupportedLanguage,
        code,
        codeHash,
        submittedAt,
      });
    } catch (kErr) {
      console.warn('[API Gateway] Kafka publish notice (falling back to direct sandbox evaluation):', kErr);
    }

    // 5. Run Direct Sandbox Evaluation
    const testCases = problem.testCases || [{ input: '', expectedOutput: '', isHidden: false }];
    let passCount = 0;
    let finalStatus: SubmissionStatus = 'ACCEPTED';
    let stdoutAcc = '';
    let stderrAcc = '';
    let maxRuntimeMs = 0;
    let maxMemoryKb = 0;

    for (let i = 0; i < testCases.length; i++) {
      const tc = testCases[i];
      const runRes = await executeInSandbox(
        submissionId,
        language as SupportedLanguage,
        code,
        tc.input,
        problem.timeLimitMs || 2000
      );

      if (runRes.metrics.timeMs > maxRuntimeMs) maxRuntimeMs = runRes.metrics.timeMs;
      if (runRes.metrics.memoryKb > maxMemoryKb) maxMemoryKb = runRes.metrics.memoryKb;

      const actualTrim = runRes.stdout.trim();
      const expectedTrim = tc.expectedOutput.trim();
      const passed = actualTrim === expectedTrim && runRes.metrics.exitCode === 0 && !runRes.timedOut;

      if (passed) {
        passCount++;
      } else {
        if (runRes.timedOut) {
          finalStatus = 'TIME_LIMIT_EXCEEDED';
        } else if (runRes.metrics.exitCode !== 0 && runRes.stderr && (runRes.stderr.includes('error:') || runRes.stderr.includes('Compilation'))) {
          finalStatus = 'COMPILATION_ERROR';
        } else if (runRes.metrics.exitCode !== 0) {
          finalStatus = 'RUNTIME_ERROR';
        } else {
          finalStatus = 'WRONG_ANSWER';
        }
        stdoutAcc = runRes.stdout;
        stderrAcc = runRes.stderr || `Test case ${i + 1} failed. Expected '${expectedTrim}', got '${actualTrim}'`;
        break;
      }
      if (!stdoutAcc) stdoutAcc = runRes.stdout;
    }

    const maxMemoryMb = Math.ceil(maxMemoryKb / 1024);

    // Update PostgreSQL DB submission record
    await updateSubmissionResult({
      id: submissionId,
      status: finalStatus,
      passedCount: passCount,
      totalCount: testCases.length,
      maxRuntimeMs,
      maxMemoryMb,
    });

    if (finalStatus === 'ACCEPTED') {
      await updateUserStatsOnAccept(effectiveUserId, id);
    }

    if (req.body.contestId) {
      await recordContestSubmission({
        contestId: req.body.contestId,
        submissionId,
        userId: effectiveUserId,
        problemId: id,
        status: finalStatus,
        points: finalStatus === 'ACCEPTED' ? 100 : 0,
        penaltySeconds: finalStatus === 'ACCEPTED' ? 0 : 300,
      }).catch((cErr) => console.warn('[Contest Submission Log Notice]:', cErr));
    }

    const fullAiAnalysis: AIFeedbackData = {
      submissionId,
      userId: effectiveUserId,
      ...analyzeCodeComplexity(code, language, maxRuntimeMs),
      analyzedAt: new Date().toISOString(),
    };

    res.status(200).json({
      success: true,
      cacheHit: false,
      message: 'Code submitted and evaluated successfully.',
      submissionId,
      userId: effectiveUserId,
      problemId: id,
      status: finalStatus,
      passedCount: passCount,
      totalCount: testCases.length,
      maxRuntimeMs,
      maxMemoryMb,
      stdout: stdoutAcc,
      stderr: stderrAcc,
      submittedAt,
      aiFeedback: fullAiAnalysis,
    });
  } catch (error: any) {
    console.error('[API Gateway] Submit Code failed:', error);
    res.status(500).json({ error: 'Failed to submit code', details: error.message });
  }
});

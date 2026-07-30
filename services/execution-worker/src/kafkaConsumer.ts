import { Kafka } from 'kafkajs';
import {
  KAFKA_TOPICS,
  CodeSubmissionPayload,
  ExecutionResultPayload,
  SubmissionStatus,
  TestCaseDTO,
} from '@rce/shared';
import { executeInSandbox } from './dockerSandbox';
import { publishExecutionResult, publishSubmissionProgress } from './kafkaProducer';
import { generateASTHash, getCachedASTResult, cacheASTResult, redisClient } from './astCache';
import {
  getProblemById,
  getTestCasesForProblem,
  updateSubmissionResult,
  updateUserStatsOnAccept,
} from '@rce/database';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'execution-worker-consumer',
  brokers: [kafkaBroker],
});

export const consumer = kafka.consumer({ groupId: 'execution-worker-group' });

export async function startWorkerConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.CODE_SUBMISSIONS, fromBeginning: false });

  console.log(`[Worker Consumer] Subscribed to topic '${KAFKA_TOPICS.CODE_SUBMISSIONS}'. Listening for code submissions...`);

  await consumer.run({
    eachMessage: async ({ message, partition }) => {
      if (!message.value) return;

      const submission: CodeSubmissionPayload = JSON.parse(message.value.toString());
      console.log(`[Worker] Received submission ${submission.submissionId} (User: ${submission.userId}, Problem: ${submission.problemId}) from partition ${partition}`);

      try {
        // 1. Calculate AST Hash
        const astHash = generateASTHash(submission.language, submission.code);

        // 2. Check Redis AST Cache
        const cachedResult = await getCachedASTResult(submission.problemId, submission.language, astHash);
        if (cachedResult) {
          console.log(`[Worker] AST Cache Hit for submission ${submission.submissionId}! Reusing result.`);

          const resultPayload: ExecutionResultPayload = {
            ...cachedResult,
            submissionId: submission.submissionId,
            userId: submission.userId,
            code: submission.code,
            astCacheHit: true,
            executedAt: new Date().toISOString(),
          };

          // Stream progress 100% to WebSocket
          await publishSubmissionProgress({
            submissionId: submission.submissionId,
            userId: submission.userId,
            problemId: submission.problemId,
            currentTestCaseIndex: resultPayload.totalTestCases || 1,
            totalTestCases: resultPayload.totalTestCases || 1,
            passCount: resultPayload.passCount || 0,
            status: resultPayload.status,
            astCacheHit: true,
            updatedAt: new Date().toISOString(),
          });

          // Update DB submission
          await updateSubmissionResult({
            id: submission.submissionId,
            status: resultPayload.status,
            passedCount: resultPayload.passCount || 0,
            totalCount: resultPayload.totalTestCases || 1,
            maxRuntimeMs: resultPayload.metrics.timeMs,
            maxMemoryMb: Math.ceil(resultPayload.metrics.memoryKb / 1024),
          });

          if (resultPayload.status === 'ACCEPTED') {
            await updateUserStatsOnAccept(submission.userId, submission.problemId);
          }

          // Publish final result payload for telemetry
          await publishExecutionResult(resultPayload);
          return;
        }

        // 3. Cache Miss: Fetch test cases for problem
        let testCases: TestCaseDTO[] = [];
        const redisTcKey = `problem:testcases:${submission.problemId}`;
        const cachedTcData = await redisClient.get(redisTcKey).catch(() => null);

        if (cachedTcData) {
          testCases = JSON.parse(cachedTcData);
        } else {
          testCases = await getTestCasesForProblem(submission.problemId);
          if (testCases.length === 0) {
            // Fetch problem fallback
            const p = await getProblemById(submission.problemId, true);
            testCases = p?.testCases || [];
          }
          if (testCases.length > 0) {
            await redisClient.setex(redisTcKey, 3600, JSON.stringify(testCases)).catch(() => {});
          }
        }

        if (testCases.length === 0) {
          // Default mock testcase if problem has no defined testcases
          testCases = [{ input: '', expectedOutput: '', isHidden: false }];
        }

        const totalTestCases = testCases.length;
        let passCount = 0;
        let finalStatus: SubmissionStatus = 'ACCEPTED';
        let stdoutAcc = '';
        let stderrAcc = '';
        let maxRuntimeMs = 0;
        let maxMemoryKb = 0;

        // Fetch problem time limit
        const prob = await getProblemById(submission.problemId);
        const timeLimitMs = prob?.timeLimitMs || 2000;

        // 4. Sequential Test Case Execution with Short-Circuit
        for (let i = 0; i < totalTestCases; i++) {
          const tc = testCases[i];

          const res = await executeInSandbox(
            submission.submissionId,
            submission.language,
            submission.code,
            tc.input,
            timeLimitMs
          );

          if (res.metrics.timeMs > maxRuntimeMs) maxRuntimeMs = res.metrics.timeMs;
          if (res.metrics.memoryKb > maxMemoryKb) maxMemoryKb = res.metrics.memoryKb;

          const actualTrim = res.stdout.trim();
          const expectedTrim = tc.expectedOutput.trim();
          const passed = actualTrim === expectedTrim && res.metrics.exitCode === 0 && !res.timedOut;

          if (passed) {
            passCount++;
          } else {
            // Determine failure status and short-circuit
            if (res.timedOut) {
              finalStatus = 'TIME_LIMIT_EXCEEDED';
            } else if (res.stderr && (res.stderr.includes('Compilation') || res.stderr.includes('g++') || res.stderr.includes('javac'))) {
              finalStatus = 'COMPILATION_ERROR';
            } else if (res.metrics.exitCode !== 0) {
              finalStatus = 'RUNTIME_ERROR';
            } else {
              finalStatus = 'WRONG_ANSWER';
            }

            stdoutAcc = res.stdout;
            stderrAcc = res.stderr || `Test case ${i + 1} failed. Expected: '${expectedTrim}', Got: '${actualTrim}'`;

            // Stream real-time progress for failed testcase and short-circuit
            await publishSubmissionProgress({
              submissionId: submission.submissionId,
              userId: submission.userId,
              problemId: submission.problemId,
              currentTestCaseIndex: i + 1,
              totalTestCases,
              passCount,
              status: finalStatus,
              updatedAt: new Date().toISOString(),
            });

            break; // Short-circuit on first failure
          }

          if (!stdoutAcc) stdoutAcc = res.stdout;

          // Stream real-time progress update after each passed test case
          await publishSubmissionProgress({
            submissionId: submission.submissionId,
            userId: submission.userId,
            problemId: submission.problemId,
            currentTestCaseIndex: i + 1,
            totalTestCases,
            passCount,
            status: i + 1 === totalTestCases ? 'ACCEPTED' : 'RUNNING',
            updatedAt: new Date().toISOString(),
          });
        }

        const executionResultPayload: ExecutionResultPayload = {
          submissionId: submission.submissionId,
          userId: submission.userId,
          problemId: submission.problemId,
          language: submission.language,
          code: submission.code,
          status: finalStatus,
          stdout: stdoutAcc,
          stderr: stderrAcc,
          metrics: {
            timeMs: maxRuntimeMs,
            memoryKb: maxMemoryKb,
            exitCode: finalStatus === 'ACCEPTED' ? 0 : 1,
          },
          passCount,
          totalTestCases,
          astCacheHit: false,
          executedAt: new Date().toISOString(),
        };

        // 5. Cache result in Redis for AST deduplication
        await cacheASTResult(submission.problemId, submission.language, astHash, executionResultPayload);

        // 6. Update PostgreSQL DB
        await updateSubmissionResult({
          id: submission.submissionId,
          status: finalStatus,
          passedCount: passCount,
          totalCount: totalTestCases,
          maxRuntimeMs,
          maxMemoryMb: Math.ceil(maxMemoryKb / 1024),
        });

        if (finalStatus === 'ACCEPTED') {
          await updateUserStatsOnAccept(submission.userId, submission.problemId);
        }

        // 7. Publish payload to 'execution-results' for AI Telemetry
        await publishExecutionResult(executionResultPayload);
      } catch (err: any) {
        console.error(`[Worker] Error processing submission ${submission.submissionId}:`, err);
      }
    },
  });
}

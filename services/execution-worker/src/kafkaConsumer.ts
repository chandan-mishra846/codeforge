import { Kafka } from 'kafkajs';
import { KAFKA_TOPICS, CodeSubmissionPayload, ExecutionResultPayload } from '@rce/shared';
import { executeInSandbox } from './dockerSandbox';
import { publishExecutionResult } from './kafkaProducer';

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
      console.log(`[Worker] Received submission ${submission.submissionId} (User: ${submission.userId}, Language: ${submission.language}) from partition ${partition}`);

      // Execute code inside isolated Docker container
      const result = await executeInSandbox(submission.submissionId, submission.language, submission.code);

      const status = result.timedOut
        ? 'TIMEOUT'
        : result.metrics.exitCode === 0
        ? 'COMPLETED'
        : 'FAILED';

      const executionResultPayload: ExecutionResultPayload = {
        submissionId: submission.submissionId,
        userId: submission.userId,
        problemId: submission.problemId,
        language: submission.language,
        code: submission.code,
        status,
        stdout: result.stdout,
        stderr: result.stderr,
        metrics: result.metrics,
        executedAt: new Date().toISOString(),
      };

      // Publish result to 'execution-results' topic
      await publishExecutionResult(executionResultPayload);
    },
  });
}

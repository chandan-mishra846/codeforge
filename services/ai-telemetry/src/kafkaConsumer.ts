import { Kafka } from 'kafkajs';
import { KAFKA_TOPICS, ExecutionResultPayload } from '@rce/shared';
import { initMongoConnection, ExecutionLogModel } from '@rce/database';
import { profileCodeWithAI } from './aiProfiler';
import { publishAIFeedback } from './kafkaProducer';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'ai-telemetry-consumer',
  brokers: [kafkaBroker],
});

export const consumer = kafka.consumer({ groupId: 'ai-telemetry-group' });

export async function startAITelemetryConsumer(): Promise<void> {
  // Initialize MongoDB connection
  await initMongoConnection().catch((err) => console.warn('[AI Telemetry] Mongo init warning:', err.message));

  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.EXECUTION_RESULTS, fromBeginning: false });

  console.log(`[AI Telemetry Consumer] Subscribed to topic '${KAFKA_TOPICS.EXECUTION_RESULTS}'.`);

  await consumer.run({
    eachMessage: async ({ message }) => {
      if (!message.value) return;

      const resultPayload: ExecutionResultPayload = JSON.parse(message.value.toString());
      console.log(`[AI Telemetry] Processing result for submission ${resultPayload.submissionId}`);

      // Perform AI Big-O Profiling
      const aiAnalysis = await profileCodeWithAI({
        submissionId: resultPayload.submissionId,
        userId: resultPayload.userId,
        language: resultPayload.language,
        code: resultPayload.code,
        timeMs: resultPayload.metrics.timeMs,
        memoryKb: resultPayload.metrics.memoryKb,
        stdout: resultPayload.stdout,
        stderr: resultPayload.stderr,
      });

      // Save execution log and unstructured AI payload into MongoDB
      try {
        await ExecutionLogModel.findByIdAndUpdate(
          resultPayload.submissionId,
          {
            _id: resultPayload.submissionId,
            userId: resultPayload.userId,
            problemId: resultPayload.problemId,
            language: resultPayload.language,
            stdout: resultPayload.stdout,
            stderr: resultPayload.stderr,
            status: resultPayload.status,
            metrics: resultPayload.metrics,
            aiAnalysis: {
              timeComplexity: aiAnalysis.timeComplexity,
              spaceComplexity: aiAnalysis.spaceComplexity,
              suggestions: aiAnalysis.suggestions,
            },
          },
          { upsert: true, new: true }
        );
        console.log(`[AI Telemetry] Successfully persisted logs & AI payload to MongoDB for submission ${resultPayload.submissionId}`);
      } catch (dbErr) {
        console.error('[AI Telemetry] MongoDB save error:', dbErr);
      }

      // Publish AI feedback to 'ai-feedback' topic for WebSocket service
      await publishAIFeedback(aiAnalysis);
    },
  });
}

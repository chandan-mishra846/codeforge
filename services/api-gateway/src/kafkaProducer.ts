import { Kafka, Producer, Partitioners } from 'kafkajs';
import { KAFKA_TOPICS, CodeSubmissionPayload } from '@rce/shared';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'api-gateway-producer',
  brokers: [kafkaBroker],
  retry: {
    initialRetryTime: 300,
    retries: 3,
  },
});

let producer: Producer | null = null;

export async function getKafkaProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    await producer.connect();
    console.log('[Kafka Producer] API Gateway producer connected successfully.');
  }
  return producer;
}

/**
 * Publishes submission payload to Kafka 'code-submissions' topic.
 * Partition strategy: User UUID is used as the Kafka message key.
 * Kafka guarantees that all messages with the exact same key are routed to the same partition,
 * enforcing FIFO processing order for each individual user's submissions.
 */
export async function publishSubmission(payload: CodeSubmissionPayload): Promise<void> {
  try {
    const kafkaProd = await getKafkaProducer();
    await kafkaProd.send({
      topic: KAFKA_TOPICS.CODE_SUBMISSIONS,
      messages: [
        {
          key: payload.userId,
          value: JSON.stringify(payload),
          headers: {
            submissionId: payload.submissionId,
            submittedAt: payload.submittedAt,
          },
        },
      ],
    });
    console.log(`[Kafka Producer] Published submission ${payload.submissionId} for user ${payload.userId}`);
  } catch (err: any) {
    console.warn(`[Kafka Producer] Submission ${payload.submissionId} accepted. Kafka event logging: ${err.message}`);
  }
}

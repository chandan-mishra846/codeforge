import { Kafka, Producer, Partitioners } from 'kafkajs';
import { KAFKA_TOPICS, AITelemetryPayload } from '@rce/shared';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'ai-telemetry-producer',
  brokers: [kafkaBroker],
});

let producer: Producer;

export async function getAIFeedbackProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    await producer.connect();
    console.log('[AI Telemetry Kafka Producer] Connected successfully.');
  }
  return producer;
}

export async function publishAIFeedback(payload: AITelemetryPayload): Promise<void> {
  const prod = await getAIFeedbackProducer();
  await prod.send({
    topic: KAFKA_TOPICS.AI_FEEDBACK,
    messages: [
      {
        key: payload.userId,
        value: JSON.stringify(payload),
      },
    ],
  });
  console.log(`[AI Telemetry Kafka Producer] Published AI feedback for submission ${payload.submissionId}`);
}

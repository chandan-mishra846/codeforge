import { Kafka, Producer, Partitioners } from 'kafkajs';
import { KAFKA_TOPICS, ExecutionResultPayload } from '@rce/shared';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'execution-worker-producer',
  brokers: [kafkaBroker],
});

let producer: Producer;

export async function getResultProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer({ createPartitioner: Partitioners.DefaultPartitioner });
    await producer.connect();
    console.log('[Worker Kafka Producer] Connected successfully.');
  }
  return producer;
}

export async function publishExecutionResult(payload: ExecutionResultPayload): Promise<void> {
  const prod = await getResultProducer();
  await prod.send({
    topic: KAFKA_TOPICS.EXECUTION_RESULTS,
    messages: [
      {
        key: payload.userId,
        value: JSON.stringify(payload),
      },
    ],
  });
  console.log(`[Worker Kafka Producer] Published execution results for submission ${payload.submissionId}`);
}

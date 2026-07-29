import { Kafka } from 'kafkajs';
import { KAFKA_TOPICS, ExecutionResultPayload, AITelemetryPayload } from '@rce/shared';
import { pushToUser } from './wsServer';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9094';

const kafka = new Kafka({
  clientId: 'websocket-service-consumer',
  brokers: [kafkaBroker],
});

export const consumer = kafka.consumer({ groupId: 'websocket-service-group' });

export async function startWebSocketKafkaConsumer(): Promise<void> {
  await consumer.connect();
  await consumer.subscribe({ topic: KAFKA_TOPICS.EXECUTION_RESULTS, fromBeginning: false });
  await consumer.subscribe({ topic: KAFKA_TOPICS.AI_FEEDBACK, fromBeginning: false });

  console.log(`[WebSocket Kafka Consumer] Subscribed to '${KAFKA_TOPICS.EXECUTION_RESULTS}' and '${KAFKA_TOPICS.AI_FEEDBACK}'.`);

  await consumer.run({
    eachMessage: async ({ topic, message }) => {
      if (!message.value) return;

      const rawVal = message.value.toString();

      if (topic === KAFKA_TOPICS.EXECUTION_RESULTS) {
        const payload: ExecutionResultPayload = JSON.parse(rawVal);
        pushToUser(payload.userId, {
          event: 'EXECUTION_RESULT',
          data: payload,
        });
      } else if (topic === KAFKA_TOPICS.AI_FEEDBACK) {
        const payload: AITelemetryPayload = JSON.parse(rawVal);
        pushToUser(payload.userId, {
          event: 'AI_FEEDBACK',
          data: payload,
        });
      }
    },
  });
}

import { setupWebSocketServer } from './wsServer';
import { startWebSocketKafkaConsumer } from './kafkaConsumer';

const port = parseInt(process.env.WEBSOCKET_SERVICE_PORT || '4001', 10);

setupWebSocketServer(port);

startWebSocketKafkaConsumer().catch((err) => {
  console.error('[WebSocket Service] Fatal error in consumer:', err);
  process.exit(1);
});

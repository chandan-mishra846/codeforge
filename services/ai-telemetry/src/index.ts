import { startAITelemetryConsumer } from './kafkaConsumer';

console.log('[AI Telemetry Service] Starting Service...');

startAITelemetryConsumer().catch((err) => {
  console.error('[AI Telemetry Service] Fatal error:', err);
  process.exit(1);
});

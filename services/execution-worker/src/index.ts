import { startWorkerConsumer } from './kafkaConsumer';

console.log('[Execution Worker] Starting Sandbox Worker Service...');

startWorkerConsumer().catch((err) => {
  console.error('[Execution Worker] Fatal error starting consumer:', err);
  process.exit(1);
});

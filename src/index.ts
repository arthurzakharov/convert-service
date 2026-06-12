import 'dotenv/config';
import app from '@app';
import { initAllClients } from '@convert/client';

const PORT = Number(process.env.PORT ?? 3100);

async function start() {
  console.log('[convert-service] Initializing Convert SDK clients...');
  await initAllClients();

  app.listen(PORT, () => {
    console.log(`[convert-service] Listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error('[convert-service] Fatal startup error:', err);
  process.exit(1);
});

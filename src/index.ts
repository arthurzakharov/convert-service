import 'dotenv/config';
import app from '@app';
import { initAllClients } from '@convert/client';
import { createLogger } from '@utils/logger';

const log = createLogger('convert-service');
const PORT = Number(process.env.PORT ?? 3100);

async function start() {
  log.info('initializing Convert SDK clients');
  await initAllClients();

  app.listen(PORT, () => {
    log.info(`listening on port ${PORT}`);
  });
}

start().catch((err) => {
  log.error('fatal startup error', err);
  process.exit(1);
});

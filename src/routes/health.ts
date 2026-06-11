import { Router } from 'express';
import type { Request, Response } from 'express';
import { version } from '../../package.json';

const router = Router();

// RAILWAY_GIT_COMMIT_SHA is injected automatically by Railway at runtime.
// COMMIT_SHA can be set manually for other environments.
const commit =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.COMMIT_SHA?.slice(0, 7) ??
  'dev';

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version,
    commit,
    timestamp: new Date().toISOString(),
  });
});

export default router;

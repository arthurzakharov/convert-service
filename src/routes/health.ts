import { Router } from 'express';
import type { Request, Response } from 'express';
import { version } from '../../package.json';

const router = Router();

// RAILWAY_GIT_COMMIT_SHA is injected by Railway at runtime.
const commit = process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) ?? 'dev';

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version,
    commit,
    timestamp: new Date().toISOString(),
  });
});

export default router;

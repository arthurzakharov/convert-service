import { Router } from 'express';
import type { Request, Response } from 'express';
import { version } from '../../package.json';

const router = Router();

const commit = process.env.COMMIT_SHA?.slice(0, 7) ?? 'dev';

router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version,
    commit,
    timestamp: new Date().toISOString(),
  });
});

export default router;

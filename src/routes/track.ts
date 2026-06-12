import { Router } from 'express';
import type { Request, Response } from 'express';
import { getClient } from '@convert/client';
import type { ProjectKey } from '@convert/client';
import { createLogger } from '@utils/logger';
import type { TrackConversionRequest, TrackConversionResponse } from '../contracts';
import { parseRequest, trackConversionSchema } from './schemas';

const log = createLogger('track');
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const body = parseRequest<TrackConversionRequest>(trackConversionSchema, req.body, res);
  if (!body) return;

  const { projectKey, visitorId, goalKey, attributes } = body;

  let sdk;
  try {
    sdk = await getClient(projectKey as ProjectKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SDK not available';
    return res.status(503).json({ error: message });
  }

  try {
    const context = sdk.createContext(visitorId);
    if (!context) {
      return res.status(500).json({ error: 'Failed to create visitor context' });
    }

    context.trackConversion(goalKey, attributes);
    log.info('conversion fired', { projectKey, visitorId, goalKey, attributes });
    const response: TrackConversionResponse = { success: true };
    return res.json(response);
  } catch (err) {
    log.error('error tracking conversion', err);
    return res.status(500).json({ error: 'Failed to track conversion' });
  }
});

export default router;

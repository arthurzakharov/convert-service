import { Router } from 'express';
import type { Request, Response } from 'express';
import type { ConversionAttributes } from '@convertcom/js-sdk';
import { getClient } from '../convert/client';
import type { ProjectKey } from '../convert/client';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { projectKey, visitorId, goalKey, attributes } = req.body as {
    projectKey?: string;
    visitorId?: string;
    goalKey?: string;
    attributes?: ConversionAttributes;
  };

  if (!projectKey || !visitorId || !goalKey) {
    return res.status(400).json({ error: 'projectKey, visitorId and goalKey are required' });
  }

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
    console.log('[track] fired:', { projectKey, visitorId, goalKey, attributes });
    return res.json({ success: true });
  } catch (err) {
    console.error('[track] Error tracking conversion:', err);
    return res.status(500).json({ error: 'Failed to track conversion' });
  }
});

export default router;

import { Router } from 'express';
import type { Request, Response } from 'express';
import type { BucketedVariation } from '@convertcom/js-sdk';
import { getClient } from '@convert/client';
import type { ProjectKey } from '@convert/client';
import { buildSegments } from '@utils/segments';
import { createLogger } from '@utils/logger';
import type { BucketRequest, BucketResponse } from '../contracts';

const log = createLogger('bucket');

function isBucketedVariation(exp: unknown): exp is BucketedVariation {
  return typeof exp === 'object' && exp !== null && 'experienceKey' in exp && 'key' in exp;
}

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { projectKey, visitorId, visitorProperties = {}, locationProperties, pageUrl, campaign } =
    req.body as Partial<BucketRequest>;

  if (!projectKey || !visitorId) {
    return res.status(400).json({ error: 'projectKey and visitorId are required' });
  }

  let sdk;
  try {
    sdk = await getClient(projectKey as ProjectKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SDK not available';
    return res.status(503).json({ error: message });
  }

  try {
    const context = sdk.createContext(visitorId, visitorProperties);
    if (!context) {
      return res.status(500).json({ error: 'Failed to create visitor context' });
    }

    const segments = buildSegments(req, pageUrl, campaign);
    (context as any).setDefaultSegments(segments);

    log.info('request', { projectKey, visitorId, locationProperties, segments });
    const bucketedExperiences = context.runExperiences(
      locationProperties ? { locationProperties } : undefined,
    );

    const variations = (bucketedExperiences as unknown[])
      .filter(isBucketedVariation)
      .map((exp) => ({
        experienceKey: exp.experienceKey,
        experienceName: exp.experienceName,
        variationKey: exp.key,
        variationName: exp.name,
        changes: (exp as any).changes ?? [],
      }));

    const response: BucketResponse = { visitorId, variations };
    return res.json(response);
  } catch (err) {
    log.error('error running experiences', err);
    return res.status(500).json({ error: 'Failed to bucket visitor' });
  }
});

export default router;

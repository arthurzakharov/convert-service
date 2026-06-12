import { Router } from 'express';
import type { Request, Response } from 'express';
import type { BucketedVariation } from '@convertcom/js-sdk';
import { getClient } from '../convert/client';
import type { ProjectKey } from '../convert/client';

function isBucketedVariation(exp: unknown): exp is BucketedVariation {
  return typeof exp === 'object' && exp !== null && 'experienceKey' in exp && 'key' in exp;
}

const router = Router();

/**
 * POST /bucket
 *
 * Run all active experiences for a visitor and return their variant assignments.
 * The frontend calls this once on load, stores the result, and renders accordingly.
 *
 * Body:
 *   {
 *     projectKey: 'passexperten' | 'bussgeldcheck',
 *     visitorId: string,
 *     visitorProperties?: Record<string, unknown>    // audience/segment attributes
 *     locationProperties?: Record<string, unknown>   // URL/location targeting, e.g. { url: 'https://...' }
 *   }
 *
 * Response 200:
 *   {
 *     visitorId: string,
 *     variations: Array<{
 *       experienceKey: string,
 *       experienceName: string,
 *       variationKey: string,
 *       variationName: string,
 *       changes: unknown
 *     }>
 *   }
 */
router.post('/', async (req: Request, res: Response) => {
  const { projectKey, visitorId, visitorProperties = {}, locationProperties } = req.body as {
    projectKey?: string;
    visitorId?: string;
    visitorProperties?: Record<string, unknown>;
    locationProperties?: Record<string, unknown>;
  };

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

    console.log('[bucket] request:', { projectKey, visitorId, locationProperties });
    const bucketedExperiences = context.runExperiences(
      locationProperties ? { locationProperties } : undefined,
    );

    // Filter out RuleError / BucketingError entries — only keep successful bucketing results
    const variations = (bucketedExperiences as unknown[])
      .filter(isBucketedVariation)
      .map((exp) => ({
        experienceKey: exp.experienceKey,
        experienceName: exp.experienceName,
        variationKey: exp.key,       // ExperienceVariationConfig uses `key`
        variationName: exp.name,     // ExperienceVariationConfig uses `name`
        changes: (exp as any).changes ?? [],
      }));

    return res.json({ visitorId, variations });
  } catch (err) {
    console.error('[bucket] Error running experiences:', err);
    return res.status(500).json({ error: 'Failed to bucket visitor' });
  }
});

export default router;

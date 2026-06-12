import { Router } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '@utils/logger';
import {
  buildBucketingAttributes,
  createVisitorContext,
  findExperienceById,
  findExperienceByKey,
  findVariationById,
  findVariationByKey,
  getExperiences,
  isBucketedVariation,
  resolveClient,
  serializeVariation,
} from './convert-route-utils';
import type {
  GetExperienceByIdRequest,
  GetExperienceByKeyRequest,
  GetVariationByIdRequest,
  GetVariationByKeyRequest,
  ListExperiencesRequest,
  RunExperienceByIdRequest,
  RunExperienceRequest,
} from '../contracts';
import {
  experienceIdParamsSchema,
  experienceKeyParamsSchema,
  parseRequest,
  projectQuerySchema,
  runExperienceByIdSchema,
  runExperienceSchema,
  variationIdParamsSchema,
  variationKeyParamsSchema,
} from './schemas';

const log = createLogger('experiences');
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = parseRequest<ListExperiencesRequest>(projectQuerySchema, req.query, res);
  if (!query) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  return res.json({ experiences: getExperiences(sdk) });
});

router.get('/by-id/:experienceId', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetExperienceByIdRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Pick<GetExperienceByIdRequest, 'experienceId'>>(
    experienceIdParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const experience = findExperienceById(sdk, params.experienceId);
  if (!experience) {
    return res.status(404).json({ error: 'Experience not found' });
  }

  return res.json({ experience });
});

router.get('/:experienceKey', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetExperienceByKeyRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Pick<GetExperienceByKeyRequest, 'experienceKey'>>(
    experienceKeyParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const experience = findExperienceByKey(sdk, params.experienceKey);
  if (!experience) {
    return res.status(404).json({ error: 'Experience not found' });
  }

  return res.json({ experience });
});

router.get('/:experienceKey/variations/:variationKey', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetVariationByKeyRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Omit<GetVariationByKeyRequest, 'projectKey'>>(
    variationKeyParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const experience = findExperienceByKey(sdk, params.experienceKey);
  const variation = experience ? findVariationByKey(experience, params.variationKey) : undefined;
  if (!variation) {
    return res.status(404).json({ error: 'Variation not found' });
  }

  return res.json({ variation });
});

router.get('/by-id/:experienceId/variations/:variationId', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetVariationByIdRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Omit<GetVariationByIdRequest, 'projectKey'>>(
    variationIdParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const experience = findExperienceById(sdk, params.experienceId);
  const variation = experience ? findVariationById(experience, params.variationId) : undefined;
  if (!variation) {
    return res.status(404).json({ error: 'Variation not found' });
  }

  return res.json({ variation });
});

router.post('/run', async (req: Request, res: Response) => {
  const body = parseRequest<RunExperienceRequest>(runExperienceSchema, req.body, res);
  if (!body) return;

  const sdk = await resolveClient(body.projectKey, res);
  if (!sdk) return;

  const context = createVisitorContext(sdk, req, res, body);
  if (!context) return;

  try {
    const result = context.runExperience(body.experienceKey, buildBucketingAttributes(body));
    log.info('experience run', {
      projectKey: body.projectKey,
      visitorId: body.visitorId,
      experienceKey: body.experienceKey,
    });

    return res.json({
      visitorId: body.visitorId,
      variation: isBucketedVariation(result) ? serializeVariation(result) : null,
      reason: isBucketedVariation(result) ? undefined : result ?? null,
    });
  } catch (err) {
    log.error('error running experience', err);
    return res.status(500).json({ error: 'Failed to run experience' });
  }
});

router.post('/run-by-id', async (req: Request, res: Response) => {
  const body = parseRequest<RunExperienceByIdRequest>(runExperienceByIdSchema, req.body, res);
  if (!body) return;

  const sdk = await resolveClient(body.projectKey, res);
  if (!sdk) return;

  const experience = findExperienceById(sdk, body.experienceId);
  if (!experience?.key) {
    return res.status(404).json({ error: 'Experience not found' });
  }

  const context = createVisitorContext(sdk, req, res, body);
  if (!context) return;

  try {
    const result = context.runExperience(experience.key, buildBucketingAttributes(body));
    log.info('experience run by id', {
      projectKey: body.projectKey,
      visitorId: body.visitorId,
      experienceId: body.experienceId,
      experienceKey: experience.key,
    });

    return res.json({
      visitorId: body.visitorId,
      variation: isBucketedVariation(result) ? serializeVariation(result) : null,
      reason: isBucketedVariation(result) ? undefined : result ?? null,
    });
  } catch (err) {
    log.error('error running experience by id', err);
    return res.status(500).json({ error: 'Failed to run experience' });
  }
});

export default router;

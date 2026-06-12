import { Router } from 'express';
import type { Request, Response } from 'express';
import { createLogger } from '@utils/logger';
import {
  buildBucketingAttributes,
  createVisitorContext,
  findFeatureById,
  findFeatureByKey,
  getFeatures,
  isBucketedFeature,
  resolveClient,
  serializeFeature,
} from './convert-route-utils';
import type {
  GetFeatureByIdRequest,
  GetFeatureByKeyRequest,
  ListFeaturesRequest,
  RunFeatureByIdRequest,
  RunFeatureRequest,
  RunFeaturesRequest,
} from '../contracts';
import {
  featureIdParamsSchema,
  featureKeyParamsSchema,
  parseRequest,
  projectQuerySchema,
  runFeatureByIdSchema,
  runFeatureSchema,
  sharedBucketingSchema,
} from './schemas';

const log = createLogger('features');
const router = Router();

router.get('/', async (req: Request, res: Response) => {
  const query = parseRequest<ListFeaturesRequest>(projectQuerySchema, req.query, res);
  if (!query) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  return res.json({ features: getFeatures(sdk) });
});

router.get('/by-id/:featureId', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetFeatureByIdRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Pick<GetFeatureByIdRequest, 'featureId'>>(
    featureIdParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const feature = findFeatureById(sdk, params.featureId);
  if (!feature) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  return res.json({ feature });
});

router.get('/:featureKey', async (req: Request, res: Response) => {
  const query = parseRequest<Pick<GetFeatureByKeyRequest, 'projectKey'>>(projectQuerySchema, req.query, res);
  const params = parseRequest<Pick<GetFeatureByKeyRequest, 'featureKey'>>(
    featureKeyParamsSchema,
    req.params,
    res,
  );
  if (!query || !params) return;

  const sdk = await resolveClient(query.projectKey, res);
  if (!sdk) return;

  const feature = findFeatureByKey(sdk, params.featureKey);
  if (!feature) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  return res.json({ feature });
});

router.post('/run-all', async (req: Request, res: Response) => {
  const body = parseRequest<RunFeaturesRequest>(sharedBucketingSchema, req.body, res);
  if (!body) return;

  const sdk = await resolveClient(body.projectKey, res);
  if (!sdk) return;

  const context = createVisitorContext(sdk, req, res, body);
  if (!context) return;

  try {
    const results = context.runFeatures(buildBucketingAttributes(body));
    const features = (results as unknown[]).filter(isBucketedFeature).map(serializeFeature);

    log.info('features run', { projectKey: body.projectKey, visitorId: body.visitorId });
    return res.json({ visitorId: body.visitorId, features });
  } catch (err) {
    log.error('error running features', err);
    return res.status(500).json({ error: 'Failed to run features' });
  }
});

router.post('/run', async (req: Request, res: Response) => {
  const body = parseRequest<RunFeatureRequest>(runFeatureSchema, req.body, res);
  if (!body) return;

  const sdk = await resolveClient(body.projectKey, res);
  if (!sdk) return;

  const context = createVisitorContext(sdk, req, res, body);
  if (!context) return;

  try {
    const result = context.runFeature(body.featureKey, buildBucketingAttributes(body));
    const resultArray = Array.isArray(result) ? result : [result];
    const features = resultArray.filter(isBucketedFeature).map(serializeFeature);

    log.info('feature run', {
      projectKey: body.projectKey,
      visitorId: body.visitorId,
      featureKey: body.featureKey,
    });

    return res.json({
      visitorId: body.visitorId,
      feature: features.length === 1 ? features[0] : null,
      features,
      reason: features.length > 0 ? undefined : result ?? null,
    });
  } catch (err) {
    log.error('error running feature', err);
    return res.status(500).json({ error: 'Failed to run feature' });
  }
});

router.post('/run-by-id', async (req: Request, res: Response) => {
  const body = parseRequest<RunFeatureByIdRequest>(runFeatureByIdSchema, req.body, res);
  if (!body) return;

  const sdk = await resolveClient(body.projectKey, res);
  if (!sdk) return;

  const feature = findFeatureById(sdk, body.featureId);
  if (!feature?.key) {
    return res.status(404).json({ error: 'Feature not found' });
  }

  const context = createVisitorContext(sdk, req, res, body);
  if (!context) return;

  try {
    const result = context.runFeature(feature.key, buildBucketingAttributes(body));
    const resultArray = Array.isArray(result) ? result : [result];
    const features = resultArray.filter(isBucketedFeature).map(serializeFeature);

    log.info('feature run by id', {
      projectKey: body.projectKey,
      visitorId: body.visitorId,
      featureId: body.featureId,
      featureKey: feature.key,
    });

    return res.json({
      visitorId: body.visitorId,
      feature: features.length === 1 ? features[0] : null,
      features,
      reason: features.length > 0 ? undefined : result ?? null,
    });
  } catch (err) {
    log.error('error running feature by id', err);
    return res.status(500).json({ error: 'Failed to run feature' });
  }
});

export default router;

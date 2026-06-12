import type { Request, Response } from 'express';
import type {
  BucketedFeature,
  BucketedVariation,
  BucketingAttributes,
  ConfigExperience,
  ConfigFeature,
  ConvertInterface,
  ContextInterface,
  ExperienceVariationConfig,
} from '@convertcom/js-sdk';
import { getClient } from '@convert/client';
import type { ProjectKey } from '@convert/client';
import { buildSegments } from '@utils/segments';

export interface BucketingBody {
  projectKey?: string;
  visitorId?: string;
  visitorProperties?: Record<string, unknown>;
  locationProperties?: Record<string, unknown>;
  pageUrl?: string;
  campaign?: string;
  updateVisitorProperties?: boolean;
  forceVariationId?: string;
  enableTracking?: boolean;
  environment?: string;
  typeCasting?: boolean;
  experienceKeys?: string[];
}

export async function resolveClient(
  projectKey: string | undefined,
  res: Response,
): Promise<ConvertInterface | null> {
  if (!projectKey) {
    res.status(400).json({ error: 'projectKey is required' });
    return null;
  }

  try {
    return await getClient(projectKey as ProjectKey);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SDK not available';
    res.status(503).json({ error: message });
    return null;
  }
}

export function createVisitorContext(
  sdk: ConvertInterface,
  req: Request,
  res: Response,
  body: BucketingBody,
): ContextInterface | null {
  if (!body.visitorId) {
    res.status(400).json({ error: 'visitorId is required' });
    return null;
  }

  const context = sdk.createContext(body.visitorId, body.visitorProperties ?? {});
  if (!context) {
    res.status(500).json({ error: 'Failed to create visitor context' });
    return null;
  }

  context.setDefaultSegments(buildSegments(req, body.pageUrl, body.campaign));
  return context;
}

export function buildBucketingAttributes(body: BucketingBody): BucketingAttributes {
  const attributes: Record<string, unknown> = {};

  if (body.visitorProperties) attributes.visitorProperties = body.visitorProperties;
  if (body.locationProperties) attributes.locationProperties = body.locationProperties;
  if (body.updateVisitorProperties !== undefined) {
    attributes.updateVisitorProperties = body.updateVisitorProperties;
  }
  if (body.forceVariationId) attributes.forceVariationId = body.forceVariationId;
  if (body.enableTracking !== undefined) attributes.enableTracking = body.enableTracking;
  if (body.environment) attributes.environment = body.environment;
  if (body.typeCasting !== undefined) attributes.typeCasting = body.typeCasting;
  if (body.experienceKeys) attributes.experienceKeys = body.experienceKeys;

  return attributes as BucketingAttributes;
}

export function getExperiences(sdk: ConvertInterface): ConfigExperience[] {
  return sdk.data.experiences ?? [];
}

export function getFeatures(sdk: ConvertInterface): ConfigFeature[] {
  return sdk.data.features ?? [];
}

export function findExperienceByKey(
  sdk: ConvertInterface,
  key: string,
): ConfigExperience | undefined {
  return getExperiences(sdk).find((experience) => experience.key === key);
}

export function findExperienceById(
  sdk: ConvertInterface,
  id: string,
): ConfigExperience | undefined {
  return getExperiences(sdk).find((experience) => experience.id === id);
}

export function findFeatureByKey(
  sdk: ConvertInterface,
  key: string,
): ConfigFeature | undefined {
  return getFeatures(sdk).find((feature) => feature.key === key);
}

export function findFeatureById(
  sdk: ConvertInterface,
  id: string,
): ConfigFeature | undefined {
  return getFeatures(sdk).find((feature) => feature.id === id);
}

export function findVariationByKey(
  experience: ConfigExperience,
  key: string,
): ExperienceVariationConfig | undefined {
  return experience.variations?.find((variation) => variation.key === key);
}

export function findVariationById(
  experience: ConfigExperience,
  id: string,
): ExperienceVariationConfig | undefined {
  return experience.variations?.find((variation) => variation.id === id);
}

export function isBucketedVariation(result: unknown): result is BucketedVariation {
  return typeof result === 'object' && result !== null && ('key' in result || 'id' in result);
}

export function isBucketedFeature(result: unknown): result is BucketedFeature {
  return typeof result === 'object' && result !== null && ('status' in result || 'variables' in result);
}

export function serializeVariation(variation: BucketedVariation) {
  return {
    id: variation.id,
    experienceId: variation.experienceId,
    experienceKey: variation.experienceKey,
    experienceName: variation.experienceName,
    variationKey: variation.key,
    variationName: variation.name,
    status: variation.status,
    bucketingAllocation: variation.bucketingAllocation,
    changes: variation.changes ?? [],
  };
}

export function serializeFeature(feature: BucketedFeature) {
  return {
    experienceId: feature.experienceId,
    experienceKey: feature.experienceKey,
    experienceName: feature.experienceName,
    id: feature.id,
    key: feature.key,
    name: feature.name,
    status: feature.status,
    variables: feature.variables ?? {},
  };
}

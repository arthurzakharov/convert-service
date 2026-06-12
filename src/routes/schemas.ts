import type { Response } from 'express';
import type { ConversionAttributes } from '@convertcom/js-sdk';
import { z } from 'zod';

export const projectKeySchema = z.enum(['passexperten', 'bussgeldcheck']);

const recordSchema = z.record(z.string(), z.unknown());

export const sharedBucketingSchema = z.object({
  projectKey: projectKeySchema,
  visitorId: z.string().min(1),
  visitorProperties: recordSchema.optional(),
  locationProperties: recordSchema.optional(),
  pageUrl: z.string().optional(),
  campaign: z.string().optional(),
  updateVisitorProperties: z.boolean().optional(),
  forceVariationId: z.string().min(1).optional(),
  enableTracking: z.boolean().optional(),
  environment: z.string().min(1).optional(),
  typeCasting: z.boolean().optional(),
  experienceKeys: z.array(z.string().min(1)).optional(),
});

export const projectQuerySchema = z.object({
  projectKey: projectKeySchema,
});

export const experienceKeyParamsSchema = z.object({
  experienceKey: z.string().min(1),
});

export const experienceIdParamsSchema = z.object({
  experienceId: z.string().min(1),
});

export const variationKeyParamsSchema = z.object({
  experienceKey: z.string().min(1),
  variationKey: z.string().min(1),
});

export const variationIdParamsSchema = z.object({
  experienceId: z.string().min(1),
  variationId: z.string().min(1),
});

export const featureKeyParamsSchema = z.object({
  featureKey: z.string().min(1),
});

export const featureIdParamsSchema = z.object({
  featureId: z.string().min(1),
});

export const runExperienceSchema = sharedBucketingSchema.extend({
  experienceKey: z.string().min(1),
});

export const runExperienceByIdSchema = sharedBucketingSchema.extend({
  experienceId: z.string().min(1),
});

export const runFeatureSchema = sharedBucketingSchema.extend({
  featureKey: z.string().min(1),
});

export const runFeatureByIdSchema = sharedBucketingSchema.extend({
  featureId: z.string().min(1),
});

export const trackConversionSchema = z.object({
  projectKey: projectKeySchema,
  visitorId: z.string().min(1),
  goalKey: z.string().min(1),
  attributes: z.custom<ConversionAttributes>().optional(),
});

export function parseRequest<T>(
  schema: z.ZodType<T>,
  value: unknown,
  res: Response,
): T | null {
  const result = schema.safeParse(value);
  if (result.success) return result.data;

  return sendValidationError(res, result.error);
}

function sendValidationError(res: Response, error: z.ZodError): null {
  res.status(400).json({
    error: 'Invalid request',
    issues: error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    })),
  });

  return null;
}

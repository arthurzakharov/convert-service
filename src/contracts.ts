import type {
  ConfigExperience,
  ConfigFeature,
  ConversionAttributes,
  ExperienceChange,
  ExperienceVariationConfig,
} from '@convertcom/js-sdk';

export type ProjectKey = 'passexperten' | 'bussgeldcheck';

export interface ApiErrorResponse {
  error: string;
}

export interface SharedBucketingRequest {
  projectKey: ProjectKey;
  visitorId: string;
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

export interface SerializedVariation {
  id?: string;
  experienceId?: string;
  experienceKey?: string;
  experienceName?: string;
  variationKey?: string;
  variationName?: string;
  status?: string;
  bucketingAllocation?: number;
  changes: ExperienceChange[];
}

export interface SerializedFeature {
  experienceId?: string;
  experienceKey?: string;
  experienceName?: string;
  id?: string;
  key?: string;
  name?: string;
  status: string;
  variables: Record<string, unknown>;
}

export type BucketRequest = SharedBucketingRequest;

export interface BucketResponse {
  visitorId: string;
  variations: SerializedVariation[];
}

export interface ListExperiencesRequest {
  projectKey: ProjectKey;
}

export interface ListExperiencesResponse {
  experiences: ConfigExperience[];
}

export interface GetExperienceByKeyRequest {
  projectKey: ProjectKey;
  experienceKey: string;
}

export interface GetExperienceByIdRequest {
  projectKey: ProjectKey;
  experienceId: string;
}

export interface GetExperienceResponse {
  experience: ConfigExperience;
}

export interface GetVariationByKeyRequest {
  projectKey: ProjectKey;
  experienceKey: string;
  variationKey: string;
}

export interface GetVariationByIdRequest {
  projectKey: ProjectKey;
  experienceId: string;
  variationId: string;
}

export interface GetVariationResponse {
  variation: ExperienceVariationConfig;
}

export type RunExperienceRequest = SharedBucketingRequest & {
  experienceKey: string;
};

export type RunExperienceByIdRequest = SharedBucketingRequest & {
  experienceId: string;
};

export interface RunExperienceResponse {
  visitorId: string;
  variation: SerializedVariation | null;
  reason?: string | null;
}

export interface ListFeaturesRequest {
  projectKey: ProjectKey;
}

export interface ListFeaturesResponse {
  features: ConfigFeature[];
}

export interface GetFeatureByKeyRequest {
  projectKey: ProjectKey;
  featureKey: string;
}

export interface GetFeatureByIdRequest {
  projectKey: ProjectKey;
  featureId: string;
}

export interface GetFeatureResponse {
  feature: ConfigFeature;
}

export type RunFeaturesRequest = SharedBucketingRequest;

export interface RunFeaturesResponse {
  visitorId: string;
  features: SerializedFeature[];
}

export type RunFeatureRequest = SharedBucketingRequest & {
  featureKey: string;
};

export type RunFeatureByIdRequest = SharedBucketingRequest & {
  featureId: string;
};

export interface RunFeatureResponse {
  visitorId: string;
  feature: SerializedFeature | null;
  features: SerializedFeature[];
  reason?: string | string[] | null;
}

export interface TrackConversionRequest {
  projectKey: ProjectKey;
  visitorId: string;
  goalKey: string;
  attributes?: ConversionAttributes;
}

export interface TrackConversionResponse {
  success: true;
}

export interface HealthResponse {
  status: 'ok';
  version: string;
  commit: string;
  timestamp: string;
}

export interface ConvertApiEndpoints {
  'GET /health': {
    request: undefined;
    response: HealthResponse;
  };
  'POST /bucket': {
    request: BucketRequest;
    response: BucketResponse;
  };
  'GET /experiences': {
    request: ListExperiencesRequest;
    response: ListExperiencesResponse;
  };
  'GET /experiences/:experienceKey': {
    request: GetExperienceByKeyRequest;
    response: GetExperienceResponse;
  };
  'GET /experiences/by-id/:experienceId': {
    request: GetExperienceByIdRequest;
    response: GetExperienceResponse;
  };
  'GET /experiences/:experienceKey/variations/:variationKey': {
    request: GetVariationByKeyRequest;
    response: GetVariationResponse;
  };
  'GET /experiences/by-id/:experienceId/variations/:variationId': {
    request: GetVariationByIdRequest;
    response: GetVariationResponse;
  };
  'POST /experiences/run': {
    request: RunExperienceRequest;
    response: RunExperienceResponse;
  };
  'POST /experiences/run-by-id': {
    request: RunExperienceByIdRequest;
    response: RunExperienceResponse;
  };
  'GET /features': {
    request: ListFeaturesRequest;
    response: ListFeaturesResponse;
  };
  'GET /features/:featureKey': {
    request: GetFeatureByKeyRequest;
    response: GetFeatureResponse;
  };
  'GET /features/by-id/:featureId': {
    request: GetFeatureByIdRequest;
    response: GetFeatureResponse;
  };
  'POST /features/run-all': {
    request: RunFeaturesRequest;
    response: RunFeaturesResponse;
  };
  'POST /features/run': {
    request: RunFeatureRequest;
    response: RunFeatureResponse;
  };
  'POST /features/run-by-id': {
    request: RunFeatureByIdRequest;
    response: RunFeatureResponse;
  };
  'POST /track': {
    request: TrackConversionRequest;
    response: TrackConversionResponse;
  };
}

export type EndpointKey = keyof ConvertApiEndpoints;
export type EndpointRequest<T extends EndpointKey> = ConvertApiEndpoints[T]['request'];
export type EndpointResponse<T extends EndpointKey> = ConvertApiEndpoints[T]['response'];

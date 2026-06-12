import type {
  BucketRequest,
  BucketResponse,
  ConvertApiEndpoints,
  EndpointKey,
  EndpointRequest,
  EndpointResponse,
  GetExperienceByIdRequest,
  GetExperienceByKeyRequest,
  GetFeatureByIdRequest,
  GetFeatureByKeyRequest,
  GetVariationByIdRequest,
  GetVariationByKeyRequest,
  ListExperiencesRequest,
  ListFeaturesRequest,
  ProjectKey,
  RunExperienceByIdRequest,
  RunExperienceRequest,
  RunExperienceResponse,
  RunFeatureByIdRequest,
  RunFeatureRequest,
  RunFeatureResponse,
  RunFeaturesRequest,
  RunFeaturesResponse,
  TrackConversionRequest,
  TrackConversionResponse,
} from './contracts';

type FetchLike = typeof fetch;
type HeadersInitLike = Record<string, string>;
type RequestCredentialsLike = 'include' | 'omit' | 'same-origin';
type RequestWithoutDefaults<T> = Omit<T, 'projectKey' | 'visitorId'> &
  Partial<Pick<T, Extract<keyof T, 'projectKey' | 'visitorId'>>>;

declare const document:
  | {
      cookie: string;
    }
  | undefined;

export interface ConvertServiceClientOptions {
  baseUrl: string;
  projectKey: ProjectKey;
  visitorId?: string;
  visitorCookieName?: string;
  visitorCookieMaxAgeDays?: number;
  fetcher?: FetchLike;
  credentials?: RequestCredentialsLike;
  defaultVisitorProperties?: Record<string, unknown>;
  defaultLocationProperties?: Record<string, unknown>;
  defaultHeaders?: HeadersInitLike;
}

export class ConvertServiceError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ConvertServiceError';
    this.status = status;
    this.payload = payload;
  }
}

export class ConvertServiceClient {
  private readonly baseUrl: string;
  private readonly projectKey: ProjectKey;
  private readonly visitorCookieName: string;
  private readonly visitorCookieMaxAgeDays: number;
  private readonly fetcher: FetchLike;
  private readonly credentials: RequestCredentialsLike;
  private readonly defaultVisitorProperties?: Record<string, unknown>;
  private readonly defaultLocationProperties?: Record<string, unknown>;
  private readonly defaultHeaders?: HeadersInitLike;
  private visitorId?: string;

  constructor(options: ConvertServiceClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.projectKey = options.projectKey;
    this.visitorId = options.visitorId;
    this.visitorCookieName = options.visitorCookieName ?? 'convert_visitor_id';
    this.visitorCookieMaxAgeDays = options.visitorCookieMaxAgeDays ?? 365;
    this.fetcher = options.fetcher ?? fetch.bind(globalThis);
    this.credentials = options.credentials ?? 'include';
    this.defaultVisitorProperties = options.defaultVisitorProperties;
    this.defaultLocationProperties = options.defaultLocationProperties;
    this.defaultHeaders = options.defaultHeaders;
  }

  getVisitorId(): string {
    if (this.visitorId) return this.visitorId;

    const existing = readCookie(this.visitorCookieName);
    if (existing) {
      this.visitorId = existing;
      return existing;
    }

    const next = createVisitorId();
    writeCookie(this.visitorCookieName, next, this.visitorCookieMaxAgeDays);
    this.visitorId = next;
    return next;
  }

  setVisitorId(visitorId: string): void {
    this.visitorId = visitorId;
    writeCookie(this.visitorCookieName, visitorId, this.visitorCookieMaxAgeDays);
  }

  async request<T extends EndpointKey>(
    endpoint: T,
    request: EndpointRequest<T>,
  ): Promise<EndpointResponse<T>> {
    const [method, pathTemplate] = endpoint.split(' ') as ['GET' | 'POST', string];
    const requestData = (request ?? {}) as unknown as Record<string, unknown>;
    const path = interpolatePath(pathTemplate, requestData);
    const url = new URL(`${this.baseUrl}${path}`);

    const init: RequestInit = {
      method,
      credentials: this.credentials,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultHeaders,
      },
    };

    if (method === 'GET') {
      appendQueryParams(url, requestData, pathTemplate);
    } else {
      init.body = JSON.stringify(request);
    }

    const response = await this.fetcher(url.toString(), init);
    const payload = await parseResponse(response);

    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error: unknown }).error)
          : `Convert service request failed with ${response.status}`;
      throw new ConvertServiceError(message, response.status, payload);
    }

    return payload as EndpointResponse<T>;
  }

  health(): Promise<ConvertApiEndpoints['GET /health']['response']> {
    return this.request('GET /health', undefined);
  }

  bucket(request: RequestWithoutDefaults<BucketRequest> = {}): Promise<BucketResponse> {
    return this.request('POST /bucket', this.withBucketingDefaults(request));
  }

  listExperiences(
    request: Partial<ListExperiencesRequest> = {},
  ): Promise<ConvertApiEndpoints['GET /experiences']['response']> {
    return this.request('GET /experiences', this.withProject(request));
  }

  getExperienceByKey(
    request: RequestWithoutDefaults<GetExperienceByKeyRequest>,
  ): Promise<ConvertApiEndpoints['GET /experiences/:experienceKey']['response']> {
    return this.request('GET /experiences/:experienceKey', this.withProject(request));
  }

  getExperienceById(
    request: RequestWithoutDefaults<GetExperienceByIdRequest>,
  ): Promise<ConvertApiEndpoints['GET /experiences/by-id/:experienceId']['response']> {
    return this.request('GET /experiences/by-id/:experienceId', this.withProject(request));
  }

  getVariationByKey(
    request: RequestWithoutDefaults<GetVariationByKeyRequest>,
  ): Promise<
    ConvertApiEndpoints['GET /experiences/:experienceKey/variations/:variationKey']['response']
  > {
    return this.request(
      'GET /experiences/:experienceKey/variations/:variationKey',
      this.withProject(request),
    );
  }

  getVariationById(
    request: RequestWithoutDefaults<GetVariationByIdRequest>,
  ): Promise<
    ConvertApiEndpoints['GET /experiences/by-id/:experienceId/variations/:variationId']['response']
  > {
    return this.request(
      'GET /experiences/by-id/:experienceId/variations/:variationId',
      this.withProject(request),
    );
  }

  runExperience(request: RequestWithoutDefaults<RunExperienceRequest>): Promise<RunExperienceResponse> {
    return this.request('POST /experiences/run', this.withBucketingDefaults(request));
  }

  runExperienceById(
    request: RequestWithoutDefaults<RunExperienceByIdRequest>,
  ): Promise<RunExperienceResponse> {
    return this.request('POST /experiences/run-by-id', this.withBucketingDefaults(request));
  }

  listFeatures(
    request: Partial<ListFeaturesRequest> = {},
  ): Promise<ConvertApiEndpoints['GET /features']['response']> {
    return this.request('GET /features', this.withProject(request));
  }

  getFeatureByKey(
    request: RequestWithoutDefaults<GetFeatureByKeyRequest>,
  ): Promise<ConvertApiEndpoints['GET /features/:featureKey']['response']> {
    return this.request('GET /features/:featureKey', this.withProject(request));
  }

  getFeatureById(
    request: RequestWithoutDefaults<GetFeatureByIdRequest>,
  ): Promise<ConvertApiEndpoints['GET /features/by-id/:featureId']['response']> {
    return this.request('GET /features/by-id/:featureId', this.withProject(request));
  }

  runFeatures(request: RequestWithoutDefaults<RunFeaturesRequest> = {}): Promise<RunFeaturesResponse> {
    return this.request('POST /features/run-all', this.withBucketingDefaults(request));
  }

  runFeature(request: RequestWithoutDefaults<RunFeatureRequest>): Promise<RunFeatureResponse> {
    return this.request('POST /features/run', this.withBucketingDefaults(request));
  }

  runFeatureById(request: RequestWithoutDefaults<RunFeatureByIdRequest>): Promise<RunFeatureResponse> {
    return this.request('POST /features/run-by-id', this.withBucketingDefaults(request));
  }

  trackConversion(
    request: RequestWithoutDefaults<TrackConversionRequest>,
  ): Promise<TrackConversionResponse> {
    return this.request('POST /track', this.withVisitorDefaults(request));
  }

  private withProject<T extends { projectKey?: ProjectKey }>(request: T): T & { projectKey: ProjectKey } {
    return {
      ...request,
      projectKey: request.projectKey ?? this.projectKey,
    };
  }

  private withVisitorDefaults<T extends { projectKey?: ProjectKey; visitorId?: string }>(
    request: T,
  ): T & { projectKey: ProjectKey; visitorId: string } {
    return {
      ...request,
      projectKey: request.projectKey ?? this.projectKey,
      visitorId: request.visitorId ?? this.getVisitorId(),
    };
  }

  private withBucketingDefaults<T extends RequestWithoutDefaults<BucketRequest>>(
    request: T,
  ): T & BucketRequest {
    return {
      ...request,
      projectKey: request.projectKey ?? this.projectKey,
      visitorId: request.visitorId ?? this.getVisitorId(),
      visitorProperties: mergeRecords(this.defaultVisitorProperties, request.visitorProperties),
      locationProperties: mergeRecords(this.defaultLocationProperties, request.locationProperties),
    };
  }
}

export function createConvertServiceClient(
  options: ConvertServiceClientOptions,
): ConvertServiceClient {
  return new ConvertServiceClient(options);
}

function interpolatePath(path: string, request: Record<string, unknown>): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = request[key];
    if (value === undefined || value === null || value === '') {
      throw new Error(`Missing path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

function appendQueryParams(url: URL, request: Record<string, unknown>, pathTemplate: string): void {
  const pathParamNames = new Set(
    [...pathTemplate.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1]),
  );

  Object.entries(request).forEach(([key, value]) => {
    if (pathParamNames.has(key) || value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;

  const encodedName = encodeURIComponent(name);
  const cookie = document.cookie
    .split('; ')
    .find((item) => item.startsWith(`${encodedName}=`));

  if (!cookie) return undefined;
  return decodeURIComponent(cookie.slice(encodedName.length + 1));
}

function writeCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === 'undefined') return;

  const maxAge = Math.round(maxAgeDays * 24 * 60 * 60);
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(
    value,
  )}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

function createVisitorId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `visitor_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
}

function mergeRecords(
  defaults: Record<string, unknown> | undefined,
  overrides: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!defaults && !overrides) return undefined;
  return {
    ...defaults,
    ...overrides,
  };
}

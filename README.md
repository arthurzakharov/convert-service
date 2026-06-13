# convert-service

Server-side proxy for the [Convert.com](https://www.convert.com/) FullStack SDK. Exposes a small HTTP API so frontend apps can bucket visitors, read FullStack configuration, run feature flags, and track conversions without embedding SDK keys in the browser.

The bucketing endpoints follow Convert's documented FullStack flow for [experiences and variations](https://docs.developers.convert.com/docs/experiences-and-variations): create a visitor context, evaluate targeting/location rules, then return the selected variation or feature state.

## Endpoints

| Method | Path                                                       | Description                                      |
| ------ | ---------------------------------------------------------- | ------------------------------------------------ |
| `GET`  | `/health`                                                  | Returns service version and commit hash          |
| `POST` | `/bucket`                                                  | Run all active experiences for a visitor         |
| `GET`  | `/experiences`                                             | List configured experiences for a project        |
| `GET`  | `/experiences/:experienceKey`                              | Read one experience by key                       |
| `GET`  | `/experiences/by-id/:experienceId`                         | Read one experience by ID                        |
| `GET`  | `/experiences/:experienceKey/variations/:variationKey`     | Read one variation by experience/variation key   |
| `GET`  | `/experiences/by-id/:experienceId/variations/:variationId` | Read one variation by experience/variation ID    |
| `POST` | `/experiences/run`                                         | Run one experience by key for a visitor          |
| `POST` | `/experiences/run-by-id`                                   | Run one experience by ID for a visitor           |
| `GET`  | `/features`                                                | List configured FullStack features for a project |
| `GET`  | `/features/:featureKey`                                    | Read one feature by key                          |
| `GET`  | `/features/by-id/:featureId`                               | Read one feature by ID                           |
| `POST` | `/features/run-all`                                        | Run all feature flags for a visitor              |
| `POST` | `/features/run`                                            | Run one feature flag by key for a visitor        |
| `POST` | `/features/run-by-id`                                      | Run one feature flag by ID for a visitor         |
| `POST` | `/track`                                                   | Track a conversion goal                          |

### `GET /health`

```json
{
  "status": "ok",
  "version": "1.0.0",
  "commit": "a3f9c12",
  "timestamp": "2026-06-11T17:00:00.000Z"
}
```

### `POST /bucket`

```json
// Request
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "visitorProperties": { "country": "DE" }
}

// Response
{
  "visitorId": "user-unique-id",
  "variations": [
    {
      "experienceKey": "exp-key",
      "experienceName": "My Experiment",
      "variationKey": "variation-1",
      "variationName": "Variation 1",
      "changes": []
    }
  ]
}
```

### Shared bucketing fields

`POST /bucket`, `/experiences/run`, `/experiences/run-by-id`, `/features/run-all`, `/features/run`, and `/features/run-by-id` accept these Convert bucketing fields:

| Field                     | Required | Description                                                  |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `projectKey`              | Yes      | Supported project key, for example `passexperten`            |
| `visitorId`               | Yes      | Stable visitor identifier                                    |
| `visitorProperties`       | No       | Audience/segment targeting properties                        |
| `locationProperties`      | No       | Location rule matching properties                            |
| `pageUrl`                 | No       | Page URL used while deriving default segments                |
| `campaign`                | No       | Campaign value used while deriving default segments          |
| `updateVisitorProperties` | No       | Whether to update in-memory visitor properties               |
| `forceVariationId`        | No       | Force a specific variation ID when running experiences       |
| `enableTracking`          | No       | Whether Convert should track the bucketing event immediately |
| `environment`             | No       | Override Convert environment for this decision               |
| `typeCasting`             | No       | Feature variable type casting flag                           |
| `experienceKeys`          | No       | Limit feature evaluation to specific experience keys         |

### `GET /experiences`

```http
GET /experiences?projectKey=passexperten
```

```json
{
  "experiences": [
    {
      "id": "100001",
      "key": "headline-test",
      "name": "Headline Test",
      "status": "active",
      "variations": []
    }
  ]
}
```

### `GET /experiences/:experienceKey`

```http
GET /experiences/headline-test?projectKey=passexperten
```

```json
{
  "experience": {
    "id": "100001",
    "key": "headline-test",
    "name": "Headline Test",
    "variations": []
  }
}
```

The ID-based equivalent is:

```http
GET /experiences/by-id/100001?projectKey=passexperten
```

### `GET /experiences/:experienceKey/variations/:variationKey`

```http
GET /experiences/headline-test/variations/variation-a?projectKey=passexperten
```

```json
{
  "variation": {
    "id": "200001",
    "key": "variation-a",
    "name": "Variation A",
    "changes": []
  }
}
```

The ID-based equivalent is:

```http
GET /experiences/by-id/100001/variations/200001?projectKey=passexperten
```

### `POST /experiences/run`

```json
// Request
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "experienceKey": "headline-test",
  "visitorProperties": { "country": "DE" },
  "locationProperties": { "url": "https://www.passexperten.de/" }
}

// Response
{
  "visitorId": "user-unique-id",
  "variation": {
    "id": "200001",
    "experienceId": "100001",
    "experienceKey": "headline-test",
    "experienceName": "Headline Test",
    "variationKey": "variation-a",
    "variationName": "Variation A",
    "status": "running",
    "bucketingAllocation": 5000,
    "changes": []
  }
}
```

The ID-based request uses `experienceId`:

```json
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "experienceId": "100001"
}
```

### `GET /features`

```http
GET /features?projectKey=passexperten
```

```json
{
  "features": [
    {
      "id": "300001",
      "key": "checkout-flow",
      "name": "Checkout Flow",
      "variables": [{ "key": "enabled", "type": "boolean" }]
    }
  ]
}
```

### `POST /features/run-all`

```json
// Request
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "visitorProperties": { "country": "DE" }
}

// Response
{
  "visitorId": "user-unique-id",
  "features": [
    {
      "experienceId": "100001",
      "experienceKey": "headline-test",
      "experienceName": "Headline Test",
      "id": "300001",
      "key": "checkout-flow",
      "name": "Checkout Flow",
      "status": "enabled",
      "variables": { "enabled": true }
    }
  ]
}
```

### `POST /features/run`

```json
// Request
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "featureKey": "checkout-flow",
  "experienceKeys": ["headline-test"]
}

// Response
{
  "visitorId": "user-unique-id",
  "feature": {
    "experienceId": "100001",
    "experienceKey": "headline-test",
    "id": "300001",
    "key": "checkout-flow",
    "status": "enabled",
    "variables": { "enabled": true }
  },
  "features": [
    {
      "experienceId": "100001",
      "experienceKey": "headline-test",
      "id": "300001",
      "key": "checkout-flow",
      "status": "enabled",
      "variables": { "enabled": true }
    }
  ]
}
```

The ID-based request uses `featureId`:

```json
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "featureId": "300001"
}
```

### `POST /track`

```json
// Request
{
  "projectKey": "passexperten",
  "visitorId": "user-unique-id",
  "goalKey": "purchase",
  "attributes": {
    "conversionData": [
      { "key": "amount", "value": 49.99 }
    ]
  }
}

// Response
{ "success": true }
```

## Supported projects

| `projectKey`    | Site             |
| --------------- | ---------------- |
| `passexperten`  | passexperten.de  |
| `bussgeldcheck` | bussgeldcheck.de |

## Local development

```bash
cp .env.example .env
# Fill in real SDK keys from Convert dashboard → Project Settings → SDK Keys

npm install
npm run dev        # ts-node-dev with hot reload on port 3100
```

## Postman

Import [postman/convert-service.postman_collection.json](/Users/arthurzakharov/Code/Work/convert-service/postman/convert-service.postman_collection.json) into Postman to test the API manually.

After import, update the collection variables:

| Variable | Default | Description |
|---|---|---|
| `baseUrl` | `http://localhost:3100` | Local or deployed service URL |
| `projectKey` | `passexperten` | Convert service project key |
| `visitorId` | `postman-visitor-001` | Stable visitor ID used in POST examples |
| `experienceKey` / `experienceId` | sample values | Replace with real Convert experience identifiers |
| `variationKey` / `variationId` | sample values | Replace with real Convert variation identifiers |
| `featureKey` / `featureId` | sample values | Replace with real Convert feature identifiers |
| `goalKey` | `purchase` | Replace with a real Convert goal key |

## Frontend npm helper

This package also exposes a browser-safe helper for frontend applications. Import it from the `client` subpath so the frontend bundle does not import the Express service entrypoint:

```ts
import { createConvertServiceClient } from "convert-service/client";

const convert = createConvertServiceClient({
  baseUrl: "https://convert-service.example.com",
  projectKey: "passexperten",
});

const { variation } = await convert.runExperience({
  experienceKey: "headline-test",
  visitorProperties: { country: "DE" },
  locationProperties: { url: window.location.href },
});

if (variation?.variationKey === "variation-a") {
  // render variation-specific frontend behavior
}
```

The helper manages a stable visitor ID in a first-party cookie named `convert_visitor_id` by default. You can override or seed it when needed:

```ts
const convert = createConvertServiceClient({
  baseUrl: "https://convert-service.example.com",
  projectKey: "bussgeldcheck",
  visitorCookieName: "bc_convert_vid",
  visitorCookieMaxAgeDays: 180,
  defaultVisitorProperties: { app: "bussgeldcheck-web" },
});

convert.setVisitorId(currentUser.id);
```

Available helper methods:

| Method                                                                                           | Method | Path                                                       |
| ------------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------- |
| `health() => HealthResponse`                                                                     | `GET`  | `/health`                                                  |
| `bucket(r?: PartialProjectVisitor<BucketRequest>) => BucketResponse`                             | `POST` | `/bucket`                                                  |
| `listExperiences(r?: Partial<ListExperiencesRequest>) => ListExperiencesResponse`                | `GET`  | `/experiences`                                             |
| `getExperienceByKey(r: PartialProject<GetExperienceByKeyRequest>) => GetExperienceResponse`      | `GET`  | `/experiences/:experienceKey`                              |
| `getExperienceById(r: PartialProject<GetExperienceByIdRequest>) => GetExperienceResponse`        | `GET`  | `/experiences/by-id/:experienceId`                         |
| `getVariationByKey(r: PartialProject<GetVariationByKeyRequest>) => GetVariationResponse`         | `GET`  | `/experiences/:experienceKey/variations/:variationKey`     |
| `getVariationById(r: PartialProject<GetVariationByIdRequest>) => GetVariationResponse`           | `GET`  | `/experiences/by-id/:experienceId/variations/:variationId` |
| `runExperience(r: PartialProjectVisitor<RunExperienceRequest>) => RunExperienceResponse`         | `POST` | `/experiences/run`                                         |
| `runExperienceById(r: PartialProjectVisitor<RunExperienceByIdRequest>) => RunExperienceResponse` | `POST` | `/experiences/run-by-id`                                   |
| `listFeatures(r?: Partial<ListFeaturesRequest>) => ListFeaturesResponse`                         | `GET`  | `/features`                                                |
| `getFeatureByKey(r: PartialProject<GetFeatureByKeyRequest>) => GetFeatureResponse`               | `GET`  | `/features/:featureKey`                                    |
| `getFeatureById(r: PartialProject<GetFeatureByIdRequest>) => GetFeatureResponse`                 | `GET`  | `/features/by-id/:featureId`                               |
| `runFeatures(r?: PartialProjectVisitor<RunFeaturesRequest>) => RunFeaturesResponse`              | `POST` | `/features/run-all`                                        |
| `runFeature(r: PartialProjectVisitor<RunFeatureRequest>) => RunFeatureResponse`                  | `POST` | `/features/run`                                            |
| `runFeatureById(r: PartialProjectVisitor<RunFeatureByIdRequest>) => RunFeatureResponse`          | `POST` | `/features/run-by-id`                                      |
| `trackConversion(r: PartialProjectVisitor<TrackConversionRequest>) => TrackConversionResponse`   | `POST` | `/track`                                                   |

For helper methods, `projectKey` defaults to the client-level `projectKey`, and `visitorId` defaults to the cookie-managed visitor ID when the endpoint needs one.

In the table, `PartialProject<T>` means `projectKey` can be omitted, and `PartialProjectVisitor<T>` means both `projectKey` and `visitorId` can be omitted because the helper supplies them.

Endpoint contracts are exported from `convert-service/contracts`:

```ts
import type {
  ConvertApiEndpoints,
  EndpointRequest,
  EndpointResponse,
  RunFeatureResponse,
} from "convert-service/contracts";

type RunFeatureRequest = EndpointRequest<"POST /features/run">;
type BucketResponse = EndpointResponse<"POST /bucket">;
type AllEndpoints = keyof ConvertApiEndpoints;
```

Use these types in frontend wrappers, tests, or mocks when you need exact request/response compatibility with this service.

## Environment variables

| Variable                        | Required | Description                                       |
| ------------------------------- | -------- | ------------------------------------------------- |
| `CONVERT_SDK_KEY_PASSEXPERTEN`  | Yes      | SDK key for passexperten project                  |
| `CONVERT_SDK_KEY_BUSSGELDCHECK` | Yes      | SDK key for bussgeldcheck project                 |
| `CONVERT_ENVIRONMENT`           | Yes      | `staging` or `live`                               |
| `CONVERT_DATA_REFRESH_INTERVAL` | No       | Config refresh interval in ms (default: `300000`) |
| `CORS_ORIGINS`                  | No       | Comma-separated allowed origins (default: `*`)    |
| `PORT`                          | No       | Port to listen on (default: `3100`)               |

## Docker

```bash
docker build -t convert-service .
docker run -p 3100:3100 --env-file .env convert-service
```

## Deployment

The service deploys to [Railway](https://railway.app) automatically via GitHub Actions.

**Flow:**

- Push to any branch / open a PR → CI runs (typecheck + build)
- Merge to `main` without a deploy tag → CI runs, Railway deploy is skipped
- Merge to `main` with `[deploy]` or `[railway-deploy]` in the commit message → deploys to Railway
- Run the GitHub Actions workflow manually → deploys to Railway

**One-time setup:**

1. Create a Railway project and link it to this repo
2. Set all env variables in the Railway dashboard
3. Add `RAILWAY_TOKEN` to GitHub repo → Settings → Secrets and variables → Actions

**Deploy commit examples:**

```bash
git commit -m "Release convert client [deploy]"
git commit -m "Redeploy Railway service [railway-deploy]"
```

## Tech stack

- Node 24 / TypeScript
- Express
- [@convertcom/js-sdk](https://www.npmjs.com/package/@convertcom/js-sdk)

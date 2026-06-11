# convert-service

Server-side proxy for the [Convert.com](https://www.convert.com/) FullStack SDK. Exposes a small HTTP API so frontend apps can bucket visitors and track conversions without embedding SDK keys in the browser.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Returns service version and commit hash |
| `POST` | `/bucket` | Run all active experiences for a visitor |
| `POST` | `/track` | Track a conversion goal |

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

| `projectKey` | Site |
|---|---|
| `passexperten` | passexperten.de |
| `bussgeldcheck` | bussgeldcheck.de |

## Local development

```bash
cp .env.example .env
# Fill in real SDK keys from Convert dashboard → Project Settings → SDK Keys

npm install
npm run dev        # ts-node-dev with hot reload on port 3100
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `CONVERT_SDK_KEY_PASSEXPERTEN` | Yes | SDK key for passexperten project |
| `CONVERT_SDK_KEY_BUSSGELDCHECK` | Yes | SDK key for bussgeldcheck project |
| `CONVERT_ENVIRONMENT` | Yes | `staging` or `live` |
| `CONVERT_DATA_REFRESH_INTERVAL` | No | Config refresh interval in ms (default: `300000`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins (default: `*`) |
| `PORT` | No | Port to listen on (default: `3100`) |

## Docker

```bash
docker build -t convert-service .
docker run -p 3100:3100 --env-file .env convert-service
```

## Deployment

The service deploys to [Railway](https://railway.app) automatically via GitHub Actions.

**Flow:**
- Push to any branch / open a PR → CI runs (typecheck + build)
- Merge to `main` → auto-deploys to Railway

**One-time setup:**
1. Create a Railway project and link it to this repo
2. Set all env variables in the Railway dashboard
3. Add `RAILWAY_TOKEN` to GitHub repo → Settings → Secrets and variables → Actions

## Tech stack

- Node 20 / TypeScript
- Express
- [@convertcom/js-sdk](https://www.npmjs.com/package/@convertcom/js-sdk)

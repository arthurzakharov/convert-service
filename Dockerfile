# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache — only re-runs when package files change)
COPY package.json package-lock.json ./
RUN npm ci

# Compile TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: production image ──────────────────────────────────────────────────
FROM node:24-alpine AS runner

WORKDIR /app

# Generic build-time commit hash — passed by Railway via railway.toml buildArgs
# or by any other CI via --build-arg COMMIT_SHA=<sha>
ARG COMMIT_SHA=dev
ENV NODE_ENV=production
ENV COMMIT_SHA=$COMMIT_SHA

# Install production dependencies only
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy compiled output from builder
COPY --from=builder /app/dist ./dist

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 3100

CMD ["node", "dist/index.js"]

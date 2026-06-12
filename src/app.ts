import express from 'express';
import cors from 'cors';
import bucketRouter from '@routes/bucket';
import experiencesRouter from '@routes/experiences';
import featuresRouter from '@routes/features';
import trackRouter from '@routes/track';
import healthRouter from '@routes/health';

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/health', healthRouter);
app.use('/bucket', bucketRouter);
app.use('/experiences', experiencesRouter);
app.use('/features', featuresRouter);
app.use('/track', trackRouter);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;

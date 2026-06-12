import { UAParser } from 'ua-parser-js';
import type { Request } from 'express';

export interface VisitorSegments {
  browser?: string;
  devices?: string;
  country?: string;
  source?: string;
  campaign?: string;
  visitorType?: string;
}

/**
 * Normalise UAParser browser name to the values Convert expects.
 * Convert accepts: 'chrome' | 'firefox' | 'safari' | 'edge' | 'ie' | 'opera' | 'other'
 */
function normaliseBrowser(name: string | undefined): string {
  if (!name) return 'other';
  const n = name.toLowerCase();
  if (n.includes('chrome') || n.includes('chromium')) return 'chrome';
  if (n.includes('firefox')) return 'firefox';
  if (n.includes('safari')) return 'safari';
  if (n.includes('edge')) return 'edge';
  if (n.includes('ie') || n.includes('internet explorer')) return 'ie';
  if (n.includes('opera')) return 'opera';
  return 'other';
}

/**
 * Normalise UAParser device type to the values Convert expects.
 * Convert accepts: 'desktop' | 'mobile' | 'tablet'
 */
function normaliseDevice(type: string | undefined): string {
  if (!type) return 'desktop'; // UAParser returns undefined for desktops
  if (type === 'mobile') return 'mobile';
  if (type === 'tablet') return 'tablet';
  return 'desktop';
}

/**
 * Build Convert default segments from the incoming HTTP request.
 * Browser, device, source are derived from headers automatically.
 * Country is read from Cloudflare's CF-IPCountry header (set by Railway's proxy).
 * campaign must be passed explicitly by the caller (UTM param, frontend-only).
 */
export function buildSegments(req: Request, campaign?: string): VisitorSegments {
  const ua = req.headers['user-agent'];
  const parser = new UAParser(ua);
  const result = parser.getResult();

  // Cloudflare sets CF-IPCountry on every request going through Railway
  const cfCountry = req.headers['cf-ipcountry'] as string | undefined;

  const segments: VisitorSegments = {
    browser: normaliseBrowser(result.browser.name),
    devices: normaliseDevice(result.device.type),
    source: ([] as (string | string[] | undefined)[])
      .concat(req.headers['referer'] ?? req.headers['referrer'])
      .flat()
      .filter((v): v is string => typeof v === 'string')[0],
    country: cfCountry && cfCountry !== 'XX' ? cfCountry : undefined,
  };

  if (campaign) segments.campaign = campaign;

  return segments;
}

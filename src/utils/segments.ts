import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
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
 * Order matters: check 'edge' before 'chrome' (Edge UA contains "Chrome")
 */
function normaliseBrowser(name: string | undefined): string {
  if (!name) return 'other';
  const n = name.toLowerCase();
  if (n.includes('edge')) return 'edge';
  if (n.includes('chrome') || n.includes('chromium')) return 'chrome';
  if (n.includes('firefox')) return 'firefox';
  if (n.includes('safari')) return 'safari';
  if (n.includes('ie') || n.includes('internet explorer')) return 'ie';
  if (n.includes('opera')) return 'opera';
  return 'other';
}

/**
 * Normalise UAParser device type to the values Convert expects.
 * Convert accepts: 'desktop' | 'mobile' | 'tablet'
 * UAParser returns undefined for desktops — treat that as 'desktop'.
 */
function normaliseDevice(type: string | undefined): string {
  if (type === 'mobile') return 'mobile';
  if (type === 'tablet') return 'tablet';
  return 'desktop';
}

/**
 * Extract the real client IP, accounting for Railway / reverse proxy headers.
 */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return first.trim();
  }
  return req.socket?.remoteAddress;
}

/**
 * Strip query string and hash from a URL string, keep path.
 * e.g. 'https://example.com/testfunnel/?foo=bar' → 'https://example.com/testfunnel/'
 */
function stripQueryParams(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

/**
 * Build Convert default segments from the incoming HTTP request.
 *
 * Auto-detected from headers:  browser, devices, country (geoip from IP)
 * Passed by frontend:          pageUrl (current page), campaign (UTM param)
 */
export function buildSegments(
  req: Request,
  pageUrl?: string,
  campaign?: string,
): VisitorSegments {
  const ua = req.headers['user-agent'];
  const parser = new UAParser(ua);
  const result = parser.getResult();

  // Country: try Cloudflare header first, fall back to offline geoip lookup
  let country: string | undefined;
  const cfCountry = req.headers['cf-ipcountry'] as string | undefined;
  if (cfCountry && cfCountry !== 'XX') {
    country = cfCountry;
  } else {
    const ip = getClientIp(req);
    if (ip) {
      const geo = geoip.lookup(ip);
      country = geo?.country ?? undefined;
    }
  }

  const browser = normaliseBrowser(result.browser.name);
  const devices = normaliseDevice(result.device.type);

  // source = current page URL (from frontend) stripped of query params
  const source = stripQueryParams(pageUrl);

  const segments: VisitorSegments = { browser, devices, country, source };

  if (campaign) segments.campaign = campaign;

  console.log('[segments] built:', { browser, devices, country, source, campaign });

  return segments;
}

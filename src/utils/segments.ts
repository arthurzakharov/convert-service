import { UAParser } from 'ua-parser-js';
import geoip from 'geoip-lite';
import type { Request } from 'express';
import { createLogger } from '@utils/logger';

const log = createLogger('segments');

// Convert API segment types (from @convertcom/js-sdk-event VisitorSegments)
type ConvertBrowser = 'IE' | 'CH' | 'FF' | 'OP' | 'SF' | 'OTH';
type ConvertDevice = 'ALLPH' | 'IPH' | 'OTHPH' | 'ALLTAB' | 'IPAD' | 'OTHTAB' | 'DESK' | 'OTHDEV';
type ConvertSource = 'campaign' | 'search' | 'referral' | 'direct' | 'ai_tool';
type ConvertVisitorType = 'new' | 'returning';

export interface VisitorSegments {
  browser?: ConvertBrowser;
  devices?: ConvertDevice[];
  country?: string;
  source?: ConvertSource;
  campaign?: string;
  visitorType?: ConvertVisitorType;
}

/**
 * Normalise UAParser browser name to Convert's internal browser codes.
 * Convert API accepts: 'CH' (Chrome) | 'FF' (Firefox) | 'SF' (Safari) |
 *                      'IE' (IE) | 'OP' (Opera) | 'OTH' (Other)
 * Note: Edge is not in the enum — maps to 'OTH'.
 * Order matters: check 'edge' before 'chrome' (Edge UA contains "Chrome")
 */
function normaliseBrowser(name: string | undefined): ConvertBrowser {
  if (!name) return 'OTH';
  const n = name.toLowerCase();
  if (n.includes('edge')) return 'OTH';
  if (n.includes('chrome') || n.includes('chromium')) return 'CH';
  if (n.includes('firefox')) return 'FF';
  if (n.includes('safari')) return 'SF';
  if (n.includes('ie') || n.includes('internet explorer')) return 'IE';
  if (n.includes('opera')) return 'OP';
  return 'OTH';
}

/**
 * Normalise UAParser device type to Convert's internal device codes (array).
 * Convert API accepts: ['DESK'] | ['ALLPH'] | ['ALLTAB']
 * UAParser returns undefined for desktops — treat that as 'DESK'.
 */
function normaliseDevice(type: string | undefined): ConvertDevice[] {
  if (type === 'mobile') return ['ALLPH'];
  if (type === 'tablet') return ['ALLTAB'];
  return ['DESK'];
}

/**
 * Derive traffic source category from available context.
 * Convert API accepts: 'campaign' | 'search' | 'referral' | 'direct' | 'ai_tool'
 */
function deriveSource(campaign?: string): ConvertSource {
  if (campaign) return 'campaign';
  return 'direct';
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
 * Build Convert default segments from the incoming HTTP request.
 *
 * Auto-detected from headers:  browser, devices, country (geoip from IP)
 * Passed by frontend:          pageUrl (not used directly), campaign (UTM param)
 *
 * Note: Convert's `source` field is a traffic category ('direct' | 'campaign' | ...),
 * not a URL. If a UTM campaign is present we report 'campaign'; otherwise 'direct'.
 */
export function buildSegments(
  req: Request,
  _pageUrl?: string,
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
  const source = deriveSource(campaign);

  const segments: VisitorSegments = { browser, devices, country, source };

  if (campaign) segments.campaign = campaign;

  log.debug('built', { browser, devices, country, source, campaign });

  return segments;
}

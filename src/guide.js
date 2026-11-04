import { decodeXMLTV } from './xmltv.js';
export { xmltvTime, parseXMLTV } from './xmltv.js';
export const GUIDE_URL = 'https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz';
export const REFRESH_INTERVAL = 6 * 60 * 60 * 1000;

export async function fetchGuide({ fetcher = fetch, now = Date.now() } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  try {
    const response = await fetcher(GUIDE_URL, { signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok) throw new Error('Le guide est temporairement indisponible.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > 32 * 1024 * 1024 || bytes.length < 4) throw new Error('Taille du guide invalide.');
    return { ...decodeXMLTV(bytes, now), savedAt: now, source: GUIDE_URL, schema: 1 };
  } finally { clearTimeout(timeout); }
}

export function guideNeedsRefresh(guide, now = Date.now()) {
  return !guide || now - guide.savedAt >= REFRESH_INTERVAL || !guide.programmes.some(p => Date.parse(p.start) <= now && Date.parse(p.end) > now);
}

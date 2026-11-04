import { createStore, get, set } from 'idb-keyval';
import { GUIDE_URL } from './guide.js';
import { validateCatalogue } from './catalogue.js';

let store;
const guideStore = () => store ??= createStore('alaffiche-guide-france', 'guide');

export async function readCachedGuide(now = Date.now()) {
  try {
    const guide = await get('current', guideStore());
    if (guide?.schema !== 1 || guide.source !== GUIDE_URL || !Number.isFinite(guide.savedAt) || guide.savedAt > now || !Array.isArray(guide.channels) || !guide.channels.every(c => typeof c.id === 'string' && typeof c.name === 'string')) return null;
    return { ...guide, programmes: validateCatalogue(guide.programmes) };
  } catch { return null; }
}

export async function saveGuide(guide) {
  try { await set('current', guide, guideStore()); return true; }
  catch { return false; }
}

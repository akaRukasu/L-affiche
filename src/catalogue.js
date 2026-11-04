export const categories = ['Tout', 'Films', 'Séries', 'Sport', 'Documentaires', 'Info', 'Jeunesse', 'Divertissement', 'Histoire', 'Sciences', 'Enquêtes', 'Nature', 'Humour', 'Auto', 'Autres'];

export function validateCatalogue(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100000) {
    throw new Error('Le guide doit contenir une liste de 1 à 100 000 programmes.');
  }
  const ids = new Set();
  return value.map((item, i) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`Programme ${i + 1} invalide.`);
    const output = {};
    for (const field of ['id', 'title', 'description', 'channel', 'category', 'start', 'end']) {
      if (typeof item[field] !== 'string' || !item[field].trim() || item[field].length > 2000) {
        throw new Error(`Champ « ${field} » invalide au programme ${i + 1}.`);
      }
      output[field] = item[field];
    }
    if (ids.has(output.id)) throw new Error('Chaque programme doit avoir un identifiant unique.');
    ids.add(output.id);
    // A timezone is required: an imported schedule must refer to an unambiguous instant.
    for (const field of ['start', 'end']) {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(output[field]) || !Number.isFinite(Date.parse(output[field]))) {
        throw new Error(`Horaire « ${field} » invalide : utilisez ISO 8601 avec fuseau horaire.`);
      }
    }
    if (Date.parse(output.end) <= Date.parse(output.start)) throw new Error('La fin doit être après le début.');
    output.artwork = ['space', 'cinema', 'sport', 'history', 'nature', 'crime', 'comedy', 'auto'].includes(item.artwork) ? item.artwork : 'cinema';
    if (typeof item.subtitle === 'string' && item.subtitle.trim()) output.subtitle = item.subtitle.slice(0, 2000);
    if (output.category === 'Sport') output.sportEvent = item.sportEvent !== false;
    if (typeof item.image === 'string' && item.image.length <= 2048) {
      try { const url = new URL(item.image); if (url.protocol === 'https:' && !url.username && !url.password) output.image = url.href; } catch { /* Use local artwork if absent or invalid. */ }
    }
    return output;
  });
}

export function selectPrograms(items, { tab = 'live', category = 'Tout', query = '', favorites = new Set(), sportMode = 'events', now = Date.now() } = {}) {
  const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const search = fold(query.trim());
  return items.filter(p => {
    const start = Date.parse(p.start), end = Date.parse(p.end);
    if (tab === 'live' && !(start <= now && now < end)) return false;
    if (tab === 'soon' && !(now < start && start <= now + 3600000)) return false;
    if (tab === 'saved' && !favorites.has(p.id)) return false;
    if (tab === 'sport' && (p.category !== 'Sport' || end <= now)) return false;
    if (tab === 'sport' && sportMode === 'events' && p.sportEvent === false) return false;
    if (tab === 'explore' && end <= now) return false;
    return (category === 'Tout' || p.category === category) && (!search || fold(`${p.title} ${p.subtitle || ''} ${p.description} ${p.channel} ${p.category}`).includes(search));
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

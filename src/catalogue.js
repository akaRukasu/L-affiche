export const categories = ['Tout', 'Films', 'Sport', 'Histoire', 'Sciences', 'Enquêtes', 'Nature', 'Humour', 'Auto'];

export function makeDemo(now = Date.now()) {
  const entries = [
    ['orbite', 'Les frontières du cosmos', 'Une odyssée aux confins de notre système solaire.', 'Sciences', 'Sciences · Démo', -25, 80, 'space'],
    ['lumiere', 'Les lumières de la ville', 'Une rencontre inattendue, une nuit qui change tout.', 'Films', 'Cinéma · Démo', -18, 100, 'cinema'],
    ['terrain', 'Le grand match', 'Le rendez-vous des passionnés du ballon rond.', 'Sport', 'Sport · Démo', -40, 110, 'sport'],
    ['memoire', 'Les bâtisseurs du temps', 'À la découverte des grandes cités de l’Antiquité.', 'Histoire', 'Histoire · Démo', -10, 60, 'history'],
    ['sauvage', 'La vie sauvage', 'Au rythme des derniers grands espaces.', 'Nature', 'Nature · Démo', -12, 55, 'nature'],
    ['dossier', 'Un dossier, une vérité', 'Une enquête racontée à travers ses archives.', 'Enquêtes', 'Enquêtes · Démo', 12, 65, 'crime'],
    ['scene', 'Ce soir, on rit', 'Une scène, des rencontres et beaucoup d’autodérision.', 'Humour', 'Spectacle · Démo', 25, 90, 'comedy'],
    ['moteur', 'Les lignes de la vitesse', 'Les artisans et les machines du sport automobile.', 'Auto', 'Moteurs · Démo', 42, 52, 'auto']
  ];
  return entries.map(([id, title, description, category, channel, offset, duration, artwork]) => ({
    id, title, description, category, channel, artwork,
    start: new Date(now + offset * 60000).toISOString(),
    end: new Date(now + (offset + duration) * 60000).toISOString()
  }));
}

export function validateCatalogue(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 2000) {
    throw new Error('Le fichier doit contenir une liste de 1 à 2 000 programmes.');
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
    return output;
  });
}

export function selectPrograms(items, { tab = 'live', category = 'Tout', query = '', favorites = new Set(), now = Date.now() } = {}) {
  const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr');
  const search = fold(query.trim());
  return items.filter(p => {
    const start = Date.parse(p.start), end = Date.parse(p.end);
    if (tab === 'live' && !(start <= now && now < end)) return false;
    if (tab === 'soon' && !(now < start && start <= now + 3600000)) return false;
    if (tab === 'saved' && !favorites.has(p.id)) return false;
    return (category === 'Tout' || p.category === category) && (!search || fold(`${p.title} ${p.channel} ${p.category}`).includes(search));
  }).sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

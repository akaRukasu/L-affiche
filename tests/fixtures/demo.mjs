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

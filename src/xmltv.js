import sax from 'sax';
import { Gunzip } from 'fflate';
import { validateCatalogue } from './catalogue.js';
const fold = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const list = value => value === undefined ? [] : Array.isArray(value) ? value : [value];
const text = value => String(value ?? '').trim();
export const MAX_XML_BYTES = 160 * 1024 * 1024;

export function xmltvTime(value) {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s+([+-])(\d{2})(\d{2})$/.exec(value ?? '');
  if (!match) throw new Error('Horaire du guide invalide.');
  const [, y, m, d, h, min, s, sign, oh, om] = match;
  const utc = Date.UTC(+y, +m - 1, +d, +h, +min, +s);
  const calendar = new Date(utc);
  if (calendar.getUTCFullYear() !== +y || calendar.getUTCMonth() !== +m - 1 || calendar.getUTCDate() !== +d || +h > 23 || +min > 59 || +s > 59 || +oh > 23 || +om > 59) throw new Error('Date du guide invalide.');
  return new Date(utc - (sign === '+' ? 1 : -1) * (+oh * 60 + +om) * 60000).toISOString();
}

function genre(value) {
  const tags = fold(list(value).map(text).join(' '));
  if (/sport|football|rugby|tennis|cyclisme|basket|volley|handball|automobilisme|formule 1|motocyclisme|athletisme|natation|golf|hockey|boxe|biathlon|ski/.test(tags)) return ['Sport', 'sport'];
  if (/jeunesse|dessin.anime|animation/.test(tags)) return ['Jeunesse', 'cinema'];
  if (/serie|feuilleton/.test(tags)) return ['Séries', 'cinema'];
  if (/film|cinema|court.metrage|telefilm/.test(tags)) return ['Films', 'cinema'];
  if (/sport|football|rugby|tennis|cyclisme/.test(tags)) return ['Sport', 'sport'];
  if (/histoire|historique/.test(tags)) return ['Histoire', 'history'];
  if (/science|technolog|espace/.test(tags)) return ['Sciences', 'space'];
  if (/nature|animal|environnement/.test(tags)) return ['Nature', 'nature'];
  if (/enquete|justice|policier/.test(tags)) return ['Enquêtes', 'crime'];
  if (/humour|comedie|one.man/.test(tags)) return ['Humour', 'comedy'];
  if (/auto|moto/.test(tags)) return ['Auto', 'auto'];
  if (/documentaire/.test(tags)) return ['Documentaires', 'history'];
  if (/jeunesse|dessin.anime|animation/.test(tags)) return ['Jeunesse', 'cinema'];
  if (/information|journal|actualite|debat|politique|meteo/.test(tags)) return ['Info', 'crime'];
  if (/divertissement|jeu|musique|spectacle|magazine|telerealite/.test(tags)) return ['Divertissement', 'comedy'];
  return ['Autres', 'cinema'];
}

export function createXMLTVParser(now = Date.now()) {
  const parser = sax.parser(true, { strictEntities: true, position: false });
  const channels = new Map(), programmes = [], ids = new Set();
  let channel = null, programme = null, field = null, value = '', rootSeen = false, depth = 0;
  parser.onerror = error => { throw error; };
  parser.ondoctype = declaration => { if (declaration.includes('[')) throw new Error('Entités XML non autorisées.'); };
  parser.onopentag = node => {
    if (depth++ === 0) {
      if (node.name !== 'tv') throw new Error('Le document reçu n’est pas un guide TV.');
      rootSeen = true;
    }
    const a = node.attributes;
    if (node.name === 'channel') channel = { id: a.id, name: '' };
    if (node.name === 'programme') {
      programme = null;
      try {
        const start = xmltvTime(a.start), end = xmltvTime(a.stop);
        if (Date.parse(end) > Date.parse(start) && Date.parse(end) >= now - 6 * 3600000 && Date.parse(start) <= now + 48 * 3600000) programme = { start, end, channelId: a.channel, categories: [] };
      } catch { /* Skip this schedule entry while continuing to parse the document. */ }
    }
    if (['title', 'sub-title', 'desc', 'category', 'display-name'].includes(node.name)) { field = node.name; value = ''; }
    if (node.name === 'icon' && programme && !programme.image) programme.image = a.src;
  };
  const append = chunk => { if (field && value.length < 2000) value += chunk.slice(0, 2000 - value.length); };
  parser.ontext = append;
  parser.oncdata = append;
  parser.onclosetag = name => {
    depth--;
    if (name === field) {
      value = value.trim();
      if (name === 'display-name' && channel && !channel.name) channel.name = value;
      if (programme) {
        if (name === 'category') programme.categories.push(value);
        else if (!programme[name]) programme[name] = value;
      }
      field = null;
    }
    if (name === 'channel' && channel) {
      if (channel.id && channel.name) channels.set(channel.id, channel.name);
      channel = null;
    }
    if (name === 'programme' && programme) {
      const p = programme, id = `${p.channelId}@${p.start}`, title = p.title, channelName = channels.get(p.channelId);
      if (channelName && title && !ids.has(id)) {
        const [category, artwork] = genre(p.categories);
        const sportEvent = category === 'Sport' && !/mag|journal|documentaire|emission|divertissement/.test(fold(p.categories.join(' '))) && !/a bientot|fin des programmes|retrouvez|conference de presse|plateau avant.match/.test(fold(title));
        programmes.push({ id, title, subtitle: p['sub-title'], description: p.desc || 'Résumé non disponible.', channel: channelName, category, sportEvent, artwork, start: p.start, end: p.end, image: p.image });
        ids.add(id);
      }
      programme = null;
    }
  };
  return {
    write: chunk => parser.write(chunk),
    finish() {
      parser.close();
      if (!rootSeen) throw new Error('Le guide reçu est illisible.');
      const valid = validateCatalogue(programmes);
      if (!valid.some(p => Date.parse(p.end) > now)) throw new Error('La source ne fournit pas encore de programmes à jour.');
      return { programmes: valid, channels: [...channels].map(([id, name]) => ({ id, name })) };
    }
  };
}

export function parseXMLTV(xml, now = Date.now()) {
  if (xml.length > MAX_XML_BYTES) throw new Error('Le guide dépasse la taille autorisée.');
  const parser = createXMLTVParser(now);
  for (let i = 0; i < xml.length; i += 32768) parser.write(xml.slice(i, i + 32768));
  return parser.finish();
}

export function decodeXMLTV(bytes, now = Date.now()) {
  const parser = createXMLTVParser(now), decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0;
  const parse = (chunk, final) => {
    size += chunk.length;
    if (size > MAX_XML_BYTES) throw new Error('Le guide dépasse la taille autorisée.');
    parser.write(decoder.decode(chunk, { stream: !final }));
  };
  if (bytes[0] === 31 && bytes[1] === 139) {
    const unzip = new Gunzip(parse);
    for (let i = 0; i < bytes.length; i += 32768) unzip.push(bytes.subarray(i, i + 32768), i + 32768 >= bytes.length);
  } else {
    for (let i = 0; i < bytes.length; i += 32768) parse(bytes.subarray(i, i + 32768), i + 32768 >= bytes.length);
  }
  return parser.finish();
}

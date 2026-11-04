import { Capacitor } from '@capacitor/core';
import { categories, selectPrograms, escapeHTML as esc } from './catalogue.js';
import { guideNeedsRefresh } from './guide.js';
import { downloadGuide } from './guide-client.js';
import { readCachedGuide, saveGuide } from './guide-cache.js';
import './style.css';

const $ = selector => document.querySelector(selector);
const native = Capacitor.isNativePlatform();
document.documentElement.classList.toggle('native', native);
const tabs = { live: ['En direct', 'À découvrir maintenant'], soon: ['Bientôt', 'Dans la prochaine heure'], sport: ['Sport', 'Matchs et événements · prochaines 48 h'], explore: ['Explorer', 'Tous les programmes'], saved: ['Ma sélection', 'Vos favoris'] };
let tab = 'live', category = 'Tout', query = '', sportMode = 'events';
let catalogue = [], guide = null, loading = true, initializing = true, guideError = '', storageWarning = false, lastAttempt = 0, viewLimit = 80, favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem('alaffiche.favorites') || '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter(v => typeof v === 'string'));
} catch { /* A corrupt or unavailable store must not prevent opening the app. */ }
function persist(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
const time = value => new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const day = value => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(value));
function timing(p) {
  const now = Date.now(), start = Date.parse(p.start), end = Date.parse(p.end);
  if (now < start) return `Dans ${Math.ceil((start - now) / 60000)} min`;
  if (now < end) return `${Math.ceil((end - now) / 60000)} min restantes`;
  return 'Terminé';
}
function art(p, extra = '') { return `<div aria-hidden="true" class="art art-${p.artwork} ${extra}"><div class="art-orb"></div><div class="art-horizon"></div>${p.image ? `<img class="poster" src="${esc(p.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ''}<span>${esc(p.category)}</span></div>`; }
function card(p) {
  return `<button class="program-card" data-detail="${esc(p.id)}">${art(p)}<div class="card-copy"><p class="channel">${esc(p.channel)}</p><h3>${esc(p.title)}</h3>${p.subtitle ? `<p class="event-subtitle">${esc(p.subtitle)}</p>` : ''}<p class="time">${day(p.start)} · ${time(p.start)}–${time(p.end)}</p><p class="remaining">${timing(p)}${favorites.has(p.id) ? ' · ♥' : ''}</p></div></button>`;
}
function hero(p) {
  const percent = Math.max(0, Math.min(100, (Date.now() - Date.parse(p.start)) / (Date.parse(p.end) - Date.parse(p.start)) * 100));
  return `<button class="hero-card" data-detail="${esc(p.id)}">${art(p, 'hero-art')}<div class="hero-copy"><p class="hero-label">EN CE MOMENT · ${esc(p.category)}</p><h2>${esc(p.title)}</h2><p>${esc(p.description)}</p><div class="hero-footer"><span>${esc(p.channel)}</span><span>${time(p.start)}–${time(p.end)}</span></div><progress max="100" value="${percent}" aria-label="Progression du programme"></progress></div></button>`;
}
function renderGuideStatus() {
  const expired = guide && !catalogue.some(p => Date.parse(p.end) > Date.now());
  $('#guide-status').textContent = loading ? 'ACTUALISATION DU GUIDE' : !guide ? 'GUIDE INDISPONIBLE' : expired ? 'GUIDE À ACTUALISER' : guideError ? 'GUIDE ENREGISTRÉ' : 'GUIDE TV AUTOMATIQUE';
  const updated = guide ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(guide.savedAt)) : '';
  $('#guide-note').textContent = guide
    ? `${guide.channels.length} chaînes référencées · ${new Set(catalogue.map(p => p.channel)).size} avec horaires · Mis à jour le ${updated}. ${expired ? 'Les horaires enregistrés sont périmés. ' : ''}${guideError ? 'Connexion au guide impossible. La dernière copie reste disponible.' : 'Actualisation automatique toutes les 6 heures.'}${storageWarning ? ' Copie hors connexion indisponible sur cet appareil.' : ''}`
    : loading ? 'Chargement automatique du guide France complet. La première ouverture peut prendre un moment…' : 'Impossible de charger les programmes. Le chargement reprendra automatiquement au retour de la connexion.';
  $('#refresh-guide').disabled = loading;
  $('#refresh-guide').textContent = loading ? 'Chargement…' : 'Actualiser';
  $('#programs').setAttribute('aria-busy', String(loading));
}
async function refreshGuide(force = false) {
  if (initializing || loading || (!force && (!guideNeedsRefresh(guide) || Date.now() - lastAttempt < 60000))) return;
  loading = true; lastAttempt = Date.now(); render();
  try {
    const next = await downloadGuide();
    guide = next; catalogue = next.programmes; guideError = '';
    window.dispatchEvent(new CustomEvent('alaffiche:guide', { detail: { channels: guide.channels.length, programmes: catalogue.length, sports: catalogue.filter(p => p.category === 'Sport').length } }));
    storageWarning = !await saveGuide(next);
  } catch (error) { guideError = error.message || 'Connexion impossible.'; }
  finally { loading = false; render(); }
}
function render() {
  $('#page-title').textContent = tabs[tab][0];
  $('#section-title').textContent = tabs[tab][1];
  renderGuideStatus();
  const availableCategories = categories.filter(c => c === 'Tout' || catalogue.some(p => p.category === c));
  if (!availableCategories.includes(category)) category = 'Tout';
  $('#categories').innerHTML = availableCategories.map(c => `<button data-category="${esc(c)}" aria-pressed="${c === category}">${esc(c)}</button>`).join('');
  $('#categories').hidden = tab === 'sport';
  $('#sport-filters').hidden = tab !== 'sport';
  document.querySelectorAll('[data-sport-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.sportMode === sportMode)));
  const results = selectPrograms(catalogue, { tab, category, query, favorites, sportMode });
  const featured = tab === 'live' && !query && category === 'Tout' ? results.find(p => p.artwork === 'space') || results[0] : null;
  $('#hero').innerHTML = featured ? hero(featured) : '';
  $('#hero').hidden = !featured;
  $('#result-count').textContent = `${results.length} programme${results.length === 1 ? '' : 's'}`;
  $('#programs').innerHTML = results.slice(0, viewLimit).map(card).join('');
  $('#load-more').hidden = results.length <= viewLimit;
  $('#empty').hidden = results.length !== 0;
  $('#empty').textContent = !guide ? loading ? 'Chargement des programmes…' : 'Le guide sera affiché dès que la connexion sera rétablie.' : tab === 'saved' ? 'Votre prochaine découverte commence ici. Ajoutez des programmes à votre sélection.' : 'Aucun programme ne correspond. Essayez une autre catégorie ou une autre recherche.';
  document.querySelectorAll('[data-tab]').forEach(button => {
    if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
}
function selectTab(next) {
  if (!Object.prototype.hasOwnProperty.call(tabs, next)) return;
  document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
  tab = next; category = 'Tout'; query = ''; viewLimit = 80; $('#search').value = '';
  render(); window.scrollTo({ top: 0, behavior: 'auto' });
}
// This small contract connects real UIKit tabs/search to the shared web catalogue.
window.ALAfficheNative = { selectTab, refreshGuide, search(value) { query = String(value); viewLimit = 80; render(); }, setTextScale(value) { const size = Math.max(14, Math.min(53, Number(value) || 17)); document.documentElement.style.fontSize = `${size}px`; document.documentElement.classList.toggle('large-text', size >= 24); } };
window.dispatchEvent(new Event('alaffiche:ready'));
function openDetail(id) {
  const p = catalogue.find(item => item.id === id);
  if (!p) return;
  const isSaved = favorites.has(id);
  $('#detail-content').innerHTML = `<div class="sheet-handle" aria-hidden="true"></div><button class="close-button" data-close aria-label="Fermer">×</button>${art(p, 'detail-art')}<p class="channel">${esc(p.channel)} · ${esc(p.category)}</p><h2>${esc(p.title)}</h2>${p.subtitle ? `<p class="event-subtitle">${esc(p.subtitle)}</p>` : ''}<p class="time">${day(p.start)} · ${time(p.start)}–${time(p.end)} · ${timing(p)}</p><p class="description">${esc(p.description)}</p><button class="primary-button" data-favorite="${esc(id)}" aria-pressed="${isSaved}">${isSaved ? 'Retirer de ma sélection' : 'Ajouter à ma sélection'}</button><p class="detail-note">Horaires : XML TV Fr. Cette application ne diffuse pas de flux vidéo.</p>`;
  $('#detail').showModal();
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.tab) selectTab(button.dataset.tab);
  if (button.dataset.category) { category = button.dataset.category; viewLimit = 80; render(); }
  if (button.dataset.sportMode) { sportMode = button.dataset.sportMode; viewLimit = 80; render(); }
  if (button.dataset.detail) openDetail(button.dataset.detail);
  if (button.hasAttribute('data-close')) $('#detail').close();
  if (button.dataset.favorite) {
    const id = button.dataset.favorite;
    if (favorites.has(id)) favorites.delete(id); else favorites.add(id);
    const stored = persist('alaffiche.favorites', [...favorites]);
    button.textContent = favorites.has(id) ? 'Retirer de ma sélection' : 'Ajouter à ma sélection';
    button.setAttribute('aria-pressed', String(favorites.has(id)));
    if (!stored) $('.detail-note').textContent = 'Sélection conservée pour cette session uniquement : le stockage local est indisponible.';
    render();
  }
});
$('#search').addEventListener('input', event => { query = event.target.value; viewLimit = 80; render(); });
$('#load-more').addEventListener('click', () => { viewLimit += 80; render(); });
$('#refresh-guide').addEventListener('click', () => refreshGuide(true));
document.addEventListener('error', event => { if (event.target.matches?.('img.poster')) event.target.hidden = true; }, true);
window.addEventListener('online', () => refreshGuide(true));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshGuide(); });
window.addEventListener('pageshow', () => refreshGuide());
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => {
  if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); }
}));
document.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName) || document.querySelector('dialog[open]')) return;
  const current = document.activeElement.getBoundingClientRect();
  const x = current.x + current.width / 2, y = current.y + current.height / 2;
  const horizontal = ['ArrowLeft', 'ArrowRight'].includes(event.key);
  const sign = ['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1;
  const candidates = [...document.querySelectorAll('button,a,input')].filter(el => el !== document.activeElement && el.getClientRects().length && !el.disabled).map(el => {
    const rect = el.getBoundingClientRect();
    const dx = rect.x + rect.width / 2 - x, dy = rect.y + rect.height / 2 - y;
    return { el, primary: (horizontal ? dx : dy) * sign, secondary: Math.abs(horizontal ? dy : dx) };
  }).filter(item => item.primary > 4).sort((a, b) => a.primary + a.secondary * 3 - b.primary - b.secondary * 3);
  if (candidates[0]) { event.preventDefault(); candidates[0].el.focus(); }
});
render();
async function startGuide() {
  guide = await readCachedGuide();
  if (guide) catalogue = guide.programmes;
  loading = false; initializing = false; render(); refreshGuide();
}
startGuide();
setInterval(() => { if (!document.hidden && !document.querySelector('dialog[open]') && !document.activeElement.closest('#categories,#programs,#hero')) render(); }, 30000);
setInterval(() => { if (!document.hidden) refreshGuide(); }, 60000);
if (!native && 'serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register('./sw.js').catch(() => {});

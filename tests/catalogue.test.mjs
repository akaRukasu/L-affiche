import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeDemo, selectPrograms, validateCatalogue, escapeHTML } from '../src/catalogue.js';
const now = Date.parse('2026-11-03T12:00:00Z');
const demo = makeDemo(now);
test('live and upcoming respect schedule boundaries', () => {
  assert.equal(selectPrograms(demo, { now, tab: 'live' }).length, 5);
  assert.equal(selectPrograms(demo, { now, tab: 'soon' }).length, 3);
  const start = Date.parse(demo[0].start), end = Date.parse(demo[0].end);
  assert.equal(selectPrograms([demo[0]], { now: start, tab: 'live' }).length, 1);
  assert.equal(selectPrograms([demo[0]], { now: end, tab: 'live' }).length, 0);
});
test('search ignores accents and saved tab uses stable ids', () => {
  assert.equal(selectPrograms(demo, { now, tab: 'explore', query: 'frontieres' })[0].id, 'orbite');
  assert.deepEqual(selectPrograms(demo, { now, tab: 'saved', favorites: new Set(['moteur']) }).map(p => p.id), ['moteur']);
});
test('import rejects ambiguous dates, duplicate ids and invalid schedules', () => {
  assert.equal(validateCatalogue(demo).length, 8);
  assert.throws(() => validateCatalogue([{ ...demo[0], start: '2026-11-03T12:00' }]));
  assert.throws(() => validateCatalogue([{ ...demo[0], end: demo[0].start }]));
  assert.throws(() => validateCatalogue([demo[0], demo[0]]));
  assert.throws(() => validateCatalogue([{ ...demo[0], title: {} }]));
  assert.throws(() => validateCatalogue({ programs: demo }));
});
test('imported text and artwork cannot inject markup', () => {
  const item = validateCatalogue([{ ...demo[0], title: '<img src=x onerror="alert(1)">', artwork: '" onclick="alert(1)' }])[0];
  assert.equal(item.artwork, 'cinema');
  assert.equal(escapeHTML(item.title), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

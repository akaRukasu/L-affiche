import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync, strToU8 } from 'fflate';
import { parseXMLTV, xmltvTime, fetchGuide, guideNeedsRefresh, GUIDE_URL, REFRESH_INTERVAL } from '../src/guide.js';
import 'fake-indexeddb/auto';
import { readCachedGuide, saveGuide } from '../src/guide-cache.js';
import { selectPrograms, validateCatalogue } from '../src/catalogue.js';

const now = Date.parse('2026-11-04T12:00:00Z');
const xml = `<?xml version="1.0"?><!DOCTYPE tv SYSTEM "xmltv.dtd"><tv>
<channel id="France2.fr"><display-name>France 2</display-name></channel>
<programme channel="France2.fr" start="20261104123000 +0100" stop="20261104133000 +0100"><title lang="fr">Journal &amp; météo</title><desc>Les nouvelles du jour.</desc><category>Information</category><icon src="https://example.org/image.jpg"/></programme>
<programme channel="France2.fr" start="20261104133000 +0100" stop="20261104143000 +0100"><title>Une série</title><category>Série</category></programme>
<programme channel="France2.fr" start="20261104133000 +0100" stop="20261104143000 +0100"><title>Doublon</title></programme>
<programme channel="France2.fr" start="20261001000000 +0200" stop="20261001010000 +0200"><title>Périmé</title></programme>
<programme channel="France2.fr" start="20261110000000 +0100" stop="20261110010000 +0100"><title>Plus tard</title></programme>
<programme channel="inconnue" start="20261104123000 +0100" stop="20261104133000 +0100"><title>Sans chaîne</title></programme>
<programme channel="France2.fr" start="illisible" stop="20261104133000 +0100"><title>Invalide</title></programme>
</tv>`;

test('XMLTV keeps real schedules, decodes text, removes duplicates and bounds the date window', () => {
  const result = parseXMLTV(xml, now).programmes;
  assert.equal(result.length, 2);
  assert.equal(result[0].title, 'Journal & météo');
  assert.equal(result[0].channel, 'France 2');
  assert.equal(result[0].category, 'Info');
  assert.equal(result[1].category, 'Séries');
  assert.equal(result[1].description, 'Résumé non disponible.');
  assert.equal(result[0].image, 'https://example.org/image.jpg');
  assert.equal(selectPrograms(result, { now, tab: 'live' }).length, 1);
  assert.equal(selectPrograms(result, { now, tab: 'soon' }).length, 1);
  assert.equal(parseXMLTV(xml, now + 60000).programmes[0].id, result[0].id);
});

test('XMLTV timezones preserve the two occurrences of an hour at the end of daylight saving', () => {
  assert.equal(xmltvTime('20261025023000 +0200'), '2026-10-25T00:30:00.000Z');
  assert.equal(xmltvTime('20261025023000 +0100'), '2026-10-25T01:30:00.000Z');
  assert.equal(xmltvTime('20261104070000 -0500'), '2026-11-04T12:00:00.000Z');
  assert.throws(() => xmltvTime('20261104120000'));
  assert.throws(() => xmltvTime('20260231120000 +0100'));
  assert.throws(() => xmltvTime('20261104250000 +0100'));
});

test('expired, malformed and entity-bearing guides are rejected instead of inventing programmes', () => {
  assert.throws(() => parseXMLTV(xml, now + 7 * 86400000));
  assert.throws(() => parseXMLTV('<tv><programme></tv>', now));
  assert.throws(() => parseXMLTV('<!DOCTYPE tv [<!ENTITY x "value">]><tv/>', now));
  assert.throws(() => parseXMLTV('<html>Service indisponible</html>', now));
});

test('automatic download supports compressed and already-decompressed HTTP responses', async () => {
  for (const body of [gzipSync(strToU8(xml)), strToU8(xml)]) {
    let calls = 0;
    const result = await fetchGuide({ now, fetcher: async (url, options) => {
      calls++;
      assert.equal(url, 'https://xmltvfr.fr/xmltv/xmltv_fr.xml.gz');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.cache, 'no-store');
      return new Response(body);
    } });
    assert.equal(calls, 1);
    assert.equal(result.programmes.length, 2);
    assert.equal(result.savedAt, now);
  }
  await assert.rejects(fetchGuide({ now, fetcher: async () => new Response('down', { status: 503 }) }));
});

test('large complete-France guides persist offline beyond the localStorage size limit', async () => {
  const sample = parseXMLTV(xml, now);
  const guide = { ...sample, source: GUIDE_URL, schema: 1, savedAt: now,
    programmes: Array.from({ length: 12000 }, (_, i) => ({ ...sample.programmes[0], id: `programme-${i}`, description: 'Résumé '.repeat(100) })) };
  assert(JSON.stringify(guide).length > 5 * 1024 * 1024);
  assert.equal(await saveGuide(guide), true);
  const cached = await readCachedGuide(now);
  assert.equal(cached.programmes.length, 12000);
  assert.equal(cached.programmes[11999].id, 'programme-11999');
  assert.equal(guideNeedsRefresh(cached, now + 60000), false);
  assert.equal(guideNeedsRefresh(cached, now + REFRESH_INTERVAL), true);
  assert.equal(guideNeedsRefresh(cached, now + 2 * 3600000), true);
  assert.equal(await readCachedGuide(now - 1), null);
});

test('programme images accept only plain HTTPS URLs and catalogue text remains data', () => {
  const p = parseXMLTV(xml, now).programmes[0];
  assert.equal(validateCatalogue([{ ...p, image: 'javascript:alert(1)' }])[0].image, undefined);
  assert.equal(validateCatalogue([{ ...p, image: 'https://secret:password@example.org/pic' }])[0].image, undefined);
  assert.equal(selectPrograms([p], { tab: 'explore', now: Date.parse(p.end) }).length, 0);
});

test('Sport finds a match by team and lists only current or upcoming sporting programmes', () => {
  const p = parseXMLTV(xml, now).programmes[0];
  const match = { ...p, id: 'match', title: 'Ligue des champions', subtitle: 'Paris / Bayern', category: 'Sport', channel: 'Canal+ Foot' };
  assert.equal(selectPrograms([p, match], { tab: 'sport', now }).length, 1);
  assert.equal(selectPrograms([match], { tab: 'sport', query: 'bayern', now })[0].channel, 'Canal+ Foot');
  assert.equal(selectPrograms([match], { tab: 'sport', now: Date.parse(match.end) }).length, 0);
  const magazine = { ...match, id: 'magazine', sportEvent: false };
  assert.equal(selectPrograms([magazine], { tab: 'sport', now }).length, 0);
  assert.equal(selectPrograms([magazine], { tab: 'sport', sportMode: 'all', now }).length, 1);
});

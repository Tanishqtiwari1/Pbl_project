// Run with: node --test Frontend/src/services/places.test.mjs
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { directionsUrl, distanceKm, rankProviders, roundCoord, specialtyLabel } from './places.js';

const origin = { lat: 28.6318, lon: 77.2194 };
const place = (id, kind, cardiology, lat, lon) => ({ id, name: id, kind, cardiology, lat, lon });

test('distance is about right (Connaught Place to India Gate ~2.4 km)', () => {
  assert.ok(Math.abs(distanceKm(origin, { lat: 28.6129, lon: 77.2295 }) - 2.33) < 0.2);
});

test('only an approximate location is sent to third parties', () => {
  assert.equal(roundCoord(28.631769), 28.63);
});

test('cardiology evidence ranks first, then hospitals, then distance', () => {
  const ranked = rankProviders([
    place('near clinic', 'clinic', 'unknown', 28.632, 77.22),
    place('far hospital', 'hospital', 'unknown', 28.70, 77.30),
    place('named heart centre', 'clinic', 'name', 28.66, 77.25),
    place('tagged cardiology', 'hospital', 'listed', 28.75, 77.35),
  ], origin);
  assert.deepEqual(ranked.map((item) => item.id), ['tagged cardiology', 'named heart centre', 'far hospital', 'near clinic']);
  assert.equal(rankProviders(ranked, origin, 'distance')[0].id, 'near clinic');
});

test('labels never overstate what the data says', () => {
  assert.equal(specialtyLabel({ kind: 'hospital', cardiology: 'listed' }), 'Cardiology');
  assert.equal(specialtyLabel({ kind: 'clinic', cardiology: 'name' }), 'Likely cardiology (from name)');
  assert.equal(specialtyLabel({ kind: 'hospital', cardiology: 'unknown' }), 'Hospital · ask about cardiology');
});

test('directions use the searched place as origin only for manual locations', () => {
  const destination = { lat: 28.64, lon: 77.18 };
  assert.ok(!directionsUrl(destination, { ...origin, manual: false }).includes('origin='));
  assert.ok(directionsUrl(destination, { ...origin, manual: true }).includes('origin=28.6318%2C77.2194'));
});

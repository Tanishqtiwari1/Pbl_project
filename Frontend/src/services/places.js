// Nearby healthcare providers from OpenStreetMap (real, openly licensed data; no API key).
//   Overpass API  -> hospitals, clinics and doctors around a point
//   Nominatim     -> turns a typed city / area / PIN code into coordinates
// Privacy: only a rounded location (~1 km) is sent to these services. The precise location
// stays in the browser and is used only to calculate distances. Nothing is stored.

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const CARDIO_NAME = /cardi|heart|हृदय|दिल/i;
const CACHE_KEY = 'cardioguard_places_cache';

export const roundCoord = (value) => Math.round(value * 100) / 100;

export function distanceKm(a, b) {
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

async function fetchJson(url, options, timeoutMs = 30000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function geocode(query) {
  const params = new URLSearchParams({ q: query, format: 'json', limit: '5', addressdetails: '0' });
  const results = await fetchJson(`${NOMINATIM_URL}/search?${params}`, { headers: { 'Accept-Language': 'en' } }, 15000);
  return results.map((item) => ({ lat: Number(item.lat), lon: Number(item.lon), label: item.display_name }));
}

export async function reverseGeocode({ lat, lon }) {
  const params = new URLSearchParams({ lat: roundCoord(lat), lon: roundCoord(lon), format: 'json', zoom: '14' });
  try {
    const result = await fetchJson(`${NOMINATIM_URL}/reverse?${params}`, { headers: { 'Accept-Language': 'en' } }, 10000);
    return result.display_name?.split(',').slice(0, 3).join(',') || null;
  } catch {
    return null;
  }
}

function address(tags) {
  const parts = [
    [tags['addr:housenumber'], tags['addr:street']].filter(Boolean).join(' '),
    tags['addr:suburb'] || tags['addr:neighbourhood'],
    tags['addr:city'] || tags['addr:district'],
    tags['addr:postcode'],
  ].filter(Boolean);
  return parts.length ? parts.join(', ') : tags['addr:full'] || null;
}

function cardiologyEvidence(tags) {
  const speciality = `${tags['healthcare:speciality'] || ''} ${tags['healthcare:speciality:en'] || ''}`;
  if (/cardio/i.test(speciality)) return 'listed';
  if (CARDIO_NAME.test(`${tags.name || ''} ${tags['name:en'] || ''}`)) return 'name';
  return 'unknown';
}

function kindOf(tags) {
  const value = tags.amenity || tags.healthcare;
  if (value === 'hospital') return 'hospital';
  if (value === 'doctors' || value === 'doctor') return 'doctor';
  return 'clinic';
}

function normalise(element) {
  const tags = element.tags || {};
  const lat = element.lat ?? element.center?.lat;
  const lon = element.lon ?? element.center?.lon;
  const name = tags.name || tags['name:en'];
  if (!name || lat === undefined) return null;
  const website = tags.website || tags['contact:website'] || tags.url || null;
  return {
    id: `${element.type}/${element.id}`,
    name,
    kind: kindOf(tags),
    cardiology: cardiologyEvidence(tags),
    speciality: tags['healthcare:speciality'] || null,
    lat,
    lon,
    address: address(tags),
    phone: tags.phone || tags['contact:phone'] || tags['contact:mobile'] || null,
    website,
    bookingUrl: tags['booking'] || tags['contact:booking'] || null,
    openingHours: tags.opening_hours || null,
    emergency: tags.emergency === 'yes',
    osmUrl: `https://www.openstreetmap.org/${element.type}/${element.id}`,
  };
}

function readCache() {
  try { return JSON.parse(sessionStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; }
}

// Providers within radiusKm of a point. Results are cached for this browser tab only.
export async function searchProviders(center, radiusKm) {
  const lat = roundCoord(center.lat);
  const lon = roundCoord(center.lon);
  const radius = Math.round(radiusKm * 1000);
  const cacheKey = `${lat},${lon},${radius}`;
  const cache = readCache();
  if (cache[cacheKey]) return cache[cacheKey];

  const around = `(around:${radius},${lat},${lon})`;
  const query = `[out:json][timeout:25];(
    nwr["healthcare:speciality"~"cardio",i]${around};
    nwr["amenity"="hospital"]${around};
    nwr["healthcare"="hospital"]${around};
    nwr["amenity"="clinic"]${around};
    nwr["healthcare"="clinic"]${around};
    nwr["amenity"="doctors"]${around};
    nwr["healthcare"="doctor"]${around};
  );out center tags 300;`;
  const data = await fetchJson(OVERPASS_URL, { method: 'POST', body: new URLSearchParams({ data: query }) });
  const seen = new Set();
  const providers = data.elements.map(normalise).filter((item) => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ...cache, [cacheKey]: providers })); } catch { /* quota */ }
  return providers;
}

const EVIDENCE_RANK = { listed: 0, name: 1, unknown: 2 };

// Cardiology evidence first, then hospitals (which usually have a cardiology department), then distance.
export function rankProviders(providers, origin, sort = 'relevance') {
  const withDistance = providers.map((item) => ({ ...item, distanceKm: distanceKm(origin, item) }));
  return withDistance.sort((a, b) => {
    if (sort === 'distance') return a.distanceKm - b.distanceKm;
    if (sort === 'name') return a.name.localeCompare(b.name);
    return EVIDENCE_RANK[a.cardiology] - EVIDENCE_RANK[b.cardiology]
      || (a.kind === 'hospital' ? 0 : 1) - (b.kind === 'hospital' ? 0 : 1)
      || a.distanceKm - b.distanceKm;
  });
}

export function directionsUrl(destination, origin) {
  const params = new URLSearchParams({ api: '1', destination: `${destination.lat},${destination.lon}`, travelmode: 'driving' });
  if (origin?.manual) params.set('origin', `${origin.lat},${origin.lon}`);
  return `https://www.google.com/maps/dir/?${params}`;
}

export function specialtyLabel(provider) {
  if (provider.cardiology === 'listed') return 'Cardiology';
  if (provider.cardiology === 'name') return 'Likely cardiology (from name)';
  if (provider.kind === 'hospital') return 'Hospital · ask about cardiology';
  if (provider.kind === 'doctor') return provider.speciality ? `Doctor · ${provider.speciality.replace(/;/g, ', ')}` : 'Doctor · speciality not listed';
  return 'Clinic · ask about cardiology';
}

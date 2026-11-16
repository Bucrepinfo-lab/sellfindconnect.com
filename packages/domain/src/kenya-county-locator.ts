import { findKenyaCounty, type KenyaCounty } from './kenya-places';

/**
 * Approximate coordinates of each county headquarters town, used only to
 * suggest the county a person is in from their phone's position. Runs on the
 * device; the position is never sent anywhere. Near a county border the
 * nearest headquarters can be the neighbouring county, so the result is a
 * suggestion the person can change.
 */
const COUNTY_HQ: Array<[county: string, lat: number, lon: number]> = [
  ['Mombasa', -4.04, 39.67],
  ['Kwale', -4.17, 39.45],
  ['Kilifi', -3.63, 39.85],
  ['Tana River', -1.5, 40.03],
  ['Lamu', -2.27, 40.9],
  ['Taita Taveta', -3.4, 38.36],
  ['Garissa', -0.45, 39.65],
  ['Wajir', 1.75, 40.06],
  ['Mandera', 3.94, 41.86],
  ['Marsabit', 2.33, 37.99],
  ['Isiolo', 0.35, 37.58],
  ['Meru', 0.05, 37.65],
  ['Tharaka-Nithi', -0.3, 37.65],
  ['Embu', -0.54, 37.46],
  ['Kitui', -1.37, 38.01],
  ['Machakos', -1.52, 37.26],
  ['Makueni', -1.78, 37.63],
  ['Nyandarua', -0.27, 36.38],
  ['Nyeri', -0.42, 36.95],
  ['Kirinyaga', -0.5, 37.28],
  ["Murang'a", -0.72, 37.15],
  ['Kiambu', -1.17, 36.83],
  ['Turkana', 3.12, 35.6],
  ['West Pokot', 1.24, 35.11],
  ['Samburu', 1.1, 36.7],
  ['Trans Nzoia', 1.02, 35.0],
  ['Uasin Gishu', 0.51, 35.27],
  ['Elgeyo/Marakwet', 0.67, 35.51],
  ['Nandi', 0.2, 35.1],
  ['Baringo', 0.49, 35.74],
  ['Laikipia', 0.03, 37.07],
  ['Nakuru', -0.3, 36.07],
  ['Narok', -1.08, 35.87],
  ['Kajiado', -1.85, 36.78],
  ['Kericho', -0.37, 35.28],
  ['Bomet', -0.78, 35.34],
  ['Kakamega', 0.28, 34.75],
  ['Vihiga', 0.06, 34.72],
  ['Bungoma', 0.56, 34.56],
  ['Busia', 0.46, 34.11],
  ['Siaya', 0.06, 34.29],
  ['Kisumu', -0.09, 34.77],
  ['Homa Bay', -0.53, 34.46],
  ['Migori', -1.06, 34.47],
  ['Kisii', -0.68, 34.77],
  ['Nyamira', -0.57, 34.94],
  ['Nairobi', -1.29, 36.82],
];

/** Kenya's outline, loosely: positions outside this box are not in Kenya. */
const KENYA_BOUNDS = { minLat: -4.9, maxLat: 5.1, minLon: 33.8, maxLon: 42.0 };

export function isInsideKenya(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= KENYA_BOUNDS.minLat &&
    lat <= KENYA_BOUNDS.maxLat &&
    lon >= KENYA_BOUNDS.minLon &&
    lon <= KENYA_BOUNDS.maxLon
  );
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** The county whose headquarters is nearest; undefined outside Kenya. */
export function nearestKenyaCounty(lat: number, lon: number): KenyaCounty | undefined {
  if (!isInsideKenya(lat, lon)) return undefined;
  let best: { name: string; km: number } | undefined;
  for (const [name, hqLat, hqLon] of COUNTY_HQ) {
    const km = distanceKm(lat, lon, hqLat, hqLon);
    if (!best || km < best.km) best = { name, km };
  }
  return best ? findKenyaCounty(best.name) : undefined;
}

export const kenyaCountyHeadquarters = COUNTY_HQ.map(([county, lat, lon]) => ({ county, lat, lon }));

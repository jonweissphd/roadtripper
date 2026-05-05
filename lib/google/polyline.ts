export type LatLng = { lat: number; lng: number };

// Decode Google's encoded polyline format (precision 5).
// Reference: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat * 1e-5, lng: lng * 1e-5 });
  }

  return points;
}

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const phi1 = (a.lat * Math.PI) / 180;
  const phi2 = (b.lat * Math.PI) / 180;
  const dPhi = ((b.lat - a.lat) * Math.PI) / 180;
  const dLambda = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(x)));
}

// Sample evenly along a polyline by cumulative distance.
// Falls back to wider spacing (within maxSamples cap) for very long routes.
export function samplePoints(
  polyline: LatLng[],
  desiredSpacingMeters: number,
  maxSamples: number,
): LatLng[] {
  if (polyline.length === 0) return [];
  if (polyline.length === 1) return [polyline[0]];

  const cumDist: number[] = [0];
  for (let i = 1; i < polyline.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineMeters(polyline[i - 1], polyline[i]));
  }
  const totalDist = cumDist[cumDist.length - 1];
  if (totalDist === 0) return [polyline[0]];

  const samplesByDesired = Math.max(1, Math.ceil(totalDist / desiredSpacingMeters));
  const numSamples = Math.min(maxSamples, samplesByDesired);
  const spacing = totalDist / numSamples;

  const samples: LatLng[] = [];
  for (let i = 0; i < numSamples; i++) {
    const target = (i + 0.5) * spacing;
    let idx = 1;
    while (idx < cumDist.length && cumDist[idx] < target) idx++;
    if (idx >= polyline.length) {
      samples.push(polyline[polyline.length - 1]);
      continue;
    }
    const segLen = cumDist[idx] - cumDist[idx - 1];
    const t = segLen > 0 ? (target - cumDist[idx - 1]) / segLen : 0;
    const a = polyline[idx - 1];
    const b = polyline[idx];
    samples.push({
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
    });
  }
  return samples;
}

// Distance from point P to segment AB in meters.
// Uses local equirectangular projection — accurate within the road-trip distances we care about.
function pointToSegmentMeters(p: LatLng, a: LatLng, b: LatLng): number {
  const lat0 = (a.lat + b.lat) / 2;
  const mPerDegLat = 111_320;
  const mPerDegLng = 111_320 * Math.cos((lat0 * Math.PI) / 180);

  const px = (p.lng - a.lng) * mPerDegLng;
  const py = (p.lat - a.lat) * mPerDegLat;
  const bx = (b.lng - a.lng) * mPerDegLng;
  const by = (b.lat - a.lat) * mPerDegLat;

  const segLen2 = bx * bx + by * by;
  let t = segLen2 > 0 ? (px * bx + py * by) / segLen2 : 0;
  t = Math.max(0, Math.min(1, t));

  const dx = px - bx * t;
  const dy = py - by * t;
  return Math.sqrt(dx * dx + dy * dy);
}

// Minimum perpendicular distance from a point to the polyline.
export function perpDistanceMeters(point: LatLng, polyline: LatLng[]): number {
  if (polyline.length === 0) return Infinity;
  if (polyline.length === 1) return haversineMeters(point, polyline[0]);
  let minDist = Infinity;
  for (let i = 0; i < polyline.length - 1; i++) {
    const d = pointToSegmentMeters(point, polyline[i], polyline[i + 1]);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

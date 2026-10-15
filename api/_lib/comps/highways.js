// Step 2 (cont.): the major highways around the subject, from OpenStreetMap,
// so sales on the other side of one aren't used as comps.

import { COMP_RULES } from "./rules.js";

// Interstates/freeways ("motorway") and divided expressways ("trunk").
const MAJOR_HIGHWAYS = "^(motorway|trunk)$";

// Public Overpass servers, asked together; the first good answer wins
// (any one of them is often slow or down).
const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

export function overpassQuery(
  { lat, lng },
  miles = COMP_RULES.searchRadiusMiles,
) {
  // A box a little bigger than the search radius.
  const dLat = (miles * 1.2) / 69;
  const dLng = (miles * 1.2) / (69 * Math.cos((lat * Math.PI) / 180));
  const box = [lat - dLat, lng - dLng, lat + dLat, lng + dLng]
    .map((n) => n.toFixed(6))
    .join(",");
  return `[out:json][timeout:15];way["highway"~"${MAJOR_HIGHWAYS}"](${box});out tags geom;`;
}

// The major highways near the location, each as { name, points }; [] when
// there are none, null when OpenStreetMap couldn't be reached (the check
// is then skipped rather than failing the comps).
export async function fetchMajorHighways(location) {
  const query = overpassQuery(location);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    return await Promise.any(
      OVERPASS_URLS.map(async (base) => {
        const res = await fetch(`${base}?data=${encodeURIComponent(query)}`, {
          headers: { "User-Agent": "YouWinEstatesCRM/1.0 (comps)" },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Overpass failed (${res.status})`);
        const data = await res.json();
        if (!Array.isArray(data?.elements)) {
          throw new Error("Overpass gave no results");
        }
        return data.elements
          .filter((el) => el.type === "way" && el.geometry?.length > 1)
          .map((el) => ({
            name: el.tags?.ref || el.tags?.name || "a major highway",
            points: el.geometry.map((p) => ({ lat: p.lat, lng: p.lon })),
          }));
      }),
    );
  } catch (err) {
    console.warn(
      "run-comps highways:",
      (err.errors || [err]).map((e) => e.message).join("; "),
    );
    return null;
  } finally {
    clearTimeout(timer);
    controller.abort(); // stop the slower servers
  }
}

// Which side of line p→q point r falls on (+1, −1, or 0 when on it).
function side(p, q, r) {
  const cross =
    (q.lng - p.lng) * (r.lat - p.lat) - (q.lat - p.lat) * (r.lng - p.lng);
  return Math.sign(cross);
}

function segmentsCross(a, b, c, d) {
  return side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0;
}

// The highway the straight line from the subject to a sale crosses, or
// null when they're on the same side of every one.
export function highwayBetween(from, to, highways) {
  for (const highway of highways || []) {
    const { points } = highway;
    for (let i = 1; i < points.length; i += 1) {
      if (segmentsCross(from, to, points[i - 1], points[i])) {
        return highway.name;
      }
    }
  }
  return null;
}

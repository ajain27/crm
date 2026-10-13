// Step 1 (cont.): the subject's coordinates, from free geocoders.

// US Census geocoder (free, no key); null when it finds no match.
async function censusGeocode(address) {
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  });
  const res = await fetch(
    `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?${params}`,
  );
  if (!res.ok) throw new Error(`Census geocoding failed (${res.status})`);
  const data = await res.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) return null;
  return {
    lat: match.coordinates.y,
    lng: match.coordinates.x,
    matchedAddress: match.matchedAddress,
  };
}

// OpenStreetMap's geocoder (free, no key), as a backup.
async function osmGeocode(address) {
  const params = new URLSearchParams({
    q: address,
    format: "json",
    limit: "1",
    countrycodes: "us",
  });
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?${params}`,
    {
      headers: { "User-Agent": "YouWinEstatesCRM/1.0 (comps)" },
    },
  );
  if (!res.ok)
    throw new Error(`OpenStreetMap geocoding failed (${res.status})`);
  const [match] = await res.json();
  if (!match) return null;
  return {
    lat: Number(match.lat),
    lng: Number(match.lon),
    matchedAddress: match.display_name,
  };
}

const withoutCountry = (address) =>
  String(address).replace(/,?\s*(USA|United States)\s*$/i, "");

// Runs geocoders in order; the first location found wins. Null when none
// can place the address.
async function firstLocation(address, geocoders) {
  for (const geocode of geocoders) {
    try {
      const location = await geocode(withoutCountry(address));
      if (location) return location;
    } catch (err) {
      console.warn("run-comps geocoding:", err.message);
    }
  }
  return null;
}

// The Census geocoder, tried twice (it has occasional hiccups).
export function geocodeAddress(address) {
  return firstLocation(address, [censusGeocode, censusGeocode]);
}

// OpenStreetMap, the last resort.
export function geocodeWithOpenStreetMap(address) {
  return firstLocation(address, [osmGeocode]);
}

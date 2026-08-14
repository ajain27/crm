let loadPromise = null;

// Loads the Google Maps JS API with the Places library once and caches the
// promise so repeated calls (e.g. multiple autocomplete inputs on one page)
// reuse the same script tag instead of injecting it again.
export function loadGooglePlaces() {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve(window.google.maps.places);
      return;
    }

    const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      reject(new Error("VITE_GOOGLE_PLACES_API_KEY is not set"));
      return;
    }

    // Use the classic `callback=` pattern rather than `loading=async`: Google
    // only guarantees google.maps.places is fully populated once this
    // callback fires, and `loading=async` needs its own bootstrap loader
    // snippet (not a plain <script src>) to expose importLibrary.
    const callbackName = "__googlePlacesLoaded";
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps.places);
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
      loadPromise = null;
      delete window[callbackName];
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Splits Google's address_components into the street/city/state/zip shape
// the app's forms use.
export function parsePlaceAddress(place) {
  const comps = place?.address_components || [];
  const get = (type) => comps.find((c) => c.types.includes(type));

  const streetNumber = get("street_number")?.long_name || "";
  const route = get("route")?.long_name || "";
  const city =
    get("locality")?.long_name ||
    get("sublocality")?.long_name ||
    get("postal_town")?.long_name ||
    "";
  const state = get("administrative_area_level_1")?.short_name || "";
  const zipCode = get("postal_code")?.long_name || "";
  const street = [streetNumber, route].filter(Boolean).join(" ");

  return {
    street: street || place?.name || "",
    city,
    state,
    zipCode,
    formatted: place?.formatted_address || street,
  };
}

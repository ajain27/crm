// Downloads the subject's listing photo so the app can keep it with the
// lead (the browser can't fetch it from the listing sites itself).

const PHOTO_TIMEOUT_MS = 8000;
// Listing photos are a few hundred KB; this keeps the response small.
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024;

// The photo as a data URL, or null if it can't be loaded.
export async function fetchPhotoData(url, timeoutMs = PHOTO_TIMEOUT_MS) {
  if (!url) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const type = (res.headers.get("content-type") || "").split(";")[0];
    if (!res.ok || !type.startsWith("image/")) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_PHOTO_BYTES) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

// Photo image data, fetched once per photo and shared by everything
// showing it (the photo grid, the main image), keyed by owner (a deal or
// lead) and photo id.
const cache = new Map();

const key = (ownerId, photoId) => `${ownerId}/${photoId}`;

// The photo's data URL ("" when missing or unreadable).
export function loadPhoto(photoStore, ownerId, photoId) {
  const k = key(ownerId, photoId);
  if (!cache.has(k)) {
    cache.set(
      k,
      photoStore
        .fetch(ownerId, photoId)
        .then((doc) => doc?.data || "")
        .catch(() => {
          cache.delete(k);
          return "";
        }),
    );
  }
  return cache.get(k);
}

// For tests: forget everything fetched.
export function clearPhotoCache() {
  cache.clear();
}

// A just-uploaded photo, so it isn't fetched back.
export function rememberPhoto(ownerId, photoId, data) {
  cache.set(key(ownerId, photoId), Promise.resolve(data));
}

// Where a photo is anchored when cropped to fill a frame, as CSS
// object-position (set by dragging the main image; centered by default).
export function photoPosition(photo) {
  const x = photo?.focus?.x ?? 50;
  const y = photo?.focus?.y ?? 50;
  return `${x}% ${y}%`;
}

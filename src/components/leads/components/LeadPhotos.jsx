import PhotoGallery, { MAX_PHOTOS } from "../../elements/photos/PhotoGallery";
import MainPhoto from "../../elements/photos/MainPhoto";
import { rememberPhoto } from "../../elements/photos/photoCache";
import {
  MAX_PHOTO_DATA_URL_LENGTH,
  compressImage,
} from "../../../utils/compressImage";

// A downloaded photo (a data URL) small enough to store as one document.
async function storablePhoto(data) {
  if (data.length <= MAX_PHOTO_DATA_URL_LENGTH) return data;
  const blob = await (await fetch(data)).blob();
  return compressImage(new File([blob], "listing.jpg", { type: blob.type }));
}

// Photos in a lead window. Changes save straight away through
// `onPhotosChange(leadId, photos)` and are mirrored into the window's
// draft, so Save Changes doesn't put back an older photo list. Without a
// photo store (or a lead id) photos are off.
export function useLeadPhotos({
  lead,
  draft,
  setDraft,
  photoStore,
  onPhotosChange,
  currentUserId,
}) {
  const enabled = Boolean(photoStore && onPhotosChange && lead?.id);
  const photos = Array.isArray(draft.photos) ? draft.photos : [];
  async function save(next) {
    await onPhotosChange(lead.id, next);
    setDraft((prev) => ({ ...prev, photos: next }));
  }

  // Adds the listing photo a comps run found ({ url, data }) — the main
  // photo when the lead has none. Skipped if the lead already has it or
  // is full.
  async function addListingPhoto(listingPhoto) {
    if (!enabled || !listingPhoto?.data) return;
    if (photos.length >= MAX_PHOTOS) return;
    if (photos.some((p) => p.sourceUrl === listingPhoto.url)) return;
    try {
      const data = await storablePhoto(listingPhoto.data);
      const photo = {
        id: crypto.randomUUID(),
        uploadedAt: new Date().toISOString(),
        sourceUrl: listingPhoto.url,
      };
      await photoStore.save({
        ...photo,
        ownerId: lead.id,
        userId: currentUserId,
        data,
      });
      rememberPhoto(lead.id, photo.id, data);
      await save([...photos, photo]);
    } catch (error) {
      console.error("Failed to add the listing photo", error);
    }
  }

  return {
    enabled,
    addListingPhoto,
    galleryProps: {
      ownerId: lead?.id,
      photos,
      photoStore,
      currentUserId,
      onChange: save,
    },
  };
}

// The main photo, large, beside `children` (the window's first sections),
// with `aside` (e.g. the big ARV) under it and, with `withGallery`, the
// photo thumbnails under that (instead of a separate Photos section);
// stacked above `children` with `stacked`.
export function LeadMainPhotoRow({
  photosState,
  aside = null,
  withGallery = false,
  stacked = false,
  children,
}) {
  const { galleryProps } = photosState;
  // With photos on, the main photo frame always shows (empty until a
  // photo is added) so the layout stays the same.
  const main = photosState.enabled && (
    <MainPhoto
      ownerId={galleryProps.ownerId}
      photos={galleryProps.photos}
      photoStore={galleryProps.photoStore}
      onChange={galleryProps.onChange}
    />
  );
  const hasSide = Boolean(main || aside);
  const side = hasSide && (
    <div className="main-photo-side">
      {main}
      {aside}
      {withGallery && photosState.enabled && (
        <PhotoGallery {...galleryProps} compact />
      )}
    </div>
  );
  if (stacked) {
    return (
      <>
        {side}
        {children}
      </>
    );
  }
  return (
    <div className={`main-photo-row${hasSide ? " has-photo" : ""}`}>
      {side}
      {children}
    </div>
  );
}

export function LeadPhotosSection({ photosState }) {
  if (!photosState.enabled) return null;
  return (
    <div className="ldm-section">
      <div className="ldm-section-label">Photos</div>
      <PhotoGallery {...photosState.galleryProps} />
    </div>
  );
}

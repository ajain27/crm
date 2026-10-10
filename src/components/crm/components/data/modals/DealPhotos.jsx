import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import Modal from "../../../../modal/Modal";
import { compressImage } from "../../../../../utils/compressImage";

export const MAX_DEAL_PHOTOS = 5;

// Up to five photos per deal. Each photo's image data is its own document
// (photoStore.save/fetch/remove); the deal keeps only `photos` — the list
// of { id, uploadedAt } — which is saved straight away via updateDealPatch.
export default function DealPhotos({
  deal,
  photoStore,
  currentUserId,
  updateDealPatch,
}) {
  const photos = Array.isArray(deal.photos) ? deal.photos : [];
  const [dataById, setDataById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewIndex, setViewIndex] = useState(null);
  const remaining = MAX_DEAL_PHOTOS - photos.length;

  const missingIds = photos
    .map((p) => p.id)
    .filter((id) => !(id in dataById))
    .join(",");

  useEffect(() => {
    if (!missingIds) return;
    let cancelled = false;
    Promise.all(
      missingIds.split(",").map((id) =>
        photoStore
          .fetch(deal.id, id)
          .then((doc) => [id, doc?.data || ""])
          .catch(() => [id, ""]),
      ),
    ).then((entries) => {
      if (!cancelled)
        setDataById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [deal.id, missingIds, photoStore]);

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.some((f) => !f.type.startsWith("image/"))) {
      alert("Please choose image files.");
      return;
    }
    if (files.length > remaining) {
      alert(
        `A deal can have up to ${MAX_DEAL_PHOTOS} photos. You can add ${remaining} more.`,
      );
      return;
    }

    setUploading(true);
    try {
      const added = [];
      for (const file of files) {
        const data = await compressImage(file);
        const photo = {
          id: crypto.randomUUID(),
          uploadedAt: new Date().toISOString(),
        };
        await photoStore.save({
          ...photo,
          dealId: deal.id,
          userId: currentUserId,
          data,
        });
        added.push(photo);
        setDataById((prev) => ({ ...prev, [photo.id]: data }));
      }
      await updateDealPatch(deal.id, { photos: [...photos, ...added] });
    } catch (error) {
      console.error("Failed to upload photo", error);
      alert(error?.message || "Unable to upload the photo.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(photoId) {
    if (!window.confirm("Delete this photo?")) return;
    const next = photos.filter((p) => p.id !== photoId);
    try {
      await photoStore.remove(deal.id, photoId);
    } catch (error) {
      console.error("Failed to delete photo", error);
    }
    await updateDealPatch(deal.id, { photos: next });
    setViewIndex(null);
  }

  const viewed = viewIndex !== null ? photos[viewIndex] : null;
  const step = (delta) =>
    setViewIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className="ddm-edit-field-wide">
      <div className="ddm-photos-grid">
        {photos.map((photo, i) => (
          <div key={photo.id} className="ddm-photo">
            <button
              type="button"
              className="ddm-photo-thumb"
              onClick={() => setViewIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              {dataById[photo.id] ? (
                <img src={dataById[photo.id]} alt={`Deal photo ${i + 1}`} />
              ) : (
                <Loader2 size={18} className="spin" />
              )}
            </button>
            <button
              type="button"
              className="ddm-photo-delete"
              onClick={() => handleDelete(photo.id)}
              aria-label={`Delete photo ${i + 1}`}
              title="Delete photo"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {remaining > 0 && (
          <label
            className={`ddm-photo-add${uploading ? " is-uploading" : ""}`}
            title={`Add photos (${remaining} left)`}
          >
            {uploading ? (
              <Loader2 size={20} className="spin" />
            ) : (
              <ImagePlus size={20} />
            )}
            <span>{uploading ? "Uploading…" : "Add photo"}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading}
              onChange={handleFiles}
              aria-label="Add photos"
            />
          </label>
        )}
      </div>
      <div className="ddm-photos-count">
        {photos.length} of {MAX_DEAL_PHOTOS} photos
      </div>

      {viewed && (
        <Modal
          isOpen
          onClose={() => setViewIndex(null)}
          title={`Photo ${viewIndex + 1} of ${photos.length}`}
          className="ddm-photo-viewer"
          style={{
            height: "auto",
            width: "min(960px, 96vw)",
            maxWidth: "none",
          }}
        >
          <div className="ddm-photo-viewer-body">
            {photos.length > 1 && (
              <button
                type="button"
                className="ddm-photo-nav"
                onClick={() => step(-1)}
                aria-label="Previous photo"
              >
                <ChevronLeft size={22} />
              </button>
            )}
            {dataById[viewed.id] ? (
              <img
                src={dataById[viewed.id]}
                alt={`Deal photo ${viewIndex + 1}`}
              />
            ) : (
              <Loader2 size={24} className="spin" />
            )}
            {photos.length > 1 && (
              <button
                type="button"
                className="ddm-photo-nav"
                onClick={() => step(1)}
                aria-label="Next photo"
              >
                <ChevronRight size={22} />
              </button>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

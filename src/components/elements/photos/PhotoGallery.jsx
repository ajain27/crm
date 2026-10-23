import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Loader2,
  Star,
  X,
} from "lucide-react";
import Modal from "../../modal/Modal";
import { compressImage, isHeicFile } from "../../../utils/compressImage";
import { loadPhoto, photoPosition, rememberPhoto } from "./photoCache";

export const MAX_PHOTOS = 5;

// Up to five photos for a deal or lead (the "owner"). Each photo's image
// data is its own document (photoStore.save/fetch/remove, by owner id);
// the owner keeps only `photos` — the list of { id, uploadedAt, focus } —
// which `onChange(photos)` saves straight away. The first photo is the
// main one (shown large by MainPhoto); drag thumbnails to reorder, or use
// "Make main". `compact` is a strip of five small slots for a narrow
// column under the main photo (tips in tooltips, no count line).
export default function PhotoGallery({
  ownerId,
  photos: photoList,
  photoStore,
  currentUserId,
  onChange,
  compact = false,
}) {
  const photos = Array.isArray(photoList) ? photoList : [];
  const [dataById, setDataById] = useState({});
  const [uploading, setUploading] = useState(false);
  const [viewIndex, setViewIndex] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const remaining = MAX_PHOTOS - photos.length;

  const missingIds = photos
    .map((p) => p.id)
    .filter((id) => !(id in dataById))
    .join(",");

  useEffect(() => {
    if (!missingIds) return;
    let cancelled = false;
    Promise.all(
      missingIds
        .split(",")
        .map((id) =>
          loadPhoto(photoStore, ownerId, id).then((data) => [id, data]),
        ),
    ).then((entries) => {
      if (!cancelled)
        setDataById((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, missingIds, photoStore]);

  async function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    // Some browsers report HEIC files with no type, so allow them by name.
    if (files.some((f) => !f.type.startsWith("image/") && !isHeicFile(f))) {
      alert("Please choose image files.");
      return;
    }
    if (files.length > remaining) {
      alert(
        `You can have up to ${MAX_PHOTOS} photos. You can add ${remaining} more.`,
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
          ownerId,
          userId: currentUserId,
          data,
        });
        added.push(photo);
        rememberPhoto(ownerId, photo.id, data);
        setDataById((prev) => ({ ...prev, [photo.id]: data }));
      }
      await onChange([...photos, ...added]);
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
      await photoStore.remove(ownerId, photoId);
    } catch (error) {
      console.error("Failed to delete photo", error);
    }
    await onChange(next);
    setViewIndex(null);
  }

  // Moves the photo at `from` to `to`; the first photo is the main one.
  async function movePhoto(from, to) {
    if (from === to || from == null || to == null) return;
    const next = [...photos];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    try {
      await onChange(next);
    } catch (error) {
      console.error("Failed to reorder photos", error);
    }
  }

  function endDrag() {
    setDragIndex(null);
    setOverIndex(null);
  }

  const viewed = viewIndex !== null ? photos[viewIndex] : null;
  const step = (delta) =>
    setViewIndex((i) => (i + delta + photos.length) % photos.length);

  return (
    <div className={`photo-gallery${compact ? " photo-gallery--compact" : ""}`}>
      <div
        className="ddm-photos-grid"
        title={
          compact && photos.length > 1
            ? "Drag to reorder; the first is the main photo"
            : undefined
        }
      >
        {photos.map((photo, i) => (
          <div
            key={photo.id}
            className={[
              "ddm-photo",
              i === 0 ? "is-main" : "",
              dragIndex === i ? "is-dragging" : "",
              overIndex === i && dragIndex !== i ? "is-drop-target" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            draggable
            onDragStart={(e) => {
              setDragIndex(i);
              e.dataTransfer.effectAllowed = "move";
              // Firefox only starts a drag with some data set.
              e.dataTransfer.setData("text/plain", photo.id);
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setOverIndex(i);
            }}
            onDrop={(e) => {
              e.preventDefault();
              movePhoto(dragIndex, i);
              endDrag();
            }}
            onDragEnd={endDrag}
          >
            <button
              type="button"
              className="ddm-photo-thumb"
              onClick={() => setViewIndex(i)}
              aria-label={`View photo ${i + 1}`}
            >
              {dataById[photo.id] ? (
                <img
                  src={dataById[photo.id]}
                  alt={`Photo ${i + 1}`}
                  draggable={false}
                  style={{ objectPosition: photoPosition(photo) }}
                />
              ) : (
                <Loader2 size={18} className="spin" />
              )}
            </button>
            {i === 0 ? (
              <span className="ddm-photo-main-badge">Main</span>
            ) : (
              <button
                type="button"
                className="ddm-photo-make-main"
                onClick={() => movePhoto(i, 0)}
                aria-label={`Make photo ${i + 1} the main photo`}
                title="Make main photo"
              >
                <Star size={12} />
              </button>
            )}
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
            className={[
              "ddm-photo-add",
              uploading ? "is-uploading" : "",
              compact && photos.length === 0 ? "is-wide" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            title={`Add photos (${photos.length} of ${MAX_PHOTOS} used)`}
          >
            {uploading ? (
              <Loader2 size={compact ? 16 : 20} className="spin" />
            ) : (
              <ImagePlus size={compact ? 16 : 20} />
            )}
            {/* In the compact strip a "+" tile says it all once there are
                photos; with none it's a slim "Add photos" button. */}
            {(!compact || photos.length === 0) && (
              <span>
                {uploading
                  ? "Uploading…"
                  : compact
                    ? "Add photos"
                    : "Add photo"}
              </span>
            )}
            <input
              type="file"
              accept="image/*,.heic,.heif"
              multiple
              disabled={uploading}
              onChange={handleFiles}
              aria-label="Add photos"
            />
          </label>
        )}
      </div>
      {!compact && (
        <div className="ddm-photos-count">
          <span>
            {photos.length} of {MAX_PHOTOS} photos
          </span>
          {photos.length > 1 && (
            <span> · drag to reorder; the first is the main photo</span>
          )}
        </div>
      )}

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
              <img src={dataById[viewed.id]} alt={`Photo ${viewIndex + 1}`} />
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

import { useEffect, useRef, useState } from "react";
import { ImageOff, Loader2, Move } from "lucide-react";
import { loadPhoto } from "./photoCache";

const clamp = (n) => Math.min(100, Math.max(0, n));

// A deal's or lead's main photo (the first in its list), large — or an
// empty frame saying there's no photo yet. Dragging
// inside it moves which part of the photo shows in the frame; the position
// is saved on that photo (`focus: { x, y }` in percent) with
// `onChange(photos)` when the drag ends.
export default function MainPhoto({
  ownerId,
  photos: photoList,
  photoStore,
  onChange,
}) {
  const photos = Array.isArray(photoList) ? photoList : [];
  const main = photos[0];
  const [data, setData] = useState(null);
  const [focus, setFocus] = useState(null);
  const drag = useRef(null);

  useEffect(() => {
    if (!main) return;
    let cancelled = false;
    setData(null);
    loadPhoto(photoStore, ownerId, main.id).then((d) => {
      if (!cancelled) setData(d);
    });
    return () => {
      cancelled = true;
    };
  }, [ownerId, main?.id, photoStore]);

  // A saved position replaces one being dragged once it's stored.
  useEffect(() => setFocus(null), [main?.id, main?.focus?.x, main?.focus?.y]);

  // No photos yet: the same frame, empty, so the window's layout doesn't
  // change when the first photo is added.
  if (!main) {
    return (
      <div className="ddm-main-photo is-empty">
        <ImageOff size={24} />
        <span>No photo yet</span>
      </div>
    );
  }
  const current = focus || { x: main.focus?.x ?? 50, y: main.focus?.y ?? 50 };

  function handlePointerDown(e) {
    if (!data) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const rect = e.currentTarget.getBoundingClientRect();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      from: current,
      width: rect.width || 1,
      height: rect.height || 1,
      moved: false,
    };
  }

  function handlePointerMove(e) {
    const d = drag.current;
    if (!d) return;
    // Dragging the photo right shows more of its left side.
    const next = {
      x: Math.round(clamp(d.from.x - ((e.clientX - d.startX) / d.width) * 100)),
      y: Math.round(
        clamp(d.from.y - ((e.clientY - d.startY) / d.height) * 100),
      ),
    };
    d.moved = d.moved || next.x !== d.from.x || next.y !== d.from.y;
    setFocus(next);
  }

  async function handlePointerUp() {
    const d = drag.current;
    drag.current = null;
    if (!d?.moved || !focus) return;
    try {
      await onChange(
        photos.map((p) =>
          p.id === main.id ? { ...p, focus: { x: focus.x, y: focus.y } } : p,
        ),
      );
    } catch (error) {
      console.error("Failed to save the photo position", error);
      setFocus(null);
    }
  }

  return (
    <div
      className="ddm-main-photo"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      title="Drag to adjust which part of the photo shows"
    >
      {data ? (
        <>
          <img
            src={data}
            alt="Main photo"
            draggable={false}
            style={{ objectPosition: `${current.x}% ${current.y}%` }}
          />
          <span className="ddm-main-photo-hint">
            <Move size={12} /> Drag to adjust
          </span>
        </>
      ) : (
        <Loader2 size={22} className="spin" />
      )}
    </div>
  );
}

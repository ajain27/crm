import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function Modal({
  isOpen,
  onClose,
  title,
  children,
  actions,
  headerActions,
  className = "",
  style,
  closeOnOverlayClick = true,
}) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key !== "Escape") return;
      // With modals stacked (e.g. a preview over a detail modal), only the
      // topmost — the last overlay in the DOM — should close.
      const overlays = document.querySelectorAll(".modal-overlay");
      const topmost = overlays[overlays.length - 1];
      if (overlayRef.current && topmost && topmost !== overlayRef.current)
        return;
      onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = prev;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      ref={overlayRef}
      className="modal-overlay"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        className={`modal ${className}`.trim()}
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <div className="modal-header-actions">
            {headerActions}
            <button className="danger-btn modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modalContent;

  return createPortal(modalContent, document.body);
}

export default Modal;

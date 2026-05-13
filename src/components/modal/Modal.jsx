import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

function Modal({ isOpen, onClose, title, children, actions, className = "" }) {
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const modalContent = (
    <div className="modal-overlay" onClick={onClose}>
      <div className={`modal ${className}`.trim()} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="danger-btn modal-close" onClick={onClose}>
            <X size={20} />
          </button>
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

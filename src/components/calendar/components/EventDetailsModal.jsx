import { X } from "lucide-react";
import { formatDate } from "../../../utils/utils";

export function EventDetailsModal({ event, onClose }) {
  if (!event) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content event-details-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>{event.title}</h3>
          <button className="ghost-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="event-details">
          {event.type === "lead" && (
            <>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">Lead Follow-up</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formatDate(event.date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{event.source}</span>
              </div>
            </>
          )}
          {event.type === "deal" && (
            <>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">Deal Closed</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Date:</span>
                <span className="detail-value">{formatDate(event.date)}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{event.source}</span>
              </div>
            </>
          )}
          {event.type === "google-calendar" && (
            <>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">Google Calendar</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Time:</span>
                <span className="detail-value">
                  {new Date(event.date).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {event.description && (
                <div className="detail-row">
                  <span className="detail-label">Description:</span>
                  <span className="detail-value">{event.description}</span>
                </div>
              )}
              <div className="detail-row">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{event.source}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

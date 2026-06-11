import { X } from "lucide-react";

export function DayEventsModal({
  day,
  currentMonth,
  currentYear,
  events,
  onClose,
  onEventClick,
}) {
  if (!day) return null;

  const dateStr = new Date(currentYear, currentMonth, day).toLocaleDateString(
    "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content day-events-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Events for {dateStr}</h3>
          <button className="ghost-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="day-events-list">
          {events?.map((followUp) => (
            <div
              key={followUp.id}
              className={`day-event-item ${followUp.type}`}
              onClick={() => {
                onEventClick(followUp);
                onClose();
              }}
            >
              <div className="event-type-badge">
                {followUp.type === "lead"
                  ? "L"
                  : followUp.type === "deal"
                    ? "D"
                    : "C"}
              </div>
              <div className="event-item-content">
                <div className="event-item-title">{followUp.title}</div>
                {followUp.type === "google-calendar" && followUp.date && (
                  <div className="event-item-time">
                    {new Date(followUp.date).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
                <div className="event-item-source">{followUp.source}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

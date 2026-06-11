import { ChevronLeft, ChevronRight } from "lucide-react";

export function CalendarControls({ monthName, onPrevMonth, onNextMonth }) {
  return (
    <div className="calendar-controls">
      <button
        className="ghost-btn"
        onClick={onPrevMonth}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>
      <h3>{monthName}</h3>
      <button
        className="ghost-btn"
        onClick={onNextMonth}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

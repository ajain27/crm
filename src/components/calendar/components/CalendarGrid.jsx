import { CalendarDay } from "./CalendarDay";

export function CalendarGrid({
  currentMonth,
  currentYear,
  followUpsByDate,
  onEventClick,
  onMoreClick,
}) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const today = new Date();
  const isCurrentMonth =
    today.getMonth() === currentMonth && today.getFullYear() === currentYear;

  return (
    <div className="calendar-grid">
      <div className="weekday-header">Sun</div>
      <div className="weekday-header">Mon</div>
      <div className="weekday-header">Tue</div>
      <div className="weekday-header">Wed</div>
      <div className="weekday-header">Thu</div>
      <div className="weekday-header">Fri</div>
      <div className="weekday-header">Sat</div>

      {days.map((day, index) => {
        const isToday = isCurrentMonth && day === today.getDate();
        return (
          <CalendarDay
            key={index}
            day={day}
            isToday={isToday}
            followUps={followUpsByDate[day]}
            onEventClick={onEventClick}
            onMoreClick={onMoreClick}
          />
        );
      })}
    </div>
  );
}

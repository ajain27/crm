export function CalendarDay({
  day,
  isToday,
  followUps,
  onEventClick,
  onMoreClick,
}) {
  const displayFollowUps = followUps?.slice(0, 2) || [];
  const moreCount = followUps?.length > 2 ? followUps.length - 2 : 0;

  return (
    <div
      className={`calendar-day ${day ? "" : "empty"} ${isToday ? "today" : ""}`}
    >
      {day && (
        <>
          <div className="calendar-day-number">{day}</div>
          <div className="calendar-day-events">
            {displayFollowUps.map((followUp) => {
              const startTime =
                followUp.type === "google-calendar" &&
                followUp.date instanceof String
                  ? new Date(followUp.date).toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";
              const displayText =
                followUp.type === "lead"
                  ? "L"
                  : followUp.type === "deal"
                    ? "D"
                    : followUp.title.substring(0, 20);

              return (
                <div
                  key={followUp.id}
                  className={`follow-up-badge ${followUp.type}`}
                  title={`${followUp.title}${startTime ? " - " + startTime : ""}`}
                  onClick={() => onEventClick(followUp)}
                  style={{ cursor: "pointer" }}
                >
                  {displayText}
                </div>
              );
            })}
            {moreCount > 0 && (
              <div
                className="follow-up-more"
                onClick={() => onMoreClick(day)}
                style={{ cursor: "pointer" }}
                title="Click to see all events for this day"
              >
                +{moreCount}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

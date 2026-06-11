import { useState, useEffect } from "react";
import { X } from "lucide-react";
import {
  CalendarControls,
  CalendarGrid,
  CalendarSidebar,
  EventDetailsModal,
  DayEventsModal,
  AddAccountModal,
} from "./components";
import { useFeedbackData, useFollowUpsByDate } from "./hooks";
import "./FollowUpCalendar.css";

function FollowUpCalendar({ isOpen, onClose, deals, leads, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Load saved accounts on mount and manage background scroll
  useEffect(() => {
    const saved = localStorage.getItem("googleCalendarAccounts");
    if (saved) {
      try {
        const accounts = JSON.parse(saved);
        setGoogleAccounts(accounts);
        accounts.forEach((account) => {
          fetchGoogleCalendarEventsForAccount(account);
        });
      } catch (err) {
        console.error("Failed to load saved accounts:", err);
      }
    }

    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [isOpen]);

  const allFollowUps = useFeedbackData(deals, leads, googleEvents);
  const followUpsByDate = useFollowUpsByDate(
    allFollowUps,
    currentMonth,
    currentYear,
  );

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleAddAccount = () => {
    if (accountName.trim()) {
      setSelectedAccounts((prev) => new Set([...prev, accountName.trim()]));
      setAccountName("");
      setIsAddAccountOpen(false);
    }
  };

  const handleRemoveAccount = (account) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      next.delete(account);
      return next;
    });
  };

  const handleGoogleAccountAdded = async (account) => {
    setGoogleAccounts((prev) => [...prev, account]);
    const updated = [...googleAccounts, account];
    localStorage.setItem("googleCalendarAccounts", JSON.stringify(updated));
    await fetchGoogleCalendarEventsForAccount(account);
  };

  const fetchGoogleCalendarEventsForAccount = async (account) => {
    if (!account.accessToken) {
      console.error("No access token for account:", account.email);
      return;
    }

    try {
      const apiUrl =
        import.meta.env.MODE === "production"
          ? "/api/fetch-events"
          : "http://localhost:5000/api/google/fetch-events";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          accessToken: account.accessToken,
          timeMin: new Date(currentYear, currentMonth, 1).toISOString(),
          timeMax: new Date(currentYear, currentMonth + 1, 1).toISOString(),
        }),
      });

      const data = await response.json();

      if (data.success && data.events) {
        const googleEventsFormatted = data.events.map((event) => ({
          id: `google-${event.id}`,
          type: "google-calendar",
          date: event.start.dateTime || event.start.date,
          title: event.summary || "Untitled Event",
          source: `Google Calendar (${account.email})`,
          description: event.description,
        }));

        setGoogleEvents((prev) => [...prev, ...googleEventsFormatted]);
      }
    } catch (err) {
      console.error("Failed to fetch Google Calendar events:", err);
    }
  };

  const handleRemoveGoogleAccount = (email) => {
    const updated = googleAccounts.filter((acc) => acc.email !== email);
    setGoogleAccounts(updated);
    localStorage.setItem("googleCalendarAccounts", JSON.stringify(updated));
  };

  const monthName = currentDate.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content calendar-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2>Follow-Up Calendar</h2>
          <button
            className="ghost-btn"
            onClick={onClose}
            title="Close"
            aria-label="Close calendar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="calendar-body">
          <div className="calendar-container">
            <CalendarControls
              monthName={monthName}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />

            <CalendarGrid
              currentMonth={currentMonth}
              currentYear={currentYear}
              followUpsByDate={followUpsByDate}
              onEventClick={setSelectedEvent}
              onMoreClick={setSelectedDay}
            />
          </div>

          <CalendarSidebar
            currentUser={currentUser}
            selectedAccounts={selectedAccounts}
            onAddAccount={handleAddAccount}
            onRemoveAccount={handleRemoveAccount}
            googleAccounts={googleAccounts}
            onGoogleAccountAdded={handleGoogleAccountAdded}
            onRemoveGoogleAccount={handleRemoveGoogleAccount}
            allFollowUps={allFollowUps}
            currentMonth={currentMonth}
            currentYear={currentYear}
            isAddAccountOpen={isAddAccountOpen}
            onAddAccountToggle={() => setIsAddAccountOpen(!isAddAccountOpen)}
            accountName={accountName}
            onAccountNameChange={setAccountName}
            onAddAccountConfirm={handleAddAccount}
          />
        </div>

        <AddAccountModal
          isOpen={isAddAccountOpen}
          accountName={accountName}
          onAccountNameChange={setAccountName}
          onConfirm={handleAddAccount}
          onClose={() => setIsAddAccountOpen(false)}
        />

        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />

        <DayEventsModal
          day={selectedDay}
          currentMonth={currentMonth}
          currentYear={currentYear}
          events={selectedDay ? followUpsByDate[selectedDay] : null}
          onClose={() => setSelectedDay(null)}
          onEventClick={setSelectedEvent}
        />
      </div>
    </div>
  );
}

export default FollowUpCalendar;

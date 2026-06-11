import { useState, useMemo, useEffect } from "react";
import { ChevronLeft, ChevronRight, X, Plus, Trash2 } from "lucide-react";
import { formatDate } from "../../utils/utils";
import GoogleCalendarAuth from "./GoogleCalendarAuth";
import "./FollowUpCalendar.css";

function FollowUpCalendar({ isOpen, onClose, deals, leads, currentUser }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccounts, setSelectedAccounts] = useState(new Set());
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [googleAccounts, setGoogleAccounts] = useState([]);
  const [googleEvents, setGoogleEvents] = useState([]);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Load saved accounts on mount and manage background scroll
  useEffect(() => {
    const saved = localStorage.getItem("googleCalendarAccounts");
    if (saved) {
      try {
        const accounts = JSON.parse(saved);
        setGoogleAccounts(accounts);
        // Fetch events for saved accounts
        accounts.forEach((account) => {
          fetchGoogleCalendarEventsForAccount(account);
        });
      } catch (err) {
        console.error("Failed to load saved accounts:", err);
      }
    }

    // Prevent background scroll when modal is open
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

  // Get all follow-ups from deals, leads, and Google Calendar
  const allFollowUps = useMemo(() => {
    const followUps = [];

    // Add lead follow-ups
    leads.forEach((lead) => {
      if (lead.followUpDate) {
        followUps.push({
          id: `lead-${lead.id}`,
          type: "lead",
          date: lead.followUpDate,
          title: lead.address,
          source: "Leads",
        });
      }
    });

    // Add deal follow-ups (closed deals)
    deals.forEach((deal) => {
      if (deal.closedDate) {
        followUps.push({
          id: `deal-${deal.id}`,
          type: "deal",
          date: deal.closedDate,
          title: deal.address,
          source: "Deals",
        });
      }
    });

    // Add Google Calendar events
    googleEvents.forEach((event) => {
      followUps.push(event);
    });

    return followUps;
  }, [deals, leads, googleEvents]);

  // Get days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();

  // Get follow-ups for each day
  const followUpsByDate = useMemo(() => {
    const map = {};
    allFollowUps.forEach((followUp) => {
      const date = new Date(followUp.date);
      if (
        date.getMonth() === currentMonth &&
        date.getFullYear() === currentYear
      ) {
        const day = date.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(followUp);
      }
    });
    return map;
  }, [allFollowUps, currentMonth, currentYear]);

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
    // Store in localStorage for persistence
    const updated = [...googleAccounts, account];
    localStorage.setItem("googleCalendarAccounts", JSON.stringify(updated));

    // Fetch calendar events for this account
    await fetchGoogleCalendarEventsForAccount(account);
  };

  const fetchGoogleCalendarEventsForAccount = async (account) => {
    if (!account.accessToken) {
      console.error("No access token for account:", account.email);
      return;
    }

    try {
      // Use relative URLs in production (Vercel), localhost in dev
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
        // Transform Google Calendar events to our format
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

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

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
            <div className="calendar-controls">
              <button
                className="ghost-btn"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft size={18} />
              </button>
              <h3>{monthName}</h3>
              <button
                className="ghost-btn"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="calendar-grid">
              <div className="weekday-header">Sun</div>
              <div className="weekday-header">Mon</div>
              <div className="weekday-header">Tue</div>
              <div className="weekday-header">Wed</div>
              <div className="weekday-header">Thu</div>
              <div className="weekday-header">Fri</div>
              <div className="weekday-header">Sat</div>

              {days.map((day, index) => (
                <div
                  key={index}
                  className={`calendar-day ${day ? "" : "empty"}`}
                >
                  {day && (
                    <>
                      <div className="calendar-day-number">{day}</div>
                      <div className="calendar-day-events">
                        {followUpsByDate[day]?.slice(0, 2).map((followUp) => {
                          const startTime =
                            followUp.type === "google-calendar" &&
                            followUp.date instanceof String
                              ? new Date(followUp.date).toLocaleTimeString(
                                  "en-US",
                                  { hour: "2-digit", minute: "2-digit" },
                                )
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
                            >
                              {displayText}
                            </div>
                          );
                        })}
                        {followUpsByDate[day]?.length > 2 && (
                          <div className="follow-up-more">
                            +{followUpsByDate[day].length - 2}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="calendar-sidebar">
            <div className="sidebar-section">
              <h4>Accounts</h4>
              <button
                className="sidebar-add-btn"
                onClick={() => setIsAddAccountOpen(true)}
              >
                <Plus size={14} />
                Add Account
              </button>
              <div className="accounts-list">
                <div className="account-item main-account">
                  <span className="account-name">
                    {currentUser?.firstName || "My Account"}
                  </span>
                  <span className="account-badge">Primary</span>
                </div>
                {Array.from(selectedAccounts).map((account) => (
                  <div key={account} className="account-item">
                    <span className="account-name">{account}</span>
                    <button
                      className="ghost-btn account-remove"
                      onClick={() => handleRemoveAccount(account)}
                      title="Remove account"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <GoogleCalendarAuth
              onAccountAdded={handleGoogleAccountAdded}
              connectedAccounts={googleAccounts}
              onRemoveAccount={handleRemoveGoogleAccount}
            />

            <div className="sidebar-section">
              <h4>Upcoming Follow-Ups</h4>
              <div className="upcoming-list">
                {allFollowUps
                  .filter(
                    (fu) =>
                      new Date(fu.date) >=
                      new Date(currentYear, currentMonth, 1),
                  )
                  .sort((a, b) => new Date(a.date) - new Date(b.date))
                  .slice(0, 10)
                  .map((followUp) => (
                    <div key={followUp.id} className="upcoming-item">
                      <span className={`type-badge ${followUp.type}`}>
                        {followUp.type === "lead" ? "L" : "D"}
                      </span>
                      <div className="upcoming-content">
                        <div className="upcoming-title">
                          {followUp.title.substring(0, 30)}
                        </div>
                        <div className="upcoming-date">
                          {formatDate(followUp.date)}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isAddAccountOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAddAccountOpen(false)}
        >
          <div
            className="modal-content add-account-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Add Account to Calendar</h3>
              <button
                className="ghost-btn"
                onClick={() => setIsAddAccountOpen(false)}
                title="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="add-account-form">
              <div className="field">
                <label>Account Name or Email</label>
                <input
                  type="text"
                  placeholder="Enter account name or email"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") handleAddAccount();
                  }}
                />
              </div>

              <div className="modal-actions">
                <button
                  className="secondary-btn"
                  onClick={() => setIsAddAccountOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="primary-btn"
                  onClick={handleAddAccount}
                  disabled={!accountName.trim()}
                >
                  Add Account
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FollowUpCalendar;

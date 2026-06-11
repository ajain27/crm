import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "../../../utils/utils";
import GoogleCalendarAuth from "../GoogleCalendarAuth";

export function CalendarSidebar({
  currentUser,
  selectedAccounts,
  onAddAccount,
  onRemoveAccount,
  googleAccounts,
  onGoogleAccountAdded,
  onRemoveGoogleAccount,
  allFollowUps,
  currentMonth,
  currentYear,
  isAddAccountOpen,
  onAddAccountToggle,
  accountName,
  onAccountNameChange,
  onAddAccountConfirm,
}) {
  return (
    <div className="calendar-sidebar">
      <div className="sidebar-section">
        <h4>Accounts</h4>
        <button className="sidebar-add-btn" onClick={onAddAccountToggle}>
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
                onClick={() => onRemoveAccount(account)}
                title="Remove account"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <GoogleCalendarAuth
        onAccountAdded={onGoogleAccountAdded}
        connectedAccounts={googleAccounts}
        onRemoveAccount={onRemoveGoogleAccount}
      />

      <div className="sidebar-section">
        <h4>Upcoming Follow-Ups</h4>
        <div className="upcoming-list">
          {allFollowUps
            .filter(
              (fu) =>
                new Date(fu.date) >= new Date(currentYear, currentMonth, 1),
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
  );
}

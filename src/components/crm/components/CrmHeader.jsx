import {
  BarChart3,
  Calculator,
  Home,
  Landmark,
  Moon,
  Sun,
  Users,
  Crosshair,
  Bell,
  Building2,
  KeyRound,
  TrendingUp,
  Calendar,
} from "lucide-react";
import logo from "../../../assets/logo.png";
import { usePrimeRate } from "../../../hooks/usePrimeRate";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "leads", label: "Potential Leads", icon: Crosshair },
  { id: "deal-analyzer", label: "Deal Analyzer", icon: BarChart3 },
  { id: "pm-deals", label: "PML Deals", icon: Landmark },
  { id: "title-companies", label: "Title Companies", icon: Building2 },
  { id: "rental-management", label: "Rental Management", icon: KeyRound },
  { id: "mortgage", label: "Mortgage Calculator", icon: Calculator },
  { id: "buyers", label: "Buyers List", icon: Users },
];

function buildDisplayName(currentUser) {
  return (
    [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(" ") ||
    currentUser?.username ||
    currentUser?.email ||
    "CRM User"
  );
}

function buildProfileInitial(currentUser) {
  return String(
    currentUser?.firstName ||
      currentUser?.username ||
      currentUser?.email ||
      "U",
  )
    .trim()
    .charAt(0)
    .toUpperCase();
}

function CrmHeader({
  currentUser,
  activeView,
  setActiveView,
  isProfileMenuOpen,
  theme,
  onToggleTheme,
  onToggleProfileMenu,
  onEditProfile,
  onSignOut,
  profileMenuRef,
  dueLeadsCount,
  onBellClick,
  onCalendarClick,
}) {
  const displayName = buildDisplayName(currentUser);
  const profileInitial = buildProfileInitial(currentUser);
  const primeRate = usePrimeRate();

  const primeTooltip = primeRate.asOf
    ? `US prime rate as of ${primeRate.asOf}${
        primeRate.source === "fallback"
          ? " (local fallback — set VITE_FRED_API_KEY for live data)"
          : ""
      }`
    : "US prime rate";

  return (
    <div className="app-topbar">
      <div className="app-topbar-row1">
        <div className="app-topbar-spacer">
          <span
            className="header-prime-rate"
            title={primeTooltip}
            aria-label={`Prime rate ${primeRate.rate}%`}
          >
            <TrendingUp size={14} />
            <span className="header-prime-rate-label">Prime</span>
            <strong>{primeRate.rate.toFixed(2)}%</strong>
          </span>
          <button
            type="button"
            className="ghost-btn header-theme-toggle"
            onClick={onToggleTheme}
            aria-label={
              theme === "dark"
                ? "Switch to light theme"
                : "Switch to dark theme"
            }
            title={theme === "dark" ? "Light Theme" : "Dark Theme"}
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <div className="header-bell-wrap">
            <button
              type="button"
              className="ghost-btn header-theme-toggle"
              onClick={onBellClick}
              title={
                dueLeadsCount > 0
                  ? `${dueLeadsCount} follow-up${dueLeadsCount > 1 ? "s" : ""} due`
                  : "Potential Leads"
              }
              aria-label="Follow-up reminders"
            >
              <Bell size={18} />
            </button>
            {dueLeadsCount > 0 && (
              <span className="header-bell-badge">{dueLeadsCount}</span>
            )}
          </div>
        </div>
        <img src={logo} alt="You Win Estates" className="app-topbar-logo" />
        <div className="app-topbar-actions">
          <button
            type="button"
            className="ghost-btn header-calendar-btn"
            onClick={onCalendarClick}
            title="Calendar & Follow-ups"
            aria-label="Open calendar"
          >
            <Calendar size={18} />
          </button>
          <div className="profile-menu-wrap" ref={profileMenuRef}>
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={onToggleProfileMenu}
              aria-label="Open profile menu"
            >
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={
                    currentUser.firstName || currentUser.username || "Profile"
                  }
                  className="profile-avatar-image"
                />
              ) : (
                <span className="profile-avatar-fallback">
                  {profileInitial}
                </span>
              )}
            </button>

            {isProfileMenuOpen && (
              <div className="profile-menu-dropdown">
                <div className="profile-menu-header">
                  <strong>{displayName}</strong>
                  <span>{currentUser?.email}</span>
                </div>
                <button
                  type="button"
                  className="profile-menu-item"
                  onClick={onEditProfile}
                >
                  Edit Profile
                </button>
                <button
                  type="button"
                  className="profile-menu-item danger"
                  onClick={onSignOut}
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="app-topbar-nav">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`app-topbar-nav-item${activeView === id ? " active" : ""}`}
            onClick={() => setActiveView(id)}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default CrmHeader;

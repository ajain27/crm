import { BarChart3, Calculator, Home, Moon, Sun, Users } from "lucide-react";
import logo from "../../../assets/logo.png";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "deal-analyzer", label: "Deal Analyzer", icon: BarChart3 },
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

function WholesaleHeader({
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
}) {
  const displayName = buildDisplayName(currentUser);
  const profileInitial = buildProfileInitial(currentUser);

  return (
    <div className="app-topbar">
      <div className="app-topbar-row1">
        <div className="app-topbar-spacer">
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
        </div>
        <img src={logo} alt="You Win Estates" className="app-topbar-logo" />
        <div className="app-topbar-actions">
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

export default WholesaleHeader;

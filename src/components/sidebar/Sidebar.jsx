import { Home, Moon, Sun, Users } from "lucide-react";
import logo from "../../assets/logo.png";

function Sidebar({
  activeView,
  setActiveView,
  currentUser,
  onSignOut,
  onEditProfile,
  isOpen,
  onToggle,
  theme,
  onToggleTheme,
}) {
  const fullName = [currentUser?.firstName, currentUser?.lastName]
    .filter(Boolean)
    .join(" ");
  const displayName =
    fullName || currentUser?.username || currentUser?.email || "CRM User";
  const initials = String(displayName || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
      <div className="brand sidebar-brand">
        <img src={logo} alt="You Win Estates" className="brand-logo" />
      </div>
      <nav>
        <a
          className={activeView === "dashboard" ? "active" : ""}
          onClick={() => setActiveView("dashboard")}
        >
          <Home size={18} />
          Dashboard
        </a>
        <a
          className={activeView === "buyers" ? "active" : ""}
          onClick={() => setActiveView("buyers")}
        >
          <Users size={18} />
          Buyers List
        </a>
      </nav>
      <button
        type="button"
        className="secondary-btn sidebar-theme-btn"
        onClick={onToggleTheme}
      >
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        {theme === "dark" ? "Light Theme" : "Dark Theme"}
      </button>
      <div className="user-card">
        <div className="avatar">{initials}</div>
        <div className="user-meta">
          <div className="user-info">
            <strong>{displayName}</strong>
          </div>
          <button
            type="button"
            className="secondary-btn sidebar-profile-btn"
            onClick={onEditProfile}
          >
            Edit Profile
          </button>
          <button
            type="button"
            className="ghost-btn sidebar-signout-btn"
            onClick={onSignOut}
          >
            Sign Out
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

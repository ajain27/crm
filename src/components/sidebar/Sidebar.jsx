import { Home, Moon, Sun, Users } from "lucide-react";

function Sidebar({
  activeView,
  setActiveView,
  currentUser,
  isOpen,
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
      <div className="user-card">
        <button
          type="button"
          className="secondary-btn sidebar-theme-btn"
          onClick={onToggleTheme}
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          {theme === "dark" ? "Light Theme" : "Dark Theme"}
        </button>
        <div className="user-meta">
          <div className="user-info">
            <div className="avatar">
              {currentUser?.profileImage ? (
                <img
                  src={currentUser.profileImage}
                  alt={displayName}
                  className="avatar-image"
                />
              ) : (
                initials
              )}
            </div>
            <strong>{displayName}</strong>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;

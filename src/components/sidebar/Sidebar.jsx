import { Home, Users } from "lucide-react";
import logo from "../../assets/logo.png";

function Sidebar({ activeView, setActiveView, currentUser, onSignOut }) {
  const initials = String(currentUser?.username || currentUser?.email || "U")
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <aside className="sidebar">
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
      <div className="user-card">
        <div className="avatar">{initials}</div>
        <div className="user-meta">
          <div className="user-info">
            <strong>{currentUser?.username || "CRM User"}</strong>
          </div>
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

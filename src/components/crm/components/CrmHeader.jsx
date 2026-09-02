import {
  BarChart3,
  Calculator,
  Home,
  Landmark,
  Moon,
  Sun,
  Users,
  Crosshair,
  KeyRound,
  TrendingUp,
  Receipt,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logo from "../../../assets/logo.png";
import { usePrimeRate } from "../../../hooks/usePrimeRate";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "leads", label: "Leads", icon: Crosshair },
  { id: "deal-analyzer", label: "Deal Analyzer", icon: BarChart3 },
  { id: "pm-deals", label: "PML Deals", icon: Landmark },
  { id: "rental-management", label: "Rental Management", icon: KeyRound },
  { id: "mortgage", label: "Mortgage Calculator", icon: Calculator },
  { id: "buyers", label: "Buyers List", icon: Users },
  { id: "invoice-generator", label: "Invoice Generator", icon: Receipt },
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
  isSidebarOpen = false,
  onToggleSidebar = () => {},
  ppcOnly = false,
}) {
  const displayName = buildDisplayName(currentUser);
  const profileInitial = buildProfileInitial(currentUser);
  const primeRate = usePrimeRate();
  const navItems = ppcOnly
    ? NAV_ITEMS.filter(
        (item) => item.id === "leads" || item.id === "deal-analyzer",
      ).map((item) =>
        item.id === "leads" ? { ...item, label: "PPC Leads" } : item,
      )
    : NAV_ITEMS;

  const primeAriaLabel = `Prime rate ${primeRate.rate.toFixed(2)}%`;
  const primeTooltip = primeRate.asOf
    ? `US prime rate as of ${primeRate.asOf}${
        primeRate.source === "fallback"
          ? " (local fallback — set VITE_FRED_API_KEY for live data)"
          : ""
      }`
    : "US prime rate";

  function handleNav(id) {
    setActiveView(id);
    // Close drawer on mobile; sidebar stays open on desktop
    if (typeof window !== "undefined" && window.innerWidth <= 900) {
      onToggleSidebar(false);
    }
  }

  return (
    <>
      {/* ── Mobile top bar (hidden on desktop) ── */}
      <div className="app-mobile-bar">
        <button
          type="button"
          className="mobile-hamburger"
          onClick={() => onToggleSidebar(true)}
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>
        <img src={logo} alt="You Win Estates" className="mobile-logo" />
        <div style={{ width: "2.25rem" }} />
      </div>

      {/* ── Backdrop (mobile only — CSS hides it on desktop) ── */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => onToggleSidebar(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`app-sidebar${isSidebarOpen ? " is-open" : ""}`}>
        {/* Nav */}
        <nav className="sb-nav" aria-label="Main navigation">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`sb-nav-item${activeView === id ? " active" : ""}`}
              onClick={() => handleNav(id)}
              aria-current={activeView === id ? "page" : undefined}
              title={label}
            >
              <Icon size={17} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="sb-spacer" />

        {/* Bottom */}
        <div className="sb-bottom">
          {/* User card */}
          <div className="sb-user-wrap" ref={profileMenuRef}>
            {/* Profile dropdown — floats above the card */}
            {isProfileMenuOpen && (
              <div className="profile-menu-dropdown sb-profile-menu">
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

            <div className="sb-user-row">
              {/* Avatar + name (triggers profile menu) */}
              <button
                type="button"
                className="sb-user-btn"
                onClick={onToggleProfileMenu}
                aria-label="Open profile menu"
              >
                <div className="sb-avatar">
                  {currentUser?.profileImage ? (
                    <img
                      src={currentUser.profileImage}
                      alt={
                        currentUser.firstName ||
                        currentUser.username ||
                        "Profile"
                      }
                      className="sb-avatar-img"
                    />
                  ) : (
                    profileInitial
                  )}
                </div>
                <div className="sb-user-info">
                  <strong>{displayName}</strong>
                  <span>{currentUser?.email}</span>
                </div>
              </button>

              {/* Theme toggle — next to avatar */}
              <button
                type="button"
                className="sb-theme-btn"
                onClick={onToggleTheme}
                aria-label={
                  theme === "dark"
                    ? "Switch to light theme"
                    : "Switch to dark theme"
                }
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>

              {/* Collapse/expand sidebar */}
              <button
                type="button"
                className="sb-collapse-btn"
                onClick={() => onToggleSidebar(!isSidebarOpen)}
                aria-label={
                  isSidebarOpen ? "Close navigation" : "Open navigation"
                }
                title={isSidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronLeft size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Fixed prime rate badge — always visible top-right ── */}
      <div
        className="prime-rate-fixed"
        title={primeTooltip}
        aria-label={primeAriaLabel}
      >
        <TrendingUp size={12} />
        <span>Prime</span>
        <strong>{primeRate.rate.toFixed(2)}%</strong>
      </div>
    </>
  );
}

export default CrmHeader;

import { Menu } from "lucide-react";
import logo from "../../../assets/logo.png";

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
    currentUser?.firstName || currentUser?.username || currentUser?.email || "U",
  )
    .trim()
    .charAt(0)
    .toUpperCase();
}

function WholesaleHeader({
  currentUser,
  isSidebarOpen,
  isProfileMenuOpen,
  onToggleSidebar,
  onToggleProfileMenu,
  onEditProfile,
  onSignOut,
  profileMenuRef,
}) {
  const displayName = buildDisplayName(currentUser);
  const profileInitial = buildProfileInitial(currentUser);

  return (
    <div className="company-header">
      <div
        className={`company-brand-header ${isSidebarOpen ? "sidebar-visible" : "sidebar-hidden"}`}
      >
        <button
          type="button"
          className="ghost-btn sidebar-toggle-btn sidebar-toggle-btn-floating"
          onClick={onToggleSidebar}
          aria-label={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          title={isSidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          <Menu size={18} />
        </button>
        <img
          src={logo}
          alt="You Win Estates"
          className={`company-header-logo ${isSidebarOpen ? "is-hidden" : "is-visible"}`}
        />
      </div>

      <div className="profile-menu-wrap" ref={profileMenuRef}>
        <button
          type="button"
          className="profile-avatar-btn"
          onClick={onToggleProfileMenu}
          aria-label="Open profile menu"
          title="Open profile menu"
        >
          {currentUser?.profileImage ? (
            <img
              src={currentUser.profileImage}
              alt={currentUser.firstName || currentUser.username || "Profile"}
              className="profile-avatar-image"
            />
          ) : (
            <span className="profile-avatar-fallback">{profileInitial}</span>
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
  );
}

export default WholesaleHeader;

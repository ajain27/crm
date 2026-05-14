import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw } from "lucide-react";
import "../../../styles/styles.css";
import {
  fetchBuyers,
  saveDeal,
  saveBuyer,
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
} from "../../../firebase/firestoreService";
import Wholesale_filters from "./filters/Wholesale_filters";
import Wholesale_form from "./forms/wholesale_form";
import Wholesale_data from "./data/Wholesale_data";
import DealAnalyzer from "../../dealAnalyzer/components/DealAnalyzer";
import MortgageCalculator from "../../mortgageCalculator/MortgageCalculator";
import Buyers from "../../buyers/components/Buyers";
import Sidebar from "../../sidebar/Sidebar";
import StatsGrid from "../../stats/StatsGrid";
import LoadingScreen from "../../loader/LoadingScreen";
import AuthGate from "../../auth/AuthGate";
import ProfileModal from "./ProfileModal";
import WholesaleHeader from "./WholesaleHeader";
import useIdleLogout from "../../../hooks/useIdleLogout";
import useScrollReveal from "../../../hooks/useScrollReveal";
import useTheme from "../../../hooks/useTheme";
import {
  SESSION_STORAGE_KEY,
  IDLE_LOGOUT_MS,
  months,
  createDefaultFilters,
  createProfileForm,
} from "./wholesaleConfig";
import { useDealsData } from "./hooks/useDealsData";
import { useDealsFilter } from "./hooks/useDealsFilter";
import { useDealForm } from "./hooks/useDealForm";
import { useProfileManager } from "./hooks/useProfileManager";

function Wholesale() {
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem(SESSION_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [activeView, setActiveView] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 1100;
  });

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 1100) {
        setIsSidebarOpen(true);
      }
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { deals, setDeals, isLoading, errorMessage, deleteDeal, persist } =
    useDealsData({ currentUser });

  const { filters, setFilters, states, propertyTypes, years, filteredDeals } =
    useDealsFilter({ deals });

  const {
    form,
    tableLoading,
    resetForm,
    handleChange,
    handleBlur,
    handleContractFileChange,
    clearContractFile,
    handleAddressBlur,
    addDeal,
  } = useDealForm({
    deals,
    currentUser,
    saveDeal,
    saveBuyer,
    fetchBuyers,
    saveContractVersion,
    setDeals,
    setFilters,
  });

  const {
    profileForm,
    setProfileForm,
    isProfileModalOpen,
    setIsProfileModalOpen,
    isProfileMenuOpen,
    setIsProfileMenuOpen,
    profileMenuRef,
    handleSaveProfile,
    handleProfileImageChange,
  } = useProfileManager({
    currentUser,
    setCurrentUser,
    sessionStorageKey: SESSION_STORAGE_KEY,
  });

  useScrollReveal([activeView, isLoading, tableLoading, deals.length]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeView]);

  function handleAuthenticated(user) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setProfileForm(createProfileForm(user));
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setDeals([]);
    resetForm();
    setFilters(createDefaultFilters());
    setActiveView("dashboard");
    setIsProfileModalOpen(false);
    setIsProfileMenuOpen(false);
  }

  useIdleLogout({
    currentUser,
    timeoutMs: IDLE_LOGOUT_MS,
    onTimeout: () => {
      alert("You have been logged out after 30 minutes of inactivity.");
      handleSignOut();
    },
  });

  if (!currentUser) {
    return <AuthGate onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div
      className={`layout ${isSidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}
    >
      <div className="desktop-sidebar-slot">
        <Sidebar
          activeView={activeView}
          setActiveView={setActiveView}
          currentUser={currentUser}
          isOpen={isSidebarOpen}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>

      <main className="main">
        <WholesaleHeader
          currentUser={currentUser}
          isSidebarOpen={isSidebarOpen}
          isProfileMenuOpen={isProfileMenuOpen}
          theme={theme}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onToggleTheme={toggleTheme}
          onToggleProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
          onEditProfile={() => {
            setIsProfileMenuOpen(false);
            setIsProfileModalOpen(true);
          }}
          onSignOut={handleSignOut}
          profileMenuRef={profileMenuRef}
        />
        <div className="mobile-sidebar-slot">
          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            currentUser={currentUser}
            isOpen={isSidebarOpen}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>
        {activeView === "dashboard" ? (
          <>
            <header className="page-header" data-reveal="left">
              <div>
                <h1>Lead Pipeline</h1>
              </div>
            </header>

            {errorMessage && (
              <div
                className="error-banner"
                data-reveal
                style={{ "--reveal-delay": "40ms" }}
              >
                {errorMessage}
              </div>
            )}

            <StatsGrid
              deals={deals}
              filteredDeals={filteredDeals}
              filters={filters}
            />

            <Wholesale_form
              addDeal={addDeal}
              form={form}
              handleChange={handleChange}
              handleBlur={handleBlur}
              handleAddressBlur={handleAddressBlur}
              handleContractFileChange={handleContractFileChange}
              clearContractFile={clearContractFile}
            />

            <Wholesale_filters
              filters={filters}
              states={states}
              propertyTypes={propertyTypes}
              months={months}
              years={years}
              RefreshCw={RefreshCw}
              setFilters={setFilters}
            />
            <LoadingScreen
              isLoading={isLoading || tableLoading}
              minDuration={300}
              loadingContent={
                <span>
                  {isLoading
                    ? "Loading deals from Firebase..."
                    : "Loading updated deal data..."}
                </span>
              }
            >
              <Wholesale_data
                filteredDeals={filteredDeals}
                deals={deals}
                deleteDeal={deleteDeal}
                persist={persist}
                saveDeal={saveDeal}
                fetchBuyers={(userId = currentUser.id) => fetchBuyers(userId)}
                saveBuyer={saveBuyer}
                setFilters={setFilters}
                saveContractVersion={saveContractVersion}
                fetchContractVersion={fetchContractVersion}
                deleteContractById={deleteContractById}
                currentUserId={currentUser.id}
              />
            </LoadingScreen>
          </>
        ) : activeView === "buyers" ? (
          <Buyers theme={theme} currentUser={currentUser} />
        ) : activeView === "mortgage" ? (
          <MortgageCalculator />
        ) : (
          <DealAnalyzer />
        )}
        <footer
          className="app-footer"
          data-reveal="zoom"
          style={{ "--reveal-delay": "300ms" }}
        >
          <span>© 2026 You Win Estates</span>
          <span>Proprietary CRM</span>
        </footer>
      </main>
      <ProfileModal
        currentUser={currentUser}
        isOpen={isProfileModalOpen}
        profileForm={profileForm}
        setProfileForm={setProfileForm}
        onClose={() => setIsProfileModalOpen(false)}
        onSave={handleSaveProfile}
        onProfileImageChange={handleProfileImageChange}
      />
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(<Wholesale />);
}

export default Wholesale;

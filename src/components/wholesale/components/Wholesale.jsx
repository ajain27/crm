import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, X } from "lucide-react";
import "../../../styles/styles.css";
import {
  fetchBuyers,
  saveDeal,
  saveBuyer,
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
  fetchLeads,
  saveLead,
  deleteLeadById,
  saveLeadFile,
  fetchLeadFile,
  deleteLeadFileById,
} from "../../../firebase/firestoreService";
import Wholesale_filters from "./filters/Wholesale_filters";
import Wholesale_form from "./forms/wholesale_form";
import Wholesale_data from "./data/Wholesale_data";
import DealAnalyzer from "../../dealAnalyzer/components/DealAnalyzer";
import MortgageCalculator from "../../mortgageCalculator/MortgageCalculator";
import Buyers from "../../buyers/components/Buyers";
import PotentialLeads from "../../leads/PotentialLeads";
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
  const [leads, setLeads] = useState([]);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    fetchLeads(currentUser.id)
      .then(setLeads)
      .catch(() => {});
  }, [currentUser?.id]);

  useEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo(0, 0);
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
    setLeads([]);
    setBannerDismissed(false);
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
    <div className="layout layout-no-sidebar">
      <WholesaleHeader
        currentUser={currentUser}
        activeView={activeView}
        setActiveView={setActiveView}
        isProfileMenuOpen={isProfileMenuOpen}
        theme={theme}
        onToggleTheme={toggleTheme}
        onToggleProfileMenu={() => setIsProfileMenuOpen((prev) => !prev)}
        onEditProfile={() => {
          setIsProfileMenuOpen(false);
          setIsProfileModalOpen(true);
        }}
        onSignOut={handleSignOut}
        profileMenuRef={profileMenuRef}
        dueLeadsCount={(() => {
          const today = new Date().toISOString().split("T")[0];
          return leads.filter((l) => l.followUpDate && l.followUpDate <= today)
            .length;
        })()}
        onBellClick={() => setActiveView("leads")}
      />
      <main className="main">
        {!bannerDismissed &&
          (() => {
            const today = new Date().toISOString().split("T")[0];
            const due = leads.filter(
              (l) => l.followUpDate && l.followUpDate <= today,
            );
            if (!due.length) return null;
            return (
              <div className="followup-banner">
                <div className="followup-banner-body">
                  <span className="followup-banner-title">
                    Follow-up{due.length > 1 ? "s" : ""} due today
                  </span>
                  <ul className="followup-banner-list">
                    {due.map((l) => (
                      <li key={l.id} className="followup-banner-item">
                        <strong>
                          {l.followUpDate < today ? "Overdue" : "Today"}
                        </strong>{" "}
                        — {l.address}
                        {(l.email || l.phone) && (
                          <span className="followup-banner-contacts">
                            {l.email && (
                              <a href={`mailto:${l.email}`}>{l.email}</a>
                            )}
                            {l.phone && (
                              <a href={`tel:${l.phone}`}>{l.phone}</a>
                            )}
                          </span>
                        )}
                        <button
                          className="followup-banner-view"
                          onClick={() => setActiveView("leads")}
                        >
                          View leads →
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  className="followup-banner-dismiss"
                  onClick={() => setBannerDismissed(true)}
                  aria-label="Dismiss"
                >
                  <X size={15} />
                </button>
              </div>
            );
          })()}
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
        ) : activeView === "leads" ? (
          <PotentialLeads
            currentUser={currentUser}
            leads={leads}
            setLeads={setLeads}
            saveLead={saveLead}
            deleteLeadById={deleteLeadById}
            saveLeadFile={saveLeadFile}
            fetchLeadFile={fetchLeadFile}
            deleteLeadFileById={deleteLeadFileById}
            saveDeal={saveDeal}
            setDeals={setDeals}
            setActiveView={setActiveView}
          />
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

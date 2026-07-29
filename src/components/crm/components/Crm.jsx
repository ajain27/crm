import { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw } from "lucide-react";
import "../../../styles/styles.css";
import logo from "../../../assets/logo.png";
import {
  fetchBuyers,
  saveDeal,
  deleteDealById,
  saveBuyer,
  saveContractVersion,
  fetchContractVersion,
  deleteContractById,
  subscribeToLeads,
  saveLead,
  deleteLeadById,
  saveLeadFile,
  fetchLeadFile,
  deleteLeadFileById,
  fetchPmDeals,
  savePmDeal,
  deletePmDealById,
  savePmDealFile,
  fetchPmDealFile,
  deletePmDealFileById,
  fetchRentals,
  saveRental,
  deleteRentalById,
} from "../../../firebase/firestoreService";
import Crm_filters from "./filters/crm_filters";
import Wholesale_form from "./forms/crm_form";
import Wholesale_data from "./data/crm_table";
import DealAnalyzer from "../../dealAnalyzer/components/DealAnalyzer";
import PMDealsTab from "../../pmDeals/PMDealsTab";
import RentalManagement from "../../rentalManagement/RentalManagement";
import MortgageCalculator from "../../mortgageCalculator/MortgageCalculator";
import Buyers from "../../buyers/components/Buyers";
import PotentialLeads from "../../leads/PotentialLeads";
import InvoiceGenerator from "../../invoiceGenerator/InvoiceGenerator";
import StatsGrid from "../../stats/StatsGrid";
import LoadingScreen from "../../loader/LoadingScreen";
import AuthGate from "../../auth/AuthGate";
import ProfileModal from "./ProfileModal";
import CrmHeader from "./CrmHeader";
import useIdleLogout from "../../../hooks/useIdleLogout";
import useScrollReveal from "../../../hooks/useScrollReveal";
import useTheme from "../../../hooks/useTheme";
import {
  SESSION_STORAGE_KEY,
  IDLE_LOGOUT_MS,
  months,
  createDefaultFilters,
  createProfileForm,
} from "./crmConfig";
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
  const [activeView, setActiveView] = useState(() =>
    currentUser?.role === "ppc" ? "leads" : "dashboard",
  );
  const ppcOnly = currentUser?.role === "ppc";

  const VIEW_META = {
    dashboard: "Manage and track your wholesale deals",
    leads: "Monitor properties before they enter your pipeline",
    "deal-analyzer": "Analyze deal structures and pressure-test the numbers",
    "pm-deals": "Track borrower details and private money loans",
    "rental-management": "Manage your rental portfolio, tenants, and cash flow",
    mortgage: "Calculate monthly payments and lifetime loan costs",
    buyers: "Organize and manage your buyers list",
    "invoice-generator": "Create and send professional invoices",
  };
  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 901,
  );
  const [leads, setLeads] = useState([]);

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToLeads(currentUser.id, setLeads);
    return unsub;
  }, [currentUser?.id]);

  useEffect(() => {
    if (ppcOnly && activeView !== "leads") {
      setActiveView("leads");
    }
  }, [ppcOnly, activeView]);

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
    formError,
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

  async function convertDealToRental(deal) {
    const rental = {
      id: crypto.randomUUID(),
      userId: currentUser?.id || "",
      createdAt: new Date().toISOString(),
      address: deal.address || "",
      city: deal.city || "",
      state: deal.state || "",
      purchaseDate: deal.closedDate || "",
      monthlyMortgage: "",
      monthlyRent: deal.rent || "",
      tenants: [],
      pmCompanyName: "",
      pmAgentName: "",
      pmContactPhone: "",
      pmContactEmail: "",
      hasApplianceInsurance: "No",
      applianceInsuranceCompany: "",
      applianceInsuranceTermYears: "",
      applianceInsurancePricePaid: "",
    };
    await saveRental(rental);
    await deleteDealById(deal.id);
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    setActiveView("rental-management");
  }

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
    if (user.role === "ppc") setActiveView("leads");
    setProfileForm(createProfileForm(user));
  }

  function handleSignOut() {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setDeals([]);
    setLeads([]);
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
    <div className="app-shell">
      <CrmHeader
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
        isSidebarOpen={sidebarOpen}
        onToggleSidebar={setSidebarOpen}
        ppcOnly={ppcOnly}
      />
      <main className="main">
        {/* Brand header — shown when sidebar drawer is closed */}
        {!sidebarOpen && (
          <div className="collapsed-brand-header">
            <img
              src={logo}
              alt="You Win Estates"
              className="collapsed-brand-logo"
            />
          </div>
        )}

        {/* Per-view description */}
        {VIEW_META[activeView] && (
          <p className="view-description">{VIEW_META[activeView]}</p>
        )}

        {!ppcOnly && activeView === "dashboard" ? (
          <>
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
              formError={formError}
              handleChange={handleChange}
              handleBlur={handleBlur}
              handleAddressBlur={handleAddressBlur}
              handleContractFileChange={handleContractFileChange}
              clearContractFile={clearContractFile}
            />

            <Crm_filters
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
                filters={filters}
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
                convertDealToRental={convertDealToRental}
              />
            </LoadingScreen>
          </>
        ) : ppcOnly || activeView === "leads" ? (
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
            ppcOnly={ppcOnly}
          />
        ) : !ppcOnly && activeView === "pm-deals" ? (
          <PMDealsTab
            tab={{
              eyebrow: "Private Money",
              title: "Private money deal tracker",
              description:
                "Track borrower details and loan terms. Late interest accrues automatically day by day after the due date.",
            }}
            currentUser={currentUser}
            fetchPmDeals={fetchPmDeals}
            savePmDeal={savePmDeal}
            deletePmDealById={deletePmDealById}
            savePmDealFile={savePmDealFile}
            fetchPmDealFile={fetchPmDealFile}
            deletePmDealFileById={deletePmDealFileById}
          />
        ) : !ppcOnly && activeView === "rental-management" ? (
          <RentalManagement
            currentUser={currentUser}
            fetchRentals={fetchRentals}
            saveRental={saveRental}
            deleteRentalById={deleteRentalById}
          />
        ) : !ppcOnly && activeView === "buyers" ? (
          <Buyers theme={theme} currentUser={currentUser} />
        ) : !ppcOnly && activeView === "mortgage" ? (
          <MortgageCalculator />
        ) : !ppcOnly && activeView === "invoice-generator" ? (
          <InvoiceGenerator currentUser={currentUser} />
        ) : !ppcOnly ? (
          <DealAnalyzer />
        ) : (
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
            ppcOnly
          />
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

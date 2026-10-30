import { useState, useEffect, useCallback } from "react";
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
  saveDealPhoto,
  fetchDealPhoto,
  deleteDealPhotoById,
  saveLeadPhoto,
  fetchLeadPhoto,
  deleteLeadPhotoById,
  updateLeadPatch,
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
  fetchTitleCompanies,
  saveTitleCompany,
  deleteTitleCompanyById,
  fetchRentals,
  saveRental,
  deleteRentalById,
} from "../../../firebase/firestoreService";
import Crm_filters from "./filters/crm_filters";
import Wholesale_form from "./forms/crm_form";
import Wholesale_data from "./data/crm_table";
import DealAnalyzer from "../../dealAnalyzer/components/DealAnalyzer";
import PMDealsTab from "../../pmDeals/PMDealsTab";
import TitleCompanies from "../../titleCompanies/TitleCompanies";
import OnMarketDeals from "../../onMarketDeals/OnMarketDeals.jsx";
import PageHero from "../../elements/PageHero";
import { PAGE_HEROES } from "./pageHeroes";

import RentalManagement from "../../rentalManagement/RentalManagement";
import MortgageCalculator from "../../mortgageCalculator/MortgageCalculator";
import Buyers from "../../buyers/components/Buyers";
import PotentialLeads from "../../leads/PotentialLeads";
import { pathForRoute, routeFromPath } from "./viewRoute";
import Modal from "../../modal/Modal";
import {
  buildLeadFromDeal,
  dealLeadTab,
  leadTabLabel,
  uniqueById,
} from "../../leads/leadUtils";
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

// Pages that show their headline themselves, beside their own buttons.
const OWN_HERO_VIEWS = new Set(["title-companies", "invoice-generator"]);

// Module-level so the object is stable across renders.
// Photo stores for PhotoGallery / MainPhoto: an owner's (deal's or
// lead's) photos, one document each.
const DEAL_PHOTO_STORE = {
  save: ({ ownerId, ...photo }) => saveDealPhoto({ ...photo, dealId: ownerId }),
  fetch: fetchDealPhoto,
  remove: deleteDealPhotoById,
};

const LEAD_PHOTO_STORE = {
  save: ({ ownerId, ...photo }) => saveLeadPhoto({ ...photo, leadId: ownerId }),
  fetch: fetchLeadPhoto,
  remove: deleteLeadPhotoById,
};

function Wholesale() {
  const { theme, toggleTheme } = useTheme();
  // Use sessionStorage (not localStorage) so a page refresh keeps the user
  // logged in, but the session doesn't survive the tab/app actually closing
  // — e.g. a mobile browser/PWA killed by the OS and reopened later.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  // The page (and Leads tab) start as the address bar says, so a refresh
  // stays on the same page.
  const [activeView, setActiveView] = useState(
    () => routeFromPath(window.location.pathname).view,
  );
  // The Leads tab: the one in the address bar, the one a deal moved back to
  // Leads came from, or the one picked on the page.
  const [leadsTab, setLeadsTab] = useState(
    () => routeFromPath(window.location.pathname).leadsTab,
  );
  // "ppc" is the role self-signup creates — despite the name, it no longer
  // grants PPC leads access; it's locked to Dashboard + Deal Analyzer only.
  const ppcOnly = currentUser?.role === "ppc";

  const [sidebarOpen, setSidebarOpen] = useState(
    typeof window !== "undefined" && window.innerWidth >= 901,
  );
  const [leads, setLeadsState] = useState([]);
  // Leads arrive from the live subscription and are also added to the list
  // right after saving (so they show at once). Both can land, so keep one
  // entry per id — the first, i.e. the freshly saved one.
  const setLeads = useCallback(
    (next) =>
      setLeadsState((prev) =>
        uniqueById(typeof next === "function" ? next(prev) : next),
      ),
    [],
  );

  useEffect(() => {
    if (!currentUser) return;
    const unsub = subscribeToLeads(currentUser.id, setLeads);
    return unsub;
  }, [currentUser?.id]);

  useEffect(() => {
    if (
      ppcOnly &&
      activeView !== "dashboard" &&
      activeView !== "deal-analyzer"
    ) {
      setActiveView("dashboard");
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

  // The dashboard's Add a lead window; it closes once the deal is saved.
  const [addDealOpen, setAddDealOpen] = useState(false);
  async function handleAddDeal(event) {
    if (await addDeal(event)) setAddDealOpen(false);
  }

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

  // Puts a deal back in Leads, under the tab its lead came from, and takes
  // it off the CRM.
  async function moveDealToLeads(deal) {
    const lead = buildLeadFromDeal(deal, currentUser?.id || "");
    const tab = dealLeadTab(deal);
    if (
      !window.confirm(
        `Move ${deal.address || "this deal"} back to ${leadTabLabel(tab)}? It will be removed from the CRM, with its contracts and photos.`,
      )
    )
      return false;
    await saveLead(lead);
    await deleteDealById(deal.id);
    setLeads((prev) => [lead, ...prev]);
    setDeals((prev) => prev.filter((d) => d.id !== deal.id));
    setLeadsTab(tab);
    setActiveView("leads");
    return true;
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

  // Keeps the address bar on the page shown. Going to another page adds a
  // history entry (so Back returns to it); switching Leads tabs doesn't.
  useEffect(() => {
    const path = pathForRoute(activeView, leadsTab);
    if (path === window.location.pathname) return;
    const samePage =
      routeFromPath(window.location.pathname).view === activeView;
    if (samePage) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
  }, [activeView, leadsTab]);

  // Back and Forward.
  useEffect(() => {
    function handlePopState() {
      const route = routeFromPath(window.location.pathname);
      setActiveView(route.view);
      setLeadsTab(route.leadsTab);
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    // Leads opens on its usual tab next time.
    if (activeView !== "leads") setLeadsTab(null);
  }, [activeView]);

  function handleAuthenticated(user) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
    if (user.role === "ppc") setActiveView("dashboard");
    setProfileForm(createProfileForm(user));
  }

  function handleSignOut() {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
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

  // PPC users only see the dashboard and the Deal Analyzer.
  const heroView =
    ppcOnly && !["dashboard", "deal-analyzer"].includes(activeView)
      ? "deal-analyzer"
      : activeView;

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
        {/* Brand header — always visible; resizes with .main as the sidebar
            opens/closes since .main is the flex-1 sibling of .app-sidebar */}
        <div className="app-brand-header">
          <img src={logo} alt="You Win Estates" className="app-brand-logo" />
        </div>

        {/* Each page opens with its typed headline; Title Companies and
            the Invoice Generator show theirs with their own buttons. */}
        {PAGE_HEROES[heroView] && !OWN_HERO_VIEWS.has(heroView) && (
          <PageHero key={heroView} {...PAGE_HEROES[heroView]} />
        )}

        {activeView === "dashboard" ? (
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

            <Modal
              isOpen={addDealOpen}
              onClose={() => setAddDealOpen(false)}
              title="Add Property Lead"
              className="leads-add-modal"
              style={{
                width: "min(960px, 96vw)",
                maxWidth: "min(960px, 96vw)",
                height: "auto",
              }}
            >
              <Wholesale_form
                inModal
                addDeal={handleAddDeal}
                form={form}
                formError={formError}
                handleChange={handleChange}
                handleBlur={handleBlur}
                handleAddressBlur={handleAddressBlur}
                handleContractFileChange={handleContractFileChange}
                clearContractFile={clearContractFile}
              />
            </Modal>

            <Crm_filters
              filters={filters}
              states={states}
              propertyTypes={propertyTypes}
              months={months}
              years={years}
              RefreshCw={RefreshCw}
              setFilters={setFilters}
              onAddLead={() => setAddDealOpen(true)}
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
                photoStore={DEAL_PHOTO_STORE}
                currentUserId={currentUser.id}
                convertDealToRental={convertDealToRental}
                moveDealToLeads={ppcOnly ? undefined : moveDealToLeads}
              />
            </LoadingScreen>
          </>
        ) : activeView === "deal-analyzer" ? (
          <DealAnalyzer />
        ) : !ppcOnly && activeView === "leads" ? (
          <PotentialLeads
            currentUser={currentUser}
            leads={leads}
            setLeads={setLeads}
            saveLead={saveLead}
            deleteLeadById={deleteLeadById}
            saveLeadFile={saveLeadFile}
            leadPhotoStore={LEAD_PHOTO_STORE}
            updateLeadPatch={updateLeadPatch}
            fetchLeadFile={fetchLeadFile}
            deleteLeadFileById={deleteLeadFileById}
            saveDeal={saveDeal}
            deals={deals}
            setDeals={setDeals}
            setActiveView={setActiveView}
            ppcOnly={ppcOnly}
            initialTab={leadsTab}
            onTabChange={setLeadsTab}
          />
        ) : !ppcOnly && activeView === "pm-deals" ? (
          <PMDealsTab
            currentUser={currentUser}
            fetchPmDeals={fetchPmDeals}
            savePmDeal={savePmDeal}
            deletePmDealById={deletePmDealById}
            savePmDealFile={savePmDealFile}
            fetchPmDealFile={fetchPmDealFile}
            deletePmDealFileById={deletePmDealFileById}
          />
        ) : !ppcOnly && activeView === "on-market-deals" ? (
          <OnMarketDeals />
        ) : !ppcOnly && activeView === "title-companies" ? (
          <TitleCompanies
            currentUser={currentUser}
            fetchTitleCompanies={fetchTitleCompanies}
            saveTitleCompany={saveTitleCompany}
            deleteTitleCompanyById={deleteTitleCompanyById}
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
        ) : ppcOnly ? (
          <DealAnalyzer />
        ) : (
          <PotentialLeads
            currentUser={currentUser}
            leads={leads}
            setLeads={setLeads}
            saveLead={saveLead}
            deleteLeadById={deleteLeadById}
            saveLeadFile={saveLeadFile}
            leadPhotoStore={LEAD_PHOTO_STORE}
            updateLeadPatch={updateLeadPatch}
            fetchLeadFile={fetchLeadFile}
            deleteLeadFileById={deleteLeadFileById}
            saveDeal={saveDeal}
            deals={deals}
            setDeals={setDeals}
            setActiveView={setActiveView}
            ppcOnly={ppcOnly}
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
  // Reuse the same root across Vite HMR re-executions of this module —
  // calling createRoot() again on every hot reload mounts a second,
  // independent React tree into the same DOM node alongside the first.
  const root = rootElement._reactRoot ?? createRoot(rootElement);
  rootElement._reactRoot = root;
  root.render(<Wholesale />);
}

export default Wholesale;

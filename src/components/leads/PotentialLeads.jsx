import { useState, useEffect, useRef } from "react";
import {
  MapPin,
  Link2,
  Phone,
  Mail,
  Trash2,
  CheckCheck,
  ExternalLink,
  Plus,
  Tag,
  Search,
  Globe,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
} from "lucide-react";
import ClearFiltersButton from "../elements/ClearFiltersButton";
import { AccordionHeaderCell, SimpleStat } from "../elements/elements";
import { STATE_OPTIONS } from "../../constants/stateOptions";
import {
  formatPhone,
  findDuplicateByAddress,
  formatDate,
  trimFieldOnBlur,
} from "../../utils/utils";
import { createEmptyDealForm, DEAL_TYPES } from "../crm/components/crmConfig";
import LeadDetailModal from "./LeadDetailModal";
import CommercialLeadDetailModal from "./CommercialLeadDetailModal";
import { COMMERCIAL_PROPERTY_TYPES } from "./leadsConfig";
import Pagination from "../pagination/Pagination";
import {
  fetchUserStats,
  incrementPpcDeleted,
} from "../../firebase/firestoreService";
import "./Leads.css";

const ITEMS_PER_PAGE = 10;

const SOURCES = ["MLS / Zillow", "Cold Call", "Propwire", "Auction.com"];
const PPC_SOURCE_TERMS = [
  "website",
  "ppc",
  "google ad",
  "google ads",
  "adwords",
  "paid search",
  "facebook ad",
  "facebook ads",
  "meta ad",
  "meta ads",
];

function isPpcLead(lead) {
  if (lead?.ppcSource === true) return true;
  const source = String(lead?.source || "").toLowerCase();
  return PPC_SOURCE_TERMS.some((term) => source.includes(term));
}

function leadIdentityKeys(lead) {
  if (lead?.wpLeadId) return [`wp:${lead.wpLeadId}`];

  return [
    [
      lead?.sellerName,
      lead?.email,
      lead?.phone,
      lead?.address,
      lead?.dateAdded,
      lead?.notes,
    ]
      .map((value) =>
        String(value || "")
          .trim()
          .toLowerCase(),
      )
      .join("|"),
  ].filter((key) => key.replace(/\|/g, ""));
}

function leadMatchesAnyKey(lead, keys) {
  return leadIdentityKeys(lead).some((key) => keys.has(key));
}

function leadPrimaryKey(lead) {
  return leadIdentityKeys(lead)[0] || lead?.id || "";
}

function dedupePpcLeads(leads) {
  const seen = new Set();
  return leads.filter((lead) => {
    const key = leadPrimaryKey(lead);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stableWpLeadId(lead) {
  if (lead?.wpLeadId) {
    return `wp-lead-${String(lead.wpLeadId).replace(/[^A-Za-z0-9_-]/g, "-")}`;
  }

  return lead?.id || crypto.randomUUID();
}

function leadAddress(lead) {
  return (
    lead?.address ||
    lead?.propertyAddress ||
    lead?.property_address ||
    lead?.property ||
    ""
  ).trim();
}

function hasUsableAddress(address) {
  const normalized = String(address || "").trim();
  return Boolean(normalized && normalized !== "—" && normalized !== "-");
}

function createEmptyForm() {
  return {
    dealType: "Wholesale",
    address: "",
    source: "",
    agentName: "",
    agentPhone: "",
    sellerName: "",
    url: "",
    followUpDate: "",
    email: "",
    phone: "",
    onMarket: "No",
    listedPrice: "",
    rent: "",
    occupied: "No",
    offerStatus: "Not Sent",
    sellerAccepted: "No",
    offerPrice: "",
    notes: "",
  };
}

function createEmptyCommercialForm() {
  return {
    name: "",
    address: "",
    propertyType: "",
    source: "",
    sellerName: "",
    sellerEmail: "",
    state: "",
    website: "",
    phone: "",
    notes: "",
  };
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Parses "123 Main St, Dallas, TX 75201" → { address, city, state, zipCode }
function parseAddress(full) {
  const parts = full
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length >= 3) {
    const street = parts[0];
    const city = parts[1];
    const stateZipRaw = parts.slice(2).join(" ").trim();
    const [state = "", zipCode = ""] = stateZipRaw.split(/\s+/);
    return { address: street, city, state, zipCode };
  }
  if (parts.length === 2) {
    const street = parts[0];
    const [state = "", zipCode = ""] = parts[1].split(/\s+/);
    return { address: street, city: "", state, zipCode };
  }
  return { address: full, city: "", state: "", zipCode: "" };
}

function followUpStatus(dateStr) {
  if (!dateStr) return null;
  const today = todayStr();
  if (dateStr < today) return "overdue";
  if (dateStr === today) return "today";
  return "upcoming";
}

export default function PotentialLeads({
  currentUser,
  leads,
  setLeads,
  saveLead,
  deleteLeadById,
  saveLeadFile,
  fetchLeadFile,
  deleteLeadFileById,
  saveDeal,
  setDeals,
  setActiveView,
  ppcOnly = false,
}) {
  const [activeTab, setActiveTab] = useState(ppcOnly ? "ppc" : "residential");

  // ── PPC state ──────────────────────────────────────────────────────────────
  const [ppcSearch, setPpcSearch] = useState("");
  const [ppcPage, setPpcPage] = useState(1);
  const [ppcBadModal, setPpcBadModal] = useState(null); // lead being marked bad
  const [ppcBadReason, setPpcBadReason] = useState("");
  const [ppcSelectedIds, setPpcSelectedIds] = useState(new Set());
  const [ppcDeletedCount, setPpcDeletedCount] = useState(0);
  const [wpFetchedLeads, setWpFetchedLeads] = useState([]);
  const [wpSyncStatus, setWpSyncStatus] = useState("");
  const [wpSyncing, setWpSyncing] = useState(false);
  const wpAutoSyncStarted = useRef(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetchUserStats(currentUser.id)
      .then((stats) => {
        setPpcDeletedCount(stats.ppcDeletedCount || 0);
      })
      .catch((err) => {
        console.warn("[PPC stats] failed to load", err);
      });
  }, [currentUser?.id]);

  // ── Residential state ──────────────────────────────────────────────────────
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterState, setFilterState] = useState("");
  const [filterFollowUpStatus, setFilterFollowUpStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [detailLead, setDetailLead] = useState(null);

  // ── Commercial state ───────────────────────────────────────────────────────
  const [commercialForm, setCommercialForm] = useState(
    createEmptyCommercialForm,
  );
  const [commercialSaving, setCommercialSaving] = useState(false);
  const [commercialError, setCommercialError] = useState("");
  const [commercialSearch, setCommercialSearch] = useState("");
  const [commercialPage, setCommercialPage] = useState(1);
  const [commercialDetailLead, setCommercialDetailLead] = useState(null);

  // ── Split leads by type ────────────────────────────────────────────────────
  const localLeadKeys = new Set(leads.flatMap(leadIdentityKeys));
  const visibleLeads = [
    ...leads,
    ...wpFetchedLeads.filter(
      (lead) => !leadIdentityKeys(lead).some((key) => localLeadKeys.has(key)),
    ),
  ];
  const ppcLeads = dedupePpcLeads(visibleLeads.filter(isPpcLead));
  const residentialLeads = leads.filter(
    (l) => (!l.leadType || l.leadType === "residential") && !isPpcLead(l),
  );
  const commercialLeads = leads.filter((l) => l.leadType === "commercial");

  function resetPage() {
    setCurrentPage(1);
  }

  // ── Residential handlers ───────────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "address") setFormError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleAddressBlur(e) {
    trimFieldOnBlur(handleChange)(e);
    const duplicate = findDuplicateByAddress(
      residentialLeads,
      e.target.value.trim(),
    );
    if (duplicate) {
      setFormError(`"${duplicate.address}" is already in your lead list.`);
    }
  }

  function handlePhoneChange(e) {
    setForm((prev) => ({ ...prev, phone: formatPhone(e.target.value) }));
  }

  async function handleAddLead(e) {
    e.preventDefault();
    if (!form.address.trim()) return;
    const duplicate = findDuplicateByAddress(residentialLeads, form.address);
    if (duplicate) {
      setFormError(`"${duplicate.address}" is already in your lead list.`);
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const lead = {
        ...form,
        leadType: "residential",
        address: form.address.trim(),
        id: crypto.randomUUID(),
        userId: currentUser.id,
        dateAdded: todayStr(),
      };
      await saveLead(lead);
      setLeads((prev) => [lead, ...prev]);
      setForm(createEmptyForm());
    } catch {
      setFormError("Failed to save lead. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function syncWordPressLeads({ silent = false } = {}) {
    if (!currentUser?.id || wpSyncing) return;
    setWpSyncing(true);
    if (!silent) setWpSyncStatus("Syncing WordPress leads...");

    try {
      const resp = await fetch("/api/fetch-wp-leads");
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(
          data?.error || `WordPress sync failed (${resp.status})`,
        );
      }

      const existingKeys = new Set(leads.flatMap(leadIdentityKeys));
      const imported = [];
      const fetchedLeads = (data.leads || []).map((wpLead) => ({
        ...wpLead,
        id: stableWpLeadId(wpLead),
        userId: currentUser.id,
        ppcSource: true,
        source: wpLead.source || "Website",
      }));

      setWpFetchedLeads(fetchedLeads);

      for (const lead of fetchedLeads) {
        const keys = leadIdentityKeys(lead);
        if (keys.some((key) => existingKeys.has(key))) continue;

        await saveLead(lead);
        imported.push(lead);
        leadIdentityKeys(lead).forEach((key) => existingKeys.add(key));
      }

      if (imported.length) {
        setLeads((prev) => {
          const prevKeys = new Set(prev.flatMap(leadIdentityKeys));
          const freshImported = imported.filter(
            (lead) => !leadIdentityKeys(lead).some((key) => prevKeys.has(key)),
          );
          return [...freshImported, ...prev];
        });
      }

      setWpSyncStatus(
        imported.length
          ? `Showing ${fetchedLeads.length} WordPress lead${fetchedLeads.length !== 1 ? "s" : ""}. Imported ${imported.length}.`
          : `Showing ${fetchedLeads.length} WordPress lead${fetchedLeads.length !== 1 ? "s" : ""}. Local CRM is up to date.`,
      );
    } catch (err) {
      console.error("[WP sync] fetch failed", err);
      setWpSyncStatus(err.message || "Failed to sync WordPress leads.");
      if (!silent) alert(err.message || "Failed to sync WordPress leads.");
    } finally {
      setWpSyncing(false);
    }
  }

  useEffect(() => {
    if (!currentUser?.id || wpAutoSyncStarted.current) return;
    wpAutoSyncStarted.current = true;
    syncWordPressLeads({ silent: true });
  }, [currentUser?.id]);

  useEffect(() => {
    if (ppcOnly && activeTab !== "ppc") {
      setActiveTab("ppc");
    }
  }, [ppcOnly, activeTab]);

  async function syncDeleteToWP(lead) {
    if (!lead?.email && !lead?.wpLeadId) {
      console.warn("[WP sync] skipped — lead has no email or wpLeadId", lead);
      return true;
    }
    try {
      const resp = await fetch("/api/delete-wp-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: lead.email || undefined,
          wpLeadId: lead.wpLeadId || undefined,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        if (resp.status === 404) {
          console.warn("[WP sync] lead already deleted", data);
          return true;
        }
        console.error("[WP sync] failed", resp.status, data);
        alert(
          `WordPress sync failed (${resp.status}): ${data?.error || JSON.stringify(data)}`,
        );
        return false;
      } else {
        console.log("[WP sync] success", data);
        return true;
      }
    } catch (err) {
      console.error("[WP sync] network error", err);
      alert(`WordPress sync network error: ${err.message}`);
      return false;
    }
  }

  async function handleDelete(id) {
    if (ppcOnly) return;
    if (!window.confirm("Delete this lead?")) return;
    const lead = visibleLeads.find((l) => l.id === id);
    const isPpc = isPpcLead(lead);
    if (isPpc && !(await syncDeleteToWP(lead))) return;
    const deletedKeys = new Set(leadIdentityKeys(lead));
    const matchingLocalLeads = leads.filter(
      (l) => l.id === id || leadMatchesAnyKey(l, deletedKeys),
    );
    await Promise.all(
      matchingLocalLeads.map((l) => deleteLeadById(l.id).catch(() => null)),
    );
    setLeads((prev) =>
      prev.filter((l) => l.id !== id && !leadMatchesAnyKey(l, deletedKeys)),
    );
    setWpFetchedLeads((prev) =>
      prev.filter((l) => l.id !== id && !leadMatchesAnyKey(l, deletedKeys)),
    );
    setPpcSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      matchingLocalLeads.forEach((l) => next.delete(l.id));
      return next;
    });
    if (!isPpc) syncDeleteToWP(lead);
    if (isPpc) {
      await incrementPpcDeleted(currentUser.id, 1);
      setPpcDeletedCount((prev) => prev + 1);
    }
  }

  async function handleLeadSave(updated) {
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handlePpcQuality(lead, quality, reason = "") {
    if (ppcOnly) return;
    const updated = { ...lead, ppcQuality: quality, ppcBadReason: reason };
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? updated : l)));
  }

  async function handlePpcBulkDelete() {
    if (ppcOnly) return;
    if (ppcSelectedIds.size === 0) return;
    if (
      !window.confirm(
        `Delete ${ppcSelectedIds.size} selected lead${ppcSelectedIds.size !== 1 ? "s" : ""}?`,
      )
    )
      return;
    const toDelete = ppcLeads.filter((l) => ppcSelectedIds.has(l.id));
    const wpResults = await Promise.all(toDelete.map((l) => syncDeleteToWP(l)));
    const syncedLeads = toDelete.filter((_, index) => wpResults[index]);
    if (syncedLeads.length === 0) return;
    const syncedIds = new Set(syncedLeads.map((l) => l.id));
    const syncedKeys = new Set(syncedLeads.flatMap(leadIdentityKeys));
    const matchingLocalLeads = leads.filter(
      (l) => syncedIds.has(l.id) || leadMatchesAnyKey(l, syncedKeys),
    );
    await Promise.all(
      matchingLocalLeads.map((l) => deleteLeadById(l.id).catch(() => null)),
    );
    setLeads((prev) =>
      prev.filter(
        (l) => !syncedIds.has(l.id) && !leadMatchesAnyKey(l, syncedKeys),
      ),
    );
    setWpFetchedLeads((prev) =>
      prev.filter(
        (l) => !syncedIds.has(l.id) && !leadMatchesAnyKey(l, syncedKeys),
      ),
    );
    setPpcSelectedIds(new Set());
    await incrementPpcDeleted(currentUser.id, syncedLeads.length);
    setPpcDeletedCount((prev) => prev + syncedLeads.length);
  }

  async function handleAddedToCRM(leadId) {
    if (
      !window.confirm(
        "Add this lead to the CRM pipeline? It will be removed from Potential Leads.",
      )
    )
      return;

    const lead = visibleLeads.find((l) => l.id === leadId);
    if (!lead) return;

    const fullAddress = leadAddress(lead);
    if (!hasUsableAddress(fullAddress)) {
      alert(
        "This lead does not have a property address, so it was not added to CRM.",
      );
      return;
    }

    const { address, city, state, zipCode } = parseAddress(fullAddress);
    const leadKeys = new Set(leadIdentityKeys(lead));
    const matchingLocalLeads = leads.filter(
      (l) => l.id === leadId || leadMatchesAnyKey(l, leadKeys),
    );
    const deal = {
      ...createEmptyDealForm(),
      id: crypto.randomUUID(),
      userId: currentUser.id,
      address,
      city,
      state,
      zipCode,
      listingUrl: lead.url || "",
      agentName: lead.agentName || "",
      agentPhone: lead.agentPhone || "",
      onMarket:
        lead.onMarket || (lead.source === "MLS / Zillow" ? "Yes" : "No"),
      listedPrice: lead.listedPrice || "",
      sellerPhone: lead.phone || "",
      source: lead.source || "Website",
      notes: [
        lead.source ? `Source: ${lead.source}` : "Source: Website",
        lead.sellerName ? `Seller: ${lead.sellerName}` : "",
        lead.email ? `Email: ${lead.email}` : "",
        lead.phone ? `Phone: ${lead.phone}` : "",
        lead.notes || "",
      ]
        .filter(Boolean)
        .join("\n"),
    };

    await saveDeal(deal);
    if (isPpcLead(lead)) {
      await syncDeleteToWP(lead);
    }
    setDeals((prev) => [deal, ...prev]);
    await Promise.all(
      matchingLocalLeads.map((l) => deleteLeadById(l.id).catch(() => null)),
    );
    setLeads((prev) =>
      prev.filter((l) => l.id !== leadId && !leadMatchesAnyKey(l, leadKeys)),
    );
    setWpFetchedLeads((prev) =>
      prev.filter((l) => l.id !== leadId && !leadMatchesAnyKey(l, leadKeys)),
    );
    setPpcSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(leadId);
      matchingLocalLeads.forEach((l) => next.delete(l.id));
      return next;
    });
    setActiveView("dashboard");
  }

  // ── Commercial handlers ────────────────────────────────────────────────────
  function handleCommercialChange(e) {
    const { name, value } = e.target;
    if (name === "address") setCommercialError("");
    setCommercialForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleCommercialPhoneChange(e) {
    setCommercialForm((prev) => ({
      ...prev,
      phone: formatPhone(e.target.value),
    }));
  }

  async function handleAddCommercialLead(e) {
    e.preventDefault();
    if (!commercialForm.address.trim()) return;
    const duplicate = findDuplicateByAddress(
      commercialLeads,
      commercialForm.address,
    );
    if (duplicate) {
      setCommercialError(
        `"${duplicate.address}" is already in your commercial lead list.`,
      );
      return;
    }
    setCommercialSaving(true);
    setCommercialError("");
    try {
      const lead = {
        ...commercialForm,
        leadType: "commercial",
        address: commercialForm.address.trim(),
        id: crypto.randomUUID(),
        userId: currentUser.id,
        dateAdded: todayStr(),
      };
      await saveLead(lead);
      setLeads((prev) => [lead, ...prev]);
      setCommercialForm(createEmptyCommercialForm());
    } catch {
      setCommercialError("Failed to save lead. Please try again.");
    } finally {
      setCommercialSaving(false);
    }
  }

  async function handleCommercialLeadSave(updated) {
    await saveLead(updated);
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  }

  async function handleCommercialLeadDelete(id) {
    if (!window.confirm("Delete this commercial lead?")) return;
    const lead = leads.find((l) => l.id === id);
    await deleteLeadById(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setCommercialDetailLead(null);
    syncDeleteToWP(lead);
  }

  // ── Residential filtering / pagination ─────────────────────────────────────
  const minDate = todayStr();

  const filtered = residentialLeads
    .filter((l) => {
      if (search) {
        const q = search.toLowerCase();
        const matches =
          l.address.toLowerCase().includes(q) ||
          (l.phone || "").toLowerCase().includes(q) ||
          (l.agentPhone || "").toLowerCase().includes(q) ||
          (l.sellerName || "").toLowerCase().includes(q) ||
          (l.agentName || "").toLowerCase().includes(q);
        if (!matches) return false;
      }
      if (filterSource && l.source !== filterSource) return false;
      if (filterState && parseAddress(l.address).state !== filterState)
        return false;
      if (
        filterFollowUpStatus &&
        followUpStatus(l.followUpDate) !== filterFollowUpStatus
      )
        return false;
      return true;
    })
    .sort((a, b) => {
      if (!a.followUpDate) return 1;
      if (!b.followUpDate) return -1;
      return a.followUpDate.localeCompare(b.followUpDate);
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE,
  );

  const activeFilters =
    search || filterSource || filterState || filterFollowUpStatus;
  const usedSources = [
    ...new Set(residentialLeads.map((l) => l.source).filter(Boolean)),
  ];
  const usedStates = [
    ...new Set(
      residentialLeads
        .map((l) => parseAddress(l.address).state)
        .filter(Boolean),
    ),
  ].sort();

  // ── PPC filtering / pagination ─────────────────────────────────────────────
  const filteredPpc = ppcLeads.filter((l) => {
    if (!ppcSearch) return true;
    const q = ppcSearch.toLowerCase();
    return (
      (l.address || "").toLowerCase().includes(q) ||
      (l.sellerName || "").toLowerCase().includes(q) ||
      (l.email || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q)
    );
  });

  const ppcTotalPages = Math.max(
    1,
    Math.ceil(filteredPpc.length / ITEMS_PER_PAGE),
  );
  const safePpcPage = Math.min(ppcPage, ppcTotalPages);
  const paginatedPpc = filteredPpc.slice(
    (safePpcPage - 1) * ITEMS_PER_PAGE,
    safePpcPage * ITEMS_PER_PAGE,
  );

  // ── Commercial filtering / pagination ──────────────────────────────────────
  const filteredCommercial = commercialLeads.filter((l) => {
    if (!commercialSearch) return true;
    const q = commercialSearch.toLowerCase();
    return (
      l.address.toLowerCase().includes(q) ||
      (l.source || "").toLowerCase().includes(q) ||
      (l.phone || "").toLowerCase().includes(q)
    );
  });

  const commercialTotalPages = Math.max(
    1,
    Math.ceil(filteredCommercial.length / ITEMS_PER_PAGE),
  );
  const safeCommercialPage = Math.min(commercialPage, commercialTotalPages);
  const paginatedCommercial = filteredCommercial.slice(
    (safeCommercialPage - 1) * ITEMS_PER_PAGE,
    safeCommercialPage * ITEMS_PER_PAGE,
  );

  return (
    <>
      <div className="leads-stats-row" data-reveal>
        {!ppcOnly && (
          <>
            <SimpleStat
              label="Residential"
              value={residentialLeads.length}
              colorTheme="blue"
            />
            <SimpleStat
              label="Commercial"
              value={commercialLeads.length}
              colorTheme="orange"
            />
          </>
        )}
        <SimpleStat
          label="PPC Campaign"
          value={ppcLeads.length + ppcDeletedCount}
          subtitle={
            ppcLeads.length > 0 ? `${ppcLeads.length} active` : undefined
          }
          colorTheme="green"
        />
      </div>

      <div
        className="deal-tab-bar"
        style={{ padding: "0 0 1rem 0" }}
        data-reveal
      >
        {!ppcOnly && (
          <>
            <button
              type="button"
              className={`deal-tab-btn${activeTab === "residential" ? " deal-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("residential")}
            >
              Residential
            </button>
            <button
              type="button"
              className={`deal-tab-btn${activeTab === "commercial" ? " deal-tab-btn--active" : ""}`}
              onClick={() => setActiveTab("commercial")}
            >
              Commercial
            </button>
          </>
        )}
        <button
          type="button"
          className={`deal-tab-btn${activeTab === "ppc" ? " deal-tab-btn--active" : ""}`}
          onClick={() => setActiveTab("ppc")}
        >
          PPC Leads
          {ppcLeads.length > 0 && (
            <span className="deal-tab-count">{ppcLeads.length}</span>
          )}
        </button>
      </div>

      {activeTab === "residential" ? (
        <>
          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "80ms" }}
          >
            <div className="panel-header">
              <div>
                <h2>Add Residential Lead</h2>
                <p>Log a property you want to follow up on.</p>
              </div>
            </div>

            <form className="add-form leads-add-form" onSubmit={handleAddLead}>
              <div className="field">
                <span>Deal Type</span>
                <select
                  name="dealType"
                  value={form.dealType || "Wholesale"}
                  onChange={handleChange}
                  className="leads-select"
                >
                  {DEAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field leads-address-field">
                <span>
                  Property Address <span className="required-star">*</span>
                </span>
                <div className="leads-input-icon-wrap">
                  <MapPin size={15} className="leads-field-icon" />
                  <input
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    onBlur={handleAddressBlur}
                    placeholder="e.g. 123 Main St, Dallas, TX 75201"
                    required
                  />
                </div>
              </div>

              {form.dealType === "Potential Rental" ? (
                <>
                  <div className="field">
                    <span>On Market</span>
                    <select
                      name="onMarket"
                      value={form.onMarket || "No"}
                      onChange={handleChange}
                      className="leads-select"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  {form.onMarket === "Yes" ? (
                    <>
                      <div className="field">
                        <span>Listed Price</span>
                        <input
                          type="text"
                          name="listedPrice"
                          value={form.listedPrice || ""}
                          onChange={handleChange}
                          placeholder="$0"
                        />
                      </div>
                      <div className="field">
                        <span>Agent Name</span>
                        <input
                          type="text"
                          name="agentName"
                          value={form.agentName || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              agentName: e.target.value.replace(
                                /[^a-zA-Z\s'.]/g,
                                "",
                              ),
                            }))
                          }
                          onBlur={trimFieldOnBlur(handleChange)}
                          placeholder="Listing agent's name"
                        />
                      </div>
                      <div className="field">
                        <span>Agent Phone</span>
                        <div className="leads-input-icon-wrap">
                          <Phone size={15} className="leads-field-icon" />
                          <input
                            type="tel"
                            name="agentPhone"
                            value={form.agentPhone || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                agentPhone: formatPhone(e.target.value),
                              }))
                            }
                            placeholder="555-000-0000"
                            maxLength={12}
                          />
                        </div>
                      </div>
                      <div className="field">
                        <span>Listing URL</span>
                        <div className="leads-input-icon-wrap">
                          <Link2 size={15} className="leads-field-icon" />
                          <input
                            type="url"
                            name="url"
                            value={form.url}
                            onChange={handleChange}
                            onBlur={trimFieldOnBlur(handleChange)}
                            placeholder="https://zillow.com/…"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="field">
                      <span>Seller Name</span>
                      <input
                        type="text"
                        name="sellerName"
                        value={form.sellerName || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            sellerName: e.target.value.replace(
                              /[^a-zA-Z\s'.]/g,
                              "",
                            ),
                          }))
                        }
                        onBlur={trimFieldOnBlur(handleChange)}
                        placeholder="Seller's name"
                      />
                    </div>
                  )}

                  <div className="field">
                    <span>Source</span>
                    <div className="leads-input-icon-wrap">
                      <Tag size={15} className="leads-field-icon" />
                      <select
                        name="source"
                        value={form.source}
                        onChange={handleChange}
                        className="leads-select"
                      >
                        <option value="">Select source…</option>
                        {SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="field">
                    <span>Rent</span>
                    <input
                      type="text"
                      name="rent"
                      value={form.rent || ""}
                      onChange={handleChange}
                      placeholder="$0"
                    />
                  </div>

                  <div className="field">
                    <span>Occupied</span>
                    <select
                      name="occupied"
                      value={form.occupied || "No"}
                      onChange={handleChange}
                      className="leads-select"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>

                  <div className="field">
                    <span>Offer Status</span>
                    <select
                      name="offerStatus"
                      value={form.offerStatus || "Not Sent"}
                      onChange={handleChange}
                      className="leads-select"
                    >
                      <option value="Not Sent">Not Sent</option>
                      <option value="Offer Sent">Offer Sent</option>
                    </select>
                  </div>

                  {form.offerStatus !== "Not Sent" && (
                    <>
                      <div className="field">
                        <span>Offer Price</span>
                        <input
                          type="text"
                          name="offerPrice"
                          value={form.offerPrice || ""}
                          onChange={handleChange}
                          placeholder="$0"
                        />
                      </div>
                      <div className="field">
                        <span>Accepted</span>
                        <select
                          name="sellerAccepted"
                          value={form.sellerAccepted || "No"}
                          onChange={handleChange}
                          className="leads-select"
                        >
                          <option value="No">No</option>
                          <option value="Waiting">Waiting</option>
                          <option value="Yes">Yes</option>
                        </select>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="field">
                    <span>Source</span>
                    <div className="leads-input-icon-wrap">
                      <Tag size={15} className="leads-field-icon" />
                      <select
                        name="source"
                        value={form.source}
                        onChange={handleChange}
                        className="leads-select"
                      >
                        <option value="">Select source…</option>
                        {SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {form.source === "MLS / Zillow" && (
                    <>
                      <div className="field">
                        <span>Agent Name</span>
                        <input
                          type="text"
                          name="agentName"
                          value={form.agentName || ""}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              agentName: e.target.value.replace(
                                /[^a-zA-Z\s'.]/g,
                                "",
                              ),
                            }))
                          }
                          onBlur={trimFieldOnBlur(handleChange)}
                          placeholder="Listing agent's name"
                        />
                      </div>
                      <div className="field">
                        <span>Agent Phone</span>
                        <div className="leads-input-icon-wrap">
                          <Phone size={15} className="leads-field-icon" />
                          <input
                            type="tel"
                            name="agentPhone"
                            value={form.agentPhone || ""}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                agentPhone: formatPhone(e.target.value),
                              }))
                            }
                            placeholder="555-000-0000"
                            maxLength={12}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {form.source === "Cold Call" && (
                    <div className="field">
                      <span>Seller Name</span>
                      <input
                        type="text"
                        name="sellerName"
                        value={form.sellerName || ""}
                        onChange={(e) =>
                          setForm((prev) => ({
                            ...prev,
                            sellerName: e.target.value.replace(
                              /[^a-zA-Z\s'.]/g,
                              "",
                            ),
                          }))
                        }
                        onBlur={trimFieldOnBlur(handleChange)}
                        placeholder="Seller's name"
                      />
                    </div>
                  )}

                  {form.source !== "Cold Call" && (
                    <div className="field">
                      <span>Listing URL</span>
                      <div className="leads-input-icon-wrap">
                        <Link2 size={15} className="leads-field-icon" />
                        <input
                          type="url"
                          name="url"
                          value={form.url}
                          onChange={handleChange}
                          onBlur={trimFieldOnBlur(handleChange)}
                          placeholder="https://zillow.com/…"
                        />
                      </div>
                    </div>
                  )}

                  <div className="field">
                    <span>
                      Follow-Up Date <span className="required-star">*</span>
                    </span>
                    <input
                      type="date"
                      name="followUpDate"
                      value={form.followUpDate}
                      onChange={handleChange}
                      min={minDate}
                      required
                    />
                  </div>

                  {form.source !== "MLS / Zillow" && (
                    <>
                      <div className="field">
                        <span>Email</span>
                        <div className="leads-input-icon-wrap">
                          <Mail size={15} className="leads-field-icon" />
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            onBlur={trimFieldOnBlur(handleChange)}
                            placeholder="seller@email.com"
                          />
                        </div>
                      </div>

                      <div className="field">
                        <span>Phone</span>
                        <div className="leads-input-icon-wrap">
                          <Phone size={15} className="leads-field-icon" />
                          <input
                            type="tel"
                            name="phone"
                            value={form.phone}
                            onChange={handlePhoneChange}
                            placeholder="555-000-0000"
                            maxLength={12}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}

              <div className="field leads-notes-field">
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Any initial notes about this lead…"
                  rows={3}
                />
              </div>

              {formError && (
                <p className="leads-form-error col-span-full">{formError}</p>
              )}

              <button
                className="primary-btn form-btn"
                type="submit"
                disabled={
                  !form.address.trim() ||
                  (form.dealType !== "Potential Rental" &&
                    !form.followUpDate) ||
                  !!formError ||
                  saving
                }
              >
                <Plus size={15} />
                {saving ? "Saving…" : "Add Lead"}
              </button>
            </form>
          </section>

          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "140ms" }}
          >
            <div className="panel-header leads-list-header">
              <div>
                <h2>Residential Lead List</h2>
                <p>
                  {residentialLeads.length === 0
                    ? "No leads yet."
                    : `${filtered.length} of ${residentialLeads.length} lead${residentialLeads.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="leads-filters">
                <div className="leads-search-wrap">
                  <Search size={13} className="leads-search-icon" />
                  <input
                    type="text"
                    placeholder="Search address, name or phone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="leads-search-input"
                  />
                </div>
                <select
                  value={filterSource}
                  onChange={(e) => {
                    setFilterSource(e.target.value);
                    resetPage();
                  }}
                  className="leads-filter-select"
                >
                  <option value="">All sources</option>
                  {usedSources.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={filterState}
                  onChange={(e) => {
                    setFilterState(e.target.value);
                    resetPage();
                  }}
                  className="leads-filter-select"
                >
                  <option value="">All states</option>
                  {usedStates.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <div
                  className="leads-status-filter"
                  role="group"
                  aria-label="Filter by follow-up status"
                >
                  {[
                    { status: "overdue", label: "Overdue" },
                    { status: "today", label: "Today" },
                    { status: "upcoming", label: "Upcoming" },
                  ].map(({ status, label }) => (
                    <button
                      key={status}
                      type="button"
                      title={label}
                      aria-pressed={filterFollowUpStatus === status}
                      className={`leads-status-dot leads-status-dot-${status}${
                        filterFollowUpStatus === status
                          ? " leads-status-dot--active"
                          : ""
                      }`}
                      onClick={() => {
                        setFilterFollowUpStatus((prev) =>
                          prev === status ? "" : status,
                        );
                        resetPage();
                      }}
                    />
                  ))}
                </div>
                <ClearFiltersButton
                  onClear={() => {
                    setSearch("");
                    setFilterSource("");
                    setFilterState("");
                    setFilterFollowUpStatus("");
                    resetPage();
                  }}
                  hasActiveFilters={Boolean(activeFilters)}
                  className="leads-clear-filters"
                  iconSize={13}
                />
              </div>
            </div>

            {residentialLeads.length === 0 ? (
              <div className="leads-empty">
                <p>Add your first lead above to get started.</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="leads-empty">
                <p>No leads match the current filters.</p>
              </div>
            ) : (
              <>
                <div
                  className="table-wrap leads-table-wrap acc-card-container"
                  style={{ overflowX: "auto" }}
                >
                  <table className="compact-table leads-table acc-card">
                    <thead>
                      <tr>
                        {!ppcOnly && <th></th>}
                        <th>Address</th>
                        <th>Source</th>
                        <th>Seller</th>
                        <th>Agent</th>
                        <th>Follow-Up</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Notes</th>
                        <th>Added</th>
                        <th>MLS Link</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.map((lead) => {
                        const status = followUpStatus(lead.followUpDate);
                        return (
                          <tr
                            key={lead.id}
                            className="clickable-row"
                            onClick={() => setDetailLead(lead)}
                          >
                            <td
                              className="acc-col-action-mobile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="leads-delete-btn acc-delete-btn"
                                title="Delete lead"
                                onClick={() => handleDelete(lead.id)}
                              >
                                <Trash2 size={14} />
                                <span className="acc-delete-label">Delete</span>
                              </button>
                            </td>
                            <AccordionHeaderCell
                              id={lead.id}
                              label="Address"
                              value={lead.address}
                              className="leads-address-cell"
                            />
                            <td data-label="Source">
                              {lead.source ? (
                                <span className="leads-source-badge">
                                  {lead.source}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td data-label="Seller">
                              {lead.sellerName || "—"}
                            </td>
                            <td className="acc-col-block" data-label="Agent">
                              {lead.agentName || lead.agentPhone ? (
                                <div className="leads-agent-cell">
                                  {lead.agentName && (
                                    <span>{lead.agentName}</span>
                                  )}
                                  {lead.agentPhone && (
                                    <a
                                      href={`tel:${lead.agentPhone}`}
                                      className="leads-contact-link"
                                    >
                                      {lead.agentPhone}
                                    </a>
                                  )}
                                </div>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td data-label="Follow-Up">
                              {lead.followUpDate ? (
                                <span
                                  className={`leads-followup-badge leads-followup-${status}`}
                                >
                                  {formatDate(lead.followUpDate)}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td data-label="Email">
                              {lead.source !== "MLS / Zillow" ? (
                                lead.email ? (
                                  <a
                                    href={`mailto:${lead.email}`}
                                    className="leads-contact-link"
                                  >
                                    {lead.email}
                                  </a>
                                ) : (
                                  "—"
                                )
                              ) : (
                                "—"
                              )}
                            </td>
                            <td data-label="Phone">
                              {lead.source !== "MLS / Zillow" ? (
                                lead.phone ? (
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="leads-contact-link"
                                  >
                                    {lead.phone}
                                  </a>
                                ) : (
                                  "—"
                                )
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="leads-notes-cell" data-label="Notes">
                              {lead.notes ? (
                                <span
                                  className="leads-notes-preview"
                                  title={lead.notes}
                                >
                                  {lead.notes}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="leads-date-cell" data-label="Added">
                              {formatDate(lead.dateAdded)}
                            </td>
                            <td
                              data-label="MLS Link"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.url ? (
                                <a
                                  href={lead.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="leads-mls-link"
                                  title={lead.url}
                                >
                                  <ExternalLink size={12} />
                                  {lead.source === "MLS / Zillow"
                                    ? "MLS"
                                    : "Link"}
                                </a>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td
                              className="acc-col-action-mobile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="leads-crm-btn"
                                title="Add to CRM pipeline"
                                onClick={() => handleAddedToCRM(lead.id)}
                              >
                                <CheckCheck size={14} />
                                CRM
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={safePage}
                  totalPages={totalPages}
                  setCurrentPage={setCurrentPage}
                >
                  <span className="pagination-summary">
                    {filtered.length === 0
                      ? "No leads"
                      : `${(safePage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safePage * ITEMS_PER_PAGE, filtered.length)} of ${filtered.length} lead${filtered.length !== 1 ? "s" : ""}`}
                  </span>
                </Pagination>
              </>
            )}
          </section>
        </>
      ) : activeTab === "commercial" ? (
        <>
          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "80ms" }}
          >
            <div className="panel-header">
              <div>
                <h2>Add Commercial Lead</h2>
                <p>Log a commercial property you want to track.</p>
              </div>
            </div>

            <form
              className="add-form leads-add-form"
              onSubmit={handleAddCommercialLead}
            >
              <div className="field">
                <span>Name</span>
                <input
                  type="text"
                  name="name"
                  value={commercialForm.name}
                  onChange={handleCommercialChange}
                  onBlur={trimFieldOnBlur(handleCommercialChange)}
                  placeholder="e.g. Office Building, Retail Strip…"
                />
              </div>

              <div className="field leads-address-field">
                <span>
                  Property Address <span className="required-star">*</span>
                </span>
                <div className="leads-input-icon-wrap">
                  <MapPin size={15} className="leads-field-icon" />
                  <input
                    type="text"
                    name="address"
                    value={commercialForm.address}
                    onChange={handleCommercialChange}
                    onBlur={(e) => {
                      trimFieldOnBlur(handleCommercialChange)(e);
                      const dup = findDuplicateByAddress(
                        commercialLeads,
                        e.target.value.trim(),
                      );
                      if (dup) {
                        setCommercialError(
                          `"${dup.address}" is already in your commercial lead list.`,
                        );
                      }
                    }}
                    placeholder="e.g. 500 Commerce St, Dallas, TX 75201"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <span>Property Type</span>
                <select
                  name="propertyType"
                  value={commercialForm.propertyType}
                  onChange={handleCommercialChange}
                  className="leads-select"
                >
                  <option value="">Select type…</option>
                  {COMMERCIAL_PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Source</span>
                <div className="leads-input-icon-wrap">
                  <Tag size={15} className="leads-field-icon" />
                  <select
                    name="source"
                    value={commercialForm.source}
                    onChange={handleCommercialChange}
                    className="leads-select"
                  >
                    <option value="">Select source…</option>
                    {SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {commercialForm.source === "Cold Call" && (
                <>
                  <div className="field">
                    <span>Seller Name</span>
                    <input
                      type="text"
                      name="sellerName"
                      value={commercialForm.sellerName}
                      onChange={(e) =>
                        setCommercialForm((prev) => ({
                          ...prev,
                          sellerName: e.target.value.replace(
                            /[^a-zA-Z\s'.]/g,
                            "",
                          ),
                        }))
                      }
                      onBlur={trimFieldOnBlur(handleCommercialChange)}
                      placeholder="Seller's name"
                    />
                  </div>
                  <div className="field">
                    <span>Seller Email</span>
                    <input
                      type="email"
                      name="sellerEmail"
                      value={commercialForm.sellerEmail}
                      onChange={handleCommercialChange}
                      onBlur={trimFieldOnBlur(handleCommercialChange)}
                      placeholder="seller@email.com"
                    />
                  </div>
                </>
              )}

              <div className="field">
                <span>State</span>
                <select
                  name="state"
                  value={commercialForm.state}
                  onChange={handleCommercialChange}
                  className="leads-select"
                >
                  <option value="">Select state…</option>
                  {STATE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Website</span>
                <div className="leads-input-icon-wrap">
                  <Globe size={15} className="leads-field-icon" />
                  <input
                    type="url"
                    name="website"
                    value={commercialForm.website}
                    onChange={handleCommercialChange}
                    onBlur={trimFieldOnBlur(handleCommercialChange)}
                    placeholder="https://loopnet.com/…"
                  />
                </div>
              </div>

              <div className="field">
                <span>Phone</span>
                <div className="leads-input-icon-wrap">
                  <Phone size={15} className="leads-field-icon" />
                  <input
                    type="tel"
                    name="phone"
                    value={commercialForm.phone}
                    onChange={handleCommercialPhoneChange}
                    placeholder="555-000-0000"
                    maxLength={12}
                  />
                </div>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Notes</span>
                <textarea
                  name="notes"
                  value={commercialForm.notes}
                  onChange={handleCommercialChange}
                  placeholder="Add notes about this lead…"
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>

              {commercialError && (
                <p className="leads-form-error col-span-full">
                  {commercialError}
                </p>
              )}

              <button
                className="primary-btn form-btn"
                type="submit"
                disabled={!commercialForm.address.trim() || commercialSaving}
              >
                <Plus size={15} />
                {commercialSaving ? "Saving…" : "Add Lead"}
              </button>
            </form>
          </section>

          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "140ms" }}
          >
            <div className="panel-header leads-list-header">
              <div>
                <h2>Commercial Lead List</h2>
                <p>
                  {commercialLeads.length === 0
                    ? "No commercial leads yet."
                    : `${filteredCommercial.length} of ${commercialLeads.length} lead${commercialLeads.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="leads-filters">
                <button
                  type="button"
                  className="leads-sync-btn"
                  onClick={() => syncWordPressLeads()}
                  disabled={wpSyncing}
                >
                  <RefreshCw size={13} />
                  {wpSyncing ? "Syncing..." : "Sync WordPress"}
                </button>
                <div className="leads-search-wrap">
                  <Search size={13} className="leads-search-icon" />
                  <input
                    type="text"
                    placeholder="Search address, source or phone…"
                    value={commercialSearch}
                    onChange={(e) => {
                      setCommercialSearch(e.target.value);
                      setCommercialPage(1);
                    }}
                    className="leads-search-input"
                  />
                </div>
                <ClearFiltersButton
                  onClear={() => {
                    setCommercialSearch("");
                    setCommercialPage(1);
                  }}
                  hasActiveFilters={Boolean(commercialSearch)}
                  className="leads-clear-filters"
                  iconSize={13}
                />
              </div>
            </div>

            {commercialLeads.length === 0 ? (
              <div className="leads-empty">
                <p>Add your first commercial lead above to get started.</p>
              </div>
            ) : filteredCommercial.length === 0 ? (
              <div className="leads-empty">
                <p>No leads match the current search.</p>
              </div>
            ) : (
              <>
                <div
                  className="table-wrap leads-table-wrap acc-card-container"
                  style={{ overflowX: "auto" }}
                >
                  <table className="compact-table leads-table acc-card">
                    <thead>
                      <tr>
                        <th></th>
                        <th>Name</th>
                        <th>Address</th>
                        <th>State</th>
                        <th>Source</th>
                        <th>Website</th>
                        <th>Phone</th>
                        <th>Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedCommercial.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={() => setCommercialDetailLead(lead)}
                          style={{ cursor: "pointer" }}
                        >
                          <td
                            className="acc-col-action-mobile"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              className="leads-delete-btn acc-delete-btn"
                              title="Delete lead"
                              onClick={() => handleDelete(lead.id)}
                            >
                              <Trash2 size={14} />
                              <span className="acc-delete-label">Delete</span>
                            </button>
                          </td>
                          <AccordionHeaderCell
                            id={lead.id}
                            label="Name"
                            value={lead.name || "—"}
                          />
                          <td
                            className="leads-address-cell"
                            data-label="Address"
                          >
                            {lead.address}
                          </td>
                          <td data-label="State">{lead.state || "—"}</td>
                          <td data-label="Source">
                            {lead.source ? (
                              <span className="leads-source-badge">
                                {lead.source}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td data-label="Website">
                            {lead.website ? (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="leads-mls-link"
                                title={lead.website}
                              >
                                <Globe size={12} />
                                Site
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td data-label="Phone">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="leads-contact-link"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="leads-date-cell" data-label="Added">
                            {formatDate(lead.dateAdded)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={safeCommercialPage}
                  totalPages={commercialTotalPages}
                  setCurrentPage={setCommercialPage}
                >
                  <span className="pagination-summary">
                    {filteredCommercial.length === 0
                      ? "No leads"
                      : `${(safeCommercialPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safeCommercialPage * ITEMS_PER_PAGE, filteredCommercial.length)} of ${filteredCommercial.length} lead${filteredCommercial.length !== 1 ? "s" : ""}`}
                  </span>
                </Pagination>
              </>
            )}
          </section>
        </>
      ) : activeTab === "ppc" ? (
        <>
          <section
            className="panel"
            data-reveal="left"
            style={{ "--reveal-delay": "80ms" }}
          >
            <div className="panel-header leads-list-header">
              <div>
                <h2>PPC Leads</h2>
                <p>
                  {ppcLeads.length === 0
                    ? "No PPC leads yet."
                    : `${filteredPpc.length} of ${ppcLeads.length} lead${ppcLeads.length !== 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="leads-filters">
                <div className="leads-search-wrap">
                  <Search size={13} className="leads-search-icon" />
                  <input
                    type="text"
                    placeholder="Search name, email, phone or address…"
                    value={ppcSearch}
                    onChange={(e) => {
                      setPpcSearch(e.target.value);
                      setPpcPage(1);
                    }}
                    className="leads-search-input"
                  />
                </div>
                <ClearFiltersButton
                  onClear={() => {
                    setPpcSearch("");
                    setPpcPage(1);
                  }}
                  hasActiveFilters={Boolean(ppcSearch)}
                  className="leads-clear-filters"
                  iconSize={13}
                />
                {!ppcOnly && ppcSelectedIds.size > 0 && (
                  <button
                    className="leads-bulk-delete-btn"
                    onClick={handlePpcBulkDelete}
                  >
                    <Trash2 size={13} />
                    Delete ({ppcSelectedIds.size})
                  </button>
                )}
              </div>
            </div>
            {wpSyncStatus && (
              <p className="leads-sync-status">{wpSyncStatus}</p>
            )}

            {ppcLeads.length === 0 ? (
              <div className="leads-empty">
                <p>
                  Leads submitted through the website form will appear here.
                </p>
              </div>
            ) : filteredPpc.length === 0 ? (
              <div className="leads-empty">
                <p>No leads match the current search.</p>
              </div>
            ) : (
              <>
                <div
                  className="table-wrap leads-table-wrap acc-card-container"
                  style={{ overflowX: "auto" }}
                >
                  <table className="compact-table leads-table acc-card">
                    <thead>
                      <tr>
                        {!ppcOnly && (
                          <>
                            <th className="buyer-checkbox-cell">
                              <input
                                type="checkbox"
                                className="buyer-checkbox"
                                checked={
                                  paginatedPpc.length > 0 &&
                                  paginatedPpc.every((l) =>
                                    ppcSelectedIds.has(l.id),
                                  )
                                }
                                onChange={(e) => {
                                  setPpcSelectedIds((prev) => {
                                    const next = new Set(prev);
                                    paginatedPpc.forEach((l) =>
                                      e.target.checked
                                        ? next.add(l.id)
                                        : next.delete(l.id),
                                    );
                                    return next;
                                  });
                                }}
                              />
                            </th>
                            <th></th>
                          </>
                        )}
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Address</th>
                        <th>Notes</th>
                        <th>Added</th>
                        {!ppcOnly && <th>Quality</th>}
                        {!ppcOnly && <th></th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedPpc.map((lead) => (
                        <tr
                          key={lead.id}
                          onClick={
                            ppcOnly ? undefined : () => setDetailLead(lead)
                          }
                          className={`${ppcOnly ? "" : "clickable-row"}${lead.ppcQuality === "bad" ? " ppc-row-bad" : lead.ppcQuality === "good" ? " ppc-row-good" : ""}`}
                        >
                          {!ppcOnly && (
                            <>
                              <td
                                className="buyer-checkbox-cell acc-col-hide-mobile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  className="buyer-checkbox"
                                  checked={ppcSelectedIds.has(lead.id)}
                                  onChange={() =>
                                    setPpcSelectedIds((prev) => {
                                      const next = new Set(prev);
                                      next.has(lead.id)
                                        ? next.delete(lead.id)
                                        : next.add(lead.id);
                                      return next;
                                    })
                                  }
                                />
                              </td>
                              <td
                                className="acc-col-action-mobile"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  className="leads-delete-btn acc-delete-btn"
                                  title="Delete lead"
                                  onClick={() => handleDelete(lead.id)}
                                >
                                  <Trash2 size={14} />
                                  <span className="acc-delete-label">
                                    Delete
                                  </span>
                                </button>
                              </td>
                            </>
                          )}
                          <AccordionHeaderCell
                            id={lead.id}
                            label="Name"
                            value={lead.sellerName || "—"}
                          />
                          <td data-label="Email">
                            {lead.email ? (
                              <a
                                href={`mailto:${lead.email}`}
                                className="leads-contact-link"
                              >
                                {lead.email}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td data-label="Phone">
                            {lead.phone ? (
                              <a
                                href={`tel:${lead.phone}`}
                                className="leads-contact-link"
                              >
                                {lead.phone}
                              </a>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td
                            className="leads-address-cell"
                            data-label="Address"
                          >
                            {lead.address || "—"}
                          </td>
                          <td className="leads-notes-cell" data-label="Notes">
                            {lead.notes ? (
                              <span
                                className="leads-notes-preview"
                                title={lead.notes}
                              >
                                {lead.notes}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="leads-date-cell" data-label="Added">
                            {formatDate(lead.dateAdded)}
                          </td>
                          {!ppcOnly && (
                            <td
                              onClick={(e) => e.stopPropagation()}
                              className="ppc-quality-cell acc-col-action-mobile"
                            >
                              <div className="ppc-quality-btns">
                                <button
                                  className={`ppc-quality-btn ppc-quality-good${lead.ppcQuality === "good" ? " ppc-quality-active" : ""}`}
                                  title="Mark as good lead"
                                  disabled={lead.ppcQuality === "good"}
                                  onClick={() => handlePpcQuality(lead, "good")}
                                >
                                  <ThumbsUp size={13} />
                                </button>
                                <button
                                  className={`ppc-quality-btn ppc-quality-bad${lead.ppcQuality === "bad" ? " ppc-quality-active" : ""}`}
                                  title="Mark as bad lead"
                                  disabled={lead.ppcQuality === "bad"}
                                  onClick={() => {
                                    setPpcBadModal(lead);
                                    setPpcBadReason(lead.ppcBadReason || "");
                                  }}
                                >
                                  <ThumbsDown size={13} />
                                </button>
                              </div>
                            </td>
                          )}
                          {!ppcOnly && (
                            <td
                              className="acc-col-action-mobile"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                className="leads-crm-btn"
                                title="Add to CRM pipeline"
                                onClick={() => handleAddedToCRM(lead.id)}
                              >
                                <CheckCheck size={14} />
                                CRM
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Pagination
                  currentPage={safePpcPage}
                  totalPages={ppcTotalPages}
                  setCurrentPage={setPpcPage}
                >
                  <span className="pagination-summary">
                    {filteredPpc.length === 0
                      ? "No leads"
                      : `${(safePpcPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(safePpcPage * ITEMS_PER_PAGE, filteredPpc.length)} of ${filteredPpc.length} lead${filteredPpc.length !== 1 ? "s" : ""}`}
                  </span>
                </Pagination>
              </>
            )}
          </section>

          {ppcBadModal && (
            <div
              className="ppc-bad-overlay"
              onClick={() => setPpcBadModal(null)}
            >
              <div
                className="ppc-bad-popup"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="ppc-bad-popup-title">
                  <ThumbsDown size={15} /> Mark Lead as Bad
                </h3>
                <p className="ppc-bad-popup-name">
                  {ppcBadModal.sellerName || "This lead"}
                </p>
                <label className="ppc-bad-popup-label">
                  Why is this lead bad?{" "}
                  <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                    (optional)
                  </span>
                </label>
                <textarea
                  className="ppc-bad-popup-textarea"
                  placeholder="e.g. Not motivated, wrong price range, unreachable…"
                  rows={4}
                  value={ppcBadReason}
                  onChange={(e) => setPpcBadReason(e.target.value)}
                  autoFocus
                />
                <div className="ppc-bad-popup-actions">
                  <button
                    className="secondary-btn"
                    onClick={() => setPpcBadModal(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="danger-btn ppc-bad-confirm-btn"
                    onClick={() => {
                      handlePpcQuality(ppcBadModal, "bad", ppcBadReason);
                      setPpcBadModal(null);
                    }}
                  >
                    Confirm Bad Lead
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : null}

      {!ppcOnly && (
        <LeadDetailModal
          isOpen={!!detailLead}
          onClose={() => setDetailLead(null)}
          lead={detailLead}
          onSave={handleLeadSave}
        />
      )}
      <CommercialLeadDetailModal
        isOpen={!!commercialDetailLead}
        onClose={() => setCommercialDetailLead(null)}
        lead={commercialDetailLead}
        onSave={handleCommercialLeadSave}
        onDelete={
          commercialDetailLead
            ? () => handleCommercialLeadDelete(commercialDetailLead.id)
            : undefined
        }
      />
    </>
  );
}

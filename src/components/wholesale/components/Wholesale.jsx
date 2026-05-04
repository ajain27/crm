import { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { RefreshCw, Moon, Sun } from "lucide-react";
import "../../../css/styles.css";
import {
  fetchDeals,
  fetchBuyers,
  saveDeal,
  saveBuyer,
  deleteDealById,
} from "../../../firebase/firestoreService";
import Wholesale_filters from "./Wholesale_filters";
import Wholesale_form from "./wholesale_form";
import Wholesale_data from "./Wholesale_data";
import Buyers from "../../buyers/components/Buyers";
import Sidebar from "../../sidebar/Sidebar";
import StatsGrid from "../../stats/StatsGrid";
import LoadingScreen from "../../loader/LoadingScreen";

const defaultFilters = {
  state: "All",
  offerStatus: "All",
  sellerAccepted: "All",
  assigned: "All",
  search: "",
  closed: "All",
  offerMonth: "All",
  closedMonth: "All",
  year: "All",
};

const emptyForm = {
  address: "",
  city: "",
  zipCode: "",
  state: "",
  propertyType: "Single Family",
  onMarket: "No",
  listedPrice: "",
  arv: "",
  rehabCost: "",
  desiredProfit: "",
  mao: "",
  offerStatus: "Not Sent",
  offerDate: "",
  sellerAccepted: "No",
  contractPrice: "",
  assigned: "No",
  assignedPrice: "",
  buyerName: "",
  buyerEmail: "",
  notes: "",
  closed: "No",
  closedDate: "",
  closedInMonth: "",
};

function Wholesale() {
  const [theme, setTheme] = useState(
    () => localStorage.getItem("crmTheme") || "light",
  );
  const [activeView, setActiveView] = useState("dashboard");

  useEffect(() => {
    localStorage.setItem("crmTheme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState(defaultFilters);

  const persist = function persist(nextDeals) {
    setDeals(nextDeals);
  };

  async function loadDeals() {
    try {
      setIsLoading(true);
      setErrorMessage("");
      const data = await fetchDeals();
      setDeals(data);
    } catch (error) {
      console.error("Failed to load deals", error);
      setErrorMessage(
        "Unable to load deals. Check your Firebase connection and Firestore rules.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDeals();
  }, []);

  function handleChange(event) {
    const { name, value } = event.target;

    if (name === "city" && /\d/.test(value)) return;
    if (name === "zipCode" && /[^0-9]/.test(value)) return;
    if (name === "state" && /[^a-zA-Z]/.test(value)) return;

    if (name === "closed" && value === "Yes") {
      const isReady = form.sellerAccepted === "Yes" && form.assigned === "Yes";

      if (!isReady) {
        alert(
          "Cannot close: Offer must be 'Accepted', and 'Assigned' must be 'Yes'.",
        );
        return; // Block the change
      }
    }

    if (name === "closed") {
      setForm((prev) => ({
        ...prev,
        closed: value,
        ...(value === "No" ? { closedDate: "", closedInMonth: "" } : {}),
      }));
      return;
    }

    if (name === "offerStatus") {
      setForm((prev) => ({
        ...prev,
        offerStatus: value,
        ...(value === "Not Sent"
          ? {
              offerDate: "",
              sellerAccepted: "No",
              contractPrice: "",
              assigned: "No",
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : {}),
      }));
      return;
    }

    if (name === "onMarket") {
      setForm((prev) => ({
        ...prev,
        onMarket: value,
        ...(value !== "Yes" ? { listedPrice: "" } : {}),
      }));
      return;
    }

    if (name === "sellerAccepted") {
      setForm((prev) => ({
        ...prev,
        sellerAccepted: value,
        ...(value !== "Yes"
          ? {
              assigned: "No",
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : {}),
      }));
      return;
    }

    if (name === "assigned") {
      setForm((prev) => ({
        ...prev,
        assigned: value,
        ...(value !== "Yes"
          ? {
              assignedPrice: "",
              buyerName: "",
              buyerEmail: "",
              closed: "No",
              closedDate: "",
              closedInMonth: "",
            }
          : {}),
      }));
      return;
    }

    const currencyFields = [
      "arv",
      "listedPrice",
      "rehabCost",
      "desiredProfit",
      "mao",
      "contractPrice",
      "assignedPrice",
    ];
    if (currencyFields.includes(name)) {
      const cleaned = value.replace(/[^0-9$,]/g, "");
      setForm((prev) => ({ ...prev, [name]: cleaned }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleBlur(event) {
    const { name, value } = event.target;
    const currencyFields = [
      "arv",
      "listedPrice",
      "rehabCost",
      "desiredProfit",
      "mao",
      "contractPrice",
      "assignedPrice",
    ];
    if (currencyFields.includes(name) && value) {
      const numericValue = value.replace(/[^0-9]/g, "");
      if (numericValue) {
        const numVal = parseInt(numericValue, 10);

        const parseNumber = (val) =>
          Number(String(val || "0").replace(/[^0-9]/g, ""));
        const currentVals = {
          arv: parseNumber(form.arv),
          rehabCost: parseNumber(form.rehabCost),
          mao: parseNumber(form.mao),
          contractPrice: parseNumber(form.contractPrice),
          assignedPrice: parseNumber(form.assignedPrice),
        };
        currentVals[name] = numVal;

        // Validations
        if (currentVals.arv > 0) {
          if (currentVals.rehabCost > currentVals.arv) {
            alert("Rehab cost cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (currentVals.mao > currentVals.arv) {
            alert("MAO cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (currentVals.contractPrice > currentVals.arv) {
            alert("Contract price cannot be more than ARV.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (currentVals.mao > 0 && currentVals.rehabCost > currentVals.mao) {
            alert("Rehab cost cannot be more than MAO.");
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
          if (
            currentVals.contractPrice > 0 &&
            currentVals.assignedPrice > 0 &&
            currentVals.assignedPrice < currentVals.contractPrice
          ) {
            alert(
              "Assigned price needs to be more than or equal to contract price.",
            );
            setForm((prev) => ({ ...prev, [name]: "" }));
            return;
          }
        }

        const formatted = "$" + numVal.toLocaleString("en-US");
        setForm((prev) => ({ ...prev, [name]: formatted }));
      }
    }
  }

  function checkDuplicateAddress(address) {
    if (!address.trim()) return;

    const existingDeal = deals.find(
      (deal) => deal.address.toLowerCase() === address.trim().toLowerCase(),
    );
    if (existingDeal) {
      alert("A property with this address already exists.");
      // Filter to show only the existing deal
      setFilters((prevFilters) => ({
        ...prevFilters,
        search: existingDeal.address,
      }));
      // Scroll to the deal after a short delay to allow filtering
      setTimeout(() => {
        const rowElement = document.querySelector(
          `[data-deal-id="${existingDeal.id}"]`,
        );
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  }

  async function addDeal(event) {
    event.preventDefault();

    // Basic Validation
    if (
      !form.address.trim() ||
      !form.city.trim() ||
      !form.zipCode.trim() ||
      !form.state.trim()
    ) {
      alert("Please fill out the required address fields.");
      return;
    }

    // Check for duplicate address
    const existingDeal = deals.find(
      (deal) =>
        deal.address.toLowerCase() === form.address.trim().toLowerCase(),
    );
    if (existingDeal) {
      alert("A property with this address already exists.");
      // Filter to show only the existing deal
      setFilters((prevFilters) => ({
        ...prevFilters,
        search: existingDeal.address,
      }));
      // Scroll to the deal after a short delay to allow filtering
      setTimeout(() => {
        const rowElement = document.querySelector(
          `[data-deal-id="${existingDeal.id}"]`,
        );
        if (rowElement) {
          rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
      return;
    }

    const parseNumber = (val) => Number(String(val).replace(/[^0-9]/g, ""));

    if (form.offerStatus === "Offer Sent" && !form.contractPrice.trim()) {
      alert("Please fill out Contract Price when the offer is sent.");
      return;
    }

    if (form.closed === "Yes" && !form.closedDate) {
      alert("Please select the close date for a closed deal.");
      return;
    }

    const arvNum = parseNumber(form.arv);
    const maoNum = parseNumber(form.mao);
    const contractNum = parseNumber(form.contractPrice);
    const assignedNum = parseNumber(form.assignedPrice);
    const rehabNum = parseNumber(form.rehabCost);

    if (arvNum > 0) {
      if (rehabNum > arvNum) {
        alert("Rehab cost cannot be more than ARV.");
        return;
      }
      if (maoNum > arvNum) {
        alert("MAO cannot be more than ARV.");
        return;
      }
      if (contractNum > arvNum) {
        alert("Contract price cannot be more than ARV.");
        return;
      }
    }
    if (maoNum > 0 && rehabNum > maoNum) {
      alert("Rehab cost cannot be more than MAO.");
      return;
    }
    if (contractNum > 0 && assignedNum > 0 && assignedNum < contractNum) {
      alert("Assigned price needs to be more than or equal to contract price.");
      return;
    }

    const profitNum =
      assignedNum > 0 && contractNum > 0 ? assignedNum - contractNum : 0;

    const { desiredProfit, ...formWithoutProfit } = form;

    const newDeal = {
      ...formWithoutProfit,
      id: crypto.randomUUID(),
      state: form.state.trim().toUpperCase(),
      zipCode: form.zipCode.trim(),
      arv: parseNumber(form.arv),
      listedPrice: parseNumber(form.listedPrice),
      rehabCost: parseNumber(form.rehabCost),
      mao: parseNumber(form.mao),
      contractPrice: parseNumber(form.contractPrice),
      assignedPrice: parseNumber(form.assignedPrice),
      profit: profitNum,
      buyerName: form.buyerName?.trim() || "",
      buyerEmail: form.buyerEmail?.trim().toLowerCase() || "",
      closedDate: form.closed === "Yes" ? form.closedDate : "",
      closedInMonth:
        form.closed === "Yes" && form.closedDate
          ? form.closedDate.slice(5, 7)
          : "",
    };

    try {
      setTableLoading(true);

      if (
        form.assigned === "Yes" &&
        form.buyerEmail?.trim() &&
        form.buyerName?.trim()
      ) {
        const existingBuyers = await fetchBuyers();
        const newEmail = form.buyerEmail.trim().toLowerCase();
        const isDuplicate = existingBuyers.some(
          (b) => b.email?.toLowerCase() === newEmail,
        );
        if (!isDuplicate) {
          const newBuyer = {
            id: crypto.randomUUID(),
            fullName: form.buyerName.trim(),
            email: newEmail,
            phone: "",
            city: form.city.trim(),
            state: form.state.trim().toUpperCase(),
            realEstateType: "Single Family",
          };
          await saveBuyer(newBuyer);
        }
      }

      await saveDeal(newDeal);
      setDeals((prevDeals) => [...prevDeals, newDeal]);
      setForm(emptyForm);
      if (newDeal.offerDate || newDeal.closedDate) {
        setFilters(defaultFilters);
      }
    } catch (error) {
      console.error("Failed to save property", error);
      alert("Unable to save property. Check your database connection.");
    } finally {
      setTableLoading(false);
    }
  }

  async function deleteDeal(id) {
    const deal = deals.find((item) => item.id === id);
    if (!window.confirm(`Delete ${deal?.address || "this deal"}?`)) return;

    try {
      await deleteDealById(id);
      setDeals((prevDeals) => prevDeals.filter((deal) => deal.id !== id));
    } catch (error) {
      console.error("Failed to delete property", error);
      alert("Unable to delete property. Check your database connection.");
    }
  }

  const states = useMemo(
    () => [
      "All",
      ...new Set(
        deals
          .map((d) => d.state)
          .filter(Boolean)
          .sort(),
      ),
    ],
    [deals],
  );
  const years = useMemo(
    () => [
      "All",
      ...new Set(
        deals
          .map((d) => (d.offerDate ? d.offerDate.substring(0, 4) : null))
          .filter(Boolean)
          .sort(),
      ),
    ],
    [deals],
  );

  const months = useMemo(
    () => [
      "All",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
      "12",
    ],
    [],
  );
  const filteredDeals = useMemo(() => {
    const query = filters.search.toLowerCase();
    return deals.filter((deal) => {
      const matchesState =
        filters.state === "All" || deal.state === filters.state;
      const matchesStatus =
        filters.offerStatus === "All" ||
        deal.offerStatus === filters.offerStatus;
      const matchesAccepted =
        filters.sellerAccepted === "All" ||
        deal.sellerAccepted === filters.sellerAccepted;
      const matchesAssigned =
        filters.assigned === "All" || deal.assigned === filters.assigned;
      const matchesClosed =
        filters.closed === "All" || deal.closed === filters.closed;
      const matchesSearch =
        !query ||
        (() => {
          const searchText = [
            deal.address,
            deal.city,
            deal.zipCode,
            deal.state,
            deal.offerStatus,
            deal.notes,
            deal.closed,
            deal.arv ? "$" + deal.arv.toLocaleString("en-US") : "",
            deal.rehabCost ? "$" + deal.rehabCost.toLocaleString("en-US") : "",
            deal.mao ? "$" + deal.mao.toLocaleString("en-US") : "",
            deal.contractPrice
              ? "$" + deal.contractPrice.toLocaleString("en-US")
              : "",
            deal.assignedPrice
              ? "$" + deal.assignedPrice.toLocaleString("en-US")
              : "",
          ]
            .join(" ")
            .toLowerCase()
            .replace(/,/g, "");
          const searchTerms = query
            .split(/\s+/)
            .filter(Boolean)
            .map((term) => term.replace(/,/g, ""));
          return searchTerms.every((term) => searchText.includes(term));
        })();

      const dealYear = deal.offerDate ? deal.offerDate.substring(0, 4) : "";
      const matchesYear = filters.year === "All" || dealYear === filters.year;

      const dealOfferMonth = deal.offerDate
        ? deal.offerDate.substring(5, 7)
        : "";
      const matchesOfferMonth =
        filters.offerMonth === "All" || dealOfferMonth === filters.offerMonth;

      const dealClosedMonth = deal.closedDate
        ? deal.closedDate.substring(5, 7)
        : deal.closedInMonth || "";
      const matchesClosedMonth =
        filters.closedMonth === "All" ||
        dealClosedMonth === filters.closedMonth;

      return (
        matchesState &&
        matchesStatus &&
        matchesAccepted &&
        matchesAssigned &&
        matchesSearch &&
        matchesClosed &&
        matchesYear &&
        matchesOfferMonth &&
        matchesClosedMonth
      );
    });
  }, [deals, filters]);

  return (
    <div className="layout">
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        theme={theme}
        setTheme={setTheme}
      />

      <main className="main">
        {activeView === "dashboard" ? (
          <>
            <header className="page-header">
              <div>
                <h1>Lead Pipeline</h1>
                <span>
                  Track and manage your real estate leads and deals locally.
                </span>
              </div>
              <button
                className="theme-toggle ghost-btn"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                title="Toggle Theme"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </header>

            {errorMessage && <div className="error-banner">{errorMessage}</div>}

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
              checkDuplicateAddress={checkDuplicateAddress}
            />

            <Wholesale_filters
              filters={filters}
              states={states}
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
              fetchBuyers={fetchBuyers}
              saveBuyer={saveBuyer}
              setFilters={setFilters}
            />
            </LoadingScreen>
          </>
        ) : (
          <Buyers theme={theme} setTheme={setTheme} />
        )}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Wholesale />);

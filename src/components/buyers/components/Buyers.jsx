import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Users } from "lucide-react";
import {
  fetchBuyers,
  saveBuyer,
  deleteBuyerById,
} from "../../../firebase/firestoreService";
import BuyerForm from "./BuyerForm";
import BuyerFilters from "./BuyerFilters";
import BuyerData from "./BuyerData";
import MailMergeModal from "./MailMergeModal";
import { SimpleStat } from "../../elements/elements";

const emptyBuyerForm = {
  fullName: "",
  email: "",
  phone: "",
  city: "",
  state: "",
  realEstateType: "Single Family",
};

function Buyers({ currentUser = { id: "" } }) {
  const [buyers, setBuyers] = useState([]);
  const [form, setForm] = useState(emptyBuyerForm);
  const [filters, setFilters] = useState({
    state: "All",
    realEstateType: "All",
    search: "",
  });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isMailMergeOpen, setIsMailMergeOpen] = useState(false);

  useEffect(() => {
    async function loadBuyers() {
      try {
        const data = await fetchBuyers(currentUser.id);
        setBuyers(data);
      } catch (error) {
        console.error("Failed to load buyers", error);
      }
    }

    loadBuyers();
  }, [currentUser.id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function updateBuyer(id, field, value) {
    const cleanedValue =
      field === "email" ? value.trim().toLowerCase() : value.trim();

    const isDuplicate = buyers.some((buyer) => {
      if (buyer.id === id) return false;
      if (field === "email" && cleanedValue) {
        return buyer.email?.toLowerCase() === cleanedValue;
      }
      if (field === "phone" && cleanedValue) {
        return buyer.phone === cleanedValue;
      }
      return false;
    });

    if (isDuplicate) {
      alert(
        `A buyer with this ${field} already exists. Please choose a different ${field}.`,
      );
      return;
    }

    const nextBuyers = buyers.map((buyer) =>
      buyer.id === id ? { ...buyer, [field]: cleanedValue } : buyer,
    );

    const updatedBuyer = nextBuyers.find((buyer) => buyer.id === id);
    if (!updatedBuyer) return;

    try {
      await saveBuyer(updatedBuyer);
      setBuyers(nextBuyers);
    } catch (error) {
      console.error("Failed to update buyer", error);
      alert("Unable to update buyer. Check your database connection.");
    }
  }

  async function addBuyer(event) {
    event.preventDefault();

    if (!form.fullName?.trim() || !form.state?.trim()) {
      alert("Please fill out at least Full Name and State.");
      return;
    }

    const newEmail = form.email?.trim().toLowerCase() || "";
    const newPhone = form.phone?.trim();

    const isDuplicate = buyers.some((buyer) => {
      const emailMatch = newEmail && buyer.email?.toLowerCase() === newEmail;
      const phoneMatch = newPhone && buyer.phone === newPhone;
      return emailMatch || phoneMatch;
    });

    if (isDuplicate) {
      alert("A buyer with this email or phone number already exists.");
      return;
    }

    const newBuyer = {
      ...form,
      id: crypto.randomUUID(),
      userId: currentUser.id,
      state: form.state?.trim().toUpperCase() || "",
    };

    try {
      await saveBuyer(newBuyer);
      setBuyers((prev) => [...prev, newBuyer]);
      setForm(emptyBuyerForm);
    } catch (error) {
      console.error("Failed to save buyer", error);
      alert("Unable to save buyer. Check your database connection.");
    }
  }

  async function deleteBuyer(id) {
    const buyer = buyers.find((item) => item.id === id);
    if (!window.confirm(`Delete ${buyer?.fullName || "this buyer"}?`)) return;

    try {
      await deleteBuyerById(id);
      setBuyers((prev) => prev.filter((b) => b.id !== id));
    } catch (error) {
      console.error("Failed to delete buyer", error);
      alert("Unable to delete buyer. Check your database connection.");
    }
  }

  const states = useMemo(
    () => [
      "All",
      ...new Set(
        buyers
          .map((b) => b.state)
          .filter(Boolean)
          .sort(),
      ),
    ],
    [buyers],
  );

  const types = useMemo(
    () => [
      "All",
      "Single Family",
      "Multi Family",
      "Commercial",
      "Land",
      "Other",
    ],
    [],
  );

  async function handleDeleteSelected() {
    if (selectedIds.size === 0) return;
    if (
      !window.confirm(
        `Delete ${selectedIds.size} buyer${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;

    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map((id) => deleteBuyerById(id)));
      setBuyers((prev) => prev.filter((b) => !selectedIds.has(b.id)));
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to delete buyers", error);
      alert(
        "Some buyers could not be deleted. Check your database connection.",
      );
    }
  }

  function handleToggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleSelectAllFiltered(selectAll) {
    if (selectAll) {
      setSelectedIds(new Set(filteredBuyers.map((b) => b.id)));
    } else {
      setSelectedIds(new Set());
    }
  }

  function handleSelectAll(pageBuyers, allSelected) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageBuyers.forEach((b) =>
        allSelected ? next.delete(b.id) : next.add(b.id),
      );
      return next;
    });
  }

  const selectedBuyers = useMemo(
    () => buyers.filter((b) => selectedIds.has(b.id)),
    [buyers, selectedIds],
  );

  const filteredBuyers = useMemo(() => {
    const query = filters.search.toLowerCase();
    return buyers.filter((buyer) => {
      const matchesState =
        filters.state === "All" || buyer.state === filters.state;
      const matchesType =
        filters.realEstateType === "All" ||
        buyer.realEstateType === filters.realEstateType;
      const matchesSearch =
        !query ||
        (() => {
          const searchText = [
            buyer.fullName,
            buyer.email,
            buyer.phone,
            buyer.city,
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

      return matchesState && matchesType && matchesSearch;
    });
  }, [buyers, filters]);

  return (
    <>
      <header className="page-header" data-reveal="left">
        <div>
          <h1>Buyers List</h1>
        </div>
      </header>

      <section
        className="stats-grid"
        data-reveal-group
        style={{ "--reveal-delay": "60ms" }}
      >
        <SimpleStat
          className="no-ripple"
          icon={<Users size={20} />}
          label={
            filters.state === "All"
              ? "Total Buyers"
              : `Buyers in ${filters.state}`
          }
          value={filteredBuyers.length}
          valueClassName="text-blue-500"
        />
      </section>

      <BuyerForm addBuyer={addBuyer} form={form} handleChange={handleChange} />

      <BuyerFilters
        filters={filters}
        states={states}
        types={types}
        RefreshCw={RefreshCw}
        setFilters={setFilters}
        selectedCount={selectedIds.size}
        onCompose={() => setIsMailMergeOpen(true)}
        onDeleteSelected={handleDeleteSelected}
      />

      <BuyerData
        filteredBuyers={filteredBuyers}
        buyers={buyers}
        deleteBuyer={deleteBuyer}
        updateBuyer={updateBuyer}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onSelectAllFiltered={handleSelectAllFiltered}
      />

      <MailMergeModal
        isOpen={isMailMergeOpen}
        onClose={() => setIsMailMergeOpen(false)}
        selectedBuyers={selectedBuyers}
      />
    </>
  );
}

export default Buyers;

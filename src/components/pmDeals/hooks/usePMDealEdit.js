import { useState } from "react";
import { fmtCurrencyInput } from "../../../utils/utils";

export function usePMDealEdit({ setDeals, savePmDeal }) {
  const [editingDeal, setEditingDeal] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  function handleRowClick(deal) {
    setEditingDeal(deal);
    setEditForm({
      borrowerName: deal.borrowerName || "",
      borrowerCompany: deal.borrowerCompany || "",
      propertyAddress: deal.propertyAddress || "",
      amountLent: deal.amountLent || "",
      interestRate: deal.interestRate || "",
      months: deal.months || "",
      lendDate: deal.lendDate || "",
    });
  }

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setEditForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setEditForm((p) => ({
        ...p,
        interestRate: value.replace(/[^0-9.%]/g, ""),
      }));
      return;
    }
    if (name === "months") {
      setEditForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setEditForm((p) => ({ ...p, [name]: value }));
  }

  function handleEditBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setEditForm((p) => ({ ...p, interestRate: `${n}%` }));
    }
  }

  async function handleEditSave() {
    if (!editingDeal) return;
    setEditSaving(true);
    try {
      const updated = { ...editingDeal, ...editForm };
      await savePmDeal(updated);
      setDeals((p) => p.map((d) => (d.id === updated.id ? updated : d)));
      setEditingDeal(null);
      setEditForm(null);
    } catch {
      alert("Failed to save changes. Check your connection.");
    } finally {
      setEditSaving(false);
    }
  }

  function closeEditModal() {
    setEditingDeal(null);
    setEditForm(null);
  }

  return {
    editingDeal,
    editForm,
    editSaving,
    handleRowClick,
    handleEditChange,
    handleEditBlur,
    handleEditSave,
    closeEditModal,
  };
}

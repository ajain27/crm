import { useState } from "react";
import { fmtCurrencyInput } from "../../../utils/utils";

function createEmptyForm() {
  return {
    borrowerName: "",
    borrowerCompany: "",
    propertyAddress: "",
    amountLent: "",
    interestRate: "",
    months: "",
    lendDate: "",
  };
}

export function usePMDealAdd({ setDeals, currentUser, savePmDeal, today }) {
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    if (name === "amountLent") {
      setForm((p) => ({ ...p, amountLent: fmtCurrencyInput(value) }));
      return;
    }
    if (name === "interestRate") {
      setForm((p) => ({ ...p, interestRate: value.replace(/[^0-9.%]/g, "") }));
      return;
    }
    if (name === "months") {
      setForm((p) => ({ ...p, months: value.replace(/[^0-9]/g, "") }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
  }

  function handleBlur(e) {
    const { name, value } = e.target;
    if (name === "interestRate" && value) {
      const n = value.replace(/[^0-9.]/g, "");
      if (n) setForm((p) => ({ ...p, interestRate: `${n}%` }));
      return;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed !== value) setForm((p) => ({ ...p, [name]: trimmed }));
    }
  }

  const isFormComplete =
    form.borrowerName.trim() &&
    form.amountLent &&
    form.interestRate &&
    form.months &&
    form.lendDate;

  async function handleAdd(e) {
    e.preventDefault();
    if (!isFormComplete) return;
    setSaving(true);
    try {
      const deal = {
        ...form,
        id: crypto.randomUUID(),
        userId: currentUser?.id || "",
        createdAt: today,
        files: [],
      };
      await savePmDeal(deal);
      setDeals((p) => [deal, ...p]);
      setForm(createEmptyForm());
    } catch {
      alert("Failed to save deal. Check your connection.");
    } finally {
      setSaving(false);
    }
  }

  return { form, saving, isFormComplete, handleChange, handleBlur, handleAdd };
}

import { useState } from "react";
import {
  findDuplicateByAddress,
  formatPhone,
  trimFieldOnBlur,
} from "../../../utils/utils";
import { todayStr } from "../leadUtils";

// State + handlers for an "Add Lead" form (residential and commercial share
// this). Rejects addresses already in `existingLeads`, and on submit saves a
// new lead of `leadType` and prepends it to the list.
export function useLeadForm({
  createEmpty,
  leadType,
  existingLeads,
  duplicateMessage,
  currentUser,
  saveLead,
  setLeads,
}) {
  const [form, setForm] = useState(createEmpty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function setField(name, value) {
    if (name === "address") setError("");
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleChange(e) {
    setField(e.target.name, e.target.value);
  }

  const handleTrimBlur = trimFieldOnBlur(handleChange);

  function handlePhoneChange(e) {
    setField(e.target.name, formatPhone(e.target.value));
  }

  // Letters, spaces, apostrophes and periods only — for person names.
  function handleNameChange(e) {
    setField(e.target.name, e.target.value.replace(/[^a-zA-Z\s'.]/g, ""));
  }

  function checkDuplicate(address) {
    const duplicate = findDuplicateByAddress(existingLeads, address);
    if (duplicate) setError(duplicateMessage(duplicate.address));
    return Boolean(duplicate);
  }

  function handleAddressBlur(e) {
    handleTrimBlur(e);
    checkDuplicate(e.target.value.trim());
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.address.trim()) return;
    if (checkDuplicate(form.address)) return;
    setSaving(true);
    setError("");
    try {
      const lead = {
        ...form,
        leadType,
        address: form.address.trim(),
        id: crypto.randomUUID(),
        userId: currentUser.id,
        dateAdded: todayStr(),
        dateAddedAt: new Date().toISOString(),
      };
      await saveLead(lead);
      setLeads((prev) => [lead, ...prev]);
      setForm(createEmpty());
    } catch {
      setError("Failed to save lead. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    form,
    saving,
    error,
    setField,
    handleChange,
    handleTrimBlur,
    handlePhoneChange,
    handleNameChange,
    handleAddressBlur,
    handleSubmit,
  };
}

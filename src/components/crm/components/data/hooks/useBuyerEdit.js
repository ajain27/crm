import { useState } from "react";

export function useBuyerEdit({ updateDeal }) {
  const [editingBuyerId, setEditingBuyerId] = useState(null);
  const [editingBuyerField, setEditingBuyerField] = useState(null);
  const [editBuyerValue, setEditBuyerValue] = useState("");

  function startEditingBuyer(deal, field) {
    setEditingBuyerId(deal.id);
    setEditingBuyerField(field);
    setEditBuyerValue(deal[field] || "");
  }

  function cancelBuyerEdit() {
    setEditingBuyerId(null);
    setEditingBuyerField(null);
    setEditBuyerValue("");
  }

  function saveBuyerEdit(id) {
    if (!editingBuyerField) return;
    updateDeal(id, editingBuyerField, editBuyerValue);
    cancelBuyerEdit();
  }

  return {
    editingBuyerId,
    editingBuyerField,
    editBuyerValue,
    setEditBuyerValue,
    startEditingBuyer,
    cancelBuyerEdit,
    saveBuyerEdit,
  };
}

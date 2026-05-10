export function useDealUpdater({ deals, persist, saveDeal, fetchBuyers, saveBuyer, setFilters }) {
  function updateDealPatch(id, patch) {
    const nextDeals = deals.map((dealItem) =>
      dealItem.id === id ? { ...dealItem, ...patch } : dealItem,
    );
    const updatedDeal = nextDeals.find((deal) => deal.id === id);

    return saveDeal(updatedDeal)
      .then((savedDeal) => {
        const persistedDeals = nextDeals.map((dealItem) =>
          dealItem.id === id ? savedDeal || updatedDeal : dealItem,
        );
        persist(persistedDeals);
      })
      .catch((error) => {
        console.error("Failed to update property", error);
        const detail = error?.message ? `\n\n${error.message}` : "";
        alert(`Unable to save contract. Check your database connection.${detail}`);
      });
  }

  async function updateDeal(id, field, value) {
    const deal = deals.find((d) => d.id === id);
    let resolvedClosedDate = deal?.closedDate || "";

    if (field === "closed" && value === "Yes") {
      const canClose = deal.sellerAccepted === "Yes" && deal.assigned === "Yes";
      if (!canClose) {
        alert("Cannot Close: Offer must be 'Accepted', and 'Assigned' must be 'Yes'.");
        return;
      }

      resolvedClosedDate = window.prompt(
        "Enter the close date (YYYY-MM-DD).",
        deal.closedDate || "",
      );
      if (!resolvedClosedDate) return;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedClosedDate)) {
        alert("Please enter a valid close date in YYYY-MM-DD format.");
        return;
      }
    }

    const nextDeals = deals.map((dealItem) => {
      if (dealItem.id !== id) return dealItem;
      const nextDeal = { ...dealItem, [field]: value };
      if (field === "closed") {
        if (value === "Yes") {
          nextDeal.closedDate = resolvedClosedDate;
          nextDeal.closedInMonth = resolvedClosedDate.slice(5, 7);
        } else {
          nextDeal.closedDate = "";
          nextDeal.closedInMonth = "";
        }
      }
      return nextDeal;
    });

    const updatedDeal = nextDeals.find((deal) => deal.id === id);
    try {
      const savedDeal = (await saveDeal(updatedDeal)) || updatedDeal;
      const persistedDeals = nextDeals.map((dealItem) =>
        dealItem.id === id ? savedDeal : dealItem,
      );
      persist(persistedDeals);

      if (
        field === "offerDate" ||
        (field === "closed" && value === "Yes" && savedDeal.closedDate)
      ) {
        setFilters({
          state: "All",
          propertyType: "All",
          offerAccepted: "All",
          assigned: "All",
          search: "",
          closed: "All",
          offerMonth: "All",
          closedMonth: "All",
          year: "All",
        });
      }

      if (
        (field === "buyerName" || field === "buyerEmail") &&
        savedDeal.assigned === "Yes" &&
        savedDeal.buyerEmail?.trim() &&
        savedDeal.buyerName?.trim()
      ) {
        const existingBuyers = await fetchBuyers();
        const buyerEmail = savedDeal.buyerEmail.trim().toLowerCase();
        const existingBuyer = existingBuyers.find(
          (b) => b.email?.toLowerCase() === buyerEmail,
        );

        if (existingBuyer) {
          await saveBuyer({ ...existingBuyer, fullName: savedDeal.buyerName.trim() });
        } else {
          await saveBuyer({
            id: crypto.randomUUID(),
            userId: savedDeal.userId,
            fullName: savedDeal.buyerName.trim(),
            email: buyerEmail,
            phone: "",
            city: savedDeal.city.trim(),
            state: savedDeal.state.trim().toUpperCase(),
            realEstateType: "Single Family",
          });
        }
      }
    } catch (error) {
      console.error("Failed to update property", error);
      alert("Unable to update property. Check your database connection.");
    }
  }

  return { updateDeal, updateDealPatch };
}

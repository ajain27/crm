import { useState, useEffect } from "react";
import {
  fetchDeals,
  deleteDealById,
} from "../../../../firebase/firestoreService";

export function useDealsData({ currentUser }) {
  const [deals, setDeals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  async function loadDeals() {
    if (!currentUser?.id) {
      setDeals([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage("");
      const data = await fetchDeals(currentUser.id);
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
  }, [currentUser?.id]);

  function persist(nextDeals) {
    setDeals(nextDeals);
  }

  async function deleteDeal(id) {
    const deal = deals.find((item) => item.id === id);
    if (!window.confirm(`Delete ${deal?.address || "this deal"}?`))
      return false;

    try {
      await deleteDealById(id);
      setDeals((prevDeals) => prevDeals.filter((d) => d.id !== id));
      return true;
    } catch (error) {
      console.error("Failed to delete property", error);
      alert("Unable to delete property. Check your database connection.");
      return false;
    }
  }

  return { deals, setDeals, isLoading, errorMessage, deleteDeal, persist };
}

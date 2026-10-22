import { fillBlanks } from "./leadImport";
import { uniqueById } from "./leadUtils";

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

// Street + city, ignoring case, punctuation and anything after the city
// (state, ZIP, country), so "1 Main St, Dallas, TX 75201, USA" and
// "1 main st., Dallas, TX" match. Null when there's no usable street.
export function addressMatchKey(address) {
  const [street, city = ""] = String(address || "").split(",");
  const streetKey = normalize(street);
  return streetKey.length > 3 ? `${streetKey}|${normalize(city)}` : null;
}

const filledCount = (lead) =>
  Object.values(lead).filter((v) => String(v ?? "").trim() !== "").length;

const addedAt = (lead) => lead.dateAddedAt || lead.dateAdded || "";

// Leads sharing an address. For each address the lead with the most
// details is kept (the earliest added on a tie), with any blanks filled
// from the others; the others are its duplicates.
// Returns one { keep, changed, duplicates } per address with more than one
// lead — `changed` when `keep` picked up details and needs saving.
export function findAddressDuplicates(leads) {
  const groups = new Map();
  // The same lead listed twice isn't a duplicate of itself: removing the
  // "duplicate" would delete the lead.
  uniqueById(leads).forEach((lead) => {
    const key = addressMatchKey(lead.address);
    if (!key) return;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(lead);
  });

  return [...groups.values()]
    .filter((group) => group.length > 1)
    .map((group) => {
      const [best, ...duplicates] = [...group].sort(
        (a, b) =>
          filledCount(b) - filledCount(a) ||
          addedAt(a).localeCompare(addedAt(b)),
      );
      const keep = duplicates.reduce(
        (lead, other) => fillBlanks(lead, other),
        best,
      );
      return { keep, changed: keep !== best, duplicates };
    });
}

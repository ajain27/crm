import { fillBlanks } from "./leadImport";
import { leadTabLabel, leadTabOf, uniqueById } from "./leadUtils";

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

// A CRM deal's address as one line ("1 Main St, Dallas, TX 75201"); deals
// keep the street, city, state and ZIP apart.
export function dealAddress(deal) {
  const stateZip = [deal?.state, deal?.zipCode].filter(Boolean).join(" ");
  return [deal?.address, deal?.city, stateZip].filter(Boolean).join(", ");
}

// Whether two addresses are the same property (see addressMatchKey). When
// either has no city (e.g. a street typed before the city), the streets
// alone decide.
export function sameAddress(a, b) {
  const keyA = addressMatchKey(a);
  const keyB = addressMatchKey(b);
  if (!keyA || !keyB) return false;
  const [streetA, cityA] = keyA.split("|");
  const [streetB, cityB] = keyB.split("|");
  return streetA === streetB && (!cityA || !cityB || cityA === cityB);
}

// The lead or CRM deal already at `address`, other than `excludeId` (the
// record being edited): { record, where } with where e.g. "PPL Leads" or
// "the CRM", or null. Every place that saves a lead or deal checks this,
// so no property is in the app twice.
export function findAddressConflict({
  address,
  leads = [],
  deals = [],
  excludeId,
}) {
  if (!addressMatchKey(address)) return null;
  const others = (list) => list.filter((r) => r && r.id !== excludeId);
  const deal = others(deals).find((d) => sameAddress(dealAddress(d), address));
  if (deal) return { record: deal, where: "the CRM" };
  const lead = others(leads).find((l) => sameAddress(l.address, address));
  if (lead) return { record: lead, where: leadTabLabel(leadTabOf(lead)) };
  return null;
}

// `"1 Main St, Dallas" is already in PPL Leads.`
export function addressConflictMessage(address, conflict) {
  return `"${String(address).trim()}" is already in ${conflict.where}.`;
}

// Records sharing an address. For each address the record with the most
// details is kept (the earliest added on a tie), with any blanks filled
// from the others; the others are its duplicates. `addressOf` reads a
// record's address (leads by default; dealAddress for CRM deals).
// Returns one { keep, changed, duplicates } per address with more than one
// record — `changed` when `keep` picked up details and needs saving.
export function findAddressDuplicates(leads, addressOf = (l) => l.address) {
  const groups = new Map();
  // The same lead listed twice isn't a duplicate of itself: removing the
  // "duplicate" would delete the lead.
  uniqueById(leads).forEach((lead) => {
    const key = addressMatchKey(addressOf(lead));
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

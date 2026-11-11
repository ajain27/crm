import { loadPhoto } from "../../../elements/photos/photoCache";
import { joinName, sellerNameOf } from "../../../leads/leadUtils";
import { displayPhone } from "../../../../utils/utils";

// What the report says about the seller and the lead, from a lead, a CRM
// deal or a county record (whichever fields it has). Blank parts are
// left out.
export function reportContact(item = {}) {
  const phones = [
    item.phone,
    item.phone2,
    item.sellerPhone,
    ...(item.sellerPhones || []),
    ...(item.phones || []),
  ]
    .map((p) => String(p || "").trim())
    .filter(Boolean);
  const seen = new Set();
  const uniquePhones = phones.filter((p) => {
    const digits = p.replace(/\D/g, "").slice(-10);
    if (seen.has(digits)) return false;
    seen.add(digits);
    return true;
  });
  return [
    [
      "Seller",
      sellerNameOf(item) ||
        joinName(item.sellerFirstName, item.sellerLastName) ||
        item.ownerName,
    ],
    ["Phone", uniquePhones.map(displayPhone).join(", ")],
    ["Email", item.email || item.sellerEmail],
    ["Lead source", item.source],
    ["Occupancy", item.occupant],
    ["Motivation", item.sellerMotivation],
    ["Timeline", item.sellingUrgency],
  ].filter(([, value]) => String(value || "").trim());
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Google Street View of the address, as a data URL ("" when there's no
// imagery or it can't be fetched).
async function streetViewImage(address) {
  const key = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
  if (!key || !address) return "";
  const params = new URLSearchParams({
    size: "640x360",
    location: address,
    fov: "80",
    // A 404 instead of a grey "no imagery" picture.
    return_error_code: "true",
    source: "outdoor",
    key,
  });
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/streetview?${params}`,
    );
    if (!res.ok) return "";
    return await blobToDataUrl(await res.blob());
  } catch {
    return "";
  }
}

// The picture of the house for the report's front: its main photo (the
// listing photo comps found, or one added), else Street View. "" when
// there's neither.
export async function loadFrontImage({ photoStore, ownerId, photos, address }) {
  const main = Array.isArray(photos) ? photos[0] : null;
  if (main && photoStore && ownerId) {
    const data = await loadPhoto(photoStore, ownerId, main.id);
    if (data) return data;
  }
  return streetViewImage(address);
}

// "4332 W Cortez St, Phoenix, AZ" → "property-report-4332-w-cortez-st"
// (the date is added when it's saved).
export function reportFilename(address) {
  const street = String(address || "")
    .split(",")[0]
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return street ? `property-report-${street}` : "property-report";
}

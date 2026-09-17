/**
 * Business Type ↔ Plan Mode helpers (UI display only).
 *
 * The AUTHORITATIVE mapping lives on the backend
 * (restaurant-pos-backend/src/utils/businessMode.js) — every plan assignment
 * is re-validated server-side. This module mirrors that mapping purely so the
 * UI can filter plan cards and label modes without a round-trip. Never trust
 * these values for security decisions; the backend rejects incompatible
 * combinations with: "Selected plan is not available for the selected
 * business type."
 */

export const BUSINESS_TYPES = [
  // Food service
  { value: "RESTAURANT", label: "Restaurant", group: "Food Service", mode: "RESTAURANT" },
  { value: "CAFE", label: "Café", group: "Food Service", mode: "BASIC_POS" },
  { value: "BAKERY", label: "Bakery", group: "Food Service", mode: "BASIC_POS" },
  { value: "BAR", label: "Bar / Pub", group: "Food Service", mode: "BASIC_POS" },
  { value: "FOOD_TRUCK", label: "Food Truck / Quick Service", group: "Food Service", mode: "BASIC_POS" },
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen", group: "Food Service", mode: "BASIC_POS" },
  { value: "FOOD_COURT", label: "Food Court", group: "Food Service", mode: "BASIC_POS" },
  // Retail
  { value: "SUPERMARKET", label: "Supermarket / Grocery", group: "Retail", mode: "BASIC_POS" },
  { value: "GROCERY", label: "Grocery Store", group: "Retail", mode: "BASIC_POS" },
  { value: "CLOTHING", label: "Retail / Clothing", group: "Retail", mode: "BASIC_POS" },
  { value: "OTHER", label: "Other", group: "Retail", mode: "BASIC_POS" },
  // HOTEL removed from new-selection UIs (spec §14). Legacy HOTEL records in
  // the database stay readable — the enum value is not deleted.
];

/** Mirror of the backend resolveBusinessMode(). Unknown → BASIC_POS. */
export function resolveBusinessMode(businessType) {
  if (!businessType) return "BASIC_POS";
  return businessType === "RESTAURANT" ? "RESTAURANT" : "BASIC_POS";
}

/** Human label for a plan mode. */
export function modeLabel(mode) {
  return mode === "RESTAURANT" ? "Restaurant Mode" : "Basic Mode";
}

/**
 * Keep only plans compatible with the given business type.
 * A plan without a businessMode is treated as RESTAURANT (legacy default).
 * NOTE: the backend already filters plan lists server-side — this is a
 * display-layer safety net, never the only gate.
 */
export function filterPlansForBusinessType(plans, businessType) {
  const mode = resolveBusinessMode(businessType);
  return (plans || []).filter(
    (p) => (p.businessMode || "RESTAURANT") === mode
  );
}

/** Group label for a business type (mirrors the backend config groups). */
export function businessTypeGroup(businessType) {
  const found = BUSINESS_TYPES.find((t) => t.value === businessType);
  return found ? found.group : "Other";
}

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
  { value: "RESTAURANT", label: "Restaurant", mode: "RESTAURANT" },
  { value: "CAFE", label: "Café", mode: "BASIC_POS" },
  { value: "BAR", label: "Bar", mode: "BASIC_POS" },
  { value: "FOOD_TRUCK", label: "Food Truck", mode: "BASIC_POS" },
  { value: "CLOUD_KITCHEN", label: "Cloud Kitchen", mode: "BASIC_POS" },
  { value: "OTHER", label: "Other", mode: "BASIC_POS" },
  { value: "BAKERY", label: "Bakery", mode: "BASIC_POS" },
  // HOTEL removed from new-selection UIs (spec §14). Legacy HOTEL records in
  // the database stay readable — the enum value is not deleted.
  { value: "FOOD_COURT", label: "Food Court", mode: "BASIC_POS" },
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
 */
export function filterPlansForBusinessType(plans, businessType) {
  const mode = resolveBusinessMode(businessType);
  return (plans || []).filter(
    (p) => (p.businessMode || "RESTAURANT") === mode
  );
}

/**
 * Business Type → Capability resolution (UI mirror).
 *
 * The AUTHORITATIVE source is the backend
 * (restaurant-pos-backend/src/utils/businessCapabilities.js) — the settings API
 * returns `capabilities` resolved server-side from the platform businessType.
 * This module mirrors the same mapping so onboarding (which runs BEFORE a
 * tenant exists) and any component without a settings round-trip can resolve
 * capabilities locally. Never trust these for security decisions; the backend
 * re-derives and enforces them server-side.
 *
 * featureVisible = businessCapability && planCapability && userPermission
 */

export const BUSINESS_CAPABILITIES = {
  RESTAURANT: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: true, floors: true, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  CAFE: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: true, floors: true, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  BAR: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: true, floors: true, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  FOOD_TRUCK: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: false, floors: false, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  CLOUD_KITCHEN: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: false, floors: false, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  FOOD_COURT: {
    food: true, dietary: true, kitchen: true, kot: true,
    tables: true, floors: true, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  BAKERY: {
    food: true, dietary: true, kitchen: false, kot: false,
    tables: false, floors: false, menu: true, products: false,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  CLOTHING: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: true,
    customers: true,
  },
  SUPERMARKET: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  GROCERY: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  ELECTRONICS: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: true,
    customers: true,
  },
  FURNITURE: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: true,
    customers: true,
  },
  HARDWARE: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  COSMETICS: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: true,
    customers: true,
  },
  STATIONERY: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  JEWELLERY: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: true,
    customers: true,
  },
  OTHER: {
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
  HOTEL: { // legacy value — stays readable, resolves to generic retail
    food: false, dietary: false, kitchen: false, kot: false,
    tables: false, floors: false, menu: false, products: true,
    barcode: true, inventory: true, stock: true, variants: false,
    customers: true,
  },
};

const DEFAULT_CAPABILITIES = BUSINESS_CAPABILITIES.OTHER;

/** Resolve capabilities for a business type (never throws). */
export function getBusinessCapabilities(businessType) {
  if (!businessType || typeof businessType !== "string") return DEFAULT_CAPABILITIES;
  return BUSINESS_CAPABILITIES[businessType.trim().toUpperCase()] || DEFAULT_CAPABILITIES;
}

/** Catalog naming: food verticals say "Menu", retail says "Products". */
export function catalogNaming(businessType) {
  const c = getBusinessCapabilities(businessType);
  if (c.menu) return { catalogLabel: "Menu & Stock", itemLabel: "Menu Items", collectionLabel: "Menu" };
  return { catalogLabel: "Products & Stock", itemLabel: "Products", collectionLabel: "Products" };
}

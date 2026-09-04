/**
 * Role-Based POS Actions & Kitchen Screen — Frontend Test Suite
 * Standalone — run directly with: node src/__tests__/run.js
 *
 * Covers the acceptance matrix without a browser test runner:
 *   1. Centralized canHandleBilling capability (permissions.js)
 *   2. Screen-level access (Kitchen Tickets vs Active Orders)
 *   3. Payment-success screen actions (Email removed, Print/Reprint/Done kept)
 *   4. Source-level visibility smoke tests — every payment/bill action in the UI
 *      is gated by the centralized canHandleBilling helper, never a scattered
 *      inline role check.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..');

const read = (rel) => readFileSync(path.join(SRC, rel), 'utf8');

const results = { pass: 0, fail: 0 };

function section(title) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}`);
}

function sub(title) {
  console.log(`\n  --- ${title} ---`);
}

function check(condition, message) {
  process.stdout.write(condition ? '  ✅ ' : '  ❌ ');
  console.log(message);
  condition ? results.pass++ : results.fail++;
}

function eq(actual, expected, label) {
  const pass = actual === expected;
  process.stdout.write(pass ? '  ✅ ' : '  ❌ ');
  console.log(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  pass ? results.pass++ : results.fail++;
}

// ═══════════════════════════════════════════════
//  1. CENTRALIZED BILLING CAPABILITY
// ═══════════════════════════════════════════════
import { canHandleBilling, canAccessScreen, BILLING_ROLES, SCREEN_PERMISSIONS } from '../utils/permissions.js';

section('1. CENTRALIZED BILLING CAPABILITY (canHandleBilling)');

sub('Payment / Bill Checkout / Checkout Desk — role matrix');
eq(canHandleBilling('ADMIN'), true, 'ADMIN → can bill');
eq(canHandleBilling('MANAGER'), true, 'MANAGER → can bill');
eq(canHandleBilling('CASHIER'), true, 'CASHIER → can bill');
eq(canHandleBilling('WAITER'), false, 'WAITER → cannot bill');
eq(canHandleBilling('KITCHEN'), false, 'KITCHEN → cannot bill');
eq(canHandleBilling('SUPER_ADMIN'), true, 'SUPER_ADMIN → can bill');
eq(canHandleBilling('admin'), true, 'lowercase "admin" normalized');
eq(canHandleBilling(null), false, 'null role → false');
eq(canHandleBilling(''), false, 'empty role → false');
eq(canHandleBilling('UNKNOWN'), false, 'unknown role → false');

sub('BILLING_ROLES constant contents');
eq(BILLING_ROLES.includes('WAITER'), false, 'WAITER not in BILLING_ROLES');
eq(BILLING_ROLES.includes('KITCHEN'), false, 'KITCHEN not in BILLING_ROLES');
eq(BILLING_ROLES.includes('MANAGER'), true, 'MANAGER in BILLING_ROLES');

// ═══════════════════════════════════════════════
//  2. SCREEN-LEVEL ACCESS
// ═══════════════════════════════════════════════

section('2. SCREEN-LEVEL ACCESS (Kitchen Tickets vs Active Orders)');

sub('KITCHEN');
eq(canAccessScreen('KITCHEN', 'orders'), true, 'Kitchen Tickets visible');
eq(canAccessScreen('KITCHEN', 'active_orders'), false, 'Active Orders hidden');
eq(canAccessScreen('KITCHEN', 'dashboard'), false, 'Dashboard hidden');

sub('WAITER');
eq(canAccessScreen('WAITER', 'active_orders'), true, 'Active Orders visible (existing behavior preserved)');

sub('CASHIER / MANAGER / ADMIN');
eq(canAccessScreen('CASHIER', 'active_orders'), true, 'CASHIER → Active Orders visible');
eq(canAccessScreen('MANAGER', 'active_orders'), true, 'MANAGER → Active Orders visible');
eq(canAccessScreen('ADMIN', 'active_orders'), true, 'ADMIN → Active Orders visible');

sub('Kitchen Tickets — existing permissions preserved');
eq(SCREEN_PERMISSIONS.orders.includes('KITCHEN'), true, 'KITCHEN still allowed on Kitchen Tickets');

// ═══════════════════════════════════════════════
//  3. PAYMENT SUCCESS SCREEN (Email removed)
// ═══════════════════════════════════════════════

section('3. PAYMENT SUCCESS SCREEN ACTIONS');

const billingPage = read('features/billing/pages/BillingPage.jsx');

sub('For every role — EMAIL button must not exist');
check(!/onEmail/.test(billingPage), 'no onEmail prop / handler remains');
check(!/Mail className=/.test(billingPage), 'no Mail icon button remains');
check(!/handleEmail/.test(billingPage), 'no handleEmail handler remains');

sub('For every role — PRINT RECEIPT / REPRINT / DONE exist');
check(billingPage.includes('Print Receipt'), 'Print Receipt present');
check(billingPage.includes('Reprint'), 'Reprint present');
check(billingPage.includes('Done'), 'Done present');

sub('Payment overlay is gated for non-billing roles');
check(billingPage.includes('canHandleBilling'), 'uses centralized canHandleBilling');
check(/if \(!checkoutOrderId \|\| !canBill\) return null;/.test(billingPage), 'overlay renders nothing for KITCHEN/WAITER');

// ═══════════════════════════════════════════════
//  4. SOURCE-LEVEL VISIBILITY SMOKE TESTS
//  Every payment/bill action must be gated by the centralized helper.
// ═══════════════════════════════════════════════

section('4. UI ACTION GATING (centralized canHandleBilling)');

sub('Kitchen Tickets — Checkout Desk hidden for KITCHEN');
const kitchenPage = read('features/kitchen/pages/KitchenPage.jsx');
check(kitchenPage.includes('canHandleBilling'), 'KitchenPage imports canHandleBilling');
check(/canBill && \(\s*<button[\s\S]*?Checkout Desk/.test(kitchenPage), 'Checkout Desk gated by canBill');
check(kitchenPage.includes('Mark as'), 'Mark as Accepted remains available');

sub('Active Orders — Bill / Checkout / Reprint Bill gated');
const activeOrdersPage = read('features/orders/pages/ActiveOrdersPage.jsx');
check(activeOrdersPage.includes('canHandleBilling'), 'ActiveOrdersPage imports canHandleBilling');
const canBillCount = (activeOrdersPage.match(/canBill &&/g) || []).length;
check(canBillCount >= 3, `Bill + Checkout + Reprint Bill all gated (found ${canBillCount} gates)`);
check(!/enableBilling !== false && !isServiceStaff/.test(activeOrdersPage), 'no stray !isServiceStaff billing gates remain');

sub('Tables — Checkout button gated');
const tablePage = read('features/masters/table/pages/TablePage.jsx');
check(tablePage.includes('canHandleBilling'), 'TablePage imports canHandleBilling');
check(/canBill &&/.test(tablePage), 'Checkout gated by canBill');

sub('Take Order Wizard — Save & Pay gated for non-billing roles');
const wizardPage = read('features/pos/workspace/components/TakeOrderWizard.jsx');
check(wizardPage.includes('canHandleBilling'), 'TakeOrderWizard imports canHandleBilling');
check(/enableBilling !== false && canBill &&/.test(wizardPage), 'Save & Pay gated by canBill');
check(/if \(canBill\)/.test(wizardPage), 'checkout only opens for billing-capable roles');

sub('Basic POS — Payment button gated for non-billing roles');
const posWorkspace = read('features/pos/workspace/pages/PosWorkspace.jsx');
check(posWorkspace.includes('canHandleBilling'), 'PosWorkspace imports canHandleBilling');
check(/canBill && \(\s*<button[\s\S]*?PAYMENT/.test(posWorkspace) || /canBill && \(\s*<button[\s\S]*?Payment/.test(posWorkspace), 'Payment button gated by canBill');
check(posWorkspace.includes('!canBill'), 'handlePayment guarded against non-billing roles');

sub('Sidebar — Active Orders hidden for KITCHEN via screen permission');
const sidebar = read('components/layout/sidebar/Sidebar.jsx');
check(sidebar.includes("canAccessScreen(userRole, item.screen)"), 'sidebar filters by canAccessScreen');
check(SCREEN_PERMISSIONS.active_orders.includes('KITCHEN') === false, 'active_orders screen permission excludes KITCHEN');

// ═══════════════════════════════════════════════
//  SUMMARY
// ═══════════════════════════════════════════════

section('RESULTS');
console.log(`\n  Total:  ${results.pass + results.fail}`);
console.log(`  Passed: ${results.pass} ✅`);
console.log(`  Failed: ${results.fail} ${results.fail > 0 ? '❌' : '✅'}`);
console.log(`  Rate:   ${((results.pass / (results.pass + results.fail)) * 100).toFixed(1)}%`);

if (results.fail > 0) {
  console.log('\n  ❌ SOME TESTS FAILED\n');
  process.exit(1);
} else {
  console.log('\n  ✅ ALL TESTS PASSED\n');
}
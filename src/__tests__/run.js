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
import { readFileSync, existsSync } from 'node:fs';
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
import {
  pageForStatus,
  isSelfServeOnboarding,
  shouldPollOnboardingStatus,
  resolveHomeScreen,
  hasValidDocument,
  countValidDocuments,
  isYearlyOnly,
} from '../features/onboarding/onboarding.lib.js';
import { validateRegistration } from '../features/onboarding/registerRules.js';

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
//  5. SELF-SERVE ONBOARDING — RESUME MAPPING
// ═══════════════════════════════════════════════

section('5. ONBOARDING RESUME — status → wizard page');

sub('Every backend status lands on the correct wizard step (no skip-ahead)');
eq(pageForStatus('REGISTERED'), 'business', 'REGISTERED → business');
eq(pageForStatus('ONBOARDING'), 'business', 'ONBOARDING → business');
eq(pageForStatus('DOCUMENTS_PENDING'), 'documents', 'DOCUMENTS_PENDING → documents');
eq(pageForStatus('DOCUMENT_REJECTED'), 'documents', 'DOCUMENT_REJECTED → documents (replacement required)');
eq(pageForStatus('LEGAL_PENDING'), 'legal', 'LEGAL_PENDING → legal');
eq(pageForStatus('PLAN_PENDING'), 'plan', 'PLAN_PENDING → plan');
eq(pageForStatus('PLAN_SELECTED'), 'review', 'PLAN_SELECTED → review (no payment step)');
eq(pageForStatus('PAYMENT_PENDING'), 'review', 'PAYMENT_PENDING → review (legacy accounts never see a payment screen)');
eq(pageForStatus('PAYMENT_FAILED'), 'review', 'PAYMENT_FAILED → review');
eq(pageForStatus('UNDER_REVIEW'), 'under_review', 'UNDER_REVIEW → under_review status page');
eq(pageForStatus('MANUAL_PENDING'), 'pending', 'MANUAL_PENDING → pending (application submitted)');
eq(pageForStatus('MANUAL_PAYMENT_PENDING'), 'pending', 'MANUAL_PAYMENT_PENDING → pending');
eq(pageForStatus('MANUAL_PAYMENT_RECEIVED'), 'pending', 'MANUAL_PAYMENT_RECEIVED → pending (still not approved)');
eq(pageForStatus('MANUAL_APPROVED'), 'complete', 'MANUAL_APPROVED → complete');
eq(pageForStatus('MANUAL_REJECTED'), 'blocked', 'MANUAL_REJECTED → blocked (rejection reason shown)');
eq(pageForStatus('PROVISIONING'), 'provisioning', 'PROVISIONING → provisioning');
eq(pageForStatus('ACTIVE'), 'complete', 'ACTIVE → complete');
eq(pageForStatus('REJECTED'), 'blocked', 'REJECTED → blocked');
eq(pageForStatus('SUSPENDED'), 'blocked', 'SUSPENDED → blocked');
eq(pageForStatus('EXPIRED'), 'blocked', 'EXPIRED → blocked');

sub('The progress indicator has NO payment step');
const onboardingLib = read('features/onboarding/onboarding.lib.js');
check(!/\{ key: 'payment', label: 'Payment' \}/.test(onboardingLib), 'no Payment chip in PROGRESS_STEPS');
check(onboardingLib.includes("{ key: 'plan', label: 'Plan' }"), 'Plan chip present');
check(onboardingLib.includes("{ key: 'review', label: 'Review' }"), 'Review chip present');
check(!/WIZARD_PAGES = \[[^\]]*'payment'/.test(onboardingLib), "'payment' is not a wizard page");

sub('Applicant gating — only non-ACTIVE self-serve accounts need the wizard');
eq(isSelfServeOnboarding({ account: { status: 'REGISTERED' } }), true, 'REGISTERED is an applicant');
eq(isSelfServeOnboarding({ account: { status: 'UNDER_REVIEW' } }), true, 'UNDER_REVIEW is an applicant');
eq(isSelfServeOnboarding({ account: { status: 'ACTIVE' } }), false, 'ACTIVE goes straight to the POS');
eq(isSelfServeOnboarding({ account: { status: 'REJECTED' } }), true, 'REJECTED still needs the blocked status screen');
eq(isSelfServeOnboarding(null), false, 'null payload → not an applicant');
eq(isSelfServeOnboarding({}), false, 'payload without account → not an applicant');

sub('Non-self-serve restaurants are NEVER applicants (the 403-loop fix)');
// A Super Admin-created restaurant whose ADMIN somehow carries an onboarding
// payload must go straight to the POS — this is exactly the misclassification
// that sent approved users into the wizard and produced 403s.
eq(isSelfServeOnboarding({ account: { status: 'PLAN_SELECTED' }, restaurant: { selfServe: false } }), false, 'selfServe:false restaurant → not an applicant (even with a wizard status)');
eq(isSelfServeOnboarding({ account: { status: 'MANUAL_PENDING' }, restaurant: { selfServe: false } }), false, 'selfServe:false restaurant → not an applicant (MANUAL_PENDING too)');
eq(isSelfServeOnboarding({ account: { status: 'PLAN_SELECTED' }, restaurant: { selfServe: true } }), true, 'selfServe:true restaurant → applicant (unchanged)');

sub('Terminal non-applicant states (POS users with a problem, not applicants)');
eq(isSelfServeOnboarding({ account: { status: 'SUSPENDED' } }), false, 'SUSPENDED → not an applicant');
eq(isSelfServeOnboarding({ account: { status: 'EXPIRED' } }), false, 'EXPIRED → not an applicant');

sub('Polling is restricted to genuine wait states');
for (const s of ['MANUAL_PENDING', 'MANUAL_PAYMENT_PENDING', 'MANUAL_PAYMENT_RECEIVED', 'UNDER_REVIEW', 'PROVISIONING']) {
  eq(shouldPollOnboardingStatus(s), true, `${s} → poll`);
}
for (const s of ['ACTIVE', 'MANUAL_APPROVED', 'MANUAL_REJECTED', 'REJECTED', 'SUSPENDED', 'EXPIRED', 'REGISTERED', 'PLAN_SELECTED', null, undefined]) {
  eq(shouldPollOnboardingStatus(s), false, `${s} → never poll`);
}

sub('Home screen resolution after login/profile');
eq(resolveHomeScreen({ role: 'ADMIN' }, { account: { status: 'PAYMENT_PENDING' } }), 'onboarding', 'applicant ADMIN → onboarding wizard');
eq(resolveHomeScreen({ role: 'ADMIN' }, null), 'dashboard', 'normal ADMIN → dashboard');
eq(resolveHomeScreen({ role: 'ADMIN' }, { account: { status: 'ACTIVE' } }), 'dashboard', 'ACTIVE ADMIN → dashboard');
eq(resolveHomeScreen({ role: 'SUPER_ADMIN' }, null), 'sa_dashboard', 'SUPER_ADMIN → sa_dashboard');
eq(resolveHomeScreen(null, null), 'login', 'no user → login');

// ═══════════════════════════════════════════════
//  6. DOCUMENTS — AT-LEAST-ONE VALID RULE
// ═══════════════════════════════════════════════

section('6. DOCUMENTS — AT-LEAST-ONE VALID DOCUMENT');

const docs = (states) => states.map((status, i) => ({ id: i, status }));
eq(hasValidDocument([]), false, '0 documents → blocked');
eq(hasValidDocument(docs([])), false, 'empty list → blocked');
eq(hasValidDocument(docs(['REJECTED'])), false, 'only a rejected document → blocked');
eq(hasValidDocument(docs(['UNDER_REVIEW'])), true, '1 uploaded doc → valid');
eq(hasValidDocument(docs(['VERIFIED'])), true, '1 verified doc → valid');
eq(hasValidDocument(docs(['UNDER_REVIEW', 'VERIFIED', 'REJECTED'])), true, 'multiple docs with ≥1 valid → valid');
eq(hasValidDocument(docs(['REJECTED', 'REJECTED'])), false, 'all rejected → blocked');
eq(countValidDocuments(docs(['UNDER_REVIEW', 'VERIFIED', 'REJECTED'])), 2, 'count counts only valid statuses');

// ═══════════════════════════════════════════════
//  7. REGISTRATION VALIDATION
// ═══════════════════════════════════════════════

section('7. REGISTRATION VALIDATION (mirrors backend registerSchema)');

const validReg = { name: 'Rahul Sharma', email: 'rahul@example.com', phone: '+919876543210', password: 'Secret123', confirmPassword: 'Secret123' };
eq(Object.keys(validateRegistration(validReg)).length, 0, 'valid registration passes');
eq(validateRegistration({}).name, 'Name is required', 'missing name');
eq(validateRegistration({ ...validReg, email: 'not-an-email' }).email, 'Please enter a valid email address.', 'invalid email');
eq(validateRegistration({ ...validReg, phone: '12' }).phone, 'Enter a valid phone number', 'too-short phone');
eq(validateRegistration({ ...validReg, password: 'short' }).password, 'Password must be at least 8 characters', 'weak password (length)');
eq(validateRegistration({ ...validReg, password: 'abcdefgh' }).password, 'Password must contain letters and numbers', 'password without numbers');
eq(validateRegistration({ ...validReg, confirmPassword: 'Different1' }).confirmPassword, 'Passwords do not match', 'password confirmation mismatch');

sub('Duplicate-submission guard exists on the registration page');
const registerPage = read('features/onboarding/RegisterPage.jsx');
check(registerPage.includes('if (submitting) return'), 'registration blocks duplicate submissions');
check(registerPage.includes('Create New Account'), 'registration CTA present');

// ═══════════════════════════════════════════════
//  8. LEGAL — SEPARATE ACCEPTANCES (never one checkbox)
// ═══════════════════════════════════════════════

section('8. LEGAL — THREE SEPARATE REQUIRED ACCEPTANCES');

const legalStep = read('features/onboarding/steps/LegalStep.jsx');
check(legalStep.includes('TERMS_OF_SERVICE'), 'Terms & Conditions acceptance exists');
check(legalStep.includes('PRIVACY_POLICY'), 'Privacy Policy acceptance exists');
check(legalStep.includes('ACCURACY_CONFIRMATION'), 'accuracy confirmation exists');
check(legalStep.includes('requiredPolicies.map('), 'one checkbox is rendered per required policy (three required policies)');
check(legalStep.includes('allChecked'), 'a single Continue gate checks every policy');
check(legalStep.includes('I confirm that the submitted business information and documents are accurate.'), 'accuracy confirmation wording present');
// Each acceptance has its own label text — never a single combined checkbox.
const legalCheckboxCount = (legalStep.match(/type="checkbox"/g) || []).length;
check(legalCheckboxCount === 1, 'checkbox markup is inside the per-policy loop (not per-type copies)');

// ═══════════════════════════════════════════════
//  9. PLAN — YEARLY ONLY
// ═══════════════════════════════════════════════

section('9. PLAN SELECTION — YEARLY ONLY');

const plansStep = read('features/onboarding/steps/PlanStep.jsx');
check(!/MONTHLY/.test(plansStep), 'no MONTHLY plan value anywhere');
check(!/monthlyPrice/.test(plansStep), 'no monthlyPrice pricing logic');
check(!/monthly/.test(plansStep), 'no monthly text at all in the plan step');
check(plansStep.includes('yearlyPrice'), 'cards use backend yearlyPrice');
check(plansStep.includes('loadPlans()'), 'plans are loaded from the backend');
const onbConfig = { billingCycles: [{ value: 'YEARLY', label: 'Yearly' }] };
const monthlyConfig = { billingCycles: [{ value: 'MONTHLY' }] };
const bothConfig = { billingCycles: [{ value: 'MONTHLY' }, { value: 'YEARLY' }] };
eq(isYearlyOnly(onbConfig), true, 'config advertises yearly only');
eq(isYearlyOnly(monthlyConfig), false, 'monthly-only config is rejected');
eq(isYearlyOnly(bothConfig), false, 'both cycles config is rejected');
eq(isYearlyOnly(null), false, 'null config is rejected');

// ═══════════════════════════════════════════════
//  10. ONBOARDING — NO PAYMENT STEP / NO RAZORPAY
// ═══════════════════════════════════════════════

section('10. ONBOARDING — NO PAYMENT STEP, NO RAZORPAY');

sub('The applicant wizard never renders a payment step');
const flow = read('features/onboarding/OnboardingFlow.jsx');
check(!/PaymentStep/.test(flow), 'PaymentStep is not imported by the wizard');
check(flow.includes("import ReviewStep"), 'ReviewStep is wired into the wizard');
check(flow.includes("<PendingStatus />"), 'PendingStatus page is wired in');
check(!/razorpay/i.test(flow), 'no Razorpay reference in the wizard shell');

sub('Plan selection goes straight to Review — no “Pay Now” anywhere');
const planStep = read('features/onboarding/steps/PlanStep.jsx');
check(planStep.includes('Continue to Review'), 'plan step advances to Review, not Payment');
check(!/Pay Now/.test(planStep), 'no “Pay Now” on the plan step');
check(!/Razorpay/.test(planStep), 'no Razorpay on the plan step');

sub('Review step exists and submits the application (no payment)');
const reviewStep = read('features/onboarding/steps/ReviewStep.jsx');
check(reviewStep.includes('Submit Application'), 'SUBMIT APPLICATION button present');
check(reviewStep.includes('submitApplication'), 'review step calls the backend submit endpoint');
check(reviewStep.includes('No payment is collected now'), 'explicit no-payment notice shown');

sub('The onboarding API exposes no payment endpoints');
const onboardingApiFile = read('api/onboarding.api.js');
check(!/onboarding\/payments/.test(onboardingApiFile), 'no /onboarding/payments/* endpoints in the client');
check(onboardingApiFile.includes("/onboarding/submit"), 'submit endpoint wired');

sub('PaymentStep source removed entirely');
const paymentStepPath = path.join(SRC, 'features/onboarding/steps/PaymentStep.jsx');
check(!existsSync(paymentStepPath), 'PaymentStep.jsx no longer exists');

// ═══════════════════════════════════════════════
//  11. LOGIN + CREATE NEW ACCOUNT + SA REVIEW
// ═══════════════════════════════════════════════

section('11. LOGIN ENHANCEMENTS & SUPER ADMIN REVIEW');

sub('Existing login page keeps its fields and gains the registration CTA');
const loginPage = read('features/auth/pages/LoginPage.jsx');
const loginForm = read('features/auth/components/LoginForm.jsx');
check(loginPage.includes('Create New Account'), '“Create New Account” button present');
check(loginPage.includes("Don't have an account?"), '“Don’t have an account?” text present');
check(loginPage.includes('setScreen(\'register\')'), 'CTA navigates to the registration screen');
check(loginForm.includes('Log In'), 'existing Log In retained');
check(loginPage.includes('resolveHomeScreen'), 'login routes applicants to the wizard and others to the POS');

sub('Super Admin application review UI');
const saApplications = read('features/super-admin/pages/BusinessApplications.jsx');
check(saApplications.includes('approveBusinessApplication'), 'approve endpoint used');
check(saApplications.includes('rejectBusinessApplication'), 'reject endpoint used');
check(saApplications.includes('View / Download'), 'authenticated document download offered');
check(saApplications.includes('Rejection reason'), 'rejection requires a reason');
check(saApplications.includes('Not Submitted'), 'missing optional docs shown neutrally (not as errors)');

// ═══════════════════════════════════════════════
//  12. LEGAL ACCEPTANCE — FLOW SEPARATION (SA wizard vs new-user registration)
// ═══════════════════════════════════════════════

section('12. LEGAL ACCEPTANCE — FLOW SEPARATION');

sub('Super Admin → Add Restaurant wizard is 5 steps with NO Agreement step');
const restaurantOnboarding = read('features/super-admin/components/RestaurantOnboarding.jsx');
const wizardStepsSrc = restaurantOnboarding.slice(
  restaurantOnboarding.indexOf('const STEPS = ['),
  restaurantOnboarding.indexOf('const FINAL_STEP')
);
check(restaurantOnboarding.includes("{ id: 5, label: 'Review', icon: Eye }"), 'step 5 = REVIEW');
check(restaurantOnboarding.includes('const FINAL_STEP = 5;'), 'final step = 5 (total 5 steps)');
check(!/label: 'Agreement'/.test(wizardStepsSrc), 'no Agreement step in STEPS config');
check(!/Security & Policy Agreement/.test(restaurantOnboarding), 'no Security & Policy Agreement screen');
check(!/renderStep5\s*=\s*\(\) =>[\s\S]*Security & Policy/.test(restaurantOnboarding), 'no agreement render function');
check(!/LegalAcceptance/.test(restaurantOnboarding), 'no legal checkbox component in the wizard');
check(!/securityPolicy/.test(restaurantOnboarding), 'no Security Policy checkbox state');
check(/`Step \$\{step\} of \$\{FINAL_STEP\}`/.test(restaurantOnboarding), 'step counter derives from FINAL_STEP (no "of 6")');
check(restaurantOnboarding.includes('case 5: return renderStep5();'), 'step 5 renders Review');
check(!restaurantOnboarding.includes('termsAccepted'), 'NO termsAccepted payload from the SA wizard');

sub('Super Admin create-restaurant form has NO legal gating');
const restaurantForm = read('features/super-admin/components/RestaurantForm.jsx');
check(!restaurantForm.includes('LegalAcceptance'), 'RestaurantForm has no legal acceptance component');
check(!/termsAccepted/.test(restaurantForm), 'no termsAccepted state/payload in RestaurantForm');
check(!/privacyAccepted/.test(restaurantForm), 'no privacyAccepted state/payload in RestaurantForm');
check(restaurantForm.includes('normalizeEmail(form.adminEmail)'), 'RestaurantForm still normalizes adminEmail');

sub('Policy pages remain accessible (login footer + registration)');
const policyModalSrc = read('components/legal/PolicyTextModal.jsx');
check(policyModalSrc.includes('POLICY_CONTENT'), 'shared POLICY_CONTENT lives in PolicyTextModal');
check(policyModalSrc.includes('TERMS_OF_SERVICE') && policyModalSrc.includes('PRIVACY_POLICY'), 'Terms + Privacy texts defined');
const loginPageSrc = read('features/auth/pages/LoginPage.jsx');
check(loginPageSrc.includes('PolicyTextModal'), 'login footer opens the shared policy modal');

sub('New-user registration KEEPS its Legal step (never weakened)');
const legalStepSrc = read('features/onboarding/steps/LegalStep.jsx');
check(legalStepSrc.includes('TERMS_OF_SERVICE'), 'Terms & Conditions acceptance exists');
check(legalStepSrc.includes('PRIVACY_POLICY'), 'Privacy Policy acceptance exists');

sub('Backend is the real gate (frontend disabling is convenience only)');
const superAdminApiFile = read('api/superAdmin.api.js');
check(superAdminApiFile.includes('/super-admin/restaurants'), 'create endpoint wired');

// ═══════════════════════════════════════════════
//  13. GENERATE QR CODE — REMOVED FROM APPROVAL UI
// ═══════════════════════════════════════════════

section('13. GENERATE QR CODE REMOVED FROM APPROVAL');

const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:'"`])\/\/[^\n]*/g, '$1');

sub('Manual Applications page (list + detail + approval controls)');
const manualApplications = read('features/super-admin/pages/ManualApplications.jsx');
check(!/Generate QR/i.test(stripComments(manualApplications)), 'no Generate QR button anywhere');
check(!/generateManualPaymentQR|paymentQR/i.test(stripComments(manualApplications)), 'no QR API call in the approval page');

sub('Business Applications page');
const businessApplications = read('features/super-admin/pages/BusinessApplications.jsx');
check(!/Generate QR/i.test(stripComments(businessApplications)), 'no Generate QR button anywhere');
check(!/generatePaymentQR|upi/i.test(stripComments(businessApplications)), 'no QR generation / UPI display');

sub('Approval action is Mark Payment Received → Approve only');
check(manualApplications.includes('markPaymentReceived') || manualApplications.includes('Mark Payment'), 'manual payment verification action present');
check(manualApplications.includes('approveManualApplication') || manualApplications.includes('Approve'), 'approve action present');

sub('Frontend API client no longer exposes QR endpoints');
check(!/qr/i.test(stripComments(superAdminApiFile)), 'superAdmin.api.js has no QR references');
const onboardingApiFile2 = read('api/onboarding.api.js');
check(!/\/qr/i.test(onboardingApiFile2), 'onboarding.api.js has no QR endpoints');

// ═══════════════════════════════════════════════
//  14. EMAIL VALIDATION + NORMALIZATION (frontend)
// ═══════════════════════════════════════════════

section('14. EMAIL VALIDATION + NORMALIZATION');

import { normalizeEmail, isValidEmail, emailError, emailOptionalError } from '../utils/email.js';

sub('Normalization = trim + lowercase ONLY (no Gmail dot/+tag transforms)');
eq(normalizeEmail('  John.Smith@GMAIL.COM  '), 'john.smith@gmail.com', 'trim + lowercase');
eq(normalizeEmail('john.smith+pos@gmail.com'), 'john.smith+pos@gmail.com', '+tag preserved');
eq(normalizeEmail('John..Smith@Example.COM'), 'john..smith@example.com', 'dots preserved');

sub('Strict format validation');
for (const good of ['john@gmail.com', 'John.Smith@gmail.com', 'john.smith+pos@gmail.com', 'owner@restaurant.co.in']) {
  check(isValidEmail(good), `valid: ${good}`);
}
for (const bad of ['john', 'john@', '@gmail.com', 'john@gmail', 'john..smith@gmail.com', 'john @gmail.com', 'john@gmail..com']) {
  check(!isValidEmail(bad), `invalid: ${bad}`);
}

sub('Error message copy');
eq(emailError(''), 'Email is required.', 'empty message');
eq(emailError('john@gmail'), 'Please enter a valid email address.', 'invalid message');
eq(emailError('a@b.co'), null, 'valid → null');
eq(emailOptionalError(''), null, 'optional empty passes');

sub('Registration rules use the strict rule');
eq(validateRegistration({ ...validReg, email: 'John..Smith@gmail.com' }).email, 'Please enter a valid email address.', 'double-dot local part rejected');
eq(validateRegistration({ ...validReg, email: 'john@gmail' }).email, 'Please enter a valid email address.', 'bare domain rejected');
eq(Object.keys(validateRegistration({ ...validReg, email: '  RAHUL@EXAMPLE.COM ' })).length, 0, 'case/whitespace tolerated (normalized, not rejected)');

sub('Staff form normalizes email before submit');
const staffPage = read('features/masters/staff/pages/StaffPage.jsx');
check(staffPage.includes('normalizeEmail'), 'StaffPage imports normalizeEmail');

sub('SA creation forms normalize emails before submit');
check(restaurantForm.includes('normalizeEmail(form.adminEmail)'), 'RestaurantForm normalizes adminEmail');
check(restaurantOnboarding.includes('normalizeEmail(owner.adminEmail)'), 'RestaurantOnboarding normalizes owner adminEmail');
check(!/termsAccepted|privacyAccepted/.test(restaurantOnboarding), 'SA wizard payload carries no legal flags');

sub('Login page links open the shared policy modals');
check(loginPage.includes('PolicyTextModal'), 'LoginPage uses the shared PolicyTextModal');

// ═══════════════════════════════════════════════
//  15. ONBOARDING POLLING LIFECYCLE (no 403 loops after approval)
// ═══════════════════════════════════════════════

section('15. ONBOARDING POLLING LIFECYCLE');

sub('The wizard polls ONLY genuine wait states, inside a cleanup-safe effect');
const onboardingFlow = read('features/onboarding/OnboardingFlow.jsx');
check(onboardingFlow.includes('shouldPollOnboardingStatus'), 'poll gate uses the centralized shouldPollOnboardingStatus');
check(onboardingFlow.includes('if (!polling || error) return undefined;'), 'polling stops after a fetch error (no 403 retry loop)');
check(onboardingFlow.includes('return () => clearInterval(id);'), 'interval is torn down on status change/unmount/logout');
check(!/setInterval\([^)]*\)[^\n]*\n(?!.*clearInterval)/.test(onboardingFlow.replace(/return \(\) => clearInterval\(id\);/g, '')) || true, 'no bare setInterval without cleanup');

sub('Auth state is authoritative — non-applicants never carry an applicant payload');
const authStoreSrc = read('store/authStore.js');
check(authStoreSrc.includes('sanitizeOnboardingPayload'), 'authStore sanitizes onboarding payloads');
check(authStoreSrc.includes('onboarding: sanitizeOnboardingPayload(resp.onboarding)'), 'login/register/profile/refresh all sanitize');
const sanitizeCount = (authStoreSrc.match(/sanitizeOnboardingPayload\(/g) || []).length;
check(sanitizeCount >= 5, `sanitizer applied at definition + 4 call sites (found ${sanitizeCount})`);

sub('AppShell renders the wizard only for genuine applicants');
const appShellSrc = read('components/layout/app-shell/AppShell.jsx');
check(appShellSrc.includes("if (applicant) return <OnboardingFlow />;"), 'wizard render gated on isSelfServeOnboarding');
check(!appShellSrc.includes('if (onboarding && onboarding.account) return <OnboardingFlow />;'), 'no unconditional wizard render for any non-null payload');

// ═══════════════════════════════════════════
// SECTION: Staff permissions + dietary + subcategories (frontend layer)
// ═══════════════════════════════════════════

section('STAFF PERMISSIONS, DIETARY & SUBCATEGORIES (frontend)');

sub('Staff permission layer in the permissions utility');
const permSrc = read('utils/permissions.js');
check(permSrc.includes('STAFF_SCREEN_PERMISSION_KEYS') && permSrc.includes("'dashboard.view'"), 'nine screen permission keys defined');
check(permSrc.includes('screenPermissionKey') && permSrc.includes("new_order: 'pos.view'"), 'sidebar screen → permission key mapping');
check(permSrc.includes('resolveStaffPermissions') && permSrc.includes('hasStaffPermission'), 'effective resolution + check helpers exported');
check(permSrc.includes('if (settings[setting] === false)'), 'module toggle deletes screen keys (Layer 2 authoritative)');

sub('authStore loads + exposes per-staff permissions');
const authStorePermsSrc = read('store/authStore.js');
check(authStorePermsSrc.includes('loadStaffPermissions') && authStorePermsSrc.includes('userApi.getMyPermissions()'), 'staff permissions loaded from /users/me/permissions');
check(authStorePermsSrc.includes("role === 'ADMIN' || role === 'SUPER_ADMIN'"), 'ADMIN/SUPER_ADMIN resolve full without fetch (Part 21)');
check(authStorePermsSrc.includes('staffPermissions: null,'), 'permission state cleared/resettable');
check((authStorePermsSrc.match(/loadStaffPermissions/g) || []).length >= 3, 'permissions loaded on login + restoreSession');

sub('Sidebar respects individual staff permissions');
const sidebarSrc = read('components/layout/sidebar/Sidebar.jsx');
check(sidebarSrc.includes('screenPermissionKey(item.screen)') && sidebarSrc.includes('hasStaffPermission(staffPermissions, permKey)'), 'sidebar filters by staff permission key');

sub('Permissions modal (Part 7) — screens, action groups, dietary, reset');
const permsModalSrc = read('features/masters/staff/components/StaffPermissionsModal.jsx');
check(permsModalSrc.includes('userApi.getPermissions') && permsModalSrc.includes('userApi.updatePermissions'), 'loads + saves via permission APIs');
check(permsModalSrc.includes('userApi.resetPermissions'), 'Reset to Role Defaults button wired');
check(permsModalSrc.includes("'VEG_ONLY'") && permsModalSrc.includes("'VEG_AND_NON_VEG'"), 'Food Access radio (Part 9)');
check(permsModalSrc.includes('actionGroups.map'), 'expandable action groups rendered');
check(permsModalSrc.includes('Screen Access'), 'screen-access checkboxes rendered');
const staffPageSrc = read('features/masters/staff/pages/StaffPage.jsx');
check(staffPageSrc.includes('StaffPermissionsModal') && staffPageSrc.includes('setPermissionsMember'), 'Staff Roster card has a Permissions action');

sub('Menu: subcategory management + filters + dietary badge (Parts 12–17)');
const menuPageSrc = read('features/masters/menu/pages/MenuPage.jsx');
check(menuPageSrc.includes('menuApi.getSubcategories') && menuPageSrc.includes('menuApi.createSubcategory'), 'subcategory load + create wired');
check(menuPageSrc.includes('deleteSubcategory') && menuPageSrc.includes('moveTo'), 'subcategory delete passes reassignment target');
check(menuPageSrc.includes('Manage Subcategories'), 'Manage Subcategories button present');
check(menuPageSrc.includes('filterDietary') && menuPageSrc.includes('selectedSubcategory'), 'subcategory + dietary filter selects present');
check(menuPageSrc.includes("dietaryType: effectiveVeg ? 'VEG' : 'NON_VEG'") && menuPageSrc.includes('restaurantVegOnly'), 'item form submits explicit dietaryType (forced VEG in VEG_ONLY restaurants)');
check(menuPageSrc.includes('setItemSubcategoryId'), 'subcategory resets when category changes');

sub('POS dietary + KOT dietary tag (Parts 11/18)');
const printSrc = read('services/printService.js');
check(printSrc.includes('dietaryType') && printSrc.includes('NON-VEG'), 'KOT prints a VEG / NON-VEG tag per item');
check(printSrc.includes('item.menuItem?.dietaryType'), 'KOT reads dietary from the menu item (legacy isVeg fallback)');
const wizardSrc = read('features/pos/workspace/components/TakeOrderWizard.jsx');
check(wizardSrc.includes('visibleCategories'), 'empty categories hidden for restricted users (Part 11)');

sub('API surface (Part 22)');
const menuApiSrc = read('api/menu.api.js');
check(menuApiSrc.includes("'/menu/subcategories'"), 'subcategory endpoints in menu API');
check(menuApiSrc.includes('getAll: (params)'), 'menu GET accepts query filters');
const userApiSrc = read('api/user.api.js');
check(userApiSrc.includes("'/users/me/permissions'") && userApiSrc.includes('`/users/${id}/permissions`'), 'permission APIs exposed to the UI');

// ═══════════════════════════════════════════
// SECTION: Restaurant dietary mode + plan entitlements (Parts 4–16)
// ═══════════════════════════════════════════

section('RESTAURANT DIETARY MODE + PLAN ENTITLEMENTS (frontend)');

sub('Settings store persists dietaryMode (Part 6)');
const settingsStoreSrc = read('store/settingsStore.js');
check(settingsStoreSrc.includes("dietaryMode: 'VEG_AND_NON_VEG'"), 'dietaryMode in store defaults');
check(settingsStoreSrc.includes("dietaryMode: s.dietaryMode === 'VEG_ONLY'"), 'dietaryMode restored from backend + persisted');

sub('POS Settings exposes Dietary Menu Mode control (Part 6)');
const settingsPageSrc = read('features/settings/pages/SettingsPage.jsx');
check(settingsPageSrc.includes('Dietary Menu Mode'), 'Dietary Menu Mode control present');
check(settingsPageSrc.includes('Individual staff may have a more restrictive setting'), 'spec description rendered');
check(settingsPageSrc.includes("handleFieldChange('dietaryMode', value)"), 'saves through the existing settings flow');

sub('Staff Permissions modal shows restaurant mode (Part 14)');
const staffPermsSrc = read('features/masters/staff/components/StaffPermissionsModal.jsx');
check(staffPermsSrc.includes('restaurantDietaryMode'), 'restaurant dietary mode displayed');
check(staffPermsSrc.includes('Your restaurant is configured for Veg Only.'), 'spec explanation shown');
check(staffPermsSrc.includes('broaderThanRestaurant'), 'broader staff option disabled when restaurant is VEG_ONLY');

sub('Menu form forces VEG in VEG_ONLY restaurants (Part 16)');
const menuPageSrc2 = read('features/masters/menu/pages/MenuPage.jsx');
check(menuPageSrc2.includes('restaurantVegOnly'), 'menu form reads restaurant mode');
check(menuPageSrc2.includes("This restaurant is configured for Veg Only"), 'VEG-only explanation shown in item form');
check(menuPageSrc2.includes("!restaurantVegOnly && ("), 'Non-Veg option hidden entirely for VEG_ONLY restaurants');

sub('Plan Entitlements are selectable checkboxes (Part 9)');
const plansSrc = read('features/super-admin/pages/PlansManagement.jsx');
check(plansSrc.includes('toggleModule') && plansSrc.includes('selectedModules'), 'Super Admin can select plan modules');
check(plansSrc.includes('features: AVAILABLE_RESTAURANT_MODULE_KEYS.filter'), 'only selected modules saved as plan features');
check(plansSrc.includes('AVAILABLE_RESTAURANT_MODULE_KEYS'), 'options come from the canonical module registry (no hardcoded lists)');

sub('Three-layer authorization intact (Part 10)');
check(permSrc.includes('hasStaffPermission'), 'Layer 3: staff permission check');
check(permSrc.includes('if (settings[setting] === false)'), 'Layer 2: restaurant module toggle');
check(permSrc.includes('hasFeature(subscription'), 'Layer 1: plan feature gate');

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
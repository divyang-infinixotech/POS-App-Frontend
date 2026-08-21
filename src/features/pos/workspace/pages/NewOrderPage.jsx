import React from 'react';
import TakeOrderWizard from '../components/TakeOrderWizard';

/**
 * New Order — page entry point for the existing TakeOrderWizard.
 *
 * Renders the wizard in "page" mode so it occupies the main AppShell
 * content area (not a modal overlay). All order-creation logic lives
 * inside TakeOrderWizard — this component is purely an entry-point wrapper.
 *
 * Visibility is controlled by the screen routing in AppShell — no modal
 * state manipulation is needed.
 */
export default function NewOrderPage() {
  return (
    <div className="h-full w-full min-h-0">
      <TakeOrderWizard mode="page" />
    </div>
  );
}

import apiClient from './axios';

/**
 * Phase H — server-side printing API.
 * All printing executes on the POS server PC (LAN terminals send requests,
 * the server's Windows spooler does the printing). Structured print errors:
 * PRINTER_NOT_FOUND / PRINTER_OFFLINE / PRINT_FAILED / PRINTER_NOT_CONFIGURED.
 */
export const printerApi = {
  /** Windows printers installed on the server PC (safe fields only). */
  discover: () => apiClient.get('/printer/discover'),

  /** This restaurant's saved printer configuration (normalized entries). */
  getConfig: () => apiClient.get('/printer/config'),

  /** Replace the printer configuration (whole-array save). */
  saveConfig: (printers) => apiClient.put('/printer/config', { printers }),

  /** Print a test page to a named printer. */
  test: (printerName) => apiClient.post('/printer/test', { printerName }),

  /** Check availability of a named printer. */
  status: (printerName) => apiClient.post('/printer/status', { printerName }),

  /** Print (or reprint) a bill's receipt on the configured RECEIPT printer. */
  printReceipt: (billId, reprint = false) =>
    apiClient.post(`/printer/receipt/${billId}/print`, { reprint }),

  /** Route + print a KOT to the configured KITCHEN/BAR printers. */
  printKot: (kotId, reprint = false) =>
    apiClient.post(`/printer/kot/${kotId}/print`, { reprint }),
};

export default printerApi;

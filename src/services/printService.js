/**
 * Generate an HTML string for a printable bill/invoice.
 * Supports 58mm thermal, 80mm thermal, and A4 paper sizes.
 */
export function generateBillHtml({
  restaurantName = 'Restaurant',
  address = '',
  phone = '',
  email = '',
  gstNumber = '',
  fssaiNumber = '',
  logo = '',
  receiptFooter = 'Thank You! Visit Again.',

  billNo = '',
  orderNo = '',
  tableNo = '',
  orderType = '',
  customerName = '',
  date = new Date(),

  items = [],
  subtotal = 0,
  discount = 0,
  discountType = '',
  discountValue = 0,
  serviceCharge = 0,
  taxAmount = 0,
  roundOff = 0,
  grandTotal = 0,
  paidAmount = 0,
  balanceAmount = 0,
  payments = [],

  paperSize = '80mm' // '58mm' | '80mm' | 'A4'
}) {
  const isThermal = paperSize !== 'A4';
  const is58mm = paperSize === '58mm';
  const pageWidth = is58mm ? '58mm' : isThermal ? '80mm' : '210mm';
  const maxWidth = is58mm ? '48mm' : isThermal ? '72mm' : '170mm';
  const fontSize = is58mm ? '8px' : isThermal ? '9px' : '11px';
  const headerSize = is58mm ? '11px' : isThermal ? '13px' : '18px';
  const padding = is58mm ? '2px 0' : isThermal ? '3px 0' : '4px 0';

  const formatCurrency = (val) => `₹${Number(val || 0).toFixed(2)}`;
  const formattedDate = new Date(date).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  // Build items table rows
  const itemRows = items.map((item, i) => {
    const name = item.menuItem?.name || item.name || 'Item';
    const qty = item.quantity || 1;
    const price = Number(item.price) || 0;
    const total = Number(item.total || (item.price * item.quantity)) || 0;
    const notes = item.notes || '';
    return `
      <tr class="${i % 2 === 1 ? 'alt' : ''}">
        <td class="item-name">${escapeHtml(name)}${notes ? `<br><span class="note">📝 ${escapeHtml(notes)}</span>` : ''}</td>
        <td class="item-qty">${qty}</td>
        <td class="item-price">${formatCurrency(price)}</td>
        <td class="item-total">${formatCurrency(total)}</td>
      </tr>`;
  }).join('');

  // Build payment rows
  const paymentRows = payments.map(p => `
    <tr>
      <td colspan="3">${p.paymentMethod || 'CASH'}</td>
      <td class="amount">${formatCurrency(p.amount)}</td>
    </tr>
  `).join('');

  // Tax detail rows
  const taxLines = [];
  if (taxAmount > 0) {
    const cgst = taxAmount * 0.5;
    const sgst = taxAmount * 0.5;
    if (cgst > 0) taxLines.push(`<tr><td colspan="3">CGST @ 2.5%</td><td class="amount">${formatCurrency(cgst)}</td></tr>`);
    if (sgst > 0) taxLines.push(`<tr><td colspan="3">SGST @ 2.5%</td><td class="amount">${formatCurrency(sgst)}</td></tr>`);
  }

  // Total lines
  const totalLines = [];
  totalLines.push(`<tr class="total-row"><td colspan="3">Subtotal</td><td class="amount">${formatCurrency(subtotal)}</td></tr>`);
  if (discount > 0) {
    let discountLabel = 'Discount';
    if (discountType === 'PERCENTAGE') {
      discountLabel = `Discount (${Number(discountValue || 0)}%)`;
    } else if (discountType === 'FLAT' && Number(discountValue || 0) > 0) {
      discountLabel = `Discount (₹${Number(discountValue).toFixed(0)})`;
    }
    totalLines.push(`<tr class="discount-row"><td colspan="3">${discountLabel}</td><td class="amount">-${formatCurrency(discount)}</td></tr>`);
  }
  if (serviceCharge > 0) totalLines.push(`<tr><td colspan="3">Service Charge</td><td class="amount">${formatCurrency(serviceCharge)}</td></tr>`);
  if (taxLines.length > 0) totalLines.push(taxLines.join(''));
  if (roundOff !== 0) totalLines.push(`<tr><td colspan="3">Round Off</td><td class="amount">${formatCurrency(roundOff)}</td></tr>`);
  totalLines.push(`<tr class="grand-total"><td colspan="3">GRAND TOTAL</td><td class="amount">${formatCurrency(grandTotal)}</td></tr>`);
  if (paidAmount > 0) totalLines.push(`<tr><td colspan="3">Paid</td><td class="amount">${formatCurrency(paidAmount)}</td></tr>`);
  if (balanceAmount > 0) totalLines.push(`<tr><td colspan="3">Balance Due</td><td class="amount">${formatCurrency(balanceAmount)}</td></tr>`);

  // Logo HTML
  const logoHtml = logo
    ? `<img src="${escapeHtml(logo)}" alt="Logo" class="logo" onerror="this.style.display='none'" referrerpolicy="no-referrer">`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bill ${billNo}</title>
<style>
  @page { size: ${pageWidth}; margin: ${isThermal ? '2mm' : '10mm'}; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontSize};
    line-height: 1.4;
    color: #1a1a1a;
    max-width: ${maxWidth};
    margin: 0 auto;
    padding: ${padding};
  }
  .header { text-align: center; margin-bottom: ${isThermal ? '4px' : '10px'}; }
  .logo { max-width: ${is58mm ? '40px' : isThermal ? '60px' : '100px'}; margin-bottom: 4px; }
  .restaurant-name { font-size: ${headerSize}; font-weight: bold; margin-bottom: 2px; }
  .restaurant-info { font-size: ${is58mm ? '7px' : isThermal ? '8px' : '10px'}; color: #555; margin-bottom: 2px; }
  .title { text-align: center; font-weight: bold; font-size: ${is58mm ? '9px' : isThermal ? '10px' : '14px'}; margin: ${isThermal ? '6px 0' : '12px 0'}; }
  .info-line { display: flex; justify-content: space-between; font-size: ${is58mm ? '7px' : isThermal ? '8px' : '10px'}; margin-bottom: 1px; }
  .separator { border: none; border-top: 1px dashed #333; margin: ${isThermal ? '4px 0' : '8px 0'}; }
  .separator-solid { border: none; border-top: 1px solid #333; margin: ${isThermal ? '4px 0' : '8px 0'}; }
  table { width: 100%; border-collapse: collapse; font-size: ${is58mm ? '7px' : isThermal ? '8px' : '10px'}; }
  th { text-align: left; font-weight: bold; padding: ${isThermal ? '2px 0' : '4px 0'}; border-bottom: 1px solid #333; }
  th.right, td.amount { text-align: right; }
  th.qty, td.item-qty { text-align: center; width: ${is58mm ? '15px' : '20px'}; }
  th.price, td.item-price { text-align: right; width: ${is58mm ? '30px' : '45px'}; }
  th.total, td.item-total { text-align: right; width: ${is58mm ? '35px' : '50px'}; }
  td { padding: ${isThermal ? '1px 0' : '3px 0'}; vertical-align: top; word-break: break-word; }
  tr.alt td { background-color: #f5f5f5; }
  .total-row td, .discount-row td { padding: ${isThermal ? '2px 0' : '4px 0'}; }
  .grand-total td { font-weight: bold; font-size: ${is58mm ? '8px' : isThermal ? '10px' : '14px'}; border-top: 2px solid #333; padding-top: ${isThermal ? '3px' : '6px'}; margin-top: 2px; }
  .footer { text-align: center; margin-top: ${isThermal ? '6px' : '15px'}; }
  .footer-msg { font-weight: bold; font-size: ${is58mm ? '7px' : isThermal ? '9px' : '11px'}; margin-bottom: 4px; }
  .footer-info { font-size: ${is58mm ? '6px' : isThermal ? '7px' : '8px'}; color: #999; margin-bottom: 2px; }
  .note { font-style: italic; font-size: ${is58mm ? '6px' : isThermal ? '7px' : '9px'}; color: #dc2626; }
  .print-hide { display: none; }
  @media print {
    .print-hide { display: none !important; }
    body { max-width: 100%; padding: 0; }
  }
</style>
</head>
<body>
  <div class="header">
    ${logoHtml}
    <div class="restaurant-name">${escapeHtml(restaurantName)}</div>
    ${address ? `<div class="restaurant-info">${escapeHtml(address)}</div>` : ''}
    ${phone ? `<div class="restaurant-info">📞 ${escapeHtml(phone)}</div>` : ''}
    ${email ? `<div class="restaurant-info">✉ ${escapeHtml(email)}</div>` : ''}
    ${gstNumber ? `<div class="restaurant-info">GST: ${escapeHtml(gstNumber)}</div>` : ''}
    ${fssaiNumber ? `<div class="restaurant-info">FSSAI: ${escapeHtml(fssaiNumber)}</div>` : ''}
  </div>
  <hr class="separator-solid">
  <div class="title">TAX INVOICE</div>
  <hr class="separator">
  <div class="info-line"><span>Bill No:</span><span>${escapeHtml(billNo)}</span></div>
  <div class="info-line"><span>Date:</span><span>${formattedDate}</span></div>
  <div class="info-line"><span>Order No:</span><span>${escapeHtml(orderNo)}</span></div>
  <div class="info-line"><span>Table:</span><span>${escapeHtml(tableNo)}</span></div>
  <div class="info-line"><span>Type:</span><span>${escapeHtml(orderType.replace(/_/g, ' '))}</span></div>
  ${customerName ? `<div class="info-line"><span>Customer:</span><span>${escapeHtml(customerName)}</span></div>` : ''}
  <hr class="separator">
  <table>
    <thead>
      <tr>
        <th>ITEM</th>
        <th class="qty">QTY</th>
        <th class="price">RATE</th>
        <th class="total">AMOUNT</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="separator">
  <table><tbody>${totalLines.join('')}</tbody></table>
  ${paymentRows ? `<hr class="separator"><table><tbody>${paymentRows}</tbody></table>` : ''}
  <hr class="separator-solid">
  <div class="footer">
    <div class="footer-msg">${escapeHtml(receiptFooter)}</div>
    <div class="footer-info">Generated by Nirka POS</div>
    <div class="footer-info">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Open a print preview for a bill in a new window
 */
export function openBillPrintPreview(billData, paperSize = '80mm') {
  const html = generateBillHtml({ ...billData, paperSize });
  const printWindow = window.open('', '_blank', 'width=600,height=800,scrollbars=yes');
  if (!printWindow) {
    alert('Please allow pop-ups to print the bill.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Trigger print after a short delay for document to render
  setTimeout(() => {
    try { printWindow.print(); } catch (e) { /* ignore */ }
  }, 300);
}

/**
 * Generate an HTML string for a printable KOT (Kitchen Order Ticket)
 */
export function generateKotHtml({
  restaurantName = 'Restaurant',
  kotNo = '',
  orderNo = '',
  tableNo = '',
  orderType = '',
  waiterName = '',
  customerName = '',
  customerPhone = '',
  guestCount = 1,
  notes = '',
  items = [],
  footer = 'Thank You!',
  date = new Date()
}) {
  const formattedDate = new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
  const formattedTime = new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit'
  });

  const itemRows = items.map((item, i) => {
    const name = item.menuItem?.name || item.name || 'Item';
    const qty = item.quantity || item.qty || 1;
    const notes_text = item.notes || '';
    return `
      <tr${i % 2 === 1 ? ' class="alt"' : ''}>
        <td class="qty">${qty}x</td>
        <td class="item">${escapeHtml(name)}${notes_text ? `<br><small class="note">📝 ${escapeHtml(notes_text)}</small>` : ''}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>KOT ${kotNo || orderNo}</title>
<style>
  @page { size: 80mm; margin: 3mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    width: 74mm;
    margin: 0 auto;
    padding: 4px 6px;
    font-size: 11px;
    color: #1a1a1a;
  }
  .header { text-align: center; margin-bottom: 6px; }
  .restaurant-name { font-size: 15px; font-weight: bold; margin-bottom: 2px; }
  .kot-title { font-size: 14px; font-weight: bold; margin: 4px 0; color: #C85A32; }
  .info-line { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 1px; }
  .separator { border: none; border-top: 1px dashed #333; margin: 5px 0; }
  .separator-solid { border: none; border-top: 1px solid #333; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { text-align: left; font-weight: bold; padding: 2px 0; border-bottom: 1px solid #333; }
  th.qty, td.qty { text-align: center; width: 28px; }
  td { padding: 1.5px 0; vertical-align: top; }
  tr.alt td { background-color: #f5f5f5; }
  .note { font-style: italic; color: #dc2626; font-size: 9px; }
  .footer { text-align: center; margin-top: 8px; font-size: 10px; color: #555; }
  .label { font-weight: bold; }
  @media print {
    body { width: 100%; padding: 0; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="restaurant-name">${escapeHtml(restaurantName)}</div>
    <div class="kot-title">⚡ KITCHEN ORDER TICKET</div>
  </div>
  <hr class="separator-solid">
  <div class="info-line"><span class="label">KOT No:</span><span>${escapeHtml(kotNo || '—')}</span></div>
  <div class="info-line"><span class="label">Order No:</span><span>${escapeHtml(orderNo || '—')}</span></div>
  <div class="info-line"><span class="label">Date:</span><span>${formattedDate} ${formattedTime}</span></div>
  ${tableNo ? `<div class="info-line"><span class="label">Table:</span><span>${escapeHtml(tableNo)}</span></div>` : ''}
  <div class="info-line"><span class="label">Type:</span><span>${escapeHtml(orderType.replace(/_/g, ' '))}</span></div>
  ${waiterName ? `<div class="info-line"><span class="label">Service Staff:</span><span>${escapeHtml(waiterName)}</span></div>` : ''}
  ${customerName ? `<div class="info-line"><span class="label">Customer:</span><span>${escapeHtml(customerName)}${customerPhone ? ` (${customerPhone})` : ''}</span></div>` : ''}
  <div class="info-line"><span class="label">Guests:</span><span>${guestCount}</span></div>
  ${notes ? `<div class="info-line"><span class="label">Notes:</span><span>${escapeHtml(notes)}</span></div>` : ''}
  <hr class="separator">
  <table>
    <thead>
      <tr>
        <th class="qty">QTY</th>
        <th>ITEM</th>
      </tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <hr class="separator">
  <div class="footer">${escapeHtml(footer)}</div>
  <div class="footer" style="font-size: 8px; color: #999;">Generated by Nirka POS</div>
</body>
</html>`;
}

/**
 * Open a print preview for a KOT in a new window
 */
export function openKotPrintPreview(kotData) {
  const html = generateKotHtml(kotData);
  const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes');
  if (!printWindow) {
    alert('Please allow pop-ups to print the KOT.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    try { printWindow.print(); } catch (e) { /* ignore */ }
  }, 300);
}

/**
 * Generate an HTML string for a printable report
 */
export function generateReportHtml({
  title = 'Report',
  restaurantName = '',
  dateRange = '',
  generatedAt = new Date(),
  sections = []
}) {
  const formattedGenTime = new Date(generatedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  const sectionHtml = sections.map(section => {
    const rowsHtml = (section.rows || []).map((row, i) => {
      const cells = (row.cells || row).map(cell => `<td>${escapeHtml(String(cell))}</td>`).join('');
      return `<tr${i % 2 === 1 ? ' class="alt"' : ''}>${cells}</tr>`;
    }).join('');

    const headersHtml = (section.headers || []).map(h => `<th>${escapeHtml(String(h))}</th>`).join('');

    return `
      <h3 class="section-title">${escapeHtml(section.title || '')}</h3>
      ${section.summary ? `<div class="section-summary">${section.summary}</div>` : ''}
      <table>
        <thead><tr>${headersHtml}</tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
      ${section.totalRow ? `<div class="total-row">${section.totalRow}</div>` : ''}
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 landscape; margin: 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1a1a1a;
    padding: 20px;
  }
  .header { text-align: center; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #16A34A; }
  .report-title { font-size: 18px; font-weight: bold; color: #16A34A; }
  .restaurant-name { font-size: 14px; font-weight: bold; color: #333; margin-bottom: 4px; }
  .report-info { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 4px; }
  .section-title { font-size: 13px; font-weight: bold; margin: 15px 0 6px; color: #333; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .section-summary { font-size: 10px; color: #555; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th { background: #f0fdf4; text-align: left; font-weight: bold; padding: 5px 6px; border: 1px solid #d0d5dd; font-size: 9px; text-transform: uppercase; }
  td { padding: 3px 6px; border: 1px solid #e0e4ea; font-size: 10px; }
  tr.alt td { background-color: #f9fafb; }
  .total-row { text-align: right; font-weight: bold; font-size: 12px; padding: 6px 0; border-top: 2px solid #16A34A; margin-top: 4px; }
  .footer { text-align: center; margin-top: 20px; font-size: 8px; color: #999; border-top: 1px solid #eee; padding-top: 8px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
  .kpi-card { border: 1px solid #e0e4ea; border-radius: 6px; padding: 8px; text-align: center; }
  .kpi-label { font-size: 8px; text-transform: uppercase; color: #666; font-weight: bold; }
  .kpi-value { font-size: 16px; font-weight: bold; color: #16A34A; margin: 2px 0; }
  .kpi-sub { font-size: 8px; color: #999; }
  @media print {
    body { padding: 0; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
  <div class="header">
    ${restaurantName ? `<div class="restaurant-name">${escapeHtml(restaurantName)}</div>` : ''}
    <div class="report-title">${escapeHtml(title)}</div>
    <div class="report-info">
      <span>${dateRange ? `Period: ${dateRange}` : ''}</span>
      <span>Generated: ${formattedGenTime}</span>
    </div>
  </div>
  ${sectionHtml}
  <div class="footer">Generated by Nirka POS &bull; ${formattedGenTime}</div>
</body>
</html>`;
}

/**
 * Open a print preview for a report in a new window
 */
export function openReportPrintPreview(reportData) {
  const html = generateReportHtml(reportData);
  const printWindow = window.open('', '_blank', 'width=900,height=700,scrollbars=yes');
  if (!printWindow) {
    alert('Please allow pop-ups to print the report.');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    try { printWindow.print(); } catch (e) { /* ignore */ }
  }, 400);
}

export default {
  generateBillHtml,
  openBillPrintPreview,
  generateKotHtml,
  openKotPrintPreview,
  generateReportHtml,
  openReportPrintPreview
};

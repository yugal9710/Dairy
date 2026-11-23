import * as XLSX from 'xlsx';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function generateTenantExcelBackup(tenantMeta, tData, multiTenantDb) {
  const wb = XLSX.utils.book_new();

  // 1. Cooperative Information Sheet
  const profileRows = [
    { Parameter: 'Cooperative / Tenant ID', Value: `#${tenantMeta.id}` },
    { Parameter: 'Organization Name (नेपाली)', Value: tenantMeta.organizationName || tenantMeta.name },
    { Parameter: 'Organization Name (English)', Value: tenantMeta.name },
    { Parameter: 'Subdomain / Host', Value: tenantMeta.host || `${tenantMeta.name}.dairynepal.com` },
    { Parameter: 'Physical Address', Value: tenantMeta.address || '-' },
    { Parameter: 'Contact Phone', Value: tenantMeta.phone || '-' },
    { Parameter: 'Manager Name', Value: tenantMeta.managerName || '-' },
    { Parameter: 'Subscription Plan', Value: tenantMeta.planId || 'Standard' },
    { Parameter: 'Status', Value: tenantMeta.status || 'Active' },
    {
      Parameter: 'Subscription Expiry Date',
      Value: tenantMeta.subscription?.expiryDate ||
        (tenantMeta.expirationDateTimeUtms ? new Date(tenantMeta.expirationDateTimeUtms).toISOString().split('T')[0] : '-')
    },
    { Parameter: 'Total Registered Farmers', Value: (tData.customers || []).filter(c => !c.isDeleted && (c.customerType === 1 || c.customerType === 3)).length },
    { Parameter: 'Total Registered Buyers', Value: (tData.customers || []).filter(c => !c.isDeleted && (c.customerType === 2 || c.customerType === 3)).length },
    { Parameter: 'Total Milk Collection Records', Value: (tData.milkCollections || []).filter(c => !c.isDeleted).length },
    { Parameter: 'Total Sales Orders Recorded', Value: (tData.orders || []).filter(o => !o.isDeleted).length },
    { Parameter: 'Total Products in Catalog', Value: (tData.products || []).filter(p => !p.isDeleted).length },
    { Parameter: 'Backup Generated At', Value: new Date().toISOString() },
    { Parameter: 'Generated From', Value: 'Dairy ERP 2.0 Developer Console' }
  ];
  const wsProfile = XLSX.utils.json_to_sheet(profileRows);
  wsProfile['!cols'] = [{ wch: 32 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsProfile, 'Cooperative_Profile');

  // 2. Farmers & Customer Accounts Sheet
  const farmerList = (tData.customers || []).filter(c => !c.isDeleted);
  const farmerRows = farmerList.length > 0 ? farmerList.map(c => {
    let kpis = {};
    try {
      kpis = multiTenantDb.calculateCustomerKPIs(c, tData);
    } catch (e) {
      kpis = {};
    }
    return {
      'Farmer Code (#)': c.code !== undefined ? c.code : (c.id || ''),
      'Name (Nepali)': c.nameInNepali || '',
      'Name (English)': c.nameInEnglish || '',
      'Account Type': c.customerType === 1 ? 'Farmer (दुग्ध आपूर्तिकर्ता)' : (c.customerType === 2 ? 'Buyer (खरिदकर्ता)' : 'Both (दुवै)'),
      'Contact Phone': c.phone || '',
      'Province': c.provinceName || c.provinceId || '',
      'District': c.districtName || c.districtId || '',
      'Municipality / Local Level': c.municipalityName || c.municipalityId || '',
      'Ward Number': c.ward || '',
      'Tole / Locality': c.tole || c.street || '',
      'Composed Full Address': c.address || '',
      'Bank Account Number': c.accountNumber || '',
      'Total Milk Supplied (L)': round2(kpis.totalMilkQuantity || 0),
      'Milk Due Balance (रू)': round2(kpis.milkCollectionRemainingAmount || 0),
      'Customer Outstanding (रू)': round2(kpis.outstandingBalance || 0),
      'Registration Date': c.creationDateTimeUtms ? new Date(c.creationDateTimeUtms).toISOString().split('T')[0] : '',
      'Remarks': c.remarks || ''
    };
  }) : [{ 'Notice': 'No farmer or customer accounts found for this cooperative' }];
  const wsFarmers = XLSX.utils.json_to_sheet(farmerRows);
  wsFarmers['!cols'] = [{ wch: 14 }, { wch: 25 }, { wch: 25 }, { wch: 24 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 24 }, { wch: 12 }, { wch: 22 }, { wch: 45 }, { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 24 }, { wch: 18 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsFarmers, 'Farmers_Accounts');

  // 3. Milk Collections Sheet
  const milkList = (tData.milkCollections || []).filter(c => !c.isDeleted);
  const milkRows = milkList.length > 0 ? milkList.map(c => {
    const farmer = (tData.customers || []).find(f => f.id === c.farmerId) || {};
    return {
      'Slip #': c.slipNumber || c.id,
      'Date': c.dateTimeUtms ? new Date(c.dateTimeUtms).toISOString().split('T')[0] : '',
      'Time': c.dateTimeUtms ? new Date(c.dateTimeUtms).toLocaleTimeString() : '',
      'Shift': c.shift === 1 ? 'Morning (बिहान)' : 'Evening (बेलुका)',
      'Milk Type': c.milkType === 1 ? 'Cow (गाई)' : 'Buffalo (भैँसी)',
      'Farmer Code': farmer.code || c.farmerCode || '',
      'Farmer Name': farmer.nameInNepali || farmer.nameInEnglish || c.farmerName || '',
      'Quantity (Litre)': round2(c.quantity || 0),
      'FAT (%)': round2(c.fat || 0),
      'SNF (%)': round2(c.snf || 0),
      'Rate per Litre (रू)': round2(c.ratePerLiter || 0),
      'Total Amount (रू)': round2(c.totalAmount || 0),
      'Payment Status': c.isPaid ? 'Paid' : 'Unpaid'
    };
  }) : [{ 'Notice': 'No milk intake records found' }];
  const wsMilk = XLSX.utils.json_to_sheet(milkRows);
  wsMilk['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, wsMilk, 'Milk_Collections');

  // 4. Farmer Payments Sheet
  const paymentList = (tData.milkCollectionPayments || []).filter(p => !p.isDeleted);
  const paymentRows = paymentList.length > 0 ? paymentList.map(p => {
    const farmer = (tData.customers || []).find(f => f.id === p.farmerId) || {};
    return {
      'Payment ID': p.id,
      'Date': p.dateTimeUtms ? new Date(p.dateTimeUtms).toISOString().split('T')[0] : '',
      'Farmer Code': farmer.code || p.farmerCode || '',
      'Farmer Name': farmer.nameInNepali || farmer.nameInEnglish || p.farmerName || '',
      'Amount Paid (रू)': round2(p.amount || 0),
      'Payment Method': p.paymentMethod === 1 ? 'Cash (नगद)' : (p.paymentMethod === 2 ? 'Bank / Cheque' : 'FonePay / Digital'),
      'Reference / Cheque #': p.referenceNumber || '',
      'Remarks': p.remarks || ''
    };
  }) : [{ 'Notice': 'No farmer payment records found' }];
  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
  wsPayments['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 25 }, { wch: 18 }, { wch: 22 }, { wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Farmer_Payments');

  // 5. Sales & Orders Sheet
  const orderList = (tData.orders || []).filter(o => !o.isDeleted);
  const salesRows = orderList.length > 0 ? orderList.map(o => {
    const cust = o.customerId ? (tData.customers || []).find(c => c.id === o.customerId) : null;
    return {
      'Bill #': o.billNumber || o.id,
      'Date': o.orderDateTimeUtms ? new Date(o.orderDateTimeUtms).toISOString().split('T')[0] : '',
      'Customer Name': cust ? (cust.nameInNepali || cust.nameInEnglish) : (o.customerName || 'Cash Counter Customer'),
      'Sale Type': o.saleType === 1 ? 'Counter POS Retail' : 'Wholesale Delivery',
      'Gross Total (रू)': round2(o.subtotal || o.total || 0),
      'Discount (रू)': round2(o.discount || 0),
      'Net Total (रू)': round2(o.total || o.netTotal || 0),
      'Paid Amount (रू)': round2(o.paidAmount || 0),
      'Due Balance (रू)': round2(o.dueAmount || 0),
      'Payment Mode': o.paymentMethod === 1 ? 'Cash' : (o.paymentMethod === 2 ? 'Credit (बाँकी)' : (o.paymentMethod === 3 ? 'FonePay / QR' : 'Bank Transfer'))
    };
  }) : [{ 'Notice': 'No sales records found' }];
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  wsSales['!cols'] = [{ wch: 16 }, { wch: 14 }, { wch: 25 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsSales, 'Sales_Orders');

  // 6. Products & Inventory Sheet
  const productList = (tData.products || []).filter(p => !p.isDeleted);
  const productRows = productList.length > 0 ? productList.map((p, idx) => {
    const stocks = (tData.productStocks || []).filter(s => s.productId === p.id);
    const totalQty = stocks.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);
    const usedQty = stocks.reduce((acc, s) => acc + (Number(s.usedQuantity) || 0), 0);
    const currentStock = round2(Math.max(0, totalQty - usedQty));
    const unitCost = Number(p.costPrice) > 0 ? Number(p.costPrice) : (Number(p.sellingPrice) || 0);
    return {
      'SN': idx + 1,
      'Product Name (Nepali)': p.nameInNepali || '',
      'Product Name (English)': p.nameInEnglish || '',
      'Unit': p.unitName || 'Unit',
      'Cost Price (रू)': round2(p.costPrice || 0),
      'Selling Price (रू)': round2(p.sellingPrice || 0),
      'In Stock': currentStock,
      'Reorder Level': round2(p.reorderLevel || 0),
      'Stock Valuation (रू)': round2(currentStock * unitCost),
      'Low Stock Alert': currentStock <= (p.reorderLevel || 0) ? 'YES (Low Stock)' : 'OK'
    };
  }) : [{ 'Notice': 'No products in inventory' }];
  const wsProducts = XLSX.utils.json_to_sheet(productRows);
  wsProducts['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 25 }, { wch: 14 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Inventory_Products');

  // 7. Expenses Sheet
  const expenseList = (tData.expenses || []).filter(e => !e.isDeleted);
  const expenseRows = expenseList.length > 0 ? expenseList.map(e => ({
    'Date': e.dateTimeUtms ? new Date(e.dateTimeUtms).toISOString().split('T')[0] : '',
    'Category': e.categoryName || e.category || 'General',
    'Title / Description': e.title || e.description || '',
    'Amount (रू)': round2(e.amount || 0),
    'Payment Mode': e.paymentMethod === 1 ? 'Cash' : 'Bank',
    'Paid To': e.paidTo || '',
    'Remarks': e.remarks || ''
  })) : [{ 'Notice': 'No expense records found' }];
  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  wsExpenses['!cols'] = [{ wch: 14 }, { wch: 20 }, { wch: 30 }, { wch: 16 }, { wch: 16 }, { wch: 20 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expenses');

  // 8. Cash & Bank Ledgers Sheet
  const ledgerList = (tData.cashBankLedgers || []).filter(l => !l.isDeleted);
  const ledgerRows = ledgerList.length > 0 ? ledgerList.map(l => ({
    'Date': l.dateTimeUtms ? new Date(l.dateTimeUtms).toISOString().split('T')[0] : '',
    'Account Type': l.accountType === 1 ? 'Cash (नगद खाता)' : 'Bank (बैंक खाता)',
    'Transaction': l.transactionType === 1 ? 'Credit / Deposit (रकम दाखिला)' : 'Debit / Withdrawal (खर्च वा भुक्तानी)',
    'Amount (रू)': round2(l.amount || 0),
    'Description': l.description || '',
    'Reference': l.reference || ''
  })) : [{ 'Notice': 'No cash/bank ledger transactions recorded' }];
  const wsLedger = XLSX.utils.json_to_sheet(ledgerRows);
  wsLedger['!cols'] = [{ wch: 14 }, { wch: 22 }, { wch: 32 }, { wch: 16 }, { wch: 30 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsLedger, 'Cash_Bank_Ledger');

  // 9. Production Batches Sheet
  const batchList = (tData.productionBatches || []).filter(b => !b.isDeleted);
  const batchRows = batchList.length > 0 ? batchList.map(b => ({
    'Batch #': b.batchNumber || b.id,
    'Production Date': b.productionDateUtms ? new Date(b.productionDateUtms).toISOString().split('T')[0] : '',
    'Input Milk (L)': round2(b.inputRawMilkLiters || 0),
    'Input FAT (%)': round2(b.inputFat || 0),
    'Input SNF (%)': round2(b.inputSnf || 0),
    'Wastage / Leakage (L)': round2(b.wastageQuantity || b.leakageLiters || 0),
    'Status': b.status || 'Completed',
    'Remarks': b.remarks || ''
  })) : [{ 'Notice': 'No dairy processing batches found' }];
  const wsBatches = XLSX.utils.json_to_sheet(batchRows);
  wsBatches['!cols'] = [{ wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 22 }, { wch: 14 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsBatches, 'Production_Batches');

  // 10. Audit Logs Sheet
  const auditList = tData.auditLogs || [];
  const auditRows = auditList.length > 0 ? auditList.slice(-500).map(a => ({
    'Date & Time': a.dateTimeUtms ? new Date(a.dateTimeUtms).toISOString() : '',
    'Action': a.action || a.actionType || '',
    'Description': a.description || '',
    'Performed By': a.userName || a.userEmail || 'Admin',
    'Category': a.category || ''
  })) : [{ 'Notice': 'No audit logs recorded' }];
  const wsAudit = XLSX.utils.json_to_sheet(auditRows);
  wsAudit['!cols'] = [{ wch: 24 }, { wch: 25 }, { wch: 45 }, { wch: 22 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit_Logs');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

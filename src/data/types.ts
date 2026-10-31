export type ApiSource = 'api';

export type Organization = {
  id: string;
  name: string;
  currencyCode: string;
  timeZone: string;
  taxRegistrationNumber?: string;
  defaultProductVatCategory: ProductVatCategory;
  status: 'ACTIVE' | 'SUSPENDED';
};

export type Branch = {
  id: string;
  name: string;
  code: string;
  timeZone: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type BranchRequest = {
  name: string;
  code: string;
  timeZone: string;
  status: Branch['status'];
};

export type Supplier = {
  id: string;
  name: string;
  supplierCode?: string;
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  kraPin?: string;
  paymentTerms?: string;
  creditLimit?: number;
  bankDetails?: string;
  productsSupplied?: string;
  outstandingBalance?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type SupplierRequest = {
  name: string;
  supplierCode?: string;
  companyName?: string;
  contactPerson: string;
  phone: string;
  email: string;
  address?: string;
  kraPin?: string;
  paymentTerms?: string;
  creditLimit?: number;
  bankDetails?: string;
  productsSupplied?: string;
  outstandingBalance?: number;
  notes: string;
  status: Supplier['status'];
};

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'CREDIT_HOLD';

export type CustomerType = 'INDIVIDUAL' | 'BUSINESS';

export type Customer = {
  id: string;
  branchId?: string;
  branchName?: string;
  customerCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  kraPin?: string;
  customerType: CustomerType;
  creditLimit: number;
  outstandingBalance: number;
  paymentTerms?: string;
  notes?: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
};

export type CustomerRequest = {
  branchId?: string;
  customerCode: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  kraPin: string;
  customerType: CustomerType;
  creditLimit: number;
  outstandingBalance: number;
  paymentTerms: string;
  notes: string;
  status: CustomerStatus;
};

export type CustomerSaleActivity = {
  reference: string;
  branchName: string;
  occurredAt: string;
  boughtAmount: number;
  paidAmount: number;
};

export type CustomerPeriodReport = {
  customerId: string;
  customerName: string;
  from: string;
  to: string;
  boughtAmount: number;
  paidAmount: number;
  balanceAmount: number;
  saleCount: number;
  activities: CustomerSaleActivity[];
};

export type CurrentUser = {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  branchIds: string[];
  roleKeys: string[];
  roleNames: string[];
  permissionCodes: string[];
};

export type Role = {
  id: string;
  name: string;
  key: string;
  description?: string;
  assignedUsers: number;
  permissionIds: string[];
  permissionCodes: string[];
};

export type RoleRequest = {
  name: string;
  key: string;
  description: string;
  permissionIds: string[];
};

export type Permission = {
  id: string;
  code: string;
  description?: string;
};

export type PermissionRequest = {
  code: string;
  description: string;
};

export type StaffUser = {
  id: string;
  email: string;
  displayName: string;
  status: 'ACTIVE' | 'DISABLED';
  roleIds: string[];
  roleNames: string[];
  permissionCodes: string[];
  branchIds: string[];
  branchNames: string[];
};

export type UserRequest = {
  email: string;
  password?: string;
  displayName: string;
  status: StaffUser['status'];
  roleIds: string[];
  branchIds: string[];
};

export type ProductCategory = {
  id: string;
  name: string;
  code: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type ProductCategoryRequest = {
  name: string;
  code: string;
  status: ProductCategory['status'];
};

export type Product = {
  productType?: 'SIMPLE' | 'VARIABLE';
  parentProductId?: string;
  parentProductName?: string;
  variantName?: string;
  variantAttributes?: Record<string, string>;
  reorderLevel?: number;
  sellable?: boolean;
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  categoryId: string;
  categoryName: string;
  department?: string;
  description?: string;
  imageUrl?: string;
  unitPrice: number;
  costPrice?: number;
  vatCategory: ProductVatCategory;
  sizes: string[];
  colors: string[];
  status: 'ACTIVE' | 'INACTIVE';
  totalStock: number;
};

export type ProductRequest = {
  productType?: 'SIMPLE' | 'VARIABLE';
  parentProductId?: string;
  variantAttributes?: Record<string, string>;
  reorderLevel?: number;
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  department: string;
  description: string;
  imageUrl: string;
  unitPrice: number;
  costPrice: number;
  vatCategory: ProductVatCategory;
  sizes: string[];
  colors: string[];
  status: Product['status'];
};

export type ProductVatCategory = 'A' | 'G';

export type PaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'BANK_TRANSFER';

export type InventoryItem = {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  vatCategory?: ProductVatCategory;
  unitPrice: number;
  quantityOnHand: number;
  quantityReserved: number;
  quantityAvailable: number;
  reorderLevel: number;
  stockHealth: 'HEALTHY' | 'LOW_STOCK' | 'OUT_OF_STOCK';
};

export type InventoryReorderLevelRequest = {
  reorderLevel: number;
};

export type StockIntake = {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  supplierName: string;
  referenceNumber?: string;
  quantity: number;
  unitCost: number;
  notes?: string;
  receivedAt: string;
};

export type StockIntakeRequest = {
  branchId: string;
  productId: string;
  supplierName: string;
  referenceNumber: string;
  quantity: number;
  unitCost: number;
  notes: string;
};

export type StockAdjustment = {
  id: string;
  branchId: string;
  branchName: string;
  productId: string;
  productName: string;
  sku: string;
  systemQuantity: number;
  countedQuantity: number;
  varianceQuantity: number;
  unitCost: number;
  lossValue: number;
  excessValue: number;
  reason: string;
  notes?: string;
  adjustedAt: string;
};

export type StockAdjustmentRequest = {
  branchId: string;
  productId: string;
  countedQuantity: number;
  reason: string;
  notes: string;
};

export type StockAdjustmentSummary = {
  lossItems: number;
  excessItems: number;
  totalLossQuantity: number;
  totalExcessQuantity: number;
  totalLossValue: number;
  totalExcessValue: number;
  netValue: number;
};

export type ExpensePaymentMethod = 'MPESA' | 'CASH' | 'CARD' | 'BANK_TRANSFER';

export type ExpenseStatus = 'PENDING' | 'PAID' | 'VOID';

export type Expense = {
  id: string;
  expenseNumber: string;
  branchId: string;
  branchName: string;
  category: string;
  description: string;
  vendorName?: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  paymentReference?: string;
  status: ExpenseStatus;
  notes?: string;
  incurredAt: string;
};

export type ExpenseRequest = {
  branchId: string;
  category: string;
  description: string;
  vendorName: string;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  paymentReference: string;
  status: Exclude<ExpenseStatus, 'VOID'>;
  notes: string;
};

export type SaleLineRequest = {
  productId: string;
  quantity: number;
};

export type SalePaymentRequest = {
  method: PaymentMethod;
  amount: number;
  paymentReference: string;
  cashReceived?: number;
};

export type SaleRequest = {
  branchId: string;
  customerName: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  cashReceived?: number;
  discountAmount: number;
  payments?: SalePaymentRequest[];
  lines: SaleLineRequest[];
};

export type SaleLine = {
  parentProductId?: string;
  parentProductName?: string;
  variantAttributes?: Record<string, string>;
  productId: string;
  productName: string;
  sku: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
  costPrice?: number;
  lineTotal: number;
  vatCategory?: ProductVatCategory;
  taxRate?: number;
  taxAmount?: number;
};

export type SalePayment = {
  id: string;
  method: PaymentMethod;
  amount: number;
  status: 'SETTLED';
  reference?: string;
  cashReceived?: number;
  changeDue?: number;
};

export type Sale = {
  syncStatus?: 'pending';
  deviceOperationId?: string;
  id: string;
  saleNumber: string;
  branchId: string;
  branchName: string;
  customerName?: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  status: 'COMPLETED';
  soldAt: string;
  lines: SaleLine[];
  payments: SalePayment[];
};

export type AccountingAccountType =
  'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'COGS' | 'EXPENSE';

export type AccountingAccount = {
  id: string;
  parentAccountId?: string;
  parentAccountCode?: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountingAccountRequest = {
  parentAccountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  active: boolean;
};

export type AccountingPeriodStatus = 'OPEN' | 'CLOSED' | 'LOCKED';

export type AccountingPeriod = {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: AccountingPeriodStatus;
  createdAt: string;
  updatedAt: string;
};

export type AccountingPeriodRequest = {
  name: string;
  periodStart: string;
  periodEnd: string;
  status: AccountingPeriodStatus;
};

export type AccountingTaxRule = {
  id: string;
  taxCode: string;
  name: string;
  taxCategory: string;
  rate: number;
  inclusive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AccountingTaxRuleRequest = {
  taxCode: string;
  name: string;
  taxCategory: string;
  rate: number;
  inclusive: boolean;
  effectiveFrom: string;
  effectiveTo: string;
  active: boolean;
};

export type AccountingJournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'VOID';

export type AccountingJournalLineRequest = {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description: string;
};

export type AccountingJournalRequest = {
  branchId: string;
  financialPeriodId: string;
  journalNumber: string;
  entryDate: string;
  description: string;
  reference: string;
  sourceModule: string;
  sourceTransactionId?: string;
  status: 'DRAFT' | 'POSTED';
  lines: AccountingJournalLineRequest[];
};

export type AccountingJournalLine = {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  debitAmount: number;
  creditAmount: number;
  description?: string;
};

export type AccountingJournal = {
  id: string;
  branchId?: string;
  branchName?: string;
  financialPeriodId?: string;
  financialPeriodName?: string;
  createdByUserId?: string;
  createdByName?: string;
  journalNumber: string;
  entryDate: string;
  description: string;
  reference?: string;
  sourceModule?: string;
  sourceTransactionId?: string;
  status: AccountingJournalStatus;
  totalDebit: number;
  totalCredit: number;
  createdAt: string;
  updatedAt: string;
  lines: AccountingJournalLine[];
};

export type AccountingLedgerEntry = {
  journalEntryId: string;
  lineId: string;
  journalNumber: string;
  entryDate: string;
  journalDescription: string;
  reference?: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  branchName?: string;
};

export type AccountingTrialBalanceRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  debitAmount: number;
  creditAmount: number;
  netDebit: number;
  netCredit: number;
};

export type AccountingTrialBalance = {
  fromDate: string;
  toDate: string;
  totalDebit: number;
  totalCredit: number;
  difference: number;
  rows: AccountingTrialBalanceRow[];
};

export type AccountingStatementRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountingAccountType;
  amount: number;
};

export type AccountingProfitAndLoss = {
  fromDate: string;
  toDate: string;
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  expenses: number;
  netIncome: number;
  revenueRows: AccountingStatementRow[];
  costOfGoodsSoldRows: AccountingStatementRow[];
  expenseRows: AccountingStatementRow[];
};

export type AccountingBalanceSheet = {
  asOfDate: string;
  assets: number;
  liabilities: number;
  equity: number;
  retainedEarnings: number;
  totalLiabilitiesAndEquity: number;
  difference: number;
  assetRows: AccountingStatementRow[];
  liabilityRows: AccountingStatementRow[];
  equityRows: AccountingStatementRow[];
};

export type AccountingCashFlowRow = {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingBalance: number;
  cashIn: number;
  cashOut: number;
  closingBalance: number;
};

export type AccountingCashFlow = {
  fromDate: string;
  toDate: string;
  openingCash: number;
  cashIn: number;
  cashOut: number;
  netCashFlow: number;
  closingCash: number;
  rows: AccountingCashFlowRow[];
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export type Metric = {
  label: string;
  value: string;
  detail: string;
  tone: 'teal' | 'burgundy' | 'amber' | 'ink';
};

export type AiAssistantReply = {
  answer: string;
  citations: string[];
  suggestions: string[];
};

export type ModuleMetric = {
  label: string;
  value: string;
  detail: string;
};

export type ModuleWorkItem = {
  id: string;
  reference: string;
  title: string;
  status: string;
  amount?: number;
  branchName?: string;
  dueDate?: string;
  createdAt?: string;
};

export type ModuleSummary = {
  moduleKey: string;
  title: string;
  description: string;
  metrics: ModuleMetric[];
  workItems: ModuleWorkItem[];
};

export type NotificationItem = {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  sourceModule?: string;
  sourceRecordId?: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  createdAt: string;
  readAt?: string;
};

export type AuditEvent = {
  id: string;
  branchId?: string;
  branchName?: string;
  actorUserId?: string;
  actorName?: string;
  action: string;
  targetType: string;
  targetId?: string;
  reason?: string;
  correlationId?: string;
  metadataJson?: string;
  createdAt: string;
};

export type BranchPerformance = {
  branch: string;
  sales: number;
  transactions: number;
};

export type InventoryMovement = {
  id: string;
  time: string;
  branch: string;
  item: string;
  variant: string;
  reason: string;
  quantity: number;
  status: 'posted' | 'review' | 'pending';
};

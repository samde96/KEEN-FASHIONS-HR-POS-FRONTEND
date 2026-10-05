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

export type Department = {
  id: string;
  name: string;
  code: string;
  description?: string;
  branchId?: string;
  branchName?: string;
  managerUserId?: string;
  managerUserDisplayName?: string;
  active: boolean;
};

export type DepartmentRequest = {
  name: string;
  code: string;
  description: string;
  branchId: string;
  managerUserId: string;
  active: boolean;
};

export type JobTitle = {
  id: string;
  title: string;
  code: string;
  description?: string;
  departmentId: string;
  departmentName: string;
  active: boolean;
};

export type JobTitleRequest = {
  title: string;
  code: string;
  departmentId: string;
  description: string;
  active: boolean;
};

export type EmployeeEmploymentType = 'PERMANENT' | 'CONTRACT' | 'TEMPORARY' | 'INTERN' | 'CASUAL';

export type EmployeeEmploymentStatus =
  'ACTIVE' | 'PROBATION' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED' | 'RETIRED';

export type SalaryPaymentMethod = 'UNSPECIFIED' | 'BANK' | 'MPESA';

export type EmployeeSummary = {
  id: string;
  employeeNumber: string;
  fullName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  branchId: string;
  branchName: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleTitle?: string;
  employmentType: EmployeeEmploymentType;
  employmentStatus: EmployeeEmploymentStatus;
  joiningDate: string;
  basicSalary: number;
  salaryPaymentMethod: SalaryPaymentMethod;
  active: boolean;
  linkedUserId?: string;
  linkedUserDisplayName?: string;
};

export type EmployeeProfileTab = {
  key: string;
  label: string;
};

export type EmployeeProfile = {
  id: string;
  employeeNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  preferredName?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
  nationalIdNumber?: string;
  branchId: string;
  branchName: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleId?: string;
  jobTitleTitle?: string;
  employmentType: EmployeeEmploymentType;
  employmentStatus: EmployeeEmploymentStatus;
  joiningDate: string;
  probationEndDate?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  linkedUserId?: string;
  linkedUserDisplayName?: string;
  managerEmployeeId?: string;
  managerEmployeeName?: string;
  workLocation?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  notes?: string;
  basicSalary: number;
  salaryPaymentMethod: SalaryPaymentMethod;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  mpesaNumber?: string;
  active: boolean;
  tabs: EmployeeProfileTab[];
};

export type EmployeeRequest = {
  employeeNumber: string;
  firstName: string;
  middleName: string;
  lastName: string;
  preferredName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationalIdNumber: string;
  primaryBranchId: string;
  departmentId: string;
  jobTitleId: string;
  employmentType: EmployeeEmploymentType;
  employmentStatus: EmployeeEmploymentStatus;
  joiningDate: string;
  probationEndDate: string;
  contractStartDate: string;
  contractEndDate: string;
  userId: string;
  managerEmployeeId: string;
  workLocation: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  address: string;
  notes: string;
  basicSalary: number;
  salaryPaymentMethod: SalaryPaymentMethod;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  mpesaNumber: string;
  active: boolean;
};

export type EmployeePage = {
  items: EmployeeSummary[];
  total: number;
};

export type EmployeeUserSyncResult = {
  totalUsers: number;
  createdCount: number;
  skippedCount: number;
  employees: EmployeeSummary[];
};

export type EmployeeDocument = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  documentType: string;
  title: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  notes?: string;
  uploadedByUserId?: string;
  uploadedByUserDisplayName?: string;
  uploadedAt: string;
};

export type EmployeeDocumentUploadRequest = {
  employeeId: string;
  documentType: string;
  title: string;
  notes: string;
  file: File;
};

export type AttendanceStatus =
  'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY' | 'OFF_DAY';

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeNumber: string;
  employeeName: string;
  branchId: string;
  branchName: string;
  departmentName?: string;
  jobTitleTitle?: string;
  attendanceDate: string;
  clockIn?: string;
  clockOut?: string;
  status: AttendanceStatus;
  workedMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  notes?: string;
  correctionReason?: string;
  corrected: boolean;
};

export type AttendanceSummary = {
  totalRecords: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  leaveCount: number;
  halfDayCount: number;
  holidayCount: number;
  offDayCount: number;
  correctedCount: number;
  totalWorkedMinutes: number;
  totalOvertimeMinutes: number;
};

export type AttendancePage = {
  items: AttendanceRecord[];
  total: number;
  summary: AttendanceSummary;
};

export type AttendanceRequest = {
  employeeId: string;
  branchId: string;
  attendanceDate: string;
  clockIn: string;
  clockOut: string;
  status: AttendanceStatus;
  notes: string;
  correctionReason: string;
};

export type LeaveRequestStatus =
  'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type LeaveType = {
  id: string;
  name: string;
  code: string;
  description?: string;
  requiresBalance: boolean;
  defaultDays: number;
  active: boolean;
};

export type LeaveBalance = {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  balanceDays: number;
  usedDays: number;
  availableDays: number;
};

export type LeaveRequestRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason?: string;
  approverUserId?: string;
  approverUserDisplayName?: string;
  approverComments?: string;
  status: LeaveRequestStatus;
  submittedAt?: string;
  decidedAt?: string;
};

export type LeavePage = {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  requests: LeaveRequestRecord[];
};

export type LeaveTypeRequest = {
  name: string;
  code: string;
  description: string;
  requiresBalance: boolean;
  defaultDays: number;
  active: boolean;
};

export type LeaveRequestInput = {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  approverUserId: string;
  approverComments: string;
  status: LeaveRequestStatus;
};

export type PayrollComponentType = 'EARNING' | 'DEDUCTION';

export type PayrollRunStatus =
  'DRAFT' | 'CALCULATED' | 'REVIEWED' | 'APPROVED' | 'PROCESSED' | 'LOCKED';

export type PayrollPeriodStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export type EmployeePerformanceEntryType = 'PERFORMANCE_REVIEW' | 'BONUS' | 'LOSS' | 'MANUAL_SALE';

export type EmployeeSalesDay = {
  salesDate: string;
  amount: number;
  receiptCount: number;
};

export type PayrollComponent = {
  id: string;
  name: string;
  code: string;
  componentType: PayrollComponentType;
  taxable: boolean;
  defaultAmount: number;
  active: boolean;
};

export type PayrollSalesBonusRule = {
  dailySalesTarget: number;
  bonusPerTargetDay: number;
  active: boolean;
};

export type PayrollPeriod = {
  id: string;
  branchId?: string;
  branchName?: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  paymentDate?: string;
  status: PayrollPeriodStatus;
};

export type PayrollEmployee = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchName: string;
  grossPay: number;
  basicSalary: number;
  bonusAmount: number;
  automaticBonusAmount: number;
  manualBonusAmount: number;
  lossAmount: number;
  salesAmount: number;
  qualifyingSalesDays: number;
  salesBonusTarget: number;
  salesBonusPerDay: number;
  performanceScore?: number;
  totalDeductions: number;
  netPay: number;
  paymentMethod: SalaryPaymentMethod;
  paymentDestination?: string;
  notes?: string;
};

export type PayrollRun = {
  id: string;
  payrollPeriodId: string;
  payrollPeriodName: string;
  branchId?: string;
  branchName?: string;
  name: string;
  status: PayrollRunStatus;
  processedAt?: string;
  employees: PayrollEmployee[];
};

export type PayrollPage = {
  components: PayrollComponent[];
  periods: PayrollPeriod[];
  runs: PayrollRun[];
  salesBonusRule: PayrollSalesBonusRule;
};

export type PayrollComponentRequest = {
  name: string;
  code: string;
  componentType: PayrollComponentType;
  taxable: boolean;
  defaultAmount: number;
  active: boolean;
};

export type PayrollPeriodRequest = {
  branchId: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: PayrollPeriodStatus;
};

export type PayrollRunRequest = {
  payrollPeriodId: string;
  name: string;
  status: PayrollRunStatus;
};

export type PayrollEmployeeAdjustmentRequest = {
  bonusAmount: number;
  lossAmount: number;
  notes: string;
};

export type PayrollSalesBonusRuleRequest = PayrollSalesBonusRule;

export type EmployeePerformanceEntry = {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  entryType: EmployeePerformanceEntryType;
  entryDate: string;
  title: string;
  amount?: number;
  score?: number;
  notes?: string;
  createdByUserId?: string;
  createdByUserDisplayName?: string;
};

export type EmployeePerformanceSummary = {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  branchId: string;
  branchName: string;
  departmentId?: string;
  departmentName?: string;
  jobTitleTitle?: string;
  basicSalary: number;
  salaryPaymentMethod: SalaryPaymentMethod;
  paymentDestination: string;
  actualSalesAmount: number;
  manualSalesAmount: number;
  totalSalesAmount: number;
  bonusAmount: number;
  automaticBonusAmount: number;
  manualBonusAmount: number;
  lossAmount: number;
  projectedNetPay: number;
  qualifyingSalesDays: number;
  salesBonusTarget: number;
  salesBonusPerDay: number;
  averagePerformanceScore?: number;
  entryCount: number;
  salesDays: EmployeeSalesDay[];
};

export type EmployeePerformancePage = {
  fromDate: string;
  toDate: string;
  salesBonusRule: PayrollSalesBonusRule;
  summaries: EmployeePerformanceSummary[];
  entries: EmployeePerformanceEntry[];
};

export type EmployeePerformanceEntryRequest = {
  employeeId: string;
  entryType: EmployeePerformanceEntryType;
  entryDate: string;
  title: string;
  amount: number;
  score?: number;
  notes: string;
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

export type StockTransfer = {
  id: string;
  sourceBranchId: string;
  sourceBranchName: string;
  destinationBranchId: string;
  destinationBranchName: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  status: 'COMPLETED' | 'CANCELLED';
  referenceNumber?: string;
  notes?: string;
  transferredAt: string;
};

export type StockTransferRequest = {
  sourceBranchId: string;
  destinationBranchId: string;
  productId: string;
  quantity: number;
  referenceNumber: string;
  notes: string;
};

export type PaymentMethod = 'MPESA' | 'CASH' | 'CARD';

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
  soldByEmployeeId?: string;
  customerName: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  cashReceived?: number;
  discountAmount: number;
  payments?: SalePaymentRequest[];
  lines: SaleLineRequest[];
};

export type SaleLine = {
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
  id: string;
  saleNumber: string;
  branchId: string;
  branchName: string;
  soldByEmployeeId?: string;
  soldByEmployeeName?: string;
  soldByEmployeeNumber?: string;
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
  | 'ASSET'
  | 'LIABILITY'
  | 'EQUITY'
  | 'REVENUE'
  | 'COGS'
  | 'EXPENSE';

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

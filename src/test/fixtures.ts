import type {
  Branch,
  CurrentUser,
  Expense,
  InventoryItem,
  Organization,
  Permission,
  Product,
  ProductCategory,
  Role,
  Supplier,
} from '../data/types';

export const testOrganization: Organization = {
  id: '00000000-0000-4000-8000-000000000001',
  name: 'KEEN Fashions',
  currencyCode: 'KES',
  timeZone: 'Africa/Nairobi',
  defaultProductVatCategory: 'A',
  status: 'ACTIVE',
};

export const testUser: CurrentUser = {
  userId: '00000000-0000-4000-8000-000000000301',
  email: 'admin@example.com',
  displayName: 'System Admin',
  organizationId: testOrganization.id,
  branchIds: [],
  roleKeys: ['ADMIN'],
  roleNames: ['Admin'],
  permissionCodes: [
    'admin:manage',
    'inventory:receive',
    'pos:sell',
    'profit:view',
    'reports:view',
    'sales:view',
    'transfer:create',
    'transfer:receive',
  ],
};

export const testBranches: Branch[] = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Flagship Branch',
    code: 'FLAG',
    timeZone: 'Africa/Nairobi',
    status: 'ACTIVE',
  },
];

export const testSuppliers: Supplier[] = [
  {
    id: '00000000-0000-4000-8000-000000000901',
    name: 'Keen Supplier',
    contactPerson: 'Jane Supplier',
    phone: '+254700000001',
    email: 'supplier@example.com',
    notes: 'Main stock supplier',
    status: 'ACTIVE',
  },
];

export const testProductCategories: ProductCategory[] = [
  {
    id: '00000000-0000-4000-8000-000000000701',
    name: 'Shirts',
    code: 'SHIRTS',
    status: 'ACTIVE',
  },
];

export const testPermissions: Permission[] = [
  {
    id: '00000000-0000-4000-8000-000000000501',
    code: 'admin:manage',
    description: 'Manage users, roles, branches, products, and settings',
  },
  {
    id: '00000000-0000-4000-8000-000000000505',
    code: 'pos:sell',
    description: 'Perform POS sale',
  },
  {
    id: '00000000-0000-4000-8000-000000000507',
    code: 'reports:view',
    description: 'View reports',
  },
  {
    id: '00000000-0000-4000-8000-000000000511',
    code: 'profit:view',
    description: 'View buying costs, gross profit, contribution, and profit reports',
  },
  {
    id: '00000000-0000-4000-8000-000000000508',
    code: 'sales:view',
    description: 'View Sales Data',
  },
];

export const testRoles: Role[] = [
  {
    id: '00000000-0000-4000-8000-000000000403',
    name: 'Cashier',
    key: 'CASHIER',
    description: 'POS sales and sales lookup access',
    assignedUsers: 1,
    permissionIds: [testPermissions[1].id, testPermissions[4].id],
    permissionCodes: [testPermissions[1].code, testPermissions[4].code],
  },
  {
    id: '00000000-0000-4000-8000-000000000407',
    name: 'Supervisor',
    key: 'SUPERVISOR',
    description: 'POS supervision and sales review',
    assignedUsers: 0,
    permissionIds: [
      testPermissions[1].id,
      testPermissions[2].id,
      testPermissions[3].id,
      testPermissions[4].id,
    ],
    permissionCodes: [
      testPermissions[1].code,
      testPermissions[2].code,
      testPermissions[3].code,
      testPermissions[4].code,
    ],
  },
];

export const testProducts: Product[] = [
  {
    id: '00000000-0000-4000-8000-000000000801',
    name: 'Oxford Shirt',
    sku: 'OXF-001',
    categoryId: testProductCategories[0].id,
    categoryName: testProductCategories[0].name,
    department: 'Menswear',
    imageUrl: 'https://example.test/oxford-shirt.png',
    unitPrice: 2800,
    costPrice: 1200,
    vatCategory: 'A',
    sizes: ['M', 'L'],
    colors: ['Blue'],
    status: 'ACTIVE',
    totalStock: 12,
  },
];

export const testInventory: InventoryItem[] = [];

export const testExpenses: Expense[] = [
  {
    id: 'expense-001',
    expenseNumber: 'EXP-001',
    branchId: testBranches[0].id,
    branchName: testBranches[0].name,
    category: 'Rent',
    description: 'Shop rent',
    vendorName: 'Landlord',
    amount: 42000,
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'BNK-001',
    status: 'PAID',
    notes: 'Monthly rent',
    incurredAt: '2026-09-01T08:00:00Z',
  },
];

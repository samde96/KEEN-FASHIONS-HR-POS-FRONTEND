export type HotelRoom = {
  id: string;
  branchId: string;
  number: string;
  roomType: string;
  capacity: number;
  nightlyRate: number;
  status: 'READY' | 'CLEANING' | 'MAINTENANCE';
};
export type HotelPaymentMethod = 'CASH' | 'MPESA' | 'CARD' | 'BANK';
export type HotelPayment = {
  id: string;
  bookingId: string;
  amount: number;
  kind: 'PAYMENT' | 'REFUND';
  method: HotelPaymentMethod;
  reference: string;
  createdAt: string;
};
export type HotelBooking = {
  id: string;
  branchId: string;
  roomId: string;
  roomNumber: string;
  reference: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  guests: number;
  arrival: string;
  departure: string;
  nights: number;
  nightlyRate: number;
  roomTotal: number;
  foodTotal: number;
  total: number;
  paid: number;
  balance: number;
  status: 'RESERVED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'CANCELLED';
  notes: string;
  checkedInAt?: string;
  checkedOutAt?: string;
  payments: HotelPayment[];
};
export type HotelItem = {
  id: string;
  branchId: string;
  name: string;
  category: 'PRODUCT' | 'INGREDIENT' | 'SUPPLY';
  unit: string;
  sellable: boolean;
  price: number;
  unitCost: number | null;
  unitCostEstimated: boolean;
  stock: number;
  reorderLevel: number;
  active: boolean;
};
export type HotelMenuItem = {
  id: string;
  branchId: string;
  name: string;
  category: string;
  description: string;
  price: number;
  available: boolean;
};
export type HotelMenuItemRequest = Omit<HotelMenuItem, 'id'>;
export type HotelRecipeIngredient = {
  itemId: string;
  itemName: string;
  quantity: number;
  unit: string;
  stockUnit: string;
  unitCost: number | null;
  estimatedCost: number | null;
  estimated: boolean;
  optional: boolean;
};
export type HotelRecipe = {
  id: string;
  menuItemId: string;
  menuItemName: string;
  sellingPrice: number;
  version: number;
  current: boolean;
  servingLabel: string;
  estimatedCost: number | null;
  contribution: number | null;
  ingredientCostPercent: number | null;
  ingredients: HotelRecipeIngredient[];
  createdAt: string;
};
export type HotelRecipeRequest = {
  requestId: string;
  servingLabel: string;
  ingredients: { itemId: string; quantity: number; unit: string; optional: boolean }[];
};
export type HotelOrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type HotelWaiter = {
  id: string;
  branchId: string;
  name: string;
  active: boolean;
  userId?: string | null;
};
export type HotelWaiterRequest = {
  branchId: string;
  active: boolean;
  userId?: string;
  name?: string;
};
export type HotelReceiptSettings = {
  hotelName: string;
  contactPhone: string;
  complaintsPhone: string;
  paymentType: 'PAYBILL' | 'TILL';
  paymentNumber: string;
  accountNumber: string;
};
export type HotelServiceType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
export type HotelOrderLine = {
  lineId: string;
  itemId: string;
  itemType: 'FOOD' | 'PRODUCT';
  itemName: string;
  quantity: number;
  preparedQuantity: number;
  recipeConfigured: boolean;
  unitPrice: number;
  total: number;
};
export type HotelOrder = {
  id: string;
  branchId: string;
  bookingId?: string;
  roomNumber?: string;
  reference: string;
  receiptNumber: string;
  customerName: string;
  total: number;
  method: HotelPaymentMethod | 'ROOM' | 'UNPAID';
  paymentReference: string;
  operatorId: string;
  waiterId?: string;
  servedByName: string;
  tableNumber: string;
  serviceType: HotelServiceType;
  notes: string;
  status: HotelOrderStatus;
  kitchenStatus: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  hotelName: string;
  contactPhone: string;
  complaintsPhone: string;
  paymentType: 'PAYBILL' | 'TILL';
  paymentNumber: string;
  accountNumber: string;
  paidAt?: string;
  createdAt: string;
  lines: HotelOrderLine[];
};
export type HotelKitchenOrderLine = {
  lineId: string;
  itemName: string;
  quantity: number;
  preparedQuantity: number;
  recipeConfigured: boolean;
};
export type HotelKitchenTicket = {
  id: string;
  branchId: string;
  reference: string;
  tableNumber: string;
  serviceType: HotelServiceType;
  notes: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  createdAt: string;
  lines: HotelKitchenOrderLine[];
};
export type HotelKitchenPreparationRequest = {
  requestId: string;
  lines: { lineId: string; quantity: number }[];
};
export type HotelSalesHistoryOrder = {
  id: string;
  branchId: string;
  branchName: string;
  reference: string;
  customerName: string;
  total: number;
  method: HotelPaymentMethod | 'ROOM' | 'UNPAID';
  status: 'CLOSED';
  createdAt: string;
  lines: HotelOrderLine[];
};
export type HotelMovement = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
  balance: number;
  kind: 'RECEIPT' | 'USAGE' | 'SALE' | 'RETURN' | 'KITCHEN';
  note: string;
  unitCost: number | null;
  costValue: number | null;
  createdAt: string;
};
export type HotelWorkspace = {
  businessDate: string;
  rooms: HotelRoom[];
  bookings: HotelBooking[];
  items: HotelItem[];
  menuItems: HotelMenuItem[];
  orders: HotelOrder[];
  movements: HotelMovement[];
};
export type HotelGuestOption = { id: string; roomNumber: string; guestName: string };
export type HotelCheckout = {
  businessDate: string;
  menuItems: HotelMenuItem[];
  products: HotelItem[];
  guests: HotelGuestOption[];
  orders: HotelOrder[];
  waiters: HotelWaiter[];
  receiptSettings: HotelReceiptSettings;
};
export type HotelReport = {
  from: string;
  to: string;
  roomRevenue: number;
  foodRevenue: number;
  productRevenue: number;
  totalRevenue: number;
  totalExpenses: number;
  profitLoss: number;
  paymentsReceived: number;
  outstandingBalance: number;
  completedStays: number;
  soldNights: number;
  bookedRoomNights: number;
  availableRoomNights: number;
  bookedOccupancyRate: number;
  averageDailyRate: number;
  daily: {
    date: string;
    accommodation: number;
    food: number;
    products: number;
    payments: number;
    expenses: number;
  }[];
  rooms: { roomNumber: string; completedStays: number; soldNights: number; revenue: number }[];
  expensesByCategory: { category: string; amount: number }[];
};
export type HotelExpenseCategory =
  | 'FOOD_SUPPLIES'
  | 'UTILITIES'
  | 'RENT'
  | 'REPAIRS_MAINTENANCE'
  | 'PAYROLL'
  | 'TRANSPORT'
  | 'OTHER';
export type HotelExpense = {
  id: string;
  branchId: string;
  expenseDate: string;
  category: HotelExpenseCategory;
  description: string;
  vendor: string;
  amount: number;
  paymentMethod: 'CASH' | 'MPESA' | 'CARD' | 'BANK' | 'OTHER';
  reference: string;
  notes: string;
  createdAt: string;
};
export type HotelExpenseRequest = Omit<HotelExpense, 'id' | 'createdAt'> & { requestId: string };
export type HotelAsset = {
  id: string;
  branchId: string;
  name: string;
  category: 'EQUIPMENT' | 'FURNITURE' | 'ELECTRONICS' | 'OTHER';
  quantity: number;
  purchaseDate: string;
  purchaseCost: number;
  location: string;
  status: 'ACTIVE' | 'NEEDS_REPAIR' | 'RETIRED';
  notes: string;
};
export type HotelAssetRequest = Omit<HotelAsset, 'id'>;
export type HotelRoomRequest = Omit<HotelRoom, 'id'>;
export type HotelBookingRequest = Pick<
  HotelBooking,
  | 'branchId'
  | 'roomId'
  | 'guestName'
  | 'guestPhone'
  | 'guestEmail'
  | 'guests'
  | 'arrival'
  | 'departure'
  | 'nightlyRate'
  | 'notes'
> & { requestId: string };
export type HotelItemRequest = Omit<HotelItem, 'id' | 'stock' | 'unitCost' | 'unitCostEstimated'>;
export type HotelOrderRequest = {
  requestId: string;
  branchId: string;
  waiterId: string;
  bookingId?: string;
  customerName: string;
  method: HotelOrder['method'];
  paymentReference: string;
  serviceType: HotelServiceType;
  tableNumber: string;
  notes: string;
  lines: { itemId: string; itemType: 'FOOD' | 'PRODUCT'; quantity: number }[];
};
export type HotelStockRequest = {
  requestId: string;
  quantity: number;
  kind: 'RECEIPT' | 'USAGE';
  note: string;
  unitCost?: number;
};

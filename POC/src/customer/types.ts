export interface DynamicDiscountRule {
  startWeek?: number;
  endWeek?: number;
  discountPercentage?: number;
  [key: string]: any;
}

export interface CustomerTier {
  id?: string;
  name: string;
  discountPercentage?: number;
  discountRules?: any;
  maxOnlineReservations?: number;
  [key: string]: any;
}

export interface CustomerUser {
  uid?: string;
  id: string;
  email: string;
  name?: string;
  customerName?: string;
  companyName?: string;
  phone?: string;
  tier?: CustomerTier | string | any;
  assignedSalesPersonId?: string;
  assignedSalesPersonName?: string;
  country?: string;
  city?: string;
  status?: 'active' | 'suspended' | 'pending' | 'deactivated';
  createdAt?: string;
  [key: string]: any;
}

export type Customer = CustomerUser;

export interface CustomerPayment {
  id: string;
  amount: number;
  currency?: string;
  vehicleId?: string;
  customerId?: string;
  paymentDate?: string;
  status?: string;
  [key: string]: any;
}

export interface CustomerPortalState {
  customer: CustomerUser | null;
  isAuthenticated: boolean;
  tier: CustomerTier;
}

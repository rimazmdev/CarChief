import React, { createContext, useContext, useState } from 'react';
import { CustomerUser, CustomerTier } from '../types';

export interface CustomerPortalContextType {
  customer: CustomerUser | null;
  customerTier: CustomerTier;
  setCustomer: (customer: CustomerUser | null) => void;
  logout: () => void;
  refreshAllData: () => Promise<void>;
}

const defaultTier: CustomerTier = {
  name: 'Standard',
  discountPercentage: 0,
  maxOnlineReservations: 2,
};

export const CustomerPortalContext = createContext<CustomerPortalContextType | undefined>(undefined);

export const CustomerPortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerUser | null>(null);

  const logout = () => {
    setCustomer(null);
  };

  const refreshAllData = async () => {
    // refresh callback
  };

  const tier: CustomerTier = typeof customer?.tier === 'object' && customer?.tier !== null
    ? customer.tier
    : defaultTier;

  return (
    <CustomerPortalContext.Provider
      value={{
        customer,
        customerTier: tier,
        setCustomer,
        logout,
        refreshAllData,
      }}
    >
      {children}
    </CustomerPortalContext.Provider>
  );
};

export const useCustomerPortal = () => {
  const context = useContext(CustomerPortalContext);
  if (!context) {
    throw new Error('useCustomerPortal must be used within a CustomerPortalProvider');
  }
  return context;
};

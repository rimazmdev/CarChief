/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VehicleCondition = 'New' | 'Used' | 'Certified Pre-Owned';
export type VehicleStatus = 'Available' | 'Pending' | 'Sold' | 'Draft' | 'Reserved' | 'Reserved with PI' | 'Invoice Created' | 'Invoiced';
export type TransmissionType = 'Automatic' | 'Manual' | 'Dual-Clutch';
export type FuelType = 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  type: string; // e.g. Sedan, SUV, Coupe, Convertible, etc.
  year: number;
  price: number;
  mileage: number;
  condition: VehicleCondition;
  color: string;
  transmission: TransmissionType;
  fuelType: FuelType;
  engine: string;
  description: string;
  images: string[];
  status: VehicleStatus;
  createdAt: string;

  // Categorized Pictures & Display Settings
  auctionPictures?: string[];
  auctionSheet?: string[];
  japanPictures?: string[];
  durbanPictures?: string[];
  showAuctionPictures?: boolean;
  showJapanPictures?: boolean;
  showDurbanPictures?: boolean;
  totalPicturesCount?: number;

  // Reservation details
  reservedAt?: string;
  reservedUntil?: string;
  reservedByEmail?: string;
  reservedByName?: string;
  reservationDurationHours?: number;
  reservedCustomerName?: string;
  reservedCustomerEmail?: string;
  reservedCustomerId?: string;
  isOnlineReservation?: boolean;
  reservedByUserName?: string;
  market?: string;

  // Custom Logistics fields
  stkNumber?: string;
  referenceNo?: string;
  modelCode?: string;
  vinSerialNo?: string;
  stockLocation?: string;
  currentLocation?: string;
  accessories?: string;
  port?: string;

  // Extra detailed CSV fields mapped
  commandType?: string;
  itemType?: string;
  domestic?: string;
  overseas?: string;
  title?: string;
  yearMonth?: string;
  registerYear?: string;
  chassis?: string;
  bodytype?: string;
  enginesize?: string;
  salescomment?: string;
  versionClass?: string;
  gradeTrimDomestic?: string;
  silverTierPrice?: string;
  goldTierPrice?: string;
  platinumTierPrice?: string;
  currency?: string;
  priceDomestic?: string;
  payTrade?: string;
  bodyStyle1?: string;
  bodyStyle2?: string;
  steering?: string;
  door?: string;
  displacement?: string;
  passengers?: string;
  driveType?: string;
  exteriorColor?: string;
  interiorColor?: string;
  checkYearMonth?: string;
  mechanicalProblem?: string;
  otherOptions?: string;
  adminComments?: string;
  commentsDomestic?: string;
  imageFiles?: string;
  vehicleWidth?: string;
  vehicleLength?: string;
  vehicleHeight?: string;
  mileageOption?: string;
  staff?: string;
  layingDate?: string;
  layingCost?: string;
  layingCostCurrency?: string;
  layingSupplier?: string;
  isPostedOption?: string;
  bottomPrice?: string;
  countryStock?: string;
  etdDate?: string;
  etaDate?: string;
  portStock?: string;
  yardIn?: string;
  ata?: string;
  stackDate?: string;
  bookingDate?: string;
  loadEtd?: string;
  loadPlanReference?: string;
  bookingStatus?: string;
  tripPhase?: string;
  erpStockNo?: string;
  btmPrice?: string;
  bookingDateApi?: string;
  bookingStatusApi?: string;
  tripPhaseApi?: string;
  loadEtdApi?: string;
  loadReferenceApi?: string;
  specialOffer?: string;
  mfgYear?: string;
  purchasedDate?: string;
  shipMethod?: string;
  shippingCompany?: string;
  blNumber?: string;
  vanning?: string;
  sealNo?: string;
  shippingMark?: string;
  shippingRemarks?: string;
  inspectionDate?: string;
  inspectionStatus?: string;
  reInspectionDate?: string;
  reInspectionStatus?: string;
  accessoriesRemark?: string;
  customer?: string;
  dataSource?: string;
  vehicleRemark?: string;
  soCutOffDate?: string;
  freightAdjustment?: string;
  departureVessel?: string;
  arrivalVoyage?: string;
  departureVoyage?: string;
  arrivalVessel?: string;
  carrierAtd?: string;
  carrierEta?: string;
  engineCode?: string;
  labelStatus?: string;
  source?: string;
  destinationInspectionDate?: string;
  m3?: string;
}

export interface Lead {
  id: string;
  vehicleId: string;
  vehicleTitle: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  status: 'New' | 'Contacted' | 'In Progress' | 'Sold' | 'Archived';
  notes: string;
  createdAt: string;
  freightDetails?: {
    destination: string;
    shippingMethod: string;
    estimatedCost: number;
  };
}

export interface RolePermissions {
  // Core System & Navigation Access
  canViewDashboard?: boolean;
  canViewInventory?: boolean;
  canEditInventory?: boolean;
  canUploadCSV?: boolean;
  canManageLeads?: boolean;
  canManageRoles?: boolean;

  // Vehicle & Sales Operations
  canReserveVehicle?: boolean;
  canCreatePI?: boolean;
  canConvertPI?: boolean;

  // Finance & Payment Actions
  canManageFinance?: boolean;
  canAllocateTT?: boolean;
  canManageExchangeRates?: boolean;
  canManageSalesmanAllocations?: boolean;

  // Masters Control & Granular Master Fields
  canManageMasters?: boolean;
  masterCountry?: boolean;
  masterPort?: boolean;
  masterCostItem?: boolean;
  masterShipper?: boolean;
  masterBank?: boolean;
  masterTerms?: boolean;
  masterRemarks?: boolean;
  masterBankNotes?: boolean;

  // Logistics & Pricing
  canManageFreightMapping?: boolean;
  canManageCityDelivery?: boolean;

  // Customer Management
  canManageCustomerTiers?: boolean;
  canManageCustomers?: boolean;

  // Content & System Auditing
  canManageCms?: boolean;
  canManageFaq?: boolean;
  canViewAuditLogs?: boolean;
}

export interface RoleConfig {
  id: string;
  name: string;
  description: string;
  permissions: RolePermissions;
  isSystemRole?: boolean;
}

export function hasStaffErpAccess(role?: RoleConfig | null): boolean {
  if (!role) return false;
  if (role.id === 'Admin' || role.name?.toLowerCase().includes('admin')) return true;
  if (role.id === 'Guest') {
    const p = role.permissions || {};
    return Boolean(
      p.canViewDashboard || p.canViewInventory || p.canManageLeads ||
      p.canManageFinance || p.canUploadCSV || p.canManageRoles || p.canManageMasters || p.canViewAuditLogs
    );
  }
  // Any assigned staff role (Sales, Dealer, Finance, or any custom role created by Admin)
  return true;
}

export interface FreightQuote {
  destination: string;
  method: 'RoRo' | 'Container' | 'Express';
  cost: number;
  transitTime: string;
}

export interface ProformaInvoice {
  id?: string;
  customerId?: string;
  currency?: string;
  proformaNo: string;
  date: string;
  paymentDue: string;
  paymentTerms: string;
  buyer: {
    companyName: string;
    consigneeName: string;
    streetAddress: string;
    city: string;
    country: string;
    email: string;
    tel1: string;
    tel2: string;
    broker?: string;
  };
  shipper: {
    companyName: string;
    address1: string;
    address2: string;
    city: string;
    state: string;
    zipCode: string;
    telephone: string;
    fax: string;
    fromPort: string;
    toPort: string;
  };
  vehicleDetails: {
    vehicleId: string;
    make: string;
    model: string;
    year: number;
    modelCode: string;
    chassisNo: string;
    grade: string;
    mfgYearMonth: string;
    regYearMonth: string;
    fuel: string;
    engineCC: string;
    exteriorColor: string;
    steering: string;
    bodyType: string;
    hsCode: string;
    engineNo: string;
    driveType: string;
    transmission: string;
    mileage: string;
    seatCapacity: string;
    stockLotNo: string;
    remarks: string;
    cfs: string;
    shipmentType: string;
    otherRemarks: string;
    purchasedDate?: string;
    imageUrl: string;
    showImage: boolean;
    // visibility flags matching checkboxes
    showBodyType?: boolean;
    showTransmission?: boolean;
    showHsCode?: boolean;
    showMileage?: boolean;
    showEngineNo?: boolean;
    showSeatCapacity?: boolean;
    showDriveType?: boolean;
    showStockLotNo?: boolean;
    showRemarks?: boolean;
    showCfs?: boolean;
    showShipmentType?: boolean;
    showOtherRemarks?: boolean;
  };
  financials: {
    stockNo: string;
    fob: number;
    freight: number;
    insurance: number;
    inspection: number;
    customCosts?: { category: string; cost: number }[];
    vehicleTotal: number;
    taxPercent: number;
    gTotalTerm: string;
    grandTotal: number;
    salesPerson: string;
    paidAmount?: number;
    balance?: number;
    currency?: string;
    exchangeRateUsed?: number;
    baseUsdFob?: number;
  };
  bankDetails: {
    bankName: string;
    branchName: string;
    accountName: string;
    accountNumber: string;
    swiftCode: string;
    branchAddress: string;
    notes: string;
  };
  termsDescription?: string;
  termsPresetId?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CountryMaster {
  id: string;
  name: string;
  code?: string;
}

export interface PortMaster {
  id: string;
  name: string;
  countryId: string;
  countryName: string;
}

export interface ShipperMaster {
  id: string;
  companyName: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zipCode: string;
  telephone: string;
  fax: string;
}

export interface BankMaster {
  id: string;
  title: string;
  bankName: string;
  branchName: string;
  accountName: string;
  accountNumber: string;
  swiftCode: string;
  bankType: 'Japan' | 'Overseas';
  address: string;
  shipperId: string;
  shipperCompanyName: string;
  iban: string;
  optionDisplay: boolean;
}

export interface FreightMapping {
  id: string;
  countryId: string;
  countryName: string;
  portId: string;
  portName: string;
  m3Range: string;
  costPerM3: number;
}

export interface TermsPresetMaster {
  id: string;
  title: string;
  displayStatus: 'Yes' | 'No';
  description: string;
}

export interface CityDeliveryRate {
  id: string;
  portId: string;
  portName: string;
  destinationCity: string;
  m3Range: string;
  costPerM3: number;
  duration?: string;
}

export interface BrandingSettings {
  logoType: 'icon' | 'image' | 'svg';
  logoIcon: string;
  logoColor: string;
  logoBgColor: string;
  logoIconColor: string;
  logoImageUrl: string;
  logoSvgCode: string;
}

export const defaultBranding: BrandingSettings = {
  logoType: 'icon',
  logoIcon: 'Car',
  logoColor: 'bg-red-600',
  logoBgColor: '#dc2626',
  logoIconColor: '#ffffff',
  logoImageUrl: '',
  logoSvgCode: '',
};

export interface SystemFAQItem {
  id?: string;
  Question: string;
  Answer: string;
  Category: string;
  Keywords: string;
  Priority: number;
  Status: 'enabled' | 'disabled' | string;
  UpdatedDate: string;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string; // e.g. JPY, USD, EUR
  toCurrency: string;   // e.g. USD, JPY, EUR
  rate: number;         // e.g. 0.0061
  effectiveDate: string;// e.g. '2026-07-22'
  activeStatus: 'Active' | 'Inactive';
  updatedBy: string;
  updatedAt: string;
}

export interface ExchangeRateHistory {
  id: string;
  exchangeRateId: string;
  fromCurrency: string;
  toCurrency: string;
  oldRate: number;
  newRate: number;
  changedBy: string;
  changedAt: string;
  reason?: string;
}

export interface PaymentAllocation {
  id: string;
  ttId: string;               // Reference to TT in customerPayments
  ttNumber: string;           // TT Number / Swift reference
  invoiceId: string;          // Proforma / Invoice ID
  invoiceNumber: string;      // Invoice Number
  vehicleId: string;          // Vehicle ID
  customerId: string;         // Customer ID
  customerName?: string;
  vehicleCurrency: string;    // Invoice Currency (e.g. JPY)
  vehicleAmount: number;      // Amount allocated in Invoice Currency
  ttCurrency: string;         // TT Currency (e.g. USD)
  ttAmountDeducted: number;   // Amount deducted from TT (vehicleAmount * exchangeRate)
  exchangeRateUsed: number;   // Permanently stored exchange rate
  allocatedBy: string;        // Sales executive / Staff name or email
  allocationDate: string;     // ISO Date string
  createdAt: string;
}





import React, { useState } from 'react';
import { 
  KeyRound, Plus, Trash2, ShieldCheck, Check, Shield, Copy, RefreshCw, 
  AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Layers, Settings, 
  Globe, Anchor, Landmark, FileText, Users, DollarSign, Car, Lock, 
  Sparkles, HelpCircle, Activity, FileSpreadsheet, MapPin, Coins,
  Building2, ArrowRight
} from 'lucide-react';
import { RoleConfig, RolePermissions } from '../types';

interface UserSecurityMatrixProps {
  currentRole: RoleConfig;
  availableRoles: RoleConfig[];
  onUpdateRolePermissions: (roleId: string, updatedPermissions: RolePermissions) => void;
  onAddRole?: (role: RoleConfig) => void;
  onDeleteRole?: (roleId: string) => void;
  triggerToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

interface PermissionDefinition {
  key: keyof RolePermissions;
  label: string;
  description: string;
}

interface PermissionGroup {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  permissions: PermissionDefinition[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    id: 'core_nav',
    title: 'Core Navigation & Module Tabs',
    icon: Building2,
    description: 'Grant or revoke access to top-level ERP dashboard views and navigation tabs.',
    permissions: [
      { key: 'canViewDashboard', label: 'Staff Dashboard Tab', description: 'Access to executive KPI overview & pending notification widget' },
      { key: 'canViewInventory', label: 'Inventory Catalog Tab', description: 'Access to vehicle stock inventory catalog & filters' },
      { key: 'canManageLeads', label: 'Leads & Enquiries Tab', description: 'Access to customer lead management and inquiry tracking' },
      { key: 'canManageFinance', label: 'Finance & Accounting Tab', description: 'Access to customer TT payment registry & salesman allocations' },
      { key: 'canUploadCSV', label: 'Bulk CSV Upload Tab', description: 'Access to batch inventory CSV import & ocean shipment parsing' },
    ]
  },
  {
    id: 'vehicle_sales',
    title: 'Vehicle Stock & Sales Operations',
    icon: Car,
    description: 'Control specific operational actions on stock items, reservations, and invoices.',
    permissions: [
      { key: 'canEditInventory', label: 'Edit Vehicle Specs & Prices', description: 'Permission to add new vehicles, edit specifications, and modify FOB prices' },
      { key: 'canReserveVehicle', label: 'Reserve Vehicles Feature', description: 'Permission to place manual hold/reservation locks on available stock' },
      { key: 'canCreatePI', label: 'Create Proforma Invoice (PI)', description: 'Permission to generate and issue formal Proforma Invoices for buyers' },
      { key: 'canConvertPI', label: 'Convert PI to Tax Invoice', description: 'Permission to convert confirmed Proforma Invoices into Tax/Commercial Invoices' },
      { key: 'canAllocateTT', label: 'Allocate & Approve TT Payments', description: 'Permission to record telegraphic transfer receipts and approve allocations' },
    ]
  },
  {
    id: 'finance_sub',
    title: 'Finance & Accounting Sub-Modules',
    icon: DollarSign,
    description: 'Granular controls for currency rates and sales representative commission tracking.',
    permissions: [
      { key: 'canManageExchangeRates', label: 'Currency Exchange Rates', description: 'Permission to modify live currency conversion rates & exchange history' },
      { key: 'canManageSalesmanAllocations', label: 'Salesperson Payment Allocations', description: 'Permission to view & edit commission allocations per salesperson' },
    ]
  },
  {
    id: 'masters_fields',
    title: 'Masters Control & Master Data Fields',
    icon: Settings,
    description: 'Individual field-level access control inside the Master Controls directory.',
    permissions: [
      { key: 'canManageMasters', label: 'Master Controls Overview Access', description: 'General access to the Master Controls management tab' },
      { key: 'masterCountry', label: 'Destination Countries Master', description: 'Manage country directory and regional destination codes' },
      { key: 'masterPort', label: 'Ports & Shipping Master', description: 'Manage maritime discharge ports and country linkages' },
      { key: 'masterCostItem', label: 'Cost Items & Charges Master', description: 'Manage additional FOB/shipping fee line items' },
      { key: 'masterShipper', label: 'Shipper / Exporter Master', description: 'Manage exporter company profiles and documentation addresses' },
      { key: 'masterBank', label: 'Bank Accounts & SWIFT Master', description: 'Manage official receiving bank accounts and SWIFT details' },
      { key: 'masterTerms', label: 'Proforma Payment Terms Presets', description: 'Manage default payment terms presets for Proforma Invoices' },
      { key: 'masterRemarks', label: 'Invoice Remarks Presets', description: 'Manage standard invoice footnote and agreement remarks' },
      { key: 'masterBankNotes', label: 'Bank Deposit Notes Presets', description: 'Manage default bank transfer deposit instructions' },
    ]
  },
  {
    id: 'logistics_pricing',
    title: 'Logistics & Delivery Pricing',
    icon: Anchor,
    description: 'Control ocean freight calculator and inland city delivery tariff setups.',
    permissions: [
      { key: 'canManageFreightMapping', label: 'Ocean Freight Rates Calculator', description: 'Manage RoRo / Container freight cost matrices per port' },
      { key: 'canManageCityDelivery', label: 'Inland City Delivery Tariff', description: 'Manage land transport delivery charges from discharge port to inland cities' },
    ]
  },
  {
    id: 'customer_mgmt',
    title: 'Customer Directory & Pricing Tiers',
    icon: Users,
    description: 'Permissions for client profiles, tier discounts, and CRM registry.',
    permissions: [
      { key: 'canManageCustomerTiers', label: 'Customer Tiers & Discount Levels', description: 'Manage buyer tier classifications and percentage discount rules' },
      { key: 'canManageCustomers', label: 'Customer Directory Management', description: 'View, edit, or deactivate registered customer account profiles' },
    ]
  },
  {
    id: 'system_security',
    title: 'Content CMS & Security Auditing',
    icon: ShieldCheck,
    description: 'Administrative permissions for website content, FAQ, logs, and security rules.',
    permissions: [
      { key: 'canManageCms', label: 'Website CMS & Home Additions', description: 'Manage promotional banners and home page showcase sections' },
      { key: 'canManageFaq', label: 'FAQ Content Manager', description: 'Edit public frequently asked questions and buyers guidelines' },
      { key: 'canViewAuditLogs', label: 'Firestore Security Audit Logs', description: 'View real-time database security logs and user activity' },
      { key: 'canManageRoles', label: 'User Security Matrix & Roles Control', description: 'Grant or revoke permissions and create new security roles' },
    ]
  }
];

export default function UserSecurityMatrix({
  currentRole,
  availableRoles,
  onUpdateRolePermissions,
  onAddRole,
  onDeleteRole,
  triggerToast
}: UserSecurityMatrixProps) {
  // Currently selected role for editing matrix
  const [selectedRoleId, setSelectedRoleId] = useState<string>('Admin');

  // Role creation form state
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleId, setNewRoleId] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [copyFromRoleId, setCopyFromRoleId] = useState<string>('none');

  // Find active selected role object
  const activeSelectedRole = availableRoles.find(r => r.id === selectedRoleId) || availableRoles[0] || currentRole;
  const isSuperAdmin = activeSelectedRole?.id === 'Admin';

  const handleCreateRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRole.permissions.canManageRoles) {
      triggerToast("Unauthorized. Only Admins can create new security roles.", "error");
      return;
    }

    if (!newRoleName.trim()) {
      triggerToast("Please provide a valid Role Name.", "error");
      return;
    }

    const generatedId = newRoleId.trim() || newRoleName.trim().replace(/\s+/g, '_').toUpperCase();

    if (availableRoles.some(r => r.id.toLowerCase() === generatedId.toLowerCase())) {
      triggerToast(`A role with ID '${generatedId}' already exists. Please choose a unique name.`, "error");
      return;
    }

    // Determine initial permissions template
    let initialPermissions: RolePermissions = {};

    if (copyFromRoleId !== 'none') {
      const template = availableRoles.find(r => r.id === copyFromRoleId);
      if (template) {
        initialPermissions = { ...template.permissions };
      }
    } else {
      // Default basic permissions
      initialPermissions = {
        canViewDashboard: true,
        canViewInventory: true,
        canReserveVehicle: true
      };
    }

    const createdRole: RoleConfig = {
      id: generatedId,
      name: newRoleName.trim(),
      description: newRoleDesc.trim() || `Custom security role for ${newRoleName.trim()}.`,
      isSystemRole: false,
      permissions: initialPermissions
    };

    if (onAddRole) {
      onAddRole(createdRole);
    }

    setSelectedRoleId(generatedId);
    setShowRoleForm(false);
    setNewRoleName('');
    setNewRoleId('');
    setNewRoleDesc('');
    setCopyFromRoleId('none');

    triggerToast(`New security role '${createdRole.name}' created successfully!`, "success");
  };

  const handleTogglePermission = (permKey: keyof RolePermissions) => {
    if (!currentRole.permissions.canManageRoles) {
      triggerToast("Unauthorized. Only Admins can modify security permissions.", "error");
      return;
    }

    if (isSuperAdmin) {
      triggerToast("Super Admin permissions cannot be restricted.", "info");
      return;
    }

    const currentVal = !!activeSelectedRole.permissions[permKey];
    const updatedPermissions = {
      ...activeSelectedRole.permissions,
      [permKey]: !currentVal
    };

    onUpdateRolePermissions(activeSelectedRole.id, updatedPermissions);
    triggerToast(`Permission '${permKey}' updated for ${activeSelectedRole.name}.`, "success");
  };

  const handleGrantAll = () => {
    if (!currentRole.permissions.canManageRoles) {
      triggerToast("Unauthorized.", "error");
      return;
    }

    const allTrue: RolePermissions = {
      canViewDashboard: true,
      canViewInventory: true,
      canEditInventory: true,
      canUploadCSV: true,
      canManageLeads: true,
      canManageRoles: true,
      canReserveVehicle: true,
      canCreatePI: true,
      canConvertPI: true,
      canManageFinance: true,
      canAllocateTT: true,
      canManageExchangeRates: true,
      canManageSalesmanAllocations: true,
      canManageMasters: true,
      masterCountry: true,
      masterPort: true,
      masterCostItem: true,
      masterShipper: true,
      masterBank: true,
      masterTerms: true,
      masterRemarks: true,
      masterBankNotes: true,
      canManageFreightMapping: true,
      canManageCityDelivery: true,
      canManageCustomerTiers: true,
      canManageCustomers: true,
      canManageCms: true,
      canManageFaq: true,
      canViewAuditLogs: true,
    };

    onUpdateRolePermissions(activeSelectedRole.id, allTrue);
    triggerToast(`All permissions granted to ${activeSelectedRole.name}.`, "success");
  };

  const handleRevokeAll = () => {
    if (!currentRole.permissions.canManageRoles) {
      triggerToast("Unauthorized.", "error");
      return;
    }

    if (isSuperAdmin) {
      triggerToast("Super Admin permissions cannot be revoked.", "info");
      return;
    }

    const allFalse: RolePermissions = {
      canViewDashboard: false,
      canViewInventory: false,
      canEditInventory: false,
      canUploadCSV: false,
      canManageLeads: false,
      canManageRoles: false,
      canReserveVehicle: false,
      canCreatePI: false,
      canConvertPI: false,
      canManageFinance: false,
      canAllocateTT: false,
      canManageExchangeRates: false,
      canManageSalesmanAllocations: false,
      canManageMasters: false,
      masterCountry: false,
      masterPort: false,
      masterCostItem: false,
      masterShipper: false,
      masterBank: false,
      masterTerms: false,
      masterRemarks: false,
      masterBankNotes: false,
      canManageFreightMapping: false,
      canManageCityDelivery: false,
      canManageCustomerTiers: false,
      canManageCustomers: false,
      canManageCms: false,
      canManageFaq: false,
      canViewAuditLogs: false,
    };

    onUpdateRolePermissions(activeSelectedRole.id, allFalse);
    triggerToast(`All permissions revoked for ${activeSelectedRole.name}.`, "info");
  };

  const handleDeleteCustomRole = (roleId: string, roleName: string) => {
    if (!currentRole.permissions.canManageRoles) {
      triggerToast("Unauthorized.", "error");
      return;
    }

    if (window.confirm(`Are you sure you want to delete the custom role '${roleName}'?`)) {
      if (onDeleteRole) {
        onDeleteRole(roleId);
        setSelectedRoleId('Admin');
        triggerToast(`Role '${roleName}' removed successfully.`, "success");
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Module Title Banner */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 border border-red-200 text-red-700 text-[10px] font-mono uppercase font-bold tracking-wider mb-2">
              <KeyRound className="w-3.5 h-3.5 text-red-600" />
              <span>ROLE CREATION & PERMISSIONS MATRIX</span>
            </div>
            <h2 className="text-xl font-bold uppercase tracking-tight text-neutral-900 flex items-center gap-2">
              User Security & Permission Control Hub
            </h2>
            <p className="text-xs text-neutral-500 mt-1 max-w-2xl leading-relaxed">
              Create custom security roles, assign granular module permissions, configure master fields access, and manage operational privileges for system staff.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowRoleForm(!showRoleForm)}
            className="bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Role</span>
          </button>
        </div>

        {/* CREATE ROLE COLLAPSIBLE FORM */}
        {showRoleForm && (
          <form onSubmit={handleCreateRoleSubmit} className="mt-6 p-5 bg-slate-50 rounded-2xl border border-neutral-200 space-y-4 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-red-600" /> STEP 1: CREATE SYSTEM SECURITY ROLE
              </h3>
              <span className="text-[10px] text-neutral-400 font-mono">NEW ROLE FORM</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Logistics Manager"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  className="w-full text-xs border border-neutral-300 rounded-xl p-2.5 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 mb-1">
                  Role Code / ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. LOGISTICS_MGR"
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full text-xs border border-neutral-300 rounded-xl p-2.5 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 mb-1">
                  Initial Permissions Template
                </label>
                <select
                  value={copyFromRoleId}
                  onChange={(e) => setCopyFromRoleId(e.target.value)}
                  className="w-full text-xs border border-neutral-300 rounded-xl p-2.5 bg-white font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="none">Start with Basic View Access</option>
                  {availableRoles.map(r => (
                    <option key={r.id} value={r.id}>Copy From: {r.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-neutral-700 mb-1">
                Role Description & Scope
              </label>
              <input
                type="text"
                placeholder="Brief summary of duties and authorized modules..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="w-full text-xs border border-neutral-300 rounded-xl p-2.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRoleForm(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 hover:bg-neutral-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-xl text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Role & Assign Access</span>
              </button>
            </div>
          </form>
        )}

        {/* ROLE SELECTOR CARDS ROW */}
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5 font-mono">
              <Users className="w-4 h-4 text-red-600" /> STEP 2: SELECT ROLE TO EDIT ACCESS MATRIX ({availableRoles.length})
            </h3>
            <span className="text-[10px] text-neutral-400 font-mono">CLICK ROLE CARD TO CONFIGURE PERMISSIONS</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {availableRoles.map((role) => {
              const isSelected = activeSelectedRole?.id === role.id;
              const isRoleAdmin = role.id === 'Admin';
              
              return (
                <div
                  key={role.id}
                  onClick={() => setSelectedRoleId(role.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-red-600 bg-red-50/20 ring-2 ring-red-500/20 shadow-md'
                      : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded font-mono ${
                      isSelected ? 'bg-red-600 text-white' : 'bg-neutral-100 text-neutral-700'
                    }`}>
                      {role.id}
                    </span>

                    <div className="flex items-center gap-1">
                      {isRoleAdmin && (
                        <span className="bg-amber-100 border border-amber-300 text-amber-800 text-[9px] font-mono px-1.5 py-0.5 rounded font-bold">
                          SUPER ADMIN
                        </span>
                      )}
                      {!role.isSystemRole && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomRole(role.id, role.name);
                          }}
                          className="text-neutral-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Delete Custom Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <h4 className="text-sm font-bold text-neutral-900 mb-1 flex items-center gap-1.5">
                    {role.name}
                  </h4>
                  <p className="text-[11px] text-neutral-500 line-clamp-2 leading-relaxed min-h-[32px]">
                    {role.description}
                  </p>

                  <div className="mt-3 pt-2 border-t border-neutral-100 flex items-center justify-between text-[10px] text-neutral-400 font-mono">
                    <span>
                      {isRoleAdmin ? 'All 26 Enabled' : `${Object.values(role.permissions || {}).filter(Boolean).length} Permissions Enabled`}
                    </span>
                    {isSelected && <span className="text-red-600 font-bold flex items-center gap-0.5">Active Matrix <ArrowRight className="w-3 h-3" /></span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ACTIVE ROLE PERMISSION MATRIX EDITOR */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 shadow-md space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-red-600 text-white font-mono text-[10px] font-bold rounded uppercase">
                {activeSelectedRole.id}
              </span>
              <h3 className="text-lg font-bold text-neutral-900 uppercase">
                {activeSelectedRole.name} — PERMISSION MATRIX
              </h3>
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {activeSelectedRole.description}
            </p>
          </div>

          {/* Quick Matrix Action Buttons */}
          <div className="flex items-center gap-2">
            {!isSuperAdmin && (
              <>
                <button
                  type="button"
                  onClick={handleGrantAll}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                >
                  Allow All
                </button>
                <button
                  type="button"
                  onClick={handleRevokeAll}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 hover:bg-rose-100 font-bold text-[11px] transition-all cursor-pointer shadow-sm"
                >
                  Deny All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Super Admin Access Banner Notice */}
        {isSuperAdmin && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3 shadow-sm">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold uppercase tracking-wider text-[11px] text-amber-900">
                Super Admin Role Authorization (Allow All)
              </p>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Super Admin maintains unrestricted master control across all 26+ ERP modules, features, master data fields, and database operations. Permissions are locked to 'Allowed' for Super Admin to prevent accidental lockout.
              </p>
            </div>
          </div>
        )}

        {/* PERMISSION CATEGORIES MATRIX GRID */}
        <div className="space-y-6">
          {PERMISSION_GROUPS.map((group) => {
            const GroupIcon = group.icon;
            
            return (
              <div key={group.id} className="border border-neutral-200 rounded-2xl overflow-hidden bg-slate-50/50 shadow-sm">
                
                {/* Category Header */}
                <div className="bg-slate-100/80 px-5 py-3.5 border-b border-neutral-200 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-white border border-neutral-200 text-red-600 shadow-sm">
                      <GroupIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 font-mono">
                        {group.title}
                      </h4>
                      <p className="text-[11px] text-neutral-500 font-sans">
                        {group.description}
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold bg-white px-2.5 py-1 rounded-md border border-neutral-200 text-neutral-600">
                    {group.permissions.filter(p => isSuperAdmin || !!activeSelectedRole.permissions[p.key]).length} / {group.permissions.length} GRANTED
                  </span>
                </div>

                {/* Permissions List */}
                <div className="divide-y divide-neutral-200/60 bg-white">
                  {group.permissions.map((perm) => {
                    const isChecked = isSuperAdmin || !!activeSelectedRole.permissions[perm.key];

                    return (
                      <div
                        key={perm.key}
                        className={`p-4 flex items-center justify-between transition-colors ${
                          isChecked ? 'bg-emerald-50/20' : 'hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="pr-4">
                          <label 
                            onClick={() => !isSuperAdmin && handleTogglePermission(perm.key)}
                            className="text-xs font-bold text-neutral-900 cursor-pointer hover:text-red-600 transition-colors flex items-center gap-2"
                          >
                            <span>{perm.label}</span>
                            {isChecked && (
                              <span className="text-[9px] font-mono uppercase bg-emerald-100 border border-emerald-300 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                                Granted
                              </span>
                            )}
                          </label>
                          <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">
                            {perm.description}
                          </p>
                        </div>

                        <div className="shrink-0 flex items-center">
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isSuperAdmin}
                              onChange={() => handleTogglePermission(perm.key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            );
          })}
        </div>

        {/* Security Matrix Footer Info */}
        <div className="p-4 rounded-xl bg-slate-100 border border-neutral-200/80 text-[11px] text-neutral-600 flex items-center justify-between font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-red-600" />
            <span>ENFORCED SECURITY MATRIX — CHANGES SYNC INSTANTLY ACROSS ALL CONNECTED USER SESSIONS</span>
          </div>
          <span className="font-bold text-neutral-800">
            SYSTEM ROLE: {activeSelectedRole.name} ({activeSelectedRole.id})
          </span>
        </div>

      </div>

    </div>
  );
}

// =====================================================================
// Generated-style TypeScript types for Phase 1 schema.
// Once Supabase CLI is linked, replace/regen with:
//   supabase gen types typescript --linked > src/types/database.types.ts
// These hand-written types match migrations 0001-0013 exactly so the
// app is type-safe from day one, before the CLI is wired up.
//
// IMPORTANT: Use `type` (not `interface`) for all Row types so they
// satisfy Record<string, unknown> and @supabase/postgrest-js can
// resolve them correctly (interfaces don't extend index-signature types).
// =====================================================================

export type UserRole = 'developer' | 'staff';
export type BranchStatus = 'active' | 'inactive';
export type VehicleStatus =
  | 'available' | 'reserved' | 'financing' | 'sold_cash' | 'closed_contract' | 'under_repair';
export type ContractStatus = 'active' | 'completed' | 'overdue' | 'cancelled';
export type PaymentStatus = 'paid' | 'pending' | 'overdue';
export type PaymentMethod = 'cash' | 'bank_transfer' | 'qr_promptpay' | 'other';
export type NotificationType =
  | 'due_today' | 'due_tomorrow' | 'due_within_7_days'
  | 'overdue_1_day' | 'overdue_3_days' | 'overdue_7_days' | 'overdue_30_days';
export type AuditAction = 'login' | 'logout' | 'failed_login' | 'create' | 'update' | 'delete';

export type AppUser = {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Branch = {
  id: string;
  branch_code: string;
  branch_name: string;
  address: string | null;
  phone_number: string | null;
  status: BranchStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Vehicle = {
  id: string;
  stock_code: string;
  brand: string;
  model: string;
  sub_model: string | null;
  year: number;
  registration_year: number | null;
  color: string | null;
  license_plate: string | null;
  vin_number: string | null;
  engine_number: string | null;
  purchase_price: number;
  selling_price: number;
  branch_id: string | null;
  status: VehicleStatus;
  notes: string | null;
  supplier_company: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  repair_cost: number;
  actual_cost: number | null;
  received_registration_book: boolean;
  received_tax_invoice: boolean;
  registration_received_date: string | null;
  stock_prefix: string | null;
  mileage: number | null;
  date_received: string | null;
  previous_owner: string | null;
  vehicle_source: 'buy' | 'trade_in' | 'auction' | 'other' | null;
};

export type Customer = {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  national_id: string | null;
  address: string | null;
  province: string | null;
  district: string | null;
  postal_code: string | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  notes: string | null;
  branch_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type Contract = {
  id: string;
  contract_number: string;
  customer_id: string;
  vehicle_id: string;
  branch_id: string;
  sale_price: number;
  down_payment: number;
  finance_amount: number;
  monthly_installment: number;
  total_terms: number | null;
  start_date: string;
  due_day: number;
  end_date: string | null;
  status: ContractStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  // Extended fields from migration 0011/0012/0013
  contract_sequence: number | null;
  total_financing: number | null;
  payment_on_delivery: number | null;
  interest_rate: number | null;
  total_interest: number | null;
  document_fee: number | null;
  balance: number | null;
  buyer_occupation: string | null;
  buyer_workplace: string | null;
  buyer_work_phone: string | null;
  guarantor_occupation: string | null;
  guarantor_workplace: string | null;
  guarantor_work_phone: string | null;
  guarantor_address: string | null;
  vehicle_engine_no: string | null;
  vehicle_chassis_no: string | null;
  vehicle_old_plate: string | null;
  vehicle_new_plate: string | null;
  vehicle_color_snap: string | null;
  vehicle_model_snap: string | null;
};

export type Payment = {
  id: string;
  contract_id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  payment_date: string | null;
  actual_payment_date: string | null;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;
  notes: string | null;
  penalty_fee: number;
  receipt_number: string | null;
  bank: string | null;
  custom_bank_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRow = {
  id: string;
  type: NotificationType;
  contract_id: string | null;
  payment_id: string | null;
  customer_id: string | null;
  branch_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
  deleted_at: string | null;
};

export type AuditLog = {
  id: number;
  user_id: string | null;
  action: AuditAction;
  table_name: string | null;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

export type ContractSummary = {
  contract_id: string;
  total_terms: number;
  paid_terms: number;
  remaining_terms: number;
  outstanding_balance: number;
  next_due_date: string | null;
  max_days_overdue: number;
};

export type StockPrefix = {
  id: string;
  prefix: string;
  label: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type StockSequence = {
  prefix: string;
  last_seq: number;
};

export type MotorcycleBrand = { id: string; name: string; is_active: boolean; sort_order: number; created_at: string };
export type MotorcycleModel = { id: string; name: string; is_active: boolean; sort_order: number; created_at: string };

export type ContractPaymentSummary = {
  contract_id: string;
  contract_number: string;
  branch_id: string;
  contract_status: ContractStatus;
  total_terms: number;
  customer_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  brand: string;
  model: string;
  paid_terms: number;
  remaining_terms: number;
  outstanding_balance: number;
  next_due_date: string | null;
  max_days_overdue: number;
  has_overdue: boolean;
};

export type DashboardSummary = {
  branch_id: string;
  branch_name: string;
  available_vehicles: number;
  reserved_vehicles: number;
  under_repair_vehicles: number;
  total_vehicles: number;
  active_contracts: number;
  completed_contracts: number;
  overdue_contracts: number;
  outstanding_balance: number;
};

export type OverdueCustomer = {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  contract_id: string;
  contract_number: string;
  branch_id: string;
  payment_id: string;
  installment_number: number;
  due_date: string;
  days_overdue: number;
  amount_outstanding: number;
};

export type SoldVehicle = {
  vehicle_id: string;
  stock_code: string;
  stock_prefix: string | null;
  brand: string;
  model: string;
  year: number;
  color: string | null;
  license_plate: string | null;
  vin_number: string | null;
  engine_number: string | null;
  purchase_price: number;
  repair_cost: number;
  actual_cost: number | null;
  selling_price: number;
  status: VehicleStatus;
  branch_id: string | null;
  contract_id: string | null;
  contract_number: string | null;
  customer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone_number: string | null;
  guarantor_name: string | null;
  guarantor_phone: string | null;
  sale_price: number | null;
  start_date: string | null;
  end_date: string | null;
  contract_status: ContractStatus | null;
  deleted_at: string | null;
};

// Minimal Supabase Database generic, extend as more views/functions land.
// IMPORTANT: All Row types must be `type` (not `interface`) so they satisfy
// Record<string, unknown> — required for @supabase/postgrest-js GenericSchema constraint.
export type Database = {
  public: {
    Tables: {
      users: { Row: AppUser; Insert: Partial<AppUser>; Update: Partial<AppUser>; Relationships: [] };
      branches: { Row: Branch; Insert: Partial<Branch>; Update: Partial<Branch>; Relationships: [] };
      vehicles: { Row: Vehicle; Insert: Partial<Vehicle>; Update: Partial<Vehicle>; Relationships: [] };
      customers: { Row: Customer; Insert: Partial<Customer>; Update: Partial<Customer>; Relationships: [] };
      contracts: { Row: Contract; Insert: Partial<Contract>; Update: Partial<Contract>; Relationships: [] };
      payments: { Row: Payment; Insert: Partial<Payment>; Update: Partial<Payment>; Relationships: [] };
      notifications: { Row: NotificationRow; Insert: Partial<NotificationRow>; Update: Partial<NotificationRow>; Relationships: [] };
      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: never; Relationships: [] };
      stock_prefixes: { Row: StockPrefix; Insert: Partial<StockPrefix>; Update: Partial<StockPrefix>; Relationships: [] };
      stock_sequences: { Row: StockSequence; Insert: Partial<StockSequence>; Update: Partial<StockSequence>; Relationships: [] };
      motorcycle_brands: { Row: MotorcycleBrand; Insert: Partial<MotorcycleBrand>; Update: Partial<MotorcycleBrand>; Relationships: [] };
      motorcycle_models: { Row: MotorcycleModel; Insert: Partial<MotorcycleModel>; Update: Partial<MotorcycleModel>; Relationships: [] };
    };
    Views: {
      v_dashboard_summary: { Row: DashboardSummary; Relationships: [] };
      v_overdue_customers: { Row: OverdueCustomer; Relationships: [] };
      v_contract_payment_summary: { Row: ContractPaymentSummary; Relationships: [] };
      v_sold_vehicles: { Row: SoldVehicle; Relationships: [] };
    };
    Functions: {
      get_contract_summary: { Args: { p_contract_id: string }; Returns: ContractSummary[] };
      generate_due_notifications: { Args: Record<string, never>; Returns: void };
      next_stock_code: { Args: { p_prefix: string }; Returns: string };
      next_contract_sequence: { Args: { p_branch_id: string }; Returns: number };
      log_auth_event: { Args: { p_action: string; p_email?: string }; Returns: void };
    };
  };
};

'use server';

import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { isPowerUser } from '@/lib/auth/roles';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function assertBranchAccess(branchId: string) {
  const me = await getCurrentAppUser();
  if (!me) throw new Error('Forbidden');
  if (!isPowerUser(me.role) && branchId !== me.branch_id) throw new Error('Forbidden');
  return me;
}

function generateContractNumber(branchCode: string, seq: number) {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  return `CT-${branchCode}-${ymd}-${String(seq).padStart(4, '0')}`;
}

// ─── CREATE CONTRACT ──────────────────────────────────────────────────────────
export interface InstallmentFormState { error?: string; contractId?: string; }

export async function createInstallmentContractAction(
  locale: string,
  _prev: InstallmentFormState,
  formData: FormData
): Promise<InstallmentFormState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const branchId = formData.get('branch_id') as string;
  if (!branchId) return { error: 'invalid' };
  if (!isPowerUser(me.role) && branchId !== me.branch_id) return { error: 'forbidden' };

  const supabase = await createClient();
  const admin = adminClient();

  // Handle customer: existing or new
  let customerId = formData.get('customer_id') as string | null;
  if (!customerId) {
    const firstName = formData.get('first_name') as string;
    const lastName = formData.get('last_name') as string;
    if (!firstName || !lastName) return { error: 'invalid' };
    const { data: newCust, error: custErr } = await admin.from('customers').insert({
      first_name: firstName,
      last_name: lastName,
      phone_number: formData.get('phone_number') as string || '',
      address: formData.get('address') as string || null,
      guarantor_name: formData.get('guarantor_name') as string || null,
      guarantor_phone: formData.get('guarantor_phone') as string || null,
      branch_id: branchId,
      created_by: me.id,
    }).select('id').single();
    if (custErr || !newCust) return { error: 'invalid' };
    customerId = newCust.id;
  }

  const vehicleId = formData.get('vehicle_id') as string;
  if (!vehicleId) return { error: 'invalid' };

  const finalContractNumber = (formData.get('contract_number') as string | null)?.trim();
  const seq = parseInt(formData.get('contract_sequence') as string || '0', 10);

  if (!finalContractNumber) return { error: 'invalid' };
  if (!seq || seq < 1) return { error: 'invalid' };

  const salePrice = Number(formData.get('sale_price') || 0);
  const downPayment = Number(formData.get('down_payment') || 0);
  const totalFinancing = Number(formData.get('total_financing') || 0);
  const balanceRaw = formData.get('balance');
  const balance = balanceRaw !== null && balanceRaw !== '' ? Number(balanceRaw) : null;

  const { data: contract, error } = await admin.from('contracts').insert({
    contract_number: finalContractNumber,
    contract_sequence: seq,
    customer_id: customerId,
    vehicle_id: vehicleId,
    branch_id: branchId,
    start_date: formData.get('contract_date') as string || new Date().toISOString().slice(0,10),
    sale_price: salePrice,
    down_payment: downPayment,
    finance_amount: salePrice - downPayment,
    total_financing: totalFinancing || (salePrice - downPayment),
    payment_on_delivery: Number(formData.get('payment_on_delivery') || 0),
    interest_rate: Number(formData.get('interest_rate') || 0) || null,
    document_fee: Number(formData.get('document_fee') || 0),
    balance: balance,
    monthly_installment: Number(formData.get('monthly_installment') || 0),
    total_terms: Number(formData.get('total_terms') || 0) || null,
    due_day: Number(formData.get('due_day') || 1),
    status: 'active',
    created_by: me.id,
    buyer_occupation: formData.get('buyer_occupation') as string || null,
    buyer_workplace: formData.get('buyer_workplace') as string || null,
    buyer_work_phone: formData.get('buyer_work_phone') as string || null,
    guarantor_occupation: formData.get('guarantor_occupation') as string || null,
    guarantor_workplace: formData.get('guarantor_workplace') as string || null,
    guarantor_work_phone: formData.get('guarantor_work_phone') as string || null,
    guarantor_address: formData.get('guarantor_address') as string || null,
    vehicle_engine_no: formData.get('vehicle_engine_no') as string || null,
    vehicle_chassis_no: formData.get('vehicle_chassis_no') as string || null,
    vehicle_old_plate: formData.get('vehicle_old_plate') as string || null,
    vehicle_new_plate: formData.get('vehicle_new_plate') as string || null,
    vehicle_color_snap: formData.get('vehicle_color_snap') as string || null,
    vehicle_model_snap: formData.get('vehicle_model_snap') as string || null,
  }).select('id').single();

  if (error) return { error: 'invalid' };

  await admin.from('vehicles').update({ status: 'financing' }).eq('id', vehicleId);

  revalidatePath(`/${locale}/installments`);
  return { contractId: contract.id };
}

// ─── SECTION UPDATES ─────────────────────────────────────────────────────────
export interface SectionFormState { error?: string; }

export async function updateContractInfoAction(
  locale: string, contractId: string, branchId: string,
  _prev: SectionFormState, formData: FormData
): Promise<SectionFormState> {
  await assertBranchAccess(branchId);
  const { error } = await adminClient().from('contracts').update({
    branch_id: formData.get('branch_id') as string || branchId,
    start_date: formData.get('contract_date') as string,
  }).eq('id', contractId);
  if (error) return { error: 'invalid' };
  revalidatePath(`/${locale}/installments/${contractId}`);
  return {};
}

export async function updateBuyerInfoAction(
  locale: string, contractId: string, customerId: string, branchId: string,
  _prev: SectionFormState, formData: FormData
): Promise<SectionFormState> {
  await assertBranchAccess(branchId);
  const admin = adminClient();
  const { error: custErr } = await admin.from('customers').update({
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    phone_number: formData.get('phone_number') as string,
    address: formData.get('address') as string || null,
  }).eq('id', customerId);
  if (custErr) return { error: 'invalid' };
  const { error: conErr } = await admin.from('contracts').update({
    buyer_occupation: formData.get('buyer_occupation') as string || null,
    buyer_workplace: formData.get('buyer_workplace') as string || null,
    buyer_work_phone: formData.get('buyer_work_phone') as string || null,
  }).eq('id', contractId);
  if (conErr) return { error: 'invalid' };
  revalidatePath(`/${locale}/installments/${contractId}`);
  revalidatePath(`/${locale}/payments/${contractId}`);
  return {};
}

export async function updateGuarantorInfoAction(
  locale: string, contractId: string, customerId: string, branchId: string,
  _prev: SectionFormState, formData: FormData
): Promise<SectionFormState> {
  await assertBranchAccess(branchId);
  const admin = adminClient();
  await admin.from('customers').update({
    guarantor_name: formData.get('guarantor_name') as string || null,
    guarantor_phone: formData.get('guarantor_phone') as string || null,
  }).eq('id', customerId);
  const { error } = await admin.from('contracts').update({
    guarantor_address: formData.get('guarantor_address') as string || null,
    guarantor_occupation: formData.get('guarantor_occupation') as string || null,
    guarantor_workplace: formData.get('guarantor_workplace') as string || null,
    guarantor_work_phone: formData.get('guarantor_work_phone') as string || null,
  }).eq('id', contractId);
  if (error) return { error: 'invalid' };
  revalidatePath(`/${locale}/installments/${contractId}`);
  revalidatePath(`/${locale}/payments/${contractId}`);
  return {};
}

export async function updateVehicleSnapshotAction(
  locale: string, contractId: string, branchId: string,
  _prev: SectionFormState, formData: FormData
): Promise<SectionFormState> {
  await assertBranchAccess(branchId);
  const { error } = await adminClient().from('contracts').update({
    vehicle_engine_no: formData.get('vehicle_engine_no') as string || null,
    vehicle_chassis_no: formData.get('vehicle_chassis_no') as string || null,
    vehicle_model_snap: formData.get('vehicle_model_snap') as string || null,
    vehicle_old_plate: formData.get('vehicle_old_plate') as string || null,
    vehicle_new_plate: formData.get('vehicle_new_plate') as string || null,
    vehicle_color_snap: formData.get('vehicle_color_snap') as string || null,
  }).eq('id', contractId);
  if (error) return { error: 'invalid' };
  revalidatePath(`/${locale}/installments/${contractId}`);
  revalidatePath(`/${locale}/payments/${contractId}`);
  return {};
}

export async function updateFinancialInfoAction(
  locale: string, contractId: string, branchId: string,
  _prev: SectionFormState, formData: FormData
): Promise<SectionFormState> {
  await assertBranchAccess(branchId);
  const salePrice = Number(formData.get('sale_price') || 0);
  const downPayment = Number(formData.get('down_payment') || 0);
  const totalFinancing = Number(formData.get('total_financing') || 0);
  const balanceRaw = formData.get('balance');
  const balance = balanceRaw !== null && balanceRaw !== '' ? Number(balanceRaw) : null;
  const { error } = await adminClient().from('contracts').update({
    sale_price: salePrice,
    down_payment: downPayment,
    finance_amount: salePrice - downPayment,
    total_financing: totalFinancing,
    payment_on_delivery: Number(formData.get('payment_on_delivery') || 0),
    interest_rate: Number(formData.get('interest_rate') || 0) || null,
    document_fee: Number(formData.get('document_fee') || 0),
    balance: balance,
    total_terms: Number(formData.get('total_terms') || 0) || null,
    monthly_installment: Number(formData.get('monthly_installment') || 0),
  }).eq('id', contractId);
  if (error) return { error: 'invalid' };
  revalidatePath(`/${locale}/installments/${contractId}`);
  revalidatePath(`/${locale}/payments/${contractId}`);
  return {};
}

// ─── PAYMENT ROWS ─────────────────────────────────────────────────────────────
export interface PaymentRowState { error?: string; }

export async function addPaymentRowAction(
  locale: string, contractBranchId: string,
  _prev: PaymentRowState, formData: FormData
): Promise<PaymentRowState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };
  if (!isPowerUser(me.role) && contractBranchId !== me.branch_id) return { error: 'forbidden' };

  const contractId = formData.get('contract_id') as string;
  const { error } = await adminClient().from('payments').insert({
    contract_id: contractId,
    installment_number: Number(formData.get('installment_number') || 1),
    due_date: formData.get('due_date') as string,
    amount_due: Number(formData.get('amount_due') || 0),
    amount_paid: 0,
    status: 'pending',
    created_by: me.id,
  });
  if (error) return { error: error.code === '23505' ? 'duplicateInstallment' : 'invalid' };
  revalidatePath(`/${locale}/payments/${contractId}`);
  return {};
}

// ─── GENERATE PAYMENT SCHEDULE ────────────────────────────────────────────────
export interface GenerateScheduleState { error?: string; count?: number; }

export async function generatePaymentScheduleAction(
  locale: string,
  contractId: string
): Promise<GenerateScheduleState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const admin = adminClient();

  // Use adminClient for contract read — bypasses RLS and Next.js fetch cache,
  // so we always get the latest saved monthly_installment / total_terms.
  const { data: contract } = await admin
    .from('contracts')
    .select('id, branch_id, total_terms, monthly_installment, start_date, due_day')
    .eq('id', contractId)
    .single();

  if (!contract) return { error: 'not_found' };
  if (!isPowerUser(me.role) && contract.branch_id !== me.branch_id) return { error: 'forbidden' };
  if (!contract.total_terms || !contract.monthly_installment) return { error: 'missing_terms' };

  // Delete existing UNPAID (pending/overdue) payments only — never delete paid ones
  const { data: paid } = await admin
    .from('payments')
    .select('id')
    .eq('contract_id', contractId)
    .eq('status', 'paid');

  const paidCount = paid?.length ?? 0;
  const startTerm = paidCount + 1; // Generate from the next term after last paid

  await admin
    .from('payments')
    .delete()
    .eq('contract_id', contractId)
    .neq('status', 'paid');

  // Build rows: due_date = start_date + N months, clamped to last day of month
  // Parse contract date as UTC to avoid timezone shifts
  const startDate = new Date(contract.start_date + 'T00:00:00Z');
  const dueDay = startDate.getUTCDate(); // e.g. 29
  const rows = [];

  for (let i = startTerm; i <= contract.total_terms; i++) {
    // Safe month arithmetic in UTC — no local-time/DST issues
    const totalMonths = startDate.getUTCMonth() + i;
    const year = startDate.getUTCFullYear() + Math.floor(totalMonths / 12);
    const month = totalMonths % 12; // 0-indexed
    // Last day of target month (UTC)
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const day = Math.min(dueDay, lastDay);
    // Format directly as YYYY-MM-DD string — no toISOString() timezone shift
    const due_date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

    rows.push({
      contract_id: contractId,
      installment_number: i,
      due_date,
      amount_due: contract.monthly_installment,
      amount_paid: 0,
      status: 'pending' as const,
      penalty_fee: 0,
      created_by: me.id,
    });
  }

  if (rows.length === 0) return { count: 0 };

  const { error } = await admin.from('payments').insert(rows);
  if (error) return { error: error.message };

  revalidatePath(`/${locale}/payments/${contractId}`);
  return { count: rows.length };
}

export async function recordInstallmentPaymentAction(
  locale: string, paymentId: string, contractId: string, contractBranchId: string,
  _prev: PaymentRowState, formData: FormData
): Promise<PaymentRowState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };
  if (!isPowerUser(me.role) && contractBranchId !== me.branch_id) return { error: 'forbidden' };

  const amount_paid = Number(formData.get('amount_paid') ?? 0);
  const amount_due = Number(formData.get('amount_due') ?? 0);
  const actual_payment_date = formData.get('actual_payment_date') as string || null;
  const payment_method = (formData.get('payment_method') as string || null) as import('@/types/database.types').PaymentMethod | null;
  const penalty_fee = Number(formData.get('penalty_fee') || 0);
  const receipt_number = formData.get('receipt_number') as string || null;
  const bank_raw = formData.get('bank') as string || null;
  const custom_bank_name = formData.get('custom_bank_name') as string || null;
  const bank = bank_raw === 'others' ? 'others' : bank_raw;

  const status = amount_paid >= amount_due && amount_due > 0 ? 'paid' : 'pending';

  const { error } = await adminClient().from('payments').update({
    amount_paid,
    actual_payment_date,
    payment_date: actual_payment_date,
    payment_method,
    penalty_fee,
    receipt_number,
    bank,
    custom_bank_name: bank === 'others' ? custom_bank_name : null,
    status,
  
  }).eq('id', paymentId);

  if (error) return { error: 'invalid' };
  revalidatePath(`/${locale}/payments/${contractId}`);
  revalidatePath(`/${locale}/installments`);
  return {};
}

// ─── DELETE A SINGLE UNPAID PAYMENT ROW ──────────────────────────────────────
export async function deletePaymentRowAction(
  locale: string,
  paymentId: string,
  contractId: string,
  contractBranchId: string
): Promise<{ error?: string }> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };
  if (!isPowerUser(me.role) && contractBranchId !== me.branch_id) return { error: 'forbidden' };

  const admin = adminClient();
  // Never delete a paid installment — that would destroy a payment record.
  const { data: pay } = await admin.from('payments').select('status').eq('id', paymentId).single();
  if (!pay) return { error: 'not_found' };
  if (pay.status === 'paid') return { error: 'cannot_delete_paid' };

  const { error } = await admin.from('payments').delete().eq('id', paymentId);
  if (error) return { error: 'invalid' };

  revalidatePath(`/${locale}/payments/${contractId}`);
  revalidatePath(`/${locale}/installments`);
  return {};
}

'use server';

import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const contractSchema = z.object({
  customer_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  sale_price: z.coerce.number().min(0),
  down_payment: z.coerce.number().min(0),
  monthly_installment: z.coerce.number().min(0.01),
  total_terms: z.coerce.number().int().min(1).max(120),
  start_date: z.string().min(1),
  due_day: z.coerce.number().int().min(1).max(31)
});

export interface ContractFormState {
  error?: string;
  contractId?: string;
}

function generateContractNumber(branchCode: string) {
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `CT-${branchCode}-${ymd}-${rand}`;
}

export async function createContractAction(
  locale: string,
  _prevState: ContractFormState,
  formData: FormData
): Promise<ContractFormState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const parsed = contractSchema.safeParse({
    customer_id: formData.get('customer_id'),
    vehicle_id: formData.get('vehicle_id'),
    branch_id: formData.get('branch_id'),
    sale_price: formData.get('sale_price'),
    down_payment: formData.get('down_payment'),
    monthly_installment: formData.get('monthly_installment'),
    total_terms: formData.get('total_terms'),
    start_date: formData.get('start_date'),
    due_day: formData.get('due_day')
  });
  if (!parsed.success) return { error: 'invalid' };

  const d = parsed.data;
  if (me.role !== 'developer' && d.branch_id !== me.branch_id) {
    return { error: 'forbidden' };
  }
  if (d.down_payment > d.sale_price) return { error: 'invalid' };

  const supabase = await createClient();

  // Confirm the vehicle is still available right before committing —
  // closes the race window between the form loading and submission.
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('status, branch_id')
    .eq('id', d.vehicle_id)
    .single();
  if (!vehicle || vehicle.status !== 'available') {
    return { error: 'vehicleNotAvailable' };
  }

  const { data: branch } = await supabase
    .from('branches')
    .select('branch_code')
    .eq('id', d.branch_id)
    .single();

  const { data: contract, error } = await supabase
    .from('contracts')
    .insert({
      contract_number: generateContractNumber(branch?.branch_code ?? 'BR'),
      customer_id: d.customer_id,
      vehicle_id: d.vehicle_id,
      branch_id: d.branch_id,
      sale_price: d.sale_price,
      down_payment: d.down_payment,
      finance_amount: d.sale_price - d.down_payment, // must match DB check constraint
      monthly_installment: d.monthly_installment,
      total_terms: d.total_terms,
      start_date: d.start_date,
      due_day: d.due_day,
      status: 'active',
      created_by: me.id
    })
    .select('id')
    .single();

  if (error) {
    return { error: error.code === '23505' ? 'oneActiveContractPerVehicle' : 'invalid' };
  }

  // Mark the vehicle as financing now that a contract exists for it.
  await supabase.from('vehicles').update({ status: 'financing' }).eq('id', d.vehicle_id);

  revalidatePath(`/${locale}/contracts`);
  revalidatePath(`/${locale}/vehicles`);
  revalidatePath(`/${locale}/customers/${d.customer_id}`);

  return { contractId: contract.id };
}

const updateContractSchema = z.object({
  monthly_installment: z.coerce.number().min(0.01),
  due_day: z.coerce.number().int().min(1).max(31),
  end_date: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'overdue', 'cancelled'])
});

export interface UpdateContractFormState {
  error?: string;
}

export async function updateContractAction(
  locale: string,
  contractId: string,
  _prevState: UpdateContractFormState,
  formData: FormData
): Promise<UpdateContractFormState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const parsed = updateContractSchema.safeParse({
    monthly_installment: formData.get('monthly_installment'),
    due_day: formData.get('due_day'),
    end_date: formData.get('end_date') || null,
    status: formData.get('status')
  });
  if (!parsed.success) return { error: 'invalid' };

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from('contracts')
    .select('branch_id, vehicle_id')
    .eq('id', contractId)
    .single();
  if (!contract) return { error: 'invalid' };
  if (me.role !== 'developer' && contract.branch_id !== me.branch_id) {
    return { error: 'forbidden' };
  }

  // NOTE: sale_price / down_payment / finance_amount / total_terms /
  // customer / vehicle are intentionally NOT editable here — changing
  // them after the payment schedule has already been generated (Phase 1
  // trigger) would desynchronize the installment rows from the contract
  // terms. Only the fields below are safe to change post-creation.
  const { error } = await supabase
    .from('contracts')
    .update({
      monthly_installment: parsed.data.monthly_installment,
      due_day: parsed.data.due_day,
      end_date: parsed.data.end_date,
      status: parsed.data.status
    })
    .eq('id', contractId);
  if (error) return { error: 'invalid' };

  // If the contract was manually cancelled from the edit form, free up
  // the vehicle the same way cancelContractAction does.
  if (parsed.data.status === 'cancelled') {
    await supabase.from('vehicles').update({ status: 'available' }).eq('id', contract.vehicle_id);
  }

  revalidatePath(`/${locale}/contracts`);
  revalidatePath(`/${locale}/contracts/${contractId}`);
  return {};
}

export async function softDeleteContractAction(locale: string, contractId: string) {
  const me = await getCurrentAppUser();
  if (!me || me.role !== 'developer') throw new Error('Forbidden');

  const admin = adminClient();
  const { data: contract } = await admin
    .from('contracts')
    .select('id, vehicle_id')
    .eq('id', contractId)
    .single();
  if (!contract) throw new Error('Not found');

  const { error } = await admin
    .from('contracts')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', contractId);
  if (error) throw error;

  // Free the vehicle back to available if it was under financing
  if (contract.vehicle_id) {
    await admin.from('vehicles')
      .update({ status: 'available' })
      .eq('id', contract.vehicle_id)
      .eq('status', 'financing');
  }

  revalidatePath(`/${locale}/installments`);
  revalidatePath(`/${locale}/payments`);
  revalidatePath(`/${locale}/sold`);
}

export async function cancelContractAction(locale: string, contractId: string) {
  const me = await getCurrentAppUser();
  if (!me) throw new Error('Forbidden');

  const supabase = await createClient();
  const { data: contract } = await supabase
    .from('contracts')
    .select('vehicle_id, branch_id')
    .eq('id', contractId)
    .single();
  if (!contract) throw new Error('Not found');
  if (me.role !== 'developer' && contract.branch_id !== me.branch_id) {
    throw new Error('Forbidden');
  }

  const admin = adminClient();
  const { error: contractError } = await admin
    .from('contracts')
    .update({ status: 'cancelled' })
    .eq('id', contractId);
  if (contractError) throw contractError;

  const { error: vehicleError } = await admin
    .from('vehicles')
    .update({ status: 'available' })
    .eq('id', contract.vehicle_id).eq('status', 'financing');
  if (vehicleError) throw vehicleError;

  revalidatePath(`/${locale}/installments`);
  revalidatePath(`/${locale}/payments`);
  revalidatePath(`/${locale}/contracts`);
}

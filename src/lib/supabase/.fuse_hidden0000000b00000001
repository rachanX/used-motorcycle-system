'use server';

import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

async function assertDeveloper() {
  const me = await getCurrentAppUser();
  if (!me || me.role !== 'developer') {
    throw new Error('Forbidden: developer role required to manage branches');
  }
}

const branchSchema = z.object({
  branch_code: z.string().min(1).max(20),
  branch_name: z.string().min(1),
  address: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive'])
});

export interface BranchFormState {
  error?: string;
}

export async function createBranchAction(
  locale: string,
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  try {
    await assertDeveloper();
  } catch {
    return { error: 'forbidden' };
  }

  const parsed = branchSchema.safeParse({
    branch_code: formData.get('branch_code'),
    branch_name: formData.get('branch_name'),
    address: formData.get('address') || null,
    phone_number: formData.get('phone_number') || null,
    status: formData.get('status')
  });
  if (!parsed.success) return { error: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase.from('branches').insert(parsed.data);

  if (error) {
    return { error: error.code === '23505' ? 'code_exists' : 'unknown' };
  }

  revalidatePath(`/${locale}/branches`);
  return {};
}

export async function softDeleteBranchAction(locale: string, branchId: string) {
  await assertDeveloper();

  const supabase = await createClient();
  const { count: vehicleCount } = await supabase
    .from('vehicles')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId)
    .is('deleted_at', null);
  const { count: userCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true })
    .eq('branch_id', branchId);
  if ((vehicleCount && vehicleCount > 0) || (userCount && userCount > 0)) {
    throw new Error('Cannot delete a branch that still has vehicles or staff assigned to it');
  }

  const { error } = await adminClient()
    .from('branches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', branchId);
  if (error) throw error;

  revalidatePath(`/${locale}/branches`);
}

export async function updateBranchAction(
  locale: string,
  branchId: string,
  _prevState: BranchFormState,
  formData: FormData
): Promise<BranchFormState> {
  try {
    await assertDeveloper();
  } catch {
    return { error: 'forbidden' };
  }

  const parsed = branchSchema.safeParse({
    branch_code: formData.get('branch_code'),
    branch_name: formData.get('branch_name'),
    address: formData.get('address') || null,
    phone_number: formData.get('phone_number') || null,
    status: formData.get('status')
  });
  if (!parsed.success) return { error: 'invalid_input' };

  const supabase = await createClient();
  const { error } = await supabase.from('branches').update(parsed.data).eq('id', branchId);

  if (error) {
    return { error: error.code === '23505' ? 'code_exists' : 'unknown' };
  }

  revalidatePath(`/${locale}/branches`);
  return {};
}

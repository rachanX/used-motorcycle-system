'use server';

import { getCurrentAppUser } from '@/lib/supabase/server';
import { isPowerUser } from '@/lib/auth/roles';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

export type RecycleKind = 'vehicle' | 'contract' | 'customer';

export interface RecycleActionResult {
  error?: string;
}

async function requirePower() {
  const me = await getCurrentAppUser();
  if (!me || !isPowerUser(me.role)) throw new Error('Forbidden');
  return me;
}

// ── RESTORE ──────────────────────────────────────────────────────────────────
export async function restoreDeletedItem(
  locale: string,
  kind: RecycleKind,
  id: string
): Promise<RecycleActionResult> {
  await requirePower();
  const admin = adminClient();

  if (kind === 'vehicle') {
    const { error } = await admin.from('vehicles').update({ deleted_at: null }).eq('id', id);
    if (error) return { error: 'restoreFailed' };
  } else if (kind === 'contract') {
    // Bring the contract back as active and re-attach its vehicle.
    const { data: contract } = await admin
      .from('contracts').select('vehicle_id').eq('id', id).single();
    const { error } = await admin
      .from('contracts').update({ deleted_at: null, status: 'active' }).eq('id', id);
    if (error) return { error: 'restoreFailed' };
    if (contract?.vehicle_id) {
      await admin.from('vehicles')
        .update({ status: 'financing' })
        .eq('id', contract.vehicle_id)
        .is('deleted_at', null)
        .eq('status', 'available');
    }
  } else if (kind === 'customer') {
    const { error } = await admin.from('customers').update({ deleted_at: null }).eq('id', id);
    if (error) return { error: 'restoreFailed' };
  }

  revalidatePath(`/${locale}/recycle-bin`);
  revalidatePath(`/${locale}/vehicles`);
  revalidatePath(`/${locale}/installments`);
  revalidatePath(`/${locale}/customers`);
  revalidatePath(`/${locale}/sold`);
  return {};
}

// ── PERMANENT DELETE (manual "delete forever") ───────────────────────────────
export async function purgeDeletedItem(
  locale: string,
  kind: RecycleKind,
  id: string
): Promise<RecycleActionResult> {
  await requirePower();
  const admin = adminClient();

  if (kind === 'contract') {
    // Clear dependents in FK-safe order, then the contract.
    const { data: pays } = await admin.from('payments').select('id').eq('contract_id', id);
    const payIds = (pays ?? []).map((p: { id: string }) => p.id);
    await admin.from('notifications').delete().eq('contract_id', id);
    await (admin as any).from('notification_logs').delete().eq('contract_id', id);
    if (payIds.length) {
      await admin.from('notifications').delete().in('payment_id', payIds);
      await (admin as any).from('notification_logs').delete().in('installment_id', payIds);
    }
    await admin.from('payments').delete().eq('contract_id', id);
    const { error } = await admin.from('contracts').delete().eq('id', id);
    if (error) return { error: 'purgeFailed' };
  } else if (kind === 'vehicle') {
    const { count } = await admin
      .from('contracts').select('id', { count: 'exact', head: true }).eq('vehicle_id', id);
    if (count && count > 0) return { error: 'vehicleHasContract' };
    const { error } = await admin.from('vehicles').delete().eq('id', id);
    if (error) return { error: 'purgeFailed' };
  } else if (kind === 'customer') {
    const { count } = await admin
      .from('contracts').select('id', { count: 'exact', head: true }).eq('customer_id', id);
    if (count && count > 0) return { error: 'customerHasContract' };
    await admin.from('notifications').delete().eq('customer_id', id);
    const { error } = await admin.from('customers').delete().eq('id', id);
    if (error) return { error: 'purgeFailed' };
  }

  revalidatePath(`/${locale}/recycle-bin`);
  return {};
}

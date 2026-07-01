'use server';

import { getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { isPowerUser } from '@/lib/auth/roles';
import { revalidatePath } from 'next/cache';

export type CatalogKind = 'brand' | 'model';

function table(kind: CatalogKind) {
  return kind === 'brand' ? 'motorcycle_brands' : 'motorcycle_models';
}

async function assertPower(): Promise<boolean> {
  const me = await getCurrentAppUser();
  return !!me && isPowerUser(me.role);
}

/** Add a brand or model to the catalog. */
export async function createCatalogItem(
  locale: string,
  kind: CatalogKind,
  name: string,
  brandId?: string
): Promise<{ error?: string }> {
  if (!(await assertPower())) return { error: 'forbidden' };
  const clean = (name || '').trim();
  if (!clean) return { error: 'invalid' };

  const payload: Record<string, unknown> = { name: clean };
  if (kind === 'model') {
    if (!brandId) return { error: 'brandRequired' };
    payload.brand_id = brandId;
  }

  const { error } = await adminClient().from(table(kind)).insert(payload as never);
  if (error) return { error: error.code === '23505' ? 'exists' : 'invalid' };

  revalidatePath(`/${locale}/brands`);
  return {};
}

/** Rename / toggle-active a catalog item. */
export async function updateCatalogItem(
  locale: string,
  kind: CatalogKind,
  id: string,
  patch: { name?: string; is_active?: boolean }
): Promise<{ error?: string }> {
  if (!(await assertPower())) return { error: 'forbidden' };

  const update: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const clean = patch.name.trim();
    if (!clean) return { error: 'invalid' };
    update.name = clean;
  }
  if (patch.is_active !== undefined) update.is_active = patch.is_active;
  if (Object.keys(update).length === 0) return {};

  const { error } = await adminClient().from(table(kind)).update(update as never).eq('id', id);
  if (error) return { error: error.code === '23505' ? 'exists' : 'invalid' };

  revalidatePath(`/${locale}/brands`);
  return {};
}

/** Delete a catalog item (existing vehicles keep their stored brand/model text). */
export async function deleteCatalogItem(
  locale: string,
  kind: CatalogKind,
  id: string
): Promise<{ error?: string }> {
  if (!(await assertPower())) return { error: 'forbidden' };

  const { error } = await adminClient().from(table(kind)).delete().eq('id', id);
  if (error) return { error: 'invalid' };

  revalidatePath(`/${locale}/brands`);
  return {};
}

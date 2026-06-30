'use server';

import { createClient, getCurrentAppUser } from '@/lib/supabase/server';
import { adminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const vehicleSchema = z.object({
  stock_prefix: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  sub_model: z.string().optional().nullable(),
  year: z.coerce.number().int().min(1980).max(new Date().getFullYear() + 1),
  color: z.string().optional().nullable(),
  license_plate: z.string().optional().nullable(),
  vin_number: z.string().optional().nullable(),
  engine_number: z.string().optional().nullable(),
  mileage: z.coerce.number().int().min(0).optional().nullable(),
  date_received: z.string().optional().nullable(),
  previous_owner: z.string().optional().nullable(),
  vehicle_source: z.enum(['buy', 'trade_in', 'auction', 'other']).optional().nullable(),
  purchase_price: z.coerce.number().min(0),
  repair_cost: z.coerce.number().min(0).default(0),
  // selling_price removed from form; kept in DB for historical contract data
  branch_id: z.string().uuid().optional().nullable(),
  status: z.enum(['available', 'reserved', 'financing', 'sold_cash', 'closed_contract', 'under_repair']),
  received_registration_book: z.coerce.boolean().default(false),
  received_tax_invoice: z.coerce.boolean().default(false),
  registration_received_date: z.string().optional().nullable(),
  selling_price: z.coerce.number().min(0).optional().nullable(),
});

export interface VehicleFormState { error?: string; }

function parseForm(formData: FormData) {
  return vehicleSchema.safeParse({
    stock_prefix: formData.get('stock_prefix'),
    brand: formData.get('brand'),
    model: formData.get('model'),
    sub_model: formData.get('sub_model') || null,
    year: formData.get('year'),
    color: formData.get('color') || null,
    license_plate: formData.get('license_plate') || null,
    vin_number: formData.get('vin_number') || null,
    engine_number: formData.get('engine_number') || null,
    mileage: formData.get('mileage') || null,
    date_received: formData.get('date_received') || null,
    previous_owner: formData.get('previous_owner') || null,
    vehicle_source: formData.get('vehicle_source') || null,
    purchase_price: formData.get('purchase_price'),
    repair_cost: formData.get('repair_cost') || 0,
    branch_id: formData.get('branch_id') || null,
    status: formData.get('status'),
    received_registration_book: formData.get('received_registration_book') === 'on',
    received_tax_invoice: formData.get('received_tax_invoice') === 'on',
    registration_received_date: formData.get('registration_received_date') || null,
    selling_price: formData.get('selling_price') || null,
  });
}

function mapDbError(e: { code?: string; message: string }): string {
  if (e.code === '23505') return e.message.includes('vin') ? 'vinExists' : 'stockCodeExists';
  if (e.code === '23502') return 'branchRequired'; // not-null violation (e.g. branch_id missing)
  if (e.code === '23514') return 'priceInvalid';   // check constraint violation
  return 'saveFailed';
}

export async function createVehicleAction(
  locale: string,
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: 'priceInvalid' };
  const d = parsed.data;

  // under_repair vehicles may have null branch_id — branch assigned later when available
  if (d.status !== 'under_repair' && !d.branch_id) return { error: 'branchRequired' };
  if (me.role !== 'developer' && d.branch_id && d.branch_id !== me.branch_id) {
    return { error: 'forbidden' };
  }
  // sold_cash requires a selling price
  if (d.status === 'sold_cash' && !d.selling_price) return { error: 'priceInvalid' };

  const supabase = await createClient();

  // Generate sequential stock code atomically
  const { data: stockCode, error: seqError } = await (supabase.rpc as any)('next_stock_code', { p_prefix: d.stock_prefix });
  if (seqError || !stockCode) return { error: 'stockCodeExists' };

  const { error } = await adminClient().from('vehicles').insert({
    stock_code: stockCode,
    stock_prefix: d.stock_prefix,
    brand: d.brand,
    model: d.model,
    sub_model: d.sub_model,
    year: d.year,
    color: d.color,
    license_plate: d.license_plate,
    vin_number: d.vin_number,
    engine_number: d.engine_number,
    mileage: d.mileage,
    date_received: d.date_received,
    previous_owner: d.previous_owner,
    vehicle_source: d.vehicle_source,
    purchase_price: d.purchase_price,
    repair_cost: d.repair_cost,
    selling_price: d.selling_price ?? 0, // set from form when sold_cash, else 0
    branch_id: d.branch_id,
    status: d.status,
    received_registration_book: d.received_registration_book,
    received_tax_invoice: d.received_tax_invoice,
    registration_received_date: d.registration_received_date,
    created_by: me.id,
  });

  if (error) return { error: mapDbError(error) };

  revalidatePath(`/${locale}/vehicles`, 'layout');
  return {};
}

export async function updateVehicleAction(
  locale: string,
  vehicleId: string,
  _prev: VehicleFormState,
  formData: FormData
): Promise<VehicleFormState> {
  const me = await getCurrentAppUser();
  if (!me) return { error: 'forbidden' };

  const parsed = parseForm(formData);
  if (!parsed.success) return { error: 'priceInvalid' };
  const d = parsed.data;

  if (me.role !== 'developer' && d.branch_id && d.branch_id !== me.branch_id) {
    return { error: 'forbidden' };
  }
  // under_repair vehicles may have null branch_id
  if (d.status !== 'under_repair' && !d.branch_id) return { error: 'branchRequired' };
  // sold_cash requires a selling price
  if (d.status === 'sold_cash' && !d.selling_price) return { error: 'priceInvalid' };

  // stock_code is intentionally NOT updated on edit — it was auto-generated
  // at creation and must remain stable forever.
  const { error } = await adminClient().from('vehicles').update({
    stock_prefix: d.stock_prefix,
    brand: d.brand,
    model: d.model,
    sub_model: d.sub_model,
    year: d.year,
    color: d.color,
    license_plate: d.license_plate,
    vin_number: d.vin_number,
    engine_number: d.engine_number,
    mileage: d.mileage,
    date_received: d.date_received,
    previous_owner: d.previous_owner,
    vehicle_source: d.vehicle_source,
    purchase_price: d.purchase_price,
    repair_cost: d.repair_cost,
    branch_id: d.branch_id,
    status: d.status,
    received_registration_book: d.received_registration_book,
    received_tax_invoice: d.received_tax_invoice,
    registration_received_date: d.registration_received_date,
    ...(d.selling_price !== null && d.selling_price !== undefined ? { selling_price: d.selling_price } : {}),
  }).eq('id', vehicleId);

  if (error) return { error: mapDbError(error) };

  revalidatePath(`/${locale}/vehicles`, 'layout');
  return {};
}

export async function softDeleteVehicleAction(locale: string, vehicleId: string) {
  const me = await getCurrentAppUser();
  if (!me) throw new Error('Forbidden');
  if (me.role !== 'developer') throw new Error('Forbidden');

  // Use adminClient to read so RLS doesn't block sold/cash vehicles
  const admin = adminClient();
  const { data: vehicle } = await admin
    .from('vehicles')
    .select('status, branch_id')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) throw new Error('Not found');
  if (vehicle.status === 'financing') throw new Error('Cannot delete a vehicle under an active contract');

  const { error } = await admin
    .from('vehicles')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', vehicleId);

  if (error) throw new Error(error.message);

  revalidatePath(`/${locale}/vehicles`);
  revalidatePath(`/${locale}/vehicles/overview`);
  revalidatePath(`/${locale}/sold`);
}

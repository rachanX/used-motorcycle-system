'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import {
  createVehicleAction,
  updateVehicleAction,
  type VehicleFormState
} from '@/lib/supabase/vehicle-actions';
import type { Vehicle } from '@/types/database.types';

type Prefix = { prefix: string; label: string };

export default function VehicleFormModal({
  locale,
  mode,
  vehicle,
  branches,
  prefixes,
  defaultBranchId,
  onClose
}: {
  locale: string;
  mode: 'create' | 'edit';
  vehicle?: Vehicle;
  branches: { id: string; branch_name: string }[];
  prefixes: Prefix[];
  defaultBranchId: string | null;
  onClose: () => void;
}) {
  const t = useTranslations('vehicles');
  const tc = useTranslations('common');
  const router = useRouter();

  const action =
    mode === 'create'
      ? createVehicleAction.bind(null, locale)
      : updateVehicleAction.bind(null, locale, vehicle!.id);

  const [state, formAction, isPending] = useActionState<VehicleFormState, FormData>(action, {});
  const submitCount = useRef(0);

  // Track status to conditionally require branch and show selling price
  const [status, setStatus] = useState<string>(vehicle?.status ?? 'available');

  // Live actual_cost = purchase_price + repair_cost
  const [purchasePrice, setPurchasePrice] = useState(vehicle?.purchase_price ?? 0);
  const [repairCost, setRepairCost] = useState(vehicle?.repair_cost ?? 0);
  const [sellingPrice, setSellingPrice] = useState(vehicle?.selling_price ?? 0);
  const actualCost = Number(purchasePrice) + Number(repairCost);

  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error) {
      router.refresh();
      onClose();
    }
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency', currency: 'THB', maximumFractionDigits: 0
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-3 py-4 overflow-y-auto">
      <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl my-auto">

        {/* Sticky header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="font-semibold text-slate-900 dark:text-white text-base">
            {mode === 'create' ? t('addVehicle') : t('editVehicle')}
          </h2>
          <button onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          action={formAction}
          onSubmit={() => { submitCount.current += 1; }}
        >
          <div className="px-5 py-4 space-y-5 max-h-[75vh] overflow-y-auto">

            {/* ── Stock type + Branch ─────────────────────────────────── */}
            <Section label={locale === 'th' ? 'ประเภทสต็อก / สาขา' : 'Stock Type / Branch'}>
              <div className="grid grid-cols-2 gap-3">
                <F label={t('stockPrefix')} required>
                  {/* Hidden input ensures stock_prefix is submitted in edit mode (disabled selects are excluded from FormData) */}
                  {mode === 'edit' && vehicle?.stock_prefix && (
                    <input type="hidden" name="stock_prefix" value={vehicle.stock_prefix} />
                  )}
                  <select
                    name={mode === 'edit' ? undefined : 'stock_prefix'}
                    defaultValue={vehicle?.stock_prefix ?? ''}
                    required
                    disabled={mode === 'edit'}
                    className="input"
                  >
                    <option value="" disabled>—</option>
                    {prefixes.map(p => (
                      <option key={p.prefix} value={p.prefix}>{p.label}</option>
                    ))}
                  </select>
                  {mode === 'create' && (
                    <p className="text-xs text-slate-400 mt-1">
                      {t('generating')}
                    </p>
                  )}
                  {mode === 'edit' && vehicle?.stock_code && (
                    <p className="text-xs font-mono text-slate-500 mt-1">{vehicle.stock_code}</p>
                  )}
                </F>
                <F label={t('branch')} required={status !== 'under_repair'}>
                  {/* Hidden input ensures branch_id is always submitted even when select is disabled */}
                  {!!defaultBranchId && mode === 'create' && (
                    <input type="hidden" name="branch_id" value={defaultBranchId} />
                  )}
                  <select
                    name={!!defaultBranchId && mode === 'create' ? undefined : 'branch_id'}
                    defaultValue={vehicle?.branch_id ?? defaultBranchId ?? ''}
                    disabled={!!defaultBranchId && mode === 'create'}
                    required={status !== 'under_repair' && !(!!defaultBranchId && mode === 'create')}
                    className="input"
                  >
                    <option value="">—</option>
                    {branches.map(b => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                  {status === 'under_repair' && (
                    <p className="text-xs text-amber-500 mt-1">
                      {locale === 'th' ? 'ไม่จำเป็นสำหรับรถระหว่างซ่อม — กำหนดสาขาเมื่อพร้อมขาย' : 'Not required for under repair — assign branch when ready to sell'}
                    </p>
                  )}
                </F>
              </div>
            </Section>

            {/* ── Vehicle info ────────────────────────────────────────── */}
            <Section label={locale === 'th' ? 'ข้อมูลรถ / Vehicle Info' : 'Vehicle Info'}>
              <div className="grid grid-cols-2 gap-3">
                <F label={t('brand')} required>
                  <input name="brand" defaultValue={vehicle?.brand} required className="input" />
                </F>
                <F label={t('model')} required>
                  <input name="model" defaultValue={vehicle?.model} required className="input" />
                </F>
                <F label={t('subModel')}>
                  <input name="sub_model" defaultValue={vehicle?.sub_model ?? ''} className="input" />
                </F>
                <F label={t('year')} required>
                  <input
                    name="year"
                    type="number"
                    defaultValue={vehicle?.year ?? new Date().getFullYear()}
                    min={1980}
                    max={new Date().getFullYear() + 1}
                    required
                    className="input"
                  />
                </F>
                <F label={t('color')}>
                  <input name="color" defaultValue={vehicle?.color ?? ''} className="input" />
                </F>
                <F label={t('mileage')}>
                  <input name="mileage" type="number" min={0}
                    defaultValue={(vehicle as any)?.mileage ?? ''} className="input" />
                </F>
                <F label={t('engineNumber')}>
                  <input name="engine_number" defaultValue={vehicle?.engine_number ?? ''} className="input" />
                </F>
                <F label={t('vinNumber')}>
                  <input name="vin_number" defaultValue={vehicle?.vin_number ?? ''} className="input" />
                </F>
                <F label={t('licensePlate')}>
                  <input name="license_plate" defaultValue={vehicle?.license_plate ?? ''} className="input" />
                </F>
              </div>
            </Section>

            {/* ── Additional info ─────────────────────────────────────── */}
            <Section label={locale === 'th' ? 'ข้อมูลเพิ่มเติม / Additional Info' : 'Additional Info'}>
              <div className="grid grid-cols-2 gap-3">
                <F label={t('dateReceived')}>
                  <input name="date_received" type="date"
                    defaultValue={(vehicle as any)?.date_received ?? ''} className="input" />
                </F>
                <F label={t('previousOwner')}>
                  <input name="previous_owner"
                    defaultValue={(vehicle as any)?.previous_owner ?? ''} className="input" />
                </F>
                <F label={t('vehicleSource')}>
                  <select name="vehicle_source"
                    defaultValue={(vehicle as any)?.vehicle_source ?? ''} className="input">
                    <option value="">—</option>
                    <option value="buy">{t('sourceBuy')}</option>
                    <option value="trade_in">{t('sourceTrade')}</option>
                    <option value="auction">{t('sourceAuction')}</option>
                    <option value="other">{t('sourceOther')}</option>
                  </select>
                </F>
                <F label={t('status')}>
                  <select
                    name="status"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    className="input"
                  >
                    <option value="available">{t('statusAvailable')}</option>
                    <option value="reserved">{t('statusReserved')}</option>
                    <option value="under_repair">{t('statusUnderRepair')}</option>
                    <option value="sold_cash">{t('statusSoldCash')}</option>
                    <option value="closed_contract">{t('statusClosedContract')}</option>
                  </select>
                </F>
              </div>
            </Section>

            {/* ── Costing ─────────────────────────────────────────────── */}
            <Section label={locale === 'th' ? 'ราคาต้นทุน / Cost' : 'Costing'}>
              <div className="grid grid-cols-3 gap-3">
                <F label={t('purchasePrice')} required>
                  <input
                    name="purchase_price"
                    type="number"
                    step="0.01"
                    min={0}
                    value={purchasePrice}
                    onChange={e => setPurchasePrice(Number(e.target.value))}
                    required
                    className="input"
                  />
                </F>
                <F label={t('repairCost')}>
                  <input
                    name="repair_cost"
                    type="number"
                    step="0.01"
                    min={0}
                    value={repairCost}
                    onChange={e => setRepairCost(Number(e.target.value))}
                    className="input"
                  />
                </F>
                <F label={t('actualCost')}>
                  <div className="input bg-slate-50 dark:bg-slate-800 font-semibold text-blue-600 dark:text-blue-400 select-none">
                    {fmtMoney(actualCost)}
                  </div>
                </F>
              </div>
              {/* Selling Price — shown only when status is Cash Sold */}
              {status === 'sold_cash' && (
                <F label={t('sellingPrice')} required>
                  <input
                    name="selling_price"
                    type="number"
                    step="0.01"
                    min={0}
                    value={sellingPrice}
                    onChange={e => setSellingPrice(Number(e.target.value))}
                    required
                    className="input"
                  />
                </F>
              )}
            </Section>

            {/* ── Documents ────────────────────────────────────────────── */}
            <Section label={locale === 'th' ? 'เอกสาร / Documents' : 'Documents'}>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <CheckboxField name="received_registration_book"
                  label={t('receivedRegistrationBook')}
                  defaultChecked={vehicle?.received_registration_book ?? false} />
                <CheckboxField name="received_tax_invoice"
                  label={t('receivedTaxInvoice')}
                  defaultChecked={vehicle?.received_tax_invoice ?? false} />
              </div>
              <F label={t('registrationReceivedDate')}>
                <input name="registration_received_date" type="date"
                  defaultValue={vehicle?.registration_received_date ?? ''} className="input" />
              </F>
            </Section>

          </div>

          {/* Sticky footer */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-200 dark:border-slate-800">
            {state.error && !(state.error === 'branchRequired' && status === 'under_repair')
              ? <p className="text-sm text-red-600">{t(state.error as any)}</p>
              : <span />}
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
                {tc('cancel')}
              </button>
              <button type="submit" disabled={isPending}
                className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">
                {isPending ? tc('loading') : tc('save')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</p>
      {children}
    </div>
  );
}

function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function CheckboxField({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
      <input type="checkbox" name={name} defaultChecked={defaultChecked}
        className="h-4 w-4 rounded border-slate-300 accent-blue-600" />
      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
    </label>
  );
}

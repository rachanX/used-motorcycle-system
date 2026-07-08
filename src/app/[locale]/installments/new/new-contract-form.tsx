'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createInstallmentContractAction, type InstallmentFormState } from '@/lib/supabase/installment-actions';

type Branch = { id: string; branch_name: string };
type Customer = { id: string; first_name: string; last_name: string; phone_number: string; address: string | null; guarantor_name: string | null; guarantor_phone: string | null };
type Vehicle = { id: string; stock_code: string; brand: string; model: string; engine_number: string | null; vin_number: string | null; license_plate: string | null; color: string | null; actual_cost: number | null; branch_id: string | null };

export default function NewContractForm({ locale, branches, customers, vehicles, defaultBranchId }: {
  locale: string;
  branches: Branch[];
  customers: Customer[];
  vehicles: Vehicle[];
  defaultBranchId: string | null;
}) {
  const t = useTranslations('installments');
  const tc = useTranslations('common');
  const router = useRouter();
  const action = createInstallmentContractAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<InstallmentFormState, FormData>(action, {});
  const submitCount = useRef(0);

  const [newCustomer, setNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>(defaultBranchId ?? '');

  // Auto-fill vehicle snapshot when vehicle selected
  function onVehicleChange(id: string) {
    const v = vehicles.find(v => v.id === id) ?? null;
    setSelectedVehicle(v);
  }
  function onCustomerChange(id: string) {
    const c = customers.find(c => c.id === id) ?? null;
    setSelectedCustomer(c);
  }
  // Sequence now derives from the selected motorcycle's stock-code number.
  const stockNum = (code: string) => (code.match(/\d+/)?.[0] ?? '');
  // Only Available motorcycles from the selected branch may be chosen.
  const branchVehicles = selectedBranch ? vehicles.filter(v => v.branch_id === selectedBranch) : [];
  const stockMsg = !selectedBranch
    ? (locale === 'th' ? 'กรุณาเลือกสาขาก่อน' : 'Please select a branch first')
    : (locale === 'th' ? 'ไม่พบรถที่พร้อมขายในสาขานี้' : 'No available motorcycles found.');

  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error && state.contractId) {
      router.push(`/${locale}/installments/${state.contractId}`);
    }
  }, [state, isPending]);

  function fmtMoney(n: number | null) {
    if (!n) return '';
    return Number(n).toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', { maximumFractionDigits: 0 });
  }

  return (
    <form action={formAction} onSubmit={() => { submitCount.current += 1; }} className="space-y-5">

      {/* ── Section 1: Contract Info ─────────────────── */}
      <Section title={`1. ${t('contractInfo')}`}>
        <div className="grid grid-cols-2 gap-3">
          <F label={t('branch')} required>
            <select value={selectedBranch}
              onChange={e => { setSelectedBranch(e.target.value); setSelectedVehicle(null); }}
              disabled={!!defaultBranchId} className="input">
              <option value="" disabled>—</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
            <input type="hidden" name="branch_id" value={selectedBranch} />
          </F>
          <F label={t('contractDate')} required>
            <input name="contract_date" type="date" defaultValue={new Date().toISOString().slice(0,10)} required className="input" />
          </F>
          <F label={t('contractId')} required>
            <input name="contract_number" required className="input" />
          </F>
          <F label={locale === 'th' ? 'รหัสสต็อก' : 'Stock Code'}>
            <select
              value={selectedVehicle?.id ?? ''}
              onChange={e => onVehicleChange(e.target.value)}
              className="input"
            >
              <option value="">—</option>
              {branchVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.stock_code}</option>
              ))}
            </select>
            {branchVehicles.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{stockMsg}</p>
            )}
            <input type="hidden" name="contract_sequence" value={selectedVehicle ? stockNum(selectedVehicle.stock_code) : ''} />
          </F>
        </div>
      </Section>

      {/* ── Section 2: Buyer Info ────────────────────── */}
      <Section title={`2. ${t('buyerInfo')}`}>
        <div className="mb-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 cursor-pointer">
            <input type="checkbox" checked={newCustomer} onChange={e => { setNewCustomer(e.target.checked); setSelectedCustomer(null); }} className="h-4 w-4 accent-blue-600" />
            {locale === 'th' ? 'ลูกค้าใหม่ (ไม่ได้อยู่ในระบบ)' : 'New customer (not in system)'}
          </label>
        </div>
        {!newCustomer ? (
          <F label={locale === 'th' ? 'เลือกลูกค้า' : 'Select Customer'} required>
            <select name="customer_id" required className="input" onChange={e => onCustomerChange(e.target.value)} defaultValue="">
              <option value="" disabled>—</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name} — {c.phone_number}</option>
              ))}
            </select>
          </F>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <F label={locale === 'th' ? 'ชื่อ' : 'First Name'} required><input name="first_name" required className="input" /></F>
            <F label={locale === 'th' ? 'นามสกุล' : 'Last Name'} required><input name="last_name" required className="input" /></F>
            <F label={locale === 'th' ? 'เบอร์โทร' : 'Phone'}><input name="phone_number" className="input" /></F>
            <F label={t('address')}><input name="address" className="input" /></F>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 mt-3">
          <F label={t('occupation')}><input name="buyer_occupation" defaultValue="" className="input" /></F>
          <F label={t('workplace')}><input name="buyer_workplace" className="input" /></F>
          <F label={t('workPhone')}><input name="buyer_work_phone" className="input" /></F>
        </div>
      </Section>

      {/* ── Section 3: Guarantor Info ────────────────── */}
      <Section title={`3. ${t('guarantorInfo')}`}>
        <div className="grid grid-cols-2 gap-3">
          <F label={locale === 'th' ? 'ชื่อผู้ค้ำประกัน' : 'Guarantor Name'}><input name="guarantor_name" defaultValue={selectedCustomer?.guarantor_name ?? ''} className="input" /></F>
          <F label={locale === 'th' ? 'เบอร์โทร' : 'Phone'}><input name="guarantor_phone" defaultValue={selectedCustomer?.guarantor_phone ?? ''} className="input" /></F>
          <F label={t('address')}><input name="guarantor_address" className="input" /></F>
          <F label={t('occupation')}><input name="guarantor_occupation" className="input" /></F>
          <F label={t('workplace')}><input name="guarantor_workplace" className="input" /></F>
          <F label={t('workPhone')}><input name="guarantor_work_phone" className="input" /></F>
        </div>
      </Section>

      {/* ── Section 4: Motorcycle Info ───────────────── */}
      <Section title={`4. ${t('vehicleInfo')}`}>
        <div className="mb-3">
          <F label={locale === 'th' ? 'เลือกรถมอเตอร์ไซค์' : 'Select Motorcycle'} required>
            <select name="vehicle_id" required className="input" value={selectedVehicle?.id ?? ''} onChange={e => onVehicleChange(e.target.value)}>
              <option value="" disabled>—</option>
              {branchVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.stock_code} — {v.brand} {v.model}</option>
              ))}
            </select>
            {branchVehicles.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">{stockMsg}</p>
            )}
          </F>
        </div>
        <div className="grid grid-cols-2 gap-3" key={selectedVehicle?.id ?? 'none'}>
          <F label={t('engineNo')}><input name="vehicle_engine_no" defaultValue={selectedVehicle?.engine_number ?? ''} className="input" /></F>
          <F label={t('chassisNo')}><input name="vehicle_chassis_no" defaultValue={selectedVehicle?.vin_number ?? ''} className="input" /></F>
          <F label={locale === 'th' ? 'รุ่น' : 'Model'}><input name="vehicle_model_snap" defaultValue={selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model}` : ''} className="input" /></F>
          <F label={t('oldPlate')}><input name="vehicle_old_plate" className="input" /></F>
          <F label={t('newPlate')}><input name="vehicle_new_plate" defaultValue={selectedVehicle?.license_plate ?? ''} className="input" /></F>
          <F label={locale === 'th' ? 'สี' : 'Color'}><input name="vehicle_color_snap" defaultValue={selectedVehicle?.color ?? ''} className="input" /></F>
        </div>
      </Section>

      {/* ── Section 5: Financial Info ────────────────── */}
      <Section title={`5. ${t('financialInfo')}`}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Cost — always shown; populated from vehicle when selected */}
          <F label={locale === 'th' ? 'ต้นทุน (Cost)' : 'Cost'}>
            <div className="input bg-slate-50 dark:bg-slate-800 text-slate-500 select-none">
              {selectedVehicle?.actual_cost != null ? fmtMoney(selectedVehicle.actual_cost) : '—'}
            </div>
          </F>
          <F label={t('salePrice')}><input name="sale_price" type="number" step="0.01" min={0} className="input" /></F>
          <F label={t('interestRate')}><input name="interest_rate" type="number" step="0.01" min={0} className="input" /></F>
          {/* ยอดจัดรวมดอกเบี้ย = total financing including interest (replaces the mislabeled duplicate "Total Terms" field) */}
          <F label={t('totalFinancingWithInterest')}><input name="total_financing" type="number" step="0.01" min={0} className="input" /></F>
          <F label={locale === 'th' ? 'ชำระเมื่อรับรถ' : 'Payment On Delivery'}><input name="payment_on_delivery" type="number" step="0.01" min={0} defaultValue={0} className="input" /></F>
          <F label={t('downPayment')}><input name="down_payment" type="number" step="0.01" min={0} defaultValue={0} className="input" /></F>
          <F label={t('documentFee')}><input name="document_fee" type="number" step="0.01" min={0} defaultValue={0} className="input" /></F>
          <F label={t('balance')}><input name="balance" type="number" step="0.01" min={0} className="input" /></F>
          <F label={t('monthlyInstallment')}><input name="monthly_installment" type="number" step="0.01" min={0} className="input" /></F>
          <F label={t('totalTerms')}><input name="total_terms" type="number" min={1} className="input" /></F>
        </div>
      </Section>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={() => router.back()}
          className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
          {tc('cancel')}
        </button>
        <button type="submit" disabled={isPending}
          className="px-5 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">
          {isPending ? tc('loading') : tc('save')}
        </button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-4">{title}</p>
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

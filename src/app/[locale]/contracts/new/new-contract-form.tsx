'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createContractAction, type ContractFormState } from '@/lib/supabase/contract-actions';

type CustomerOpt = { id: string; first_name: string; last_name: string; phone_number: string };
type VehicleOpt = { id: string; stock_code: string; brand: string; model: string; year: number; selling_price: number; branch_id: string | null };

export default function NewContractForm({
  locale,
  customers,
  vehicles,
  branches,
  defaultBranchId,
  preselectedCustomerId,
  preselectedVehicleId
}: {
  locale: string;
  customers: CustomerOpt[];
  vehicles: VehicleOpt[];
  branches: { id: string; branch_name: string }[];
  defaultBranchId: string | null;
  preselectedCustomerId?: string;
  preselectedVehicleId?: string;
}) {
  const t = useTranslations('contracts');
  const tc = useTranslations('common');
  const router = useRouter();

  const action = createContractAction.bind(null, locale);
  const [state, formAction, isPending] = useActionState<ContractFormState, FormData>(action, {});

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId ?? '');
  const [salePrice, setSalePrice] = useState<number>(0);
  const [downPayment, setDownPayment] = useState<number>(0);
  const [branchId, setBranchId] = useState(defaultBranchId ?? '');

  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId), [vehicleId, vehicles]);

  useEffect(() => {
    if (selectedVehicle) {
      setSalePrice(selectedVehicle.selling_price);
      setBranchId(selectedVehicle.branch_id ?? '');
    }
  }, [selectedVehicle]);

  useEffect(() => {
    if (state.contractId) {
      router.push(`/${locale}/contracts/${state.contractId}`);
    }
  }, [state.contractId, locale, router]);

  const financeAmount = Math.max(0, (salePrice || 0) - (downPayment || 0));

  function fmtMoney(n: number) {
    return n.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US', {
      style: 'currency',
      currency: 'THB',
      maximumFractionDigits: 0
    });
  }

  return (
    <form action={formAction} className="max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
      <input type="hidden" name="branch_id" value={branchId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t('customer')}>
          <select name="customer_id" defaultValue={preselectedCustomerId ?? ''} required className="input">
            <option value="" disabled>{t('selectCustomer')}</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.first_name} {c.last_name} · {c.phone_number}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t('vehicle')}>
          <select
            name="vehicle_id"
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            required
            className="input"
          >
            <option value="" disabled>{t('selectVehicle')}</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.stock_code} · {v.brand} {v.model} ({v.year})
              </option>
            ))}
          </select>
          {vehicles.length === 0 && <p className="text-xs text-amber-600 mt-1">{t('noVehicleAvailable')}</p>}
        </Field>

        <Field label={t('salePrice')}>
          <input
            name="sale_price"
            type="number"
            step="0.01"
            min={0}
            value={salePrice}
            onChange={(e) => setSalePrice(Number(e.target.value))}
            required
            className="input"
          />
        </Field>

        <Field label={t('downPayment')}>
          <input
            name="down_payment"
            type="number"
            step="0.01"
            min={0}
            value={downPayment}
            onChange={(e) => setDownPayment(Number(e.target.value))}
            required
            className="input"
          />
        </Field>

        <Field label={t('financeAmount')}>
          <input value={fmtMoney(financeAmount)} disabled className="input bg-slate-50 dark:bg-slate-800" />
          <p className="text-xs text-slate-400 mt-1">{t('financeAmountAuto')}</p>
        </Field>

        <Field label={t('monthlyInstallment')}>
          <input name="monthly_installment" type="number" step="0.01" min={0.01} required className="input" />
        </Field>

        <Field label={t('totalTerms')}>
          <input name="total_terms" type="number" min={1} max={120} required defaultValue={12} className="input" />
        </Field>

        <Field label={t('startDate')}>
          <input
            name="start_date"
            type="date"
            required
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="input"
          />
        </Field>

        <Field label={t('dueDay')}>
          <input name="due_day" type="number" min={1} max={31} required defaultValue={5} className="input" />
        </Field>

        <Field label={t('branch')}>
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            disabled={!!defaultBranchId || !!selectedVehicle}
            className="input"
          >
            <option value="" disabled>—</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.branch_name}</option>
            ))}
          </select>
        </Field>
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">{t(state.error as any)}</p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium"
        >
          {isPending ? tc('loading') : t('createContract')}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

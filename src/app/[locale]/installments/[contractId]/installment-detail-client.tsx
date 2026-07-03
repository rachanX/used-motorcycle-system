'use client';

import { useState, useActionState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Pencil, X, Check, ExternalLink } from 'lucide-react';
import {
  updateContractInfoAction, updateBuyerInfoAction, updateGuarantorInfoAction,
  updateVehicleSnapshotAction, updateFinancialInfoAction, type SectionFormState
} from '@/lib/supabase/installment-actions';

export default function InstallmentDetailClient({ locale, contract, branches }: {
  locale: string;
  contract: any;
  branches: { id: string; branch_name: string }[];
}) {
  const t = useTranslations('installments');
  const tc = useTranslations('common');
  const [editing, setEditing] = useState<string | null>(null);
  const isThai = locale === 'th';
  const cu = contract.customers;
  const ve = contract.vehicles;

  function fmtMoney(n: number | null) {
    if (n == null) return '—';
    return Number(n).toLocaleString(isThai ? 'th-TH' : 'en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide">{t('contractInfo')}</p>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white font-mono mt-1">{contract.contract_number}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{cu ? `${cu.first_name} ${cu.last_name}` : '—'}</p>
        </div>
        <Link
          href={`/${locale}/payments/${contract.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2"
        >
          <ExternalLink className="h-4 w-4" />
          {isThai ? 'ดูตารางผ่อนชำระ' : 'View Payment Schedule'}
        </Link>
      </div>

      {/* Section 1: Contract Info */}
      <EditableSection
        title={`1. ${t('contractInfo')}`}
        sectionKey="contractInfo"
        editing={editing}
        setEditing={setEditing}
        viewContent={
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <InfoRow label={t('branch')} value={branches.find(b => b.id === contract.branch_id)?.branch_name} />
            <InfoRow label={t('contractDate')} value={contract.start_date} />
            <InfoRow label={t('contractId')} value={contract.contract_number ?? '—'} />
            <InfoRow label={t('sequence')} value={contract.contract_sequence?.toString() ?? '—'} />
          </div>
        }
        editContent={
          <ContractInfoForm locale={locale} contract={contract} branches={branches} onClose={() => setEditing(null)} />
        }
      />

      {/* Section 2: Buyer Info */}
      <EditableSection
        title={`2. ${t('buyerInfo')}`}
        sectionKey="buyerInfo"
        editing={editing}
        setEditing={setEditing}
        viewContent={
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <InfoRow label={isThai ? 'ชื่อ-นามสกุล' : 'Name'} value={cu ? `${cu.first_name} ${cu.last_name}` : '—'} />
            <InfoRow label={isThai ? 'เบอร์โทร' : 'Phone'} value={cu?.phone_number} />
            <InfoRow label={t('address')} value={cu?.address} />
            <InfoRow label={t('occupation')} value={contract.buyer_occupation} />
            <InfoRow label={t('workplace')} value={contract.buyer_workplace} />
            <InfoRow label={t('workPhone')} value={contract.buyer_work_phone} />
          </div>
        }
        editContent={
          <BuyerInfoForm locale={locale} contract={contract} onClose={() => setEditing(null)} />
        }
      />

      {/* Section 3: Guarantor Info */}
      <EditableSection
        title={`3. ${t('guarantorInfo')}`}
        sectionKey="guarantorInfo"
        editing={editing}
        setEditing={setEditing}
        viewContent={
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <InfoRow label={isThai ? 'ชื่อ-นามสกุล' : 'Name'} value={cu?.guarantor_name} />
            <InfoRow label={isThai ? 'เบอร์โทร' : 'Phone'} value={cu?.guarantor_phone} />
            <InfoRow label={t('address')} value={contract.guarantor_address} />
            <InfoRow label={t('occupation')} value={contract.guarantor_occupation} />
            <InfoRow label={t('workplace')} value={contract.guarantor_workplace} />
            <InfoRow label={t('workPhone')} value={contract.guarantor_work_phone} />
          </div>
        }
        editContent={
          <GuarantorInfoForm locale={locale} contract={contract} onClose={() => setEditing(null)} />
        }
      />

      {/* Section 4: Vehicle Info */}
      <EditableSection
        title={`4. ${t('vehicleInfo')}`}
        sectionKey="vehicleInfo"
        editing={editing}
        setEditing={setEditing}
        viewContent={
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
            <InfoRow label={t('engineNo')} value={contract.vehicle_engine_no || ve?.engine_number} />
            <InfoRow label={t('chassisNo')} value={contract.vehicle_chassis_no || ve?.vin_number} />
            <InfoRow label={isThai ? 'รุ่น' : 'Model'} value={contract.vehicle_model_snap || (ve ? `${ve.brand} ${ve.model}` : '')} />
            <InfoRow label={t('oldPlate')} value={contract.vehicle_old_plate} />
            <InfoRow label={t('newPlate')} value={contract.vehicle_new_plate || ve?.license_plate} />
            <InfoRow label={isThai ? 'สี' : 'Color'} value={contract.vehicle_color_snap || ve?.color} />
          </div>
        }
        editContent={
          <VehicleInfoForm locale={locale} contract={contract} onClose={() => setEditing(null)} />
        }
      />

      {/* Section 5: Financial Info */}
      <EditableSection
        title={`5. ${t('financialInfo')}`}
        sectionKey="financialInfo"
        editing={editing}
        setEditing={setEditing}
        viewContent={
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-1.5">
            {ve?.actual_cost != null && <InfoRow label={isThai ? 'ต้นทุน' : 'Cost'} value={fmtMoney(ve.actual_cost)} />}
            <InfoRow label={t('salePrice')} value={fmtMoney(contract.sale_price)} />
            <InfoRow label={t('interestRate')} value={contract.interest_rate != null ? `${contract.interest_rate}%` : '—'} />
            <InfoRow label={t('totalFinancingWithInterest')} value={fmtMoney(contract.total_financing)} />
            <InfoRow label={isThai ? 'ชำระเมื่อรับรถ' : 'Payment On Delivery'} value={fmtMoney(contract.payment_on_delivery)} />
            <InfoRow label={t('downPayment')} value={fmtMoney(contract.down_payment)} />
            <InfoRow label={t('documentFee')} value={fmtMoney(contract.document_fee)} />
            <InfoRow label={t('balance')} value={contract.balance != null ? fmtMoney(contract.balance) : undefined} />
            <InfoRow label={t('monthlyInstallment')} value={fmtMoney(contract.monthly_installment)} />
            <InfoRow label={t('totalTerms')} value={contract.total_terms ? `${contract.total_terms} ${isThai ? 'งวด' : 'terms'}` : '—'} />
          </div>
        }
        editContent={
          <FinancialInfoForm locale={locale} contract={contract} onClose={() => setEditing(null)} />
        }
      />
    </div>
  );
}

/* ── Editable Section Wrapper ──────────────────────────────────────────────── */
function EditableSection({ title, sectionKey, editing, setEditing, viewContent, editContent }: {
  title: string; sectionKey: string; editing: string | null; setEditing: (k: string | null) => void;
  viewContent: React.ReactNode; editContent: React.ReactNode;
}) {
  const tc = useTranslations('common');
  const isEditing = editing === sectionKey;
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</p>
        {!isEditing && (
          <button onClick={() => setEditing(sectionKey)}
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Pencil className="h-3.5 w-3.5" />{tc('edit')}
          </button>
        )}
      </div>
      {isEditing ? editContent : viewContent}
    </div>
  );
}

/* ── Info Row ──────────────────────────────────────────────────────────────── */
function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm py-0.5">
      <span className="text-slate-400 shrink-0 min-w-[8rem]">{label}</span>
      <span className="text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

/* ── Section Edit Forms ────────────────────────────────────────────────────── */
function useSection<T extends SectionFormState>(action: any, onClose: () => void) {
  const [state, formAction, isPending] = useActionState<T, FormData>(action, {} as Awaited<T>);
  const ref = useRef(0);
  useEffect(() => { if (ref.current > 0 && !isPending && !state.error) onClose(); }, [state, isPending]);
  return { state, formAction, isPending, ref };
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

function FormFooter({ onClose, isPending }: { onClose: () => void; isPending: boolean }) {
  const tc = useTranslations('common');
  return (
    <div className="flex justify-end gap-2 pt-3 mt-3 border-t border-slate-100 dark:border-slate-800">
      <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">{tc('cancel')}</button>
      <button type="submit" disabled={isPending} className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">{isPending ? tc('loading') : tc('save')}</button>
    </div>
  );
}

function ContractInfoForm({ locale, contract, branches, onClose }: { locale: string; contract: any; branches: any[]; onClose: () => void }) {
  const action = updateContractInfoAction.bind(null, locale, contract.id, contract.branch_id);
  const { state, formAction, isPending, ref } = useSection(action, onClose);
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <F label={locale === 'th' ? 'สาขา' : 'Branch'}>
          <select name="branch_id" defaultValue={contract.branch_id} className="input">
            {branches.map(b => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
          </select>
        </F>
        <F label={locale === 'th' ? 'วันที่ทำสัญญา' : 'Contract Date'}>
          <input name="contract_date" type="date" defaultValue={contract.start_date} className="input" />
        </F>
        <F label={locale === 'th' ? 'เลขที่สัญญา' : 'Contract Number'}>
          <input name="contract_number" defaultValue={contract.contract_number ?? ''} className="input" />
        </F>
        <F label={locale === 'th' ? 'ลำดับ' : 'Sequence'}>
          <input name="contract_sequence" type="number" min="0" step="1" defaultValue={contract.contract_sequence ?? ''} className="input" />
        </F>
      </div>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
      <FormFooter onClose={onClose} isPending={isPending} />
    </form>
  );
}

function BuyerInfoForm({ locale, contract, onClose }: { locale: string; contract: any; onClose: () => void }) {
  const cu = contract.customers;
  const action = updateBuyerInfoAction.bind(null, locale, contract.id, cu?.id ?? '', contract.branch_id);
  const { state, formAction, isPending, ref } = useSection(action, onClose);
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }} className="grid grid-cols-2 gap-3">
      <F label="First Name"><input name="first_name" defaultValue={cu?.first_name} className="input" /></F>
      <F label="Last Name"><input name="last_name" defaultValue={cu?.last_name} className="input" /></F>
      <F label="Phone"><input name="phone_number" defaultValue={cu?.phone_number} className="input" /></F>
      <F label="Address"><input name="address" defaultValue={cu?.address} className="input" /></F>
      <F label="Occupation"><input name="buyer_occupation" defaultValue={contract.buyer_occupation} className="input" /></F>
      <F label="Workplace"><input name="buyer_workplace" defaultValue={contract.buyer_workplace} className="input" /></F>
      <F label="Work Phone"><input name="buyer_work_phone" defaultValue={contract.buyer_work_phone} className="input" /></F>
      {state.error && <p className="col-span-2 text-xs text-red-600">{state.error}</p>}
      <div className="col-span-2"><FormFooter onClose={onClose} isPending={isPending} /></div>
    </form>
  );
}

function GuarantorInfoForm({ locale, contract, onClose }: { locale: string; contract: any; onClose: () => void }) {
  const cu = contract.customers;
  const action = updateGuarantorInfoAction.bind(null, locale, contract.id, cu?.id ?? '', contract.branch_id);
  const { state, formAction, isPending, ref } = useSection(action, onClose);
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }} className="grid grid-cols-2 gap-3">
      <F label="Guarantor Name"><input name="guarantor_name" defaultValue={cu?.guarantor_name} className="input" /></F>
      <F label="Phone"><input name="guarantor_phone" defaultValue={cu?.guarantor_phone} className="input" /></F>
      <F label="Address"><input name="guarantor_address" defaultValue={contract.guarantor_address} className="input" /></F>
      <F label="Occupation"><input name="guarantor_occupation" defaultValue={contract.guarantor_occupation} className="input" /></F>
      <F label="Workplace"><input name="guarantor_workplace" defaultValue={contract.guarantor_workplace} className="input" /></F>
      <F label="Work Phone"><input name="guarantor_work_phone" defaultValue={contract.guarantor_work_phone} className="input" /></F>
      {state.error && <p className="col-span-2 text-xs text-red-600">{state.error}</p>}
      <div className="col-span-2"><FormFooter onClose={onClose} isPending={isPending} /></div>
    </form>
  );
}

function VehicleInfoForm({ locale, contract, onClose }: { locale: string; contract: any; onClose: () => void }) {
  const ve = contract.vehicles;
  const action = updateVehicleSnapshotAction.bind(null, locale, contract.id, contract.branch_id);
  const { state, formAction, isPending, ref } = useSection(action, onClose);
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }} className="grid grid-cols-2 gap-3">
      <F label="Engine No."><input name="vehicle_engine_no" defaultValue={contract.vehicle_engine_no || ve?.engine_number} className="input" /></F>
      <F label="Chassis No."><input name="vehicle_chassis_no" defaultValue={contract.vehicle_chassis_no || ve?.vin_number} className="input" /></F>
      <F label="Model"><input name="vehicle_model_snap" defaultValue={contract.vehicle_model_snap || (ve ? `${ve.brand} ${ve.model}` : '')} className="input" /></F>
      <F label="Old Plate"><input name="vehicle_old_plate" defaultValue={contract.vehicle_old_plate} className="input" /></F>
      <F label="New Plate"><input name="vehicle_new_plate" defaultValue={contract.vehicle_new_plate || ve?.license_plate} className="input" /></F>
      <F label="Color"><input name="vehicle_color_snap" defaultValue={contract.vehicle_color_snap || ve?.color} className="input" /></F>
      {state.error && <p className="col-span-2 text-xs text-red-600">{state.error}</p>}
      <div className="col-span-2"><FormFooter onClose={onClose} isPending={isPending} /></div>
    </form>
  );
}

function FinancialInfoForm({ locale, contract, onClose }: { locale: string; contract: any; onClose: () => void }) {
  const action = updateFinancialInfoAction.bind(null, locale, contract.id, contract.branch_id);
  const { state, formAction, isPending, ref } = useSection(action, onClose);
  const isThai = locale === 'th';
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      <F label={isThai ? 'ราคาขาย' : 'Sale Price'}><input name="sale_price" type="number" step="0.01" defaultValue={contract.sale_price} className="input" /></F>
      <F label={isThai ? 'ดอกเบี้ย (%)' : 'Interest (%)'}><input name="interest_rate" type="number" step="0.01" defaultValue={contract.interest_rate} className="input" /></F>
      <F label="ยอดจัดรวมดอกเบี้ย"><input name="total_financing" type="number" step="0.01" defaultValue={contract.total_financing} className="input" /></F>
      <F label={isThai ? 'ชำระเมื่อรับรถ' : 'Payment On Delivery'}><input name="payment_on_delivery" type="number" step="0.01" defaultValue={contract.payment_on_delivery} className="input" /></F>
      <F label={isThai ? 'เงินดาวน์' : 'Down Payment'}><input name="down_payment" type="number" step="0.01" defaultValue={contract.down_payment} className="input" /></F>
      <F label={isThai ? 'ค่าเอกสาร' : 'Document Fee'}><input name="document_fee" type="number" step="0.01" defaultValue={contract.document_fee} className="input" /></F>
      <F label={isThai ? 'ยอดคงเหลือ' : 'Balance'}><input name="balance" type="number" step="0.01" defaultValue={contract.balance} className="input" /></F>
      <F label={isThai ? 'ค่างวดต่อเดือน' : 'Monthly Installment'}><input name="monthly_installment" type="number" step="0.01" defaultValue={contract.monthly_installment} className="input" /></F>
      <F label={isThai ? 'จำนวนงวด' : 'No. of Installments'}><input name="total_terms" type="number" defaultValue={contract.total_terms} className="input" /></F>
      {state.error && <p className="col-span-3 text-xs text-red-600">{state.error}</p>}
      <div className="col-span-3"><FormFooter onClose={onClose} isPending={isPending} /></div>
    </form>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CircleDollarSign, Plus, RefreshCw, Trash2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import RecordPaymentModal from '../record-payment-modal';
import { addPaymentRowAction, generatePaymentScheduleAction, deletePaymentRowAction, type PaymentRowState } from '@/lib/supabase/installment-actions';
import { closeContractAction } from '@/lib/supabase/contract-actions';
import { useActionState, useEffect, useRef } from 'react';

type Payment = {
  id: string;
  installment_number: number;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  actual_payment_date: string | null;
  payment_date: string | null;
  status: 'paid' | 'pending' | 'overdue';
  penalty_fee: number;
  receipt_number: string | null;
  bank: string | null;
  custom_bank_name: string | null;
  notes: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  overdue: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
};

export default function PaymentDetailClient({ locale, contract, payments, branches }: {
  locale: string; contract: any; payments: Payment[]; branches: any[];
}) {
  const t = useTranslations('installments');
  const tc = useTranslations('common');
  const isThai = locale === 'th';
  const cu = contract.customers;
  const ve = contract.vehicles;
  const router = useRouter();
  const [payingRow, setPayingRow] = useState<Payment | null>(null);
  const [showAddRow, setShowAddRow] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateMsg, setGenerateMsg] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  async function handleGenerateSchedule() {
    if (!contract.total_terms || !contract.monthly_installment) return;
    const unpaid = payments.filter(p => p.status !== 'paid');
    if (unpaid.length > 0) {
      const msg = isThai
        ? `จะลบ ${unpaid.length} งวดที่ยังไม่ชำระและสร้างใหม่ ต้องการดำเนินการต่อ?`
        : `This will replace ${unpaid.length} unpaid term(s) and regenerate. Continue?`;
      if (!confirm(msg)) return;
    }
    setGenerating(true);
    setGenerateMsg(null);
    try {
      const result = await generatePaymentScheduleAction(locale, contract.id);
      if (result.error) {
        setGenerateMsg(isThai ? `เกิดข้อผิดพลาด: ${result.error}` : `Error: ${result.error}`);
      } else {
        setGenerateMsg(isThai ? `สร้าง ${result.count} งวดสำเร็จ` : `Generated ${result.count} term(s)`);
        router.refresh();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function handleCloseContract() {
    const msg = isThai
      ? 'ยืนยันปิดสัญญา? งวดที่ยังไม่ชำระจะถูกลบ และสัญญาจะถูกปิด (รถจะย้ายไปแท็บปิดสัญญาแล้ว)'
      : 'Close this contract? Remaining unpaid installments will be removed and the contract will be closed (the bike moves to Closed Contracts).';
    if (!confirm(msg)) return;
    setClosing(true);
    setGenerateMsg(null);
    try {
      await closeContractAction(locale, contract.id);
      alert(isThai ? 'ปิดสัญญาเรียบร้อยแล้ว ✓' : 'Contract closed successfully ✓');
      router.push(`/${locale}/payments`);
    } catch {
      setClosing(false);
      setGenerateMsg(isThai ? 'ปิดสัญญาไม่สำเร็จ' : 'Failed to close contract');
    }
  }

  async function handleDeleteRow(p: Payment) {
    const msg = isThai
      ? `ลบงวดที่ ${p.installment_number}? การดำเนินการนี้ย้อนกลับไม่ได้`
      : `Delete term #${p.installment_number}? This cannot be undone.`;
    if (!confirm(msg)) return;
    const res = await deletePaymentRowAction(locale, p.id, contract.id, contract.branch_id);
    if (res?.error) {
      setGenerateMsg(isThai ? `ลบไม่สำเร็จ: ${res.error}` : `Delete failed: ${res.error}`);
    } else {
      router.refresh();
    }
  }

  function fmtMoney(n: number | null) {
    if (n == null) return '—';
    return Number(n).toLocaleString(isThai ? 'th-TH' : 'en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  }

  function displayBank(p: Payment) {
    if (!p.bank) return '—';
    if (p.bank === 'others') return p.custom_bank_name || '—';
    return p.bank;
  }

  // Header remaining balance: sum of (amount_due - amount_paid) for all unpaid rows.
  // Same formula as v_contract_payment_summary.outstanding_balance so both pages match.
  const remainingBalance = payments
    .filter(p => p.status !== 'paid')
    .reduce((sum, p) => sum + Number(p.amount_due) - Number(p.amount_paid || 0), 0);

  // Per-row running balance column: start from contract balance and subtract each payment made.
  const startingBalance = contract.balance != null
    ? Number(contract.balance)
    : Number(contract.total_financing || contract.finance_amount || 0) - Number(contract.payment_on_delivery || 0);
  let running = startingBalance;
  const balances: number[] = payments.map(p => {
    running -= Number(p.amount_paid || 0);
    return running;
  });

  const statusLabel = (s: string) => {
    if (isThai) return s === 'paid' ? t('statusPaid') : s === 'overdue' ? t('statusOverdue') : t('statusPending');
    return s === 'paid' ? t('statusPaid') : s === 'overdue' ? t('statusOverdue') : t('statusPending');
  };

  return (
    <div className="space-y-5">
      {/* Header summary */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide">{isThai ? 'ระบบรับชำระเงิน' : 'Payment System'}</p>
            <h1 className="text-xl font-semibold font-mono text-slate-900 dark:text-white mt-1">{contract.contract_number}</h1>
            <p className="text-sm text-slate-500">{cu ? `${cu.first_name} ${cu.last_name}` : '—'}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">{isThai ? 'ยอดคงเหลือ' : 'Remaining Balance'}</p>
            <p className="text-xl font-semibold text-amber-600">{fmtMoney(running)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {payments.filter(p => p.status === 'paid').length}/{contract.total_terms || payments.length} {isThai ? 'งวด' : 'terms'}
            </p>
          </div>
        </div>
      </div>

      {/* 5-section info (condensed, view-only on payment page) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <InfoCard title={`1. ${t('contractInfo')}`}>
          <InfoRow label={isThai ? 'สาขา' : 'Branch'} value={branches.find(b => b.id === contract.branch_id)?.branch_name} />
          <InfoRow label={isThai ? 'วันที่สัญญา' : 'Contract Date'} value={contract.start_date} />
          <InfoRow label={isThai ? 'เลขที่สัญญา' : 'Contract No.'} value={contract.contract_number} />
          <InfoRow label={isThai ? 'ลำดับ' : 'Sequence'} value={contract.contract_sequence?.toString()} />
        </InfoCard>

        <InfoCard title={`2. ${t('buyerInfo')}`}>
          <InfoRow label={isThai ? 'ชื่อ-นามสกุล' : 'Name'} value={cu ? `${cu.first_name} ${cu.last_name}` : '—'} />
          <InfoRow label={isThai ? 'เบอร์โทร' : 'Phone'} value={cu?.phone_number} />
          <InfoRow label={isThai ? 'ที่อยู่' : 'Address'} value={cu?.address} />
          <InfoRow label={t('occupation')} value={contract.buyer_occupation} />
          <InfoRow label={t('workplace')} value={contract.buyer_workplace} />
        </InfoCard>

        <InfoCard title={`3. ${t('guarantorInfo')}`}>
          <InfoRow label={isThai ? 'ชื่อ-นามสกุล' : 'Name'} value={cu?.guarantor_name} />
          <InfoRow label={isThai ? 'เบอร์โทร' : 'Phone'} value={cu?.guarantor_phone} />
          <InfoRow label={isThai ? 'ที่อยู่' : 'Address'} value={contract.guarantor_address} />
          <InfoRow label={t('occupation')} value={contract.guarantor_occupation} />
        </InfoCard>

        <InfoCard title={`4. ${t('vehicleInfo')}`}>
          <InfoRow label={t('engineNo')} value={contract.vehicle_engine_no || ve?.engine_number} />
          <InfoRow label={t('chassisNo')} value={contract.vehicle_chassis_no || ve?.vin_number} />
          <InfoRow label={isThai ? 'รุ่น' : 'Model'} value={contract.vehicle_model_snap || (ve ? `${ve.brand} ${ve.model}` : '')} />
          <InfoRow label={isThai ? 'ทะเบียน' : 'Plate'} value={contract.vehicle_new_plate || ve?.license_plate} />
          <InfoRow label={isThai ? 'สี' : 'Color'} value={contract.vehicle_color_snap || ve?.color} />
        </InfoCard>

        <InfoCard title={`5. ${t('financialInfo')}`} className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-1.5">
            {ve?.actual_cost != null && <InfoRow label={isThai ? 'ต้นทุน' : 'Cost'} value={fmtMoney(ve.actual_cost)} />}
            <InfoRow label={t('salePrice')} value={fmtMoney(contract.sale_price)} />
            <InfoRow label={t('interestRate')} value={contract.interest_rate != null ? `${contract.interest_rate}%` : undefined} />
            <InfoRow label="ยอดจัดรวมดอกเบี้ย" value={fmtMoney(contract.total_financing)} />
            <InfoRow label={isThai ? 'ชำระเมื่อรับรถ' : 'Payment On Delivery'} value={fmtMoney(contract.payment_on_delivery)} />
            <InfoRow label={t('downPayment')} value={fmtMoney(contract.down_payment)} />
            <InfoRow label={t('documentFee')} value={fmtMoney(contract.document_fee)} />
            <InfoRow label={isThai ? 'ยอดคงเหลือ' : 'Balance'} value={contract.balance != null ? fmtMoney(contract.balance) : undefined} />
            <InfoRow label={t('monthlyInstallment')} value={fmtMoney(contract.monthly_installment)} />
            <InfoRow label={t('totalTerms')} value={contract.total_terms ? `${contract.total_terms} ${isThai ? 'งวด' : 'terms'}` : undefined} />
          </div>
        </InfoCard>
      </div>

      {/* Payment Schedule */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('paymentSchedule')}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCloseContract}
              disabled={closing}
              className="inline-flex items-center gap-1.5 text-sm border border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
            >
              <Lock className="h-3.5 w-3.5" />
              {closing ? (isThai ? 'กำลังปิด...' : 'Closing...') : (isThai ? 'ลูกค้าปิดสัญญา' : 'Close Contract')}
            </button>
            {contract.total_terms > 0 && contract.monthly_installment > 0 && (
              <button
                onClick={handleGenerateSchedule}
                disabled={generating}
                className="inline-flex items-center gap-1.5 text-sm border border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-lg px-3 py-1.5 font-medium disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating
                  ? (isThai ? 'กำลังสร้าง...' : 'Generating...')
                  : (isThai ? 'สร้างตารางงวด' : 'Generate Schedule')}
              </button>
            )}
            <button onClick={() => setShowAddRow(true)}
              className="inline-flex items-center gap-1.5 text-sm border border-blue-600 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg px-3 py-1.5 font-medium">
              <Plus className="h-3.5 w-3.5" />{t('addRow')}
            </button>
          </div>
        </div>
        {generateMsg && (
          <p className={`text-xs mb-3 ${generateMsg.startsWith('Error') || generateMsg.startsWith('เกิดข้อ') ? 'text-red-600' : 'text-emerald-600'}`}>
            {generateMsg}
          </p>
        )}

        {payments.length === 0 && !showAddRow
          ? <p className="text-sm text-slate-400 text-center py-6">{t('noPayments')}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[900px]">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-2">#</th>
                    <th className="py-2 pr-2">{isThai ? 'วันครบกำหนด' : 'Due Date'}</th>
                    <th className="py-2 pr-2">{isThai ? 'ยอดงวด' : 'Amount'}</th>
                    <th className="py-2 pr-2">{isThai ? 'ยอดชำระ' : 'Paid'}</th>
                    <th className="py-2 pr-2">{isThai ? 'วันที่ชำระ' : 'Pay Date'}</th>
                    <th className="py-2 pr-2">{isThai ? 'สถานะ' : 'Status'}</th>
                    <th className="py-2 pr-2">{isThai ? 'ค่าปรับ' : 'Penalty'}</th>
                    <th className="py-2 pr-2">{isThai ? 'เลขใบเสร็จ' : 'Receipt No.'}</th>
                    <th className="py-2 pr-2">{isThai ? 'ธนาคาร' : 'Bank'}</th>
                    <th className="py-2 pr-2">{isThai ? 'ยอดคงเหลือ' : 'Balance'}</th>
                    <th className="py-2 text-right">{isThai ? 'ดำเนินการ' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, idx) => (
                    <tr key={p.id} className="border-b last:border-0 border-slate-50 dark:border-slate-800/50">
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">#{p.installment_number}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{p.due_date}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_due)}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{fmtMoney(p.amount_paid)}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{p.actual_payment_date || p.payment_date || '—'}</td>
                      <td className="py-2 pr-2">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLORS[p.status]}`}>
                          {statusLabel(p.status)}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{p.penalty_fee > 0 ? fmtMoney(p.penalty_fee) : '—'}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{p.receipt_number || '—'}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-300">{displayBank(p)}</td>
                      <td className="py-2 pr-2 text-slate-900 dark:text-white font-medium">{fmtMoney(balances[idx])}</td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => setPayingRow(p)}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                        >
                          <CircleDollarSign className="h-3.5 w-3.5" />
                          {t('recordPayment')}
                        </button>
                        {p.status !== 'paid' && (
                          <button
                            onClick={() => handleDeleteRow(p)}
                            className="ml-3 inline-flex items-center gap-1 text-red-500 hover:text-red-600 font-medium whitespace-nowrap"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isThai ? 'ลบ' : 'Delete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        {showAddRow && (
          <AddRowForm locale={locale} contractId={contract.id} branchId={contract.branch_id}
            nextNumber={(payments.length > 0 ? Math.max(...payments.map(p => p.installment_number)) : 0) + 1}
            onClose={() => setShowAddRow(false)} />
        )}
      </div>

      {payingRow && (
        <RecordPaymentModal
          locale={locale}
          payment={payingRow as any}
          contractNumber={contract.contract_number}
          customerName={cu ? `${cu.first_name} ${cu.last_name}` : ''}
          branchId={contract.branch_id}
          onClose={() => setPayingRow(null)}
        />
      )}
    </div>
  );
}

function InfoCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-3">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-sm">
      <span className="text-slate-400 shrink-0 min-w-[8rem]">{label}</span>
      <span className="text-slate-700 dark:text-slate-200">{value}</span>
    </div>
  );
}

function AddRowForm({ locale, contractId, branchId, nextNumber, onClose }: {
  locale: string; contractId: string; branchId: string; nextNumber: number; onClose: () => void;
}) {
  const t = useTranslations('installments');
  const tc = useTranslations('common');
  const action = addPaymentRowAction.bind(null, locale, branchId);
  const [state, formAction, isPending] = useActionState<PaymentRowState, FormData>(action, {});
  const ref = useRef(0);
  useEffect(() => { if (ref.current > 0 && !isPending && !state.error) onClose(); }, [state, isPending]);
  return (
    <form action={formAction} onSubmit={() => { ref.current += 1; }}
      className="mt-4 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <input type="hidden" name="contract_id" value={contractId} />
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('termNo')}</label>
          <input name="installment_number" type="number" defaultValue={nextNumber} min={1} required className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('dueDate')}</label>
          <input name="due_date" type="date" required className="input" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">{t('amount')}</label>
          <input name="amount_due" type="number" step="0.01" min={0} required className="input" />
        </div>
      </div>
      {state.error && <p className="text-xs text-red-600 mb-2">{state.error}</p>}
      <div className="flex justify-end gap-2 mt-3">
        <button type="button" onClick={onClose}
          className="px-3 py-1.5 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
          {tc('cancel')}
        </button>
        <button type="submit" disabled={isPending}
          className="px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">
          {isPending ? tc('loading') : tc('save')}
        </button>
      </div>
    </form>
  );
}

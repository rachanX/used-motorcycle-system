'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { recordPaymentAction, type PaymentFormState } from '@/lib/supabase/payment-actions';
import type { Payment } from '@/types/database.types';

const BANKS_TH = [
  'กสิกรไทย (KBank)',
  'ไทยพาณิชย์ (SCB)',
  'กรุงไทย (KTB)',
  'กรุงเทพ (BBL)',
  'กรุงศรี (BAY)',
  'ทีทีบี (TTB)',
  'ออมสิน',
  'ธ.ก.ส. (BAAC)',
  'UOB',
  'CIMB Thai',
  'LH Bank',
  'ICBC',
  'Standard Chartered',
  'others'
];
const BANKS_EN = [
  'Kasikorn Bank (KBank)',
  'SCB',
  'Krungthai Bank (KTB)',
  'Bangkok Bank (BBL)',
  'Krungsri (BAY)',
  'TTB',
  'Government Savings Bank',
  'BAAC',
  'UOB',
  'CIMB Thai',
  'LH Bank',
  'ICBC',
  'Standard Chartered',
  'others'
];

export default function RecordPaymentModal({
  locale,
  payment,
  contractNumber,
  customerName,
  branchId,
  onClose
}: {
  locale: string;
  payment: Payment & { penalty_fee?: number; receipt_number?: string | null; bank?: string | null; custom_bank_name?: string | null };
  contractNumber: string;
  customerName: string;
  branchId: string;
  onClose: () => void;
}) {
  const t = useTranslations('installments');
  const tc = useTranslations('common');
  const isThai = locale === 'th';

  const action = recordPaymentAction.bind(null, locale, payment.id, branchId);
  const [state, formAction, isPending] = useActionState<PaymentFormState, FormData>(action, {});
  const submitCount = useRef(0);

  const [selectedBank, setSelectedBank] = useState(payment.bank ?? '');
  const banks = isThai ? BANKS_TH : BANKS_EN;
  const isOthers = selectedBank === 'others';

  useEffect(() => {
    if (submitCount.current > 0 && !isPending && !state.error) onClose();
  }, [state, isPending]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtMoney(n: number) {
    return n.toLocaleString(isThai ? 'th-TH' : 'en-US', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 overflow-y-auto py-8">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 my-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold text-slate-900 dark:text-white">{t('recordPayment')}</h2>
          <button onClick={onClose}><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <p className="text-xs text-slate-400 mb-1">{contractNumber} · {customerName}</p>
        <p className="text-xs text-slate-500 mb-4">
          {isThai ? 'งวดที่' : 'Installment'} #{payment.installment_number} &nbsp;|&nbsp;
          {isThai ? 'ยอดที่ต้องชำระ' : 'Amount due'}: <span className="font-medium text-slate-700 dark:text-slate-200">{fmtMoney(payment.amount_due)}</span>
        </p>

        <form
          action={formAction}
          onSubmit={() => { submitCount.current += 1; }}
          className="space-y-3"
        >
          <input type="hidden" name="amount_due" value={payment.amount_due} />

          {/* Amount Paid */}
          <F label={isThai ? 'ยอดชำระ' : 'Amount Paid'}>
            <div className="flex gap-2">
              <input
                name="amount_paid"
                type="number"
                step="0.01"
                min={0}
                defaultValue={payment.amount_paid || payment.amount_due}
                required
                className="input flex-1"
              />
              <button
                type="button"
                onClick={(e) => {
                  const inp = (e.currentTarget.parentElement?.querySelector('input[name="amount_paid"]') as HTMLInputElement);
                  if (inp) inp.value = String(payment.amount_due);
                }}
                className="shrink-0 px-3 py-2 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {isThai ? 'ชำระเต็ม' : 'Full Pay'}
              </button>
            </div>
          </F>

          {/* Payment Date */}
          <F label={isThai ? 'วันที่ชำระ' : 'Payment Date'}>
            <input
              name="payment_date"
              type="date"
              defaultValue={(payment as any).actual_payment_date ?? new Date().toISOString().slice(0, 10)}
              required
              className="input"
            />
          </F>

          {/* Payment Method */}
          <F label={isThai ? 'วิธีชำระ' : 'Method'}>
            <select name="payment_method" defaultValue={payment.payment_method ?? 'cash'} className="input">
              <option value="cash">{isThai ? 'เงินสด' : 'Cash'}</option>
              <option value="bank_transfer">{isThai ? 'โอนเงิน' : 'Bank Transfer'}</option>
              <option value="qr_promptpay">QR PromptPay</option>
              <option value="other">{isThai ? 'อื่นๆ' : 'Other'}</option>
            </select>
          </F>

          {/* Penalty Fee */}
          <F label={isThai ? 'ค่าปรับ (ไม่นับรวมในยอดผ่อน)' : 'Penalty Fee (does not reduce balance)'}>
            <input
              name="penalty_fee"
              type="number"
              step="0.01"
              min={0}
              defaultValue={(payment as any).penalty_fee ?? 0}
              className="input"
            />
          </F>

          {/* Receipt Number */}
          <F label={isThai ? 'เลขที่ใบเสร็จ' : 'Receipt Number'}>
            <input
              name="receipt_number"
              type="text"
              defaultValue={(payment as any).receipt_number ?? ''}
              className="input"
            />
          </F>

          {/* Bank Dropdown */}
          <F label={isThai ? 'ธนาคาร' : 'Bank'}>
            <select
              name="bank"
              value={selectedBank}
              onChange={e => setSelectedBank(e.target.value)}
              className="input"
            >
              <option value="">—</option>
              {banks.map(b => (
                <option key={b} value={b}>{b === 'others' ? (isThai ? 'อื่นๆ' : 'Others') : b}</option>
              ))}
            </select>
          </F>

          {/* Custom bank name when Others selected */}
          {isOthers && (
            <F label={isThai ? 'ระบุชื่อธนาคาร' : 'Enter bank name'}>
              <input
                name="custom_bank_name"
                type="text"
                defaultValue={(payment as any).custom_bank_name ?? ''}
                placeholder={isThai ? 'ชื่อธนาคาร...' : 'Bank name...'}
                required
                className="input"
              />
            </F>
          )}

          {/* Notes */}
          <F label={isThai ? 'หมายเหตุ' : 'Notes'}>
            <textarea
              name="notes"
              rows={2}
              defaultValue={payment.notes ?? ''}
              className="input"
            />
          </F>

          {state.error && (
            <p className="text-sm text-red-600" role="alert">{state.error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800">
              {tc('cancel')}
            </button>
            <button type="submit" disabled={isPending}
              className="px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium">
              {isPending ? tc('loading') : tc('save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

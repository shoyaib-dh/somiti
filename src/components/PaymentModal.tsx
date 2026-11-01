import React, { useState, useEffect } from 'react';
import { Member, OrgSettings } from '../types';
import { money } from '../utils';
import { X, HandCoins, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  member: Member | null;
  settings: OrgSettings;
  isOpen: boolean;
  onClose: () => void;
  onSavePayment: (paymentData: {
    MemberID: string;
    Month: string;
    Amount: number;
    Fine: number;
    Date: string;
    Note: string;
  }) => Promise<void>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  member,
  isOpen,
  onClose,
  onSavePayment
}) => {
  const [targetMonth, setTargetMonth] = useState('');
  const [amount, setAmount] = useState<number>(1000);
  const [fine, setFine] = useState<number>(0);
  const [date, setDate] = useState(new Date().toISOString().substring(0, 10));
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (member && isOpen) {
      setError('');
      setDate(new Date().toISOString().substring(0, 10));
      setNote('');

      // Check if member has missing / due months
      if (member.missingMonths && member.missingMonths.length > 0) {
        const firstDue = member.missingMonths[0];
        setTargetMonth(firstDue.ym);
        setAmount(firstDue.dueAmt || member.InstallmentAmount || 1000);
        setFine(firstDue.dueFine || 0);
      } else {
        const now = new Date();
        const mo = now.getMonth() + 1;
        const ym = `${now.getFullYear()}-${mo < 10 ? '0' + mo : mo}`;
        setTargetMonth(ym);
        setAmount(member.InstallmentAmount || 1000);
        setFine(0);
      }
    }
  }, [member, isOpen]);

  if (!isOpen || !member) return null;

  const handleMonthChange = (ym: string) => {
    setTargetMonth(ym);
    const foundDue = (member.missingMonths || []).find((m) => m.ym === ym);
    if (foundDue) {
      setAmount(foundDue.dueAmt || member.InstallmentAmount);
      setFine(foundDue.dueFine || 0);
    } else {
      setAmount(member.InstallmentAmount || 1000);
      setFine(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await onSavePayment({
        MemberID: member.ID,
        Month: targetMonth,
        Amount: Number(amount),
        Fine: Number(fine),
        Date: date,
        Note: note.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Payment submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <HandCoins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Collect Installment</h2>
              <p className="text-xs text-teal-700 font-semibold">{member.Name} ({member.MemberNo})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Installment Month *</label>
            <select
              value={targetMonth}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
            >
              {member.missingMonths && member.missingMonths.length > 0 ? (
                member.missingMonths.map((due) => (
                  <option key={due.ym} value={due.ym}>
                    {due.monthName} (Due: ৳{money(due.dueAmt)}{due.dueFine > 0 ? `, Fine: ৳${money(due.dueFine)}` : ''})
                  </option>
                ))
              ) : null}
              {/* Also allow current or advance months */}
              <option value={`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`}>
                Current Month ({new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })})
              </option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Amount (৳) *</label>
              <input
                type="number"
                min="1"
                step="50"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-bold text-teal-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Fine Paid (৳)</label>
              <input
                type="number"
                min="0"
                step="50"
                value={fine}
                onChange={(e) => setFine(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-bold text-amber-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Date *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Note / Voucher Ref (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Bank Transfer, Cash, bKash"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              {submitting ? 'Processing...' : 'Confirm Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

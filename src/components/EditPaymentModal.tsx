import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { paymentMonthKey } from '../utils';
import { X, Edit3, DollarSign, Calendar } from 'lucide-react';

interface EditPaymentModalProps {
  payment: Payment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedPayment: Payment) => Promise<void>;
}

export const EditPaymentModal: React.FC<EditPaymentModalProps> = ({
  payment,
  isOpen,
  onClose,
  onUpdate
}) => {
  const [month, setMonth] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [fine, setFine] = useState<number>(0);
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setMonth(paymentMonthKey(payment));
      setAmount(Number(payment.Amount || 0));
      setFine(Number(payment.Fine || 0));
      setDate(payment.Date ? payment.Date.substring(0, 10) : new Date().toISOString().substring(0, 10));
      setNote(payment.Note || '');
    }
  }, [payment, isOpen]);

  if (!isOpen || !payment) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onUpdate({
        ...payment,
        Month: month,
        Amount: Number(amount),
        Fine: Number(fine),
        Date: date,
        Note: note.trim()
      });
      onClose();
    } catch (err: any) {
      alert('আপডেট করা যায়নি: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">কিস্তি সংশোধন</h2>
              <p className="text-xs text-slate-500">জমার তথ্য পরিবর্তন করুন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">কিস্তির মাস *</label>
            <input
              type="month"
              required
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">জমার পরিমাণ (৳) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm font-bold text-teal-700 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">জরিমানা প্রদান (৳)</label>
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
            <label className="mb-1 block text-xs font-medium text-slate-600">জমার তারিখ *</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">মন্তব্য (ঐচ্ছিক)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-teal-600 px-6 py-2 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              {saving ? 'আপডেট হচ্ছে...' : 'আপডেট করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React from 'react';
import { Member } from '../types';
import { money } from '../utils';
import { X, AlertCircle, Plus } from 'lucide-react';

interface DueMonthsListModalProps {
  member: Member | null;
  isOpen: boolean;
  onClose: () => void;
  onPayMonth: (member: Member, ym: string) => void;
}

export const DueMonthsListModal: React.FC<DueMonthsListModalProps> = ({
  member,
  isOpen,
  onClose,
  onPayMonth
}) => {
  if (!isOpen || !member) return null;

  const totalDue = (member.dueAmount || 0) + (member.dueFineAmount || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">বকেয়া কিস্তির বিবরণী</h2>
              <p className="text-xs text-slate-500 font-semibold text-rose-700">{member.Name} ({member.MemberNo})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2.5">
          {member.missingMonths && member.missingMonths.length > 0 ? (
            member.missingMonths.map((m) => (
              <div
                key={m.ym}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3"
              >
                <div>
                  <div className="text-sm font-bold text-slate-800">{m.monthName}</div>
                  <div className="text-xs text-slate-500">
                    মূল কিস্তি: ৳{money(m.dueAmt)}
                    {m.dueFine > 0 && (
                      <span className="text-rose-600 font-medium"> + জরিমানা: ৳{money(m.dueFine)}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-rose-600">
                    ৳{money(m.dueAmt + m.dueFine)}
                  </span>
                  <button
                    onClick={() => {
                      onClose();
                      onPayMonth(member, m.ym);
                    }}
                    className="flex items-center gap-1 rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-teal-700"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    জমা
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-sm text-slate-500">
              কোনো বকেয়া পাওয়া যায়নি
            </div>
          )}
        </div>

        {/* Total Summary */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-rose-50 p-3.5 border border-rose-100">
          <span className="text-sm font-bold text-rose-900">সর্বমোট বকেয়া (জরিমানাসহ):</span>
          <span className="text-lg font-extrabold text-rose-600">৳{money(totalDue)}</span>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};

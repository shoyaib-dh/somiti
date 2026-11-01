import React, { useState } from 'react';
import { Member, OrgSettings, Payment } from '../types';
import { generateLedger, money, formatBnDate } from '../utils';
import { downloadMemberStatementPdf } from '../services/pdfService';
import { X, FileText, Download, Trash2, Edit3, Plus, CreditCard, Loader2 } from 'lucide-react';

interface StatementModalProps {
  member: Member | null;
  settings: OrgSettings;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  onOpenPayForMonth: (member: Member, ym: string) => void;
  onDeletePayment: (paymentId: string) => Promise<void>;
  onEditPayment: (payment: Payment) => void;
  onOpenIdCard: (member: Member) => void;
}

export const StatementModal: React.FC<StatementModalProps> = ({
  member,
  settings,
  isAdmin,
  isOpen,
  onClose,
  onOpenPayForMonth,
  onDeletePayment,
  onEditPayment,
  onOpenIdCard
}) => {
  const [downloading, setDownloading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const payments = member.payments || [];
  const ledger = generateLedger(member, payments);

  const totalPaid = payments.reduce((s, p) => s + Number(p.Amount || 0), 0);
  const totalFine = payments.reduce((s, p) => s + Number(p.Fine || 0), 0);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadMemberStatementPdf(member, settings);
    } catch (err: any) {
      alert('Failed to generate statement PDF: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment record?')) return;
    setDeletingId(paymentId);
    try {
      await onDeletePayment(paymentId);
    } catch (err: any) {
      alert('Failed to delete: ' + (err?.message || err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm font-sans">
      <div className="relative flex max-h-[92vh] w-full max-w-3xl flex-col rounded-2xl bg-white p-6 shadow-2xl md:p-7">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">{member.Name} — Account Ledger</h2>
              <p className="text-xs text-slate-500 font-mono">ID: {member.MemberNo} | Phone: {member.Mobile || '—'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Financial Summary Pill Box */}
        <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-center border border-slate-100">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Savings Paid</div>
            <div className="text-base font-bold text-teal-700">৳ {money(totalPaid)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Fine Paid</div>
            <div className="text-base font-bold text-amber-600">৳ {money(totalFine)}</div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase">Total Overdue</div>
            <div className={`text-base font-bold ${((member.dueAmount || 0) + (member.dueFineAmount || 0)) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ৳ {money((member.dueAmount || 0) + (member.dueFineAmount || 0))}
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs font-semibold text-slate-600 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3">Month</th>
                <th className="p-3">Payment Date</th>
                <th className="p-3">Deposit</th>
                <th className="p-3">Fine</th>
                <th className="p-3">Status / Notes</th>
                {isAdmin && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {ledger.map((entry) => {
                const isPaidInFull = entry.paid >= entry.expected;
                const hasDues = entry.dueAmt > 0 || entry.dueFine > 0;

                return (
                  <tr key={entry.ym} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 font-semibold text-slate-800">{entry.monthName}</td>
                    <td className="p-3 text-slate-600">
                      {entry.dates.length > 0 ? entry.dates.map((d) => formatBnDate(d)).join(', ') : '—'}
                    </td>
                    <td className="p-3">
                      {entry.paid > 0 ? (
                        <div>
                          <span className="font-bold text-teal-700">৳ {money(entry.paid)}</span>
                          {entry.dueAmt > 0 && (
                            <span className="ml-1.5 text-[10px] font-bold text-rose-600">
                              (Due: ৳{money(entry.dueAmt)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="font-semibold text-rose-600">Due: ৳{money(entry.dueAmt)}</span>
                      )}
                    </td>
                    <td className="p-3">
                      {entry.finePaid > 0 ? (
                        <span className="font-bold text-amber-700">৳ {money(entry.finePaid)}</span>
                      ) : entry.dueFine > 0 ? (
                        <span className="font-semibold text-rose-600">৳ {money(entry.dueFine)}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3">
                      {isPaidInFull ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 border border-emerald-200">
                          Paid
                        </span>
                      ) : entry.paid > 0 ? (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                          Partial
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-rose-50 px-2 py-0.5 text-[10.5px] font-bold text-rose-700 border border-rose-200">
                          Unpaid
                        </span>
                      )}
                      {entry.notes.length > 0 && (
                        <div className="text-[10px] text-slate-500 mt-0.5">{entry.notes.join(', ')}</div>
                      )}
                    </td>

                    {isAdmin && (
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {entry.raw.length > 0 ? (
                            entry.raw.map((p) => (
                              <div key={p.ID} className="flex items-center gap-1">
                                <button
                                  onClick={() => onEditPayment(p)}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                                  title="Edit"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.ID)}
                                  disabled={deletingId === p.ID}
                                  className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))
                          ) : hasDues ? (
                            <button
                              onClick={() => onOpenPayForMonth(member, entry.ym)}
                              className="flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-100"
                            >
                              <Plus className="h-3 w-3" />
                              Pay
                            </button>
                          ) : null}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <button
            onClick={() => onOpenIdCard(member)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
          >
            <CreditCard className="h-4 w-4 text-teal-600" />
            View ID Badge
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              Close
            </button>
            <button
              onClick={handleDownloadPdf}
              disabled={downloading}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download Statement PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

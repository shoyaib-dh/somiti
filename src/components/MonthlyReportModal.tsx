import React, { useState } from 'react';
import { Member, OrgSettings } from '../types';
import { downloadMonthlyReportPdf } from '../services/pdfService';
import { X, Calendar, Download, Loader2 } from 'lucide-react';

interface MonthlyReportModalProps {
  members: Member[];
  settings: OrgSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  members,
  settings,
  isOpen,
  onClose
}) => {
  const now = new Date();
  const currentYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentYm);
  const [downloading, setDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    if (!selectedMonth) return;
    setDownloading(true);
    try {
      await downloadMonthlyReportPdf(members, selectedMonth, settings);
      onClose();
    } catch (err: any) {
      alert('মাসিক প্রতিবেদন তৈরি ব্যর্থ হয়েছে: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">মাসিক প্রতিবেদন ডাউনলোড</h2>
              <p className="text-xs text-slate-500">নির্দিষ্ট মাসের সঞ্চয় ও বকেয়ার পূর্ণাঙ্গ বিবরণী</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">মাস নির্বাচন করুন *</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 leading-relaxed border border-slate-100">
            এই প্রতিবেদনে নির্বাচিত মাসের মোট কিস্তি আদায়, জরিমানা জমা এবং যাদের বকেয়া রয়েছে তাদের বিস্তারিত নাম ও মোবাইলসহ তালিকা থাকবে।
          </p>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading || !selectedMonth}
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? 'প্রস্তুত হচ্ছে...' : 'পিডিএফ ডাউনলোড'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import { Member, OrgSettings } from '../types';
import { VerticalIdCard } from './VerticalIdCard';
import { downloadSingleIdCardPdf, downloadSingleIdCardImage } from '../services/pdfService';
import { X, Download, Image as ImageIcon, Loader2 } from 'lucide-react';

interface IdCardPreviewModalProps {
  member: Member | null;
  settings: OrgSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const IdCardPreviewModal: React.FC<IdCardPreviewModalProps> = ({
  member,
  settings,
  isOpen,
  onClose
}) => {
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !member) return null;

  const handleDownloadPdf = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await downloadSingleIdCardPdf(member, cardRef.current);
    } catch (err: any) {
      alert('Failed to generate ID card PDF: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      await downloadSingleIdCardImage(member, cardRef.current);
    } catch (err: any) {
      alert('Failed to generate ID card image: ' + (err?.message || err));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-md font-sans">
      <div className="relative flex max-h-[96vh] w-full max-w-lg flex-col items-center overflow-y-auto rounded-3xl bg-slate-900 p-6 text-white shadow-2xl border border-slate-800">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="mb-3 text-center">
          <span className="rounded-full bg-teal-500/20 px-3 py-1 text-[11px] font-bold text-teal-300 uppercase tracking-wider">
            Premium Portrait ID Card
          </span>
          <h2 className="mt-1 text-base font-bold text-slate-100">{member.Name} — Identity Badge</h2>
        </div>

        {/* Lanyard Clip Simulation & Card Container */}
        <div className="flex flex-col items-center justify-center py-1">
          {/* Lanyard Hole Clip */}
          <div className="mb-1 flex flex-col items-center">
            <div className="h-3.5 w-12 rounded-t-md bg-slate-600 shadow-inner" />
            <div className="h-1.5 w-8 rounded-b-md bg-slate-500" />
          </div>

          {/* Card Component Container */}
          <div ref={cardRef} className="shadow-2xl rounded-2xl overflow-hidden bg-white">
            <VerticalIdCard member={member} settings={settings} />
          </div>
        </div>

        {/* Actions Toolbar */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3 w-full">
          <button
            onClick={handleDownloadPdf}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-600/30 hover:bg-teal-500 transition disabled:opacity-50"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF Badge
          </button>

          <button
            onClick={handleDownloadImage}
            disabled={downloading}
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition disabled:opacity-50 border border-slate-700"
          >
            <ImageIcon className="h-4 w-4 text-teal-400" />
            Download PNG Image
          </button>
        </div>

        <p className="mt-3 text-[11px] text-slate-400">
          Standard 54mm × 86mm portrait lanyard badge size ready for printing and lamination.
        </p>
      </div>
    </div>
  );
};

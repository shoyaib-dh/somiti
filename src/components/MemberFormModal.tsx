import React, { useState, useEffect } from 'react';
import { Member, OrgSettings } from '../types';
import { X, UserPlus, Upload, Phone, User, Calendar, DollarSign, HeartPulse } from 'lucide-react';
import { FALLBACK_AVATAR } from './VerticalIdCard';

interface MemberFormModalProps {
  member?: Member | null;
  settings: OrgSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: Partial<Member>) => Promise<void>;
}

export const MemberFormModal: React.FC<MemberFormModalProps> = ({
  member,
  settings,
  isOpen,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('');
  const [memberNo, setMemberNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [installmentAmount, setInstallmentAmount] = useState<number>(settings.defaultInstallment || 1000);
  const [dueDay, setDueDay] = useState<number>(settings.defaultDueDay || 12);
  const [fineAmount, setFineAmount] = useState<number>(settings.defaultFine || 300);
  const [bloodGroup, setBloodGroup] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().substring(0, 10));
  const [photo, setPhoto] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) {
      setName(member.Name || '');
      setMemberNo(member.MemberNo || '');
      setMobile(member.Mobile || '');
      setInstallmentAmount(member.InstallmentAmount || settings.defaultInstallment || 1000);
      setDueDay(member.DueDay || settings.defaultDueDay || 12);
      setFineAmount(member.FineAmount || settings.defaultFine || 300);
      setBloodGroup(member.BloodGroup || '');
      setJoinDate(member.JoinDate || new Date().toISOString().substring(0, 10));
      setPhoto(member.Photo || '');
    } else {
      setName('');
      setMemberNo('');
      setMobile('');
      setInstallmentAmount(settings.defaultInstallment || 1000);
      setDueDay(settings.defaultDueDay || 12);
      setFineAmount(settings.defaultFine || 300);
      setBloodGroup('');
      setJoinDate(new Date().toISOString().substring(0, 10));
      setPhoto('');
    }
  }, [member, settings, isOpen]);

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('Photo file size must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400; // Crisp avatar resolution
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhoto(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter member name');
      return;
    }
    if (!memberNo.trim()) {
      alert('Please enter Member ID / No');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        // CRITICAL FIX: Preserves existing member ID so edit updates existing record!
        ID: member ? member.ID : undefined,
        Name: name.trim(),
        MemberNo: memberNo.trim(),
        Mobile: mobile.trim(),
        InstallmentAmount: Number(installmentAmount),
        DueDay: Number(dueDay),
        FineAmount: Number(fineAmount),
        BloodGroup: bloodGroup.trim(),
        JoinDate: joinDate,
        Photo: photo
      });
      onClose();
    } catch (err: any) {
      alert('Failed to save member: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl font-sans">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {member ? 'Edit Member Information' : 'Register New Member'}
              </h2>
              <p className="text-xs text-slate-500">
                {member ? `Updating details for ${member.Name} (${member.MemberNo})` : 'Fill in the information below to add a member'}
              </p>
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
          {/* Member Photo Upload */}
          <div className="flex items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 p-3.5">
            <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-2 border-teal-500 bg-white shadow-sm">
              <img
                src={photo || FALLBACK_AVATAR}
                alt="Member avatar"
                className="h-full w-full object-cover"
              />
              {photo && (
                <button
                  type="button"
                  onClick={() => setPhoto('')}
                  className="absolute bottom-0 inset-x-0 bg-slate-900/70 text-white text-[9px] py-0.5 text-center"
                >
                  Remove
                </button>
              )}
            </div>
            <div className="flex-1">
              <label className="mb-1 block text-xs font-semibold text-slate-700">Member Passport Photo</label>
              <p className="mb-2 text-[11px] text-slate-500">Square photo recommended for ID card</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                <Upload className="h-3.5 w-3.5 text-teal-600" />
                Select Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Member Name & No */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Full Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="e.g. John Doe"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Member ID / No *</label>
              <input
                type="text"
                required
                value={memberNo}
                onChange={(e) => setMemberNo(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="e.g. SH-01"
              />
            </div>
          </div>

          {/* Mobile (International support) & Blood Group */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Mobile Number (Any Country Code)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  placeholder="e.g. +880 1712-345678 or +1 555-0199"
                />
              </div>
              <p className="mt-1 text-[10.5px] text-slate-400">Include country code (+880, +1, +44, +971, etc.) for WhatsApp</p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Blood Group (Optional)</label>
              <div className="relative">
                <HeartPulse className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                >
                  <option value="">Select Blood Group</option>
                  {bloodGroups.map((bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Financials: Installment, Due Day, Fine */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Monthly Installment (৳) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={installmentAmount}
                  onChange={(e) => setInstallmentAmount(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Due Day (1-28) *</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  min="1"
                  max="28"
                  required
                  value={dueDay}
                  onChange={(e) => setDueDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Late Fine (৳)</label>
              <input
                type="number"
                min="0"
                step="50"
                required
                value={fineAmount}
                onChange={(e) => setFineAmount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Join Date */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Date of Joining / Issue</label>
            <input
              type="date"
              value={joinDate}
              onChange={(e) => setJoinDate(e.target.value)}
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
              disabled={saving}
              className="rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              {saving ? 'Saving...' : member ? 'Update Member' : 'Register Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

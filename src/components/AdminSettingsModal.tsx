import React, { useState } from 'react';
import { OrgSettings } from '../types';
import { X, Save, Palette, Building2, Phone, Mail, MapPin, DollarSign, Calendar, Upload } from 'lucide-react';

interface AdminSettingsModalProps {
  settings: OrgSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: OrgSettings) => Promise<void>;
}

export const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<OrgSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert('Logo file size must be less than 2MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 200;
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
        setFormData((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg('');
    try {
      await onSave(formData);
      setStatusMsg('Settings saved successfully!');
      setTimeout(() => {
        setStatusMsg('');
        onClose();
      }, 700);
    } catch (err: any) {
      alert('Failed to save settings: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const themeOptions: { id: OrgSettings['cardTheme']; label: string; bg: string }[] = [
    { id: 'teal', label: 'Teal Modern (Reference)', bg: 'from-teal-600 to-teal-800' },
    { id: 'emerald', label: 'Emerald Green', bg: 'from-emerald-600 to-emerald-800' },
    { id: 'navy', label: 'Royal Navy Blue', bg: 'from-blue-700 to-slate-900' },
    { id: 'indigo', label: 'Classic Indigo', bg: 'from-indigo-600 to-indigo-900' },
    { id: 'gold', label: 'Luxury Amber Gold', bg: 'from-amber-600 to-amber-900' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm font-sans">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Admin System Customization</h2>
              <p className="text-xs text-slate-500">Configure organization branding, ID badge theme, and financial defaults</p>
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
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* Section 1: Organization Identity */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="h-4 w-4 text-teal-600" />
              Organization Identity
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Organization Name *</label>
                <input
                  type="text"
                  required
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="e.g. Shoptodash Sohojatra"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Slogan / Subtitle</label>
                <input
                  type="text"
                  value={formData.orgSub}
                  onChange={(e) => setFormData({ ...formData, orgSub: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="e.g. Savings & Credit Co-operative Society"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Registration Number</label>
                <input
                  type="text"
                  value={formData.registrationNo || ''}
                  onChange={(e) => setFormData({ ...formData, registrationNo: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  placeholder="e.g. REG: 17/2026"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Contact Phone (Any Country)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                    placeholder="e.g. +880 1712-345678 or +1 555-0199"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Official Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Office Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Logo Upload */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <label className="mb-2 block text-xs font-semibold text-slate-700">Organization Logo / Emblem</label>
              <div className="flex items-center gap-4">
                {formData.logoUrl ? (
                  <div className="relative">
                    <img
                      src={formData.logoUrl}
                      alt="Logo preview"
                      className="h-14 w-14 rounded-full border border-teal-500 object-cover p-0.5 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, logoUrl: '' })}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-white text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400 text-xs text-center p-1 font-medium">
                    No Logo
                  </div>
                )}
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                  <Upload className="h-4 w-4 text-teal-600" />
                  Upload Logo Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: ID Card Theme Selection */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Palette className="h-4 w-4 text-teal-600" />
              ID Badge Color Theme
            </h3>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {themeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, cardTheme: opt.id })}
                  className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-all ${
                    formData.cardTheme === opt.id
                      ? 'border-teal-600 bg-teal-50/70 shadow-sm ring-1 ring-teal-600'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${opt.bg} shadow-inner flex-shrink-0`} />
                  <span className="text-xs font-semibold text-slate-800">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3: Financial Defaults */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4">
            <h3 className="mb-3 text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-teal-600" />
              Financial Policy & Defaults
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Default Installment (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={formData.defaultInstallment}
                  onChange={(e) => setFormData({ ...formData, defaultInstallment: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Due Day (1-28)</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    min="1"
                    max="28"
                    required
                    value={formData.defaultDueDay}
                    onChange={(e) => setFormData({ ...formData, defaultDueDay: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">Default Late Fine (৳)</label>
                <input
                  type="number"
                  min="0"
                  step="50"
                  required
                  value={formData.defaultFine}
                  onChange={(e) => setFormData({ ...formData, defaultFine: Number(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
                />
              </div>
            </div>
          </div>

          {statusMsg && (
            <div className="rounded-lg bg-teal-50 p-2.5 text-center text-xs font-semibold text-teal-700">
              {statusMsg}
            </div>
          )}

          {/* Action buttons */}
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
              className="flex items-center gap-2 rounded-xl bg-teal-600 px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

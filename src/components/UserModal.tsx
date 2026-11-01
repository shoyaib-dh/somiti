import React, { useState, useEffect } from 'react';
import { UserAccount } from '../types';
import { X, UserCheck, Shield } from 'lucide-react';

interface UserModalProps {
  user: UserAccount | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: UserAccount) => Promise<void>;
}

export const UserModal: React.FC<UserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Admin' | 'Operator'>('Operator');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setUsername(user.Username);
      setName(user.Name);
      setPassword('');
      setRole(user.Role);
    } else {
      setUsername('');
      setName('');
      setPassword('');
      setRole('Operator');
    }
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !name.trim()) {
      alert('ইউজারনেম ও নাম দিন');
      return;
    }
    if (!user && !password.trim()) {
      alert('নতুন ইউজারের জন্য পাসওয়ার্ড দিন');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        Username: username.trim(),
        Name: name.trim(),
        Password: password,
        Role: role
      });
      onClose();
    } catch (err: any) {
      alert('ইউজার সংরক্ষণ ব্যর্থ হয়েছে: ' + (err?.message || err));
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
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                {user ? 'ইউজার তথ্য এডিট' : 'নতুন ইউজার অ্যাকাউন্ট'}
              </h2>
              <p className="text-xs text-slate-500">ইউজার তৈরি বা রোল পরিবর্তন করুন</p>
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
            <label className="mb-1 block text-xs font-medium text-slate-600">ইউজারনেম (ইংরেজিতে) *</label>
            <input
              type="text"
              required
              disabled={!!user}
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              placeholder="যেমন: admin2"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-mono focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:bg-slate-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">পূর্ণ নাম *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="যেমন: শেখ সোহেল"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              পাসওয়ার্ড {user ? '(পরিবর্তন না করতে চাইলে খালি রাখুন)' : '*'}
            </label>
            <input
              type="password"
              required={!user}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">অ্যাক্সেস রোল</label>
            <div className="relative">
              <Shield className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'Admin' | 'Operator')}
                className="w-full rounded-lg border border-slate-300 pl-9 pr-3.5 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              >
                <option value="Admin">অ্যাডমিন (সকল কাজ ও কাস্টমাইজেশন করতে পারবে)</option>
                <option value="Operator">মেম্বার / অপারেটর (শুধুমাত্র তথ্য দেখতে ও পিডিএফ নিতে পারবে)</option>
              </select>
            </div>
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
              {saving ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

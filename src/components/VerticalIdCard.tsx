import React from 'react';
import { Member, OrgSettings } from '../types';
import { toBn, money, formatMobile, formatBnDate } from '../utils';

interface VerticalIdCardProps {
  member: Member;
  settings: OrgSettings;
  elementId?: string;
  isPrintMode?: boolean;
}

export const FALLBACK_AVATAR = 'data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22%230d9488%22%3E%3Cpath%20d%3D%22M12%2012c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0%202c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4z%22%2F%3E%3C%2Fsvg%3E';

export const VerticalIdCard: React.FC<VerticalIdCardProps> = ({
  member,
  settings,
  elementId,
  isPrintMode = false
}) => {
  // Theme color maps matching the screenshot style
  const themeMap = {
    teal: {
      primary: '#0d9488',
      dark: '#115e59',
      light: '#ccfbf1',
      bgGrad: 'linear-gradient(135deg, #0d9488 0%, #115e59 100%)',
      accent: '#0f766e',
      border: '#14b8a6'
    },
    emerald: {
      primary: '#059669',
      dark: '#064e3b',
      light: '#d1fae5',
      bgGrad: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)',
      accent: '#047857',
      border: '#10b981'
    },
    navy: {
      primary: '#1e40af',
      dark: '#0f172a',
      light: '#dbeafe',
      bgGrad: 'linear-gradient(135deg, #1e40af 0%, #0f172a 100%)',
      accent: '#1e3a8a',
      border: '#3b82f6'
    },
    indigo: {
      primary: '#4f46e5',
      dark: '#312e81',
      light: '#e0e7ff',
      bgGrad: 'linear-gradient(135deg, #4f46e5 0%, #312e81 100%)',
      accent: '#3730a3',
      border: '#6366f1'
    },
    gold: {
      primary: '#b45309',
      dark: '#78350f',
      light: '#fef3c7',
      bgGrad: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)',
      accent: '#92400e',
      border: '#f59e0b'
    }
  };

  const theme = themeMap[settings.cardTheme || 'teal'] || themeMap.teal;
  const photoSrc = member.Photo || FALLBACK_AVATAR;

  return (
    <div
      id={elementId}
      className="relative select-none overflow-hidden bg-white text-slate-800 transition-all"
      style={{
        width: '320px',
        height: '520px',
        borderRadius: '16px',
        boxShadow: isPrintMode ? 'none' : '0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e2e8f0',
        fontFamily: "'Hind Siliguri', 'Poppins', sans-serif"
      }}
    >
      {/* Background Watermark / Subtle Texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `radial-gradient(${theme.primary} 1.5px, transparent 1.5px)`,
          backgroundSize: '14px 14px'
        }}
      />

      {/* Top Header with Organization Branding */}
      <div className="relative z-10 flex flex-col items-center pt-5 pb-2 text-center">
        {/* Organization Emblem */}
        <div className="mb-1 flex items-center justify-center gap-2">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md"
              style={{ background: theme.bgGrad }}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
        </div>

        {/* Organization Name & Subtitle */}
        <h2 className="text-[17px] font-bold tracking-tight text-slate-900" style={{ lineHeight: '1.2' }}>
          {settings.orgName || 'সপ্তদশ সহযাত্রা'}
        </h2>
        <p className="text-[10px] font-medium tracking-wide uppercase text-slate-500" style={{ letterSpacing: '0.08em' }}>
          {settings.orgSub || 'সঞ্চয় ও ঋণদান সমবায় সমিতি'}
        </p>
        {settings.registrationNo && (
          <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-semibold text-slate-600">
            {settings.registrationNo}
          </span>
        )}
      </div>

      {/* Geometric Middle Banner with Curved Wings (Matching User's Screenshot!) */}
      <div className="relative my-2 flex h-36 items-center justify-center">
        {/* Left Wing Graphic */}
        <svg
          className="absolute left-0 top-0 h-full w-[45%]"
          viewBox="0 0 144 144"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0,20 C50,20 90,60 120,72 C90,84 50,124 0,124 Z"
            fill={theme.primary}
          />
        </svg>

        {/* Right Wing Graphic */}
        <svg
          className="absolute right-0 top-0 h-full w-[45%]"
          viewBox="0 0 144 144"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M144,20 C94,20 54,60 24,72 C54,84 94,124 144,124 Z"
            fill={theme.primary}
          />
        </svg>

        {/* Central Circular Avatar Photo Frame */}
        <div className="relative z-20 flex flex-col items-center">
          <div
            className="flex h-[116px] w-[116px] items-center justify-center rounded-full bg-white p-1.5 shadow-xl"
            style={{
              boxShadow: `0 8px 24px -4px ${theme.primary}55`
            }}
          >
            <div
              className="h-full w-full overflow-hidden rounded-full p-[3px]"
              style={{ background: theme.bgGrad }}
            >
              <img
                src={photoSrc}
                alt={member.Name}
                className="h-full w-full rounded-full object-cover bg-slate-100"
                crossOrigin="anonymous"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Member Name and Designation (Matches Screenshot NOME COMPLETO) */}
      <div className="relative z-10 px-4 text-center">
        <h3 className="text-[19px] font-bold text-slate-900 tracking-tight leading-tight">
          {member.Name}
        </h3>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-teal-700" style={{ color: theme.primary }}>
          সম্মানিত সদস্য • MEMBER
        </p>
      </div>

      {/* Member Details Key-Value List (Matches Screenshot Column Alignment) */}
      <div className="relative z-10 mx-6 mt-3 rounded-xl bg-slate-50/80 p-2.5 backdrop-blur-sm border border-slate-100">
        <table className="w-full text-[12px] text-slate-700" style={{ borderCollapse: 'separate', borderSpacing: '0 4px' }}>
          <tbody>
            <tr>
              <td className="w-[42%] font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                সদস্য নং
              </td>
              <td className="w-[6%] text-slate-400 font-bold">:</td>
              <td className="font-bold text-slate-900 font-mono tracking-wide text-[12.5px]">
                {member.MemberNo}
              </td>
            </tr>
            <tr>
              <td className="font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                মোবাইল
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-semibold text-slate-800 font-mono">
                {formatMobile(member.Mobile) || '—'}
              </td>
            </tr>
            {member.BloodGroup && (
              <tr>
                <td className="font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                  রক্তের গ্রুপ
                </td>
                <td className="text-slate-400 font-bold">:</td>
                <td className="font-bold text-rose-600">
                  {member.BloodGroup}
                </td>
              </tr>
            )}
            <tr>
              <td className="font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                মাসিক কিস্তি
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-bold text-emerald-700">
                ৳{money(member.InstallmentAmount)}
              </td>
            </tr>
            <tr>
              <td className="font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                মোট সঞ্চয়
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-bold text-indigo-700">
                ৳{money(member.totalPaid || 0)}
              </td>
            </tr>
            <tr>
              <td className="font-medium text-slate-500 uppercase tracking-wider text-[10.5px]">
                ইস্যু তারিখ
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-medium text-slate-600 text-[11px]">
                {formatBnDate(member.JoinDate || new Date().toISOString())}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Accent Footer (Matches Screenshot Footer Bar with Barcode) */}
      <div
        className="absolute bottom-0 left-0 right-0 flex h-9 items-center justify-between px-5 text-white"
        style={{ background: theme.bgGrad }}
      >
        <span className="text-[9px] font-medium tracking-wider opacity-90">
          ID: {member.MemberNo}
        </span>
        {/* Stylized Barcode pattern */}
        <div
          className="h-3.5 w-24 opacity-85"
          style={{
            background: 'repeating-linear-gradient(90deg, #ffffff 0 2px, transparent 2px 5px)'
          }}
        />
        <span className="text-[8.5px] font-semibold opacity-90">
          {toBn(new Date().getFullYear())}
        </span>
      </div>
    </div>
  );
};

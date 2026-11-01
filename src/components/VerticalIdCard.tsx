import React from 'react';
import { Member, OrgSettings } from '../types';
import { money, formatMobile, formatBnDate } from '../utils';

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
      primary: '#0D9488',
      dark: '#115E59',
      light: '#CCFBF1',
      bgGrad: 'linear-gradient(135deg, #0D9488 0%, #115E59 100%)',
      ring: '#0D9488',
      banner: '#0D9488'
    },
    emerald: {
      primary: '#059669',
      dark: '#064E3B',
      light: '#D1FAE5',
      bgGrad: 'linear-gradient(135deg, #059669 0%, #064E3B 100%)',
      ring: '#059669',
      banner: '#059669'
    },
    navy: {
      primary: '#1D4ED8',
      dark: '#0F172A',
      light: '#DBEAFE',
      bgGrad: 'linear-gradient(135deg, #1D4ED8 0%, #0F172A 100%)',
      ring: '#1D4ED8',
      banner: '#1D4ED8'
    },
    indigo: {
      primary: '#4F46E5',
      dark: '#312E81',
      light: '#E0E7FF',
      bgGrad: 'linear-gradient(135deg, #4F46E5 0%, #312E81 100%)',
      ring: '#4F46E5',
      banner: '#4F46E5'
    },
    gold: {
      primary: '#B45309',
      dark: '#78350F',
      light: '#FEF3C7',
      bgGrad: 'linear-gradient(135deg, #D97706 0%, #78350F 100%)',
      ring: '#D97706',
      banner: '#D97706'
    }
  };

  const theme = themeMap[settings.cardTheme || 'teal'] || themeMap.teal;
  const photoSrc = member.Photo || FALLBACK_AVATAR;

  return (
    <div
      id={elementId}
      className="relative select-none overflow-hidden bg-white text-slate-800"
      style={{
        width: '320px',
        height: '520px',
        borderRadius: '16px',
        boxShadow: isPrintMode ? 'none' : '0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        border: '1px solid #E2E8F0',
        fontFamily: "'Poppins', sans-serif"
      }}
    >
      {/* Subtle Security Dot Pattern Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(${theme.primary} 1.5px, transparent 1.5px)`,
          backgroundSize: '14px 14px'
        }}
      />

      {/* Top Header: Organization Branding */}
      <div className="relative z-10 flex flex-col items-center pt-5 pb-1 px-4 text-center">
        {/* Logo Icon */}
        <div className="mb-1.5 flex items-center justify-center">
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover shadow-sm"
              crossOrigin="anonymous"
            />
          ) : (
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-white shadow-md"
              style={{ background: theme.bgGrad }}
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
          )}
        </div>

        {/* Organization Name & Slogan */}
        <h2 className="text-[15.5px] font-extrabold tracking-tight text-slate-900 uppercase leading-snug">
          {settings.orgName || 'SHOPTODASH SOHOJATRA'}
        </h2>
        <p className="text-[9.5px] font-semibold tracking-wider uppercase text-slate-500">
          {settings.orgSub || 'Savings & Credit Co-operative Society'}
        </p>
        {settings.registrationNo && (
          <span className="mt-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[8.5px] font-bold text-slate-600">
            {settings.registrationNo}
          </span>
        )}
      </div>

      {/* Middle Section: Geometric Flanking Wings + Central Circular Avatar (Exact Match to Screenshot!) */}
      <div className="relative my-1 flex h-[142px] items-center justify-center overflow-hidden">
        {/* Flawless SVG Geometric Wings Framing the Circle */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 320 142"
          fill="none"
        >
          {/* Left Wing with smooth concave curve */}
          <path
            d="M 0 22 L 78 22 C 102 22 122 44 126 71 C 122 98 102 120 78 120 L 0 120 Z"
            fill={theme.primary}
          />
          {/* Right Wing with smooth concave curve */}
          <path
            d="M 320 22 L 242 22 C 218 22 198 44 194 71 C 198 98 218 120 242 120 L 320 120 Z"
            fill={theme.primary}
          />
        </svg>

        {/* Central Circular Avatar Photo Frame */}
        <div className="relative z-20 flex flex-col items-center">
          <div
            className="flex h-[116px] w-[116px] items-center justify-center rounded-full bg-white p-1 shadow-lg"
            style={{
              boxShadow: `0 8px 24px -4px ${theme.primary}45`
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

      {/* Member Name and Designation (Matches Screenshot 'NOME COMPLETO') */}
      <div className="relative z-10 px-4 text-center mt-1">
        <h3 className="text-[18px] font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
          {member.Name}
        </h3>
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.primary }}>
          HONORARY MEMBER
        </p>
      </div>

      {/* Member Details Key-Value List (Matches Screenshot Column Alignment) */}
      <div className="relative z-10 mx-5 mt-2 rounded-xl bg-slate-50/90 p-2.5 border border-slate-100">
        <table className="w-full text-[11px] text-slate-700" style={{ borderCollapse: 'separate', borderSpacing: '0 3.5px' }}>
          <tbody>
            <tr>
              <td className="w-[40%] font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                MEMBER ID
              </td>
              <td className="w-[6%] text-slate-400 font-bold">:</td>
              <td className="font-bold text-slate-900 font-mono tracking-wide text-[12px]">
                {member.MemberNo}
              </td>
            </tr>
            <tr>
              <td className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                MOBILE
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-semibold text-slate-800 font-mono">
                {formatMobile(member.Mobile) || '—'}
              </td>
            </tr>
            {member.BloodGroup && (
              <tr>
                <td className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                  BLOOD GROUP
                </td>
                <td className="text-slate-400 font-bold">:</td>
                <td className="font-bold text-rose-600">
                  {member.BloodGroup}
                </td>
              </tr>
            )}
            <tr>
              <td className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                INSTALLMENT
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-bold text-emerald-700">
                ৳ {money(member.InstallmentAmount)}
              </td>
            </tr>
            <tr>
              <td className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                TOTAL SAVINGS
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-bold text-indigo-700">
                ৳ {money(member.totalPaid || 0)}
              </td>
            </tr>
            <tr>
              <td className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                ISSUE DATE
              </td>
              <td className="text-slate-400 font-bold">:</td>
              <td className="font-medium text-slate-600 text-[10.5px]">
                {formatBnDate(member.JoinDate || new Date().toISOString())}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Bottom Accent Footer Bar with Barcode (Matches Screenshot) */}
      <div
        className="absolute bottom-0 left-0 right-0 flex h-8 items-center justify-between px-5 text-white"
        style={{ background: theme.bgGrad }}
      >
        <span className="text-[9px] font-semibold tracking-wider opacity-90 uppercase">
          ID: {member.MemberNo}
        </span>
        {/* Stylized Crisp Barcode */}
        <div
          className="h-3 w-24 opacity-85"
          style={{
            background: 'repeating-linear-gradient(90deg, #FFFFFF 0 2px, transparent 2px 5px)'
          }}
        />
        <span className="text-[8.5px] font-bold opacity-90">
          {new Date().getFullYear()}
        </span>
      </div>
    </div>
  );
};

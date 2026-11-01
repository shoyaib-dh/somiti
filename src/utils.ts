import { Member, Payment, LedgerEntry, DueMonthItem, OrgSettings } from './types';

export const BANGLA_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const BANGLA_DIGITS: { [key: string]: string } = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯'
};

export function toBn(num: number | string | undefined | null): string {
  if (num === undefined || num === null || num === '') return '০';
  const str = String(num);
  return str.replace(/[0-9]/g, (d) => BANGLA_DIGITS[d] || d);
}

export function money(amount: number | string | undefined | null): string {
  const n = Number(amount || 0);
  const formatted = n.toLocaleString('en-IN');
  return toBn(formatted);
}

export function formatBnDate(dateInput?: string | Date | null): string {
  if (!dateInput) return '—';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  
  const day = toBn(d.getDate());
  const month = BANGLA_MONTHS[d.getMonth()];
  const year = toBn(d.getFullYear());
  return `${day} ${month}, ${year}`;
}

export function formatMonthBn(yyyyMm?: string): string {
  if (!yyyyMm || !yyyyMm.includes('-')) return '';
  const [y, m] = yyyyMm.split('-');
  const monthIndex = parseInt(m, 10) - 1;
  const monthName = BANGLA_MONTHS[monthIndex] || m;
  return `${monthName} ${toBn(y)}`;
}

export function formatMobile(mobile?: string): string {
  let digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('880')) digits = digits.substring(3);
  if (!digits.startsWith('0')) digits = '0' + digits;
  return digits;
}

export function toWhatsAppNumber(mobile?: string): string | null {
  const digits = String(mobile || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return '88' + digits;
  return '880' + digits;
}

export function makeWhatsAppLink(mobile: string, name: string, dueTotal: number, orgName: string): string | null {
  const num = toWhatsAppNumber(mobile);
  if (!num) return null;
  const msg = `সম্মানিত ${name}, আসসালামু আলাইকুম। ${orgName}-এ আপনার কিস্তি ও জরিমানাসহ মোট ৳${money(dueTotal)} বকেয়া রয়েছে। অনুগ্রহপূর্বক নির্ধারিত সময়ের মধ্যে পরিশোধ করার অনুরোধ করা হচ্ছে। ধন্যবাদ।`;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
}

export function paymentMonthKey(p: Payment): string {
  if (p.Month && /^\d{4}-\d{2}/.test(String(p.Month))) {
    return String(p.Month).substring(0, 7);
  }
  const d = new Date(p.Date);
  if (isNaN(d.getTime())) return '';
  const mo = d.getMonth() + 1;
  return `${d.getFullYear()}-${mo < 10 ? '0' + mo : mo}`;
}

export function generateLedger(m: Member, payments: Payment[]): LedgerEntry[] {
  const startYear = 2026;
  const startMonth = 1;
  const now = new Date();
  const currYear = now.getFullYear();
  const currMonth = now.getMonth() + 1;
  const today = now.getDate();
  const dueDay = Number(m.DueDay || 12);
  const installment = Number(m.InstallmentAmount || 1000);
  const fineRate = Number(m.FineAmount || 300);

  const payMap: {
    [ym: string]: {
      paid: number;
      finePaid: number;
      dates: string[];
      notes: string[];
      raw: Payment[];
    };
  } = {};

  (payments || []).forEach((p) => {
    const ym = paymentMonthKey(p);
    if (!payMap[ym]) {
      payMap[ym] = { paid: 0, finePaid: 0, dates: [], notes: [], raw: [] };
    }
    payMap[ym].paid += Number(p.Amount || 0);
    payMap[ym].finePaid += Number(p.Fine || 0);
    if (p.Date) payMap[ym].dates.push(p.Date);
    if (p.Note) payMap[ym].notes.push(p.Note);
    payMap[ym].raw.push(p);
  });

  const allYm = new Set(Object.keys(payMap));
  let iterY = startYear;
  let iterM = startMonth;
  let guard = 600;

  while (guard-- > 0) {
    const ym = `${iterY}-${iterM < 10 ? '0' + iterM : iterM}`;
    allYm.add(ym);
    if (iterY === currYear && iterM === currMonth) break;
    iterM++;
    if (iterM > 12) {
      iterM = 1;
      iterY++;
    }
  }

  const sortedYm = Array.from(allYm).sort();
  const ledger: LedgerEntry[] = [];

  sortedYm.forEach((ym) => {
    const [yStr, mStr] = ym.split('-');
    const y = parseInt(yStr, 10);
    const mth = parseInt(mStr, 10);
    const mName = `${BANGLA_MONTHS[mth - 1]} ${toBn(y)}`;

    // Special concession for starting month 2026-01 as in original app
    const expectedAmt = ym === '2026-01' ? 500 : installment;
    const isPastDue =
      y < currYear ||
      (y === currYear && mth < currMonth) ||
      (y === currYear && mth === currMonth && today > dueDay);

    const pData = payMap[ym] || { paid: 0, finePaid: 0, dates: [], notes: [], raw: [] };
    let dueAmt = expectedAmt - pData.paid;
    if (dueAmt < 0) dueAmt = 0;

    let dueFine = dueAmt > 0 && isPastDue ? fineRate - pData.finePaid : 0;
    if (dueFine < 0) dueFine = 0;

    ledger.push({
      ym,
      monthName: mName,
      expected: expectedAmt,
      paid: pData.paid,
      finePaid: pData.finePaid,
      dueAmt,
      dueFine,
      isPastDue,
      dates: pData.dates,
      notes: pData.notes,
      raw: pData.raw
    });
  });

  return ledger;
}

export function calculateMemberFinancials(members: Member[]): {
  processedMembers: Member[];
  dueMembers: Member[];
  totalCollected: number;
  totalFineCollected: number;
  duesAmount: number;
  duesFine: number;
} {
  let totalCollected = 0;
  let totalFineCollected = 0;
  let duesAmount = 0;
  let duesFine = 0;
  const dueMembers: Member[] = [];

  const processedMembers = members.map((m) => {
    const ledger = generateLedger(m, m.payments || []);
    let mPaid = 0;
    let mFine = 0;
    let mDueAmt = 0;
    let mDueFine = 0;
    const missingMonths: DueMonthItem[] = [];

    ledger.forEach((entry) => {
      mPaid += entry.paid;
      mFine += entry.finePaid;
      if (entry.dueAmt > 0 || entry.dueFine > 0) {
        missingMonths.push({
          ym: entry.ym,
          monthName: entry.monthName,
          dueAmt: entry.dueAmt,
          dueFine: entry.dueFine
        });
        mDueAmt += entry.dueAmt;
        mDueFine += entry.dueFine;
      }
    });

    const enriched: Member = {
      ...m,
      totalPaid: mPaid,
      totalFine: mFine,
      dueAmount: mDueAmt,
      dueFineAmount: mDueFine,
      missingMonths
    };

    totalCollected += mPaid;
    totalFineCollected += mFine;

    if (mDueAmt > 0 || mDueFine > 0) {
      duesAmount += mDueAmt;
      duesFine += mDueFine;
      dueMembers.push(enriched);
    }

    return enriched;
  });

  return {
    processedMembers,
    dueMembers,
    totalCollected,
    totalFineCollected,
    duesAmount,
    duesFine
  };
}

export const DEFAULT_ORG_SETTINGS: OrgSettings = {
  orgName: 'সপ্তদশ সহযাত্রা',
  orgSub: 'সঞ্চয় ও ঋণদান সমবায় সমিতি',
  phone: '01712-345678',
  email: 'info@shoptodash.org',
  address: 'বাগমারা, রাজশাহী, বাংলাদেশ',
  cardTheme: 'teal',
  defaultInstallment: 1000,
  defaultDueDay: 12,
  defaultFine: 300,
  registrationNo: 'রেজিঃ নং: ১৭/২০২৬'
};

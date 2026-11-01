export interface Member {
  ID: string;
  Name: string;
  MemberNo: string;
  Mobile: string;
  InstallmentAmount: number;
  DueDay: number;
  FineAmount: number;
  Photo?: string;
  BloodGroup?: string;
  JoinDate?: string;
  payments?: Payment[];
  totalPaid?: number;
  totalFine?: number;
  dueAmount?: number;
  dueFineAmount?: number;
  missingMonths?: DueMonthItem[];
}

export interface DueMonthItem {
  ym: string;
  monthName: string;
  dueAmt: number;
  dueFine: number;
}

export interface Payment {
  ID: string;
  MemberID: string;
  Month?: string;
  Amount: number;
  Date: string;
  Fine: number;
  Note?: string;
}

export interface UserAccount {
  Username: string;
  Name: string;
  Role: 'Admin' | 'Operator';
  Password?: string;
}

export interface OrgSettings {
  orgName: string;
  orgSub: string;
  phone: string;
  email: string;
  address: string;
  cardTheme: 'teal' | 'navy' | 'emerald' | 'indigo' | 'gold';
  defaultInstallment: number;
  defaultDueDay: number;
  defaultFine: number;
  logoUrl?: string;
  registrationNo?: string;
}

export interface DashboardStats {
  totalMembers: number;
  totalCollected: number;
  totalFineCollected: number;
  duesAmount: number;
  duesFine: number;
  duesCount: number;
}

export interface LedgerEntry {
  ym: string;
  monthName: string;
  expected: number;
  paid: number;
  finePaid: number;
  dueAmt: number;
  dueFine: number;
  isPastDue: boolean;
  dates: string[];
  notes: string[];
  raw: Payment[];
}

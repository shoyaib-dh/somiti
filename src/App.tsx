import React, { useState, useEffect, useMemo } from 'react';
import {
  Member,
  Payment,
  UserAccount,
  OrgSettings,
  DashboardStats
} from './types';
import {
  db,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  deleteDoc,
  ensureAuth
} from './firebase';
import {
  money,
  toBn,
  formatBnDate,
  formatMobile,
  toWhatsAppNumber,
  makeWhatsAppLink,
  calculateMemberFinancials,
  DEFAULT_ORG_SETTINGS
} from './utils';
import { exportAllMembersMasterPdf } from './services/pdfService';
import { LoginScreen } from './components/LoginScreen';
import { VerticalIdCard, FALLBACK_AVATAR } from './components/VerticalIdCard';
import { IdCardPreviewModal } from './components/IdCardPreviewModal';
import { MemberFormModal } from './components/MemberFormModal';
import { PaymentModal } from './components/PaymentModal';
import { StatementModal } from './components/StatementModal';
import { EditPaymentModal } from './components/EditPaymentModal';
import { UserModal } from './components/UserModal';
import { AdminSettingsModal } from './components/AdminSettingsModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { DueMonthsListModal } from './components/DueMonthsListModal';
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  UserCog,
  Settings,
  LogOut,
  Plus,
  Search,
  Download,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  MessageCircle,
  Menu,
  X,
  Loader2,
  Trash2,
  Edit2,
  Calendar,
  Building2,
  CheckCircle2,
  ExternalLink,
  Phone
} from 'lucide-react';

export default function App() {
  // Authentication & Settings
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = sessionStorage.getItem('ssa_user_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [settings, setSettings] = useState<OrgSettings>(() => {
    const saved = localStorage.getItem('ssa_org_settings');
    return saved ? JSON.parse(saved) : DEFAULT_ORG_SETTINGS;
  });

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'members' | 'dues' | 'users'>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Modals state
  const [idCardMember, setIdCardMember] = useState<Member | null>(null);
  const [formMember, setFormMember] = useState<Member | null>(null);
  const [isMemberFormOpen, setIsMemberFormOpen] = useState(false);
  const [payMember, setPayMember] = useState<Member | null>(null);
  const [isPayOpen, setIsPayOpen] = useState(false);
  const [statementMember, setStatementMember] = useState<Member | null>(null);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [isEditPaymentOpen, setIsEditPaymentOpen] = useState(false);
  const [userModalData, setUserModalData] = useState<UserAccount | null>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
  const [dueListMember, setDueListMember] = useState<Member | null>(null);
  const [isDueListOpen, setIsDueListOpen] = useState(false);
  const [exportingAllPdf, setExportingAllPdf] = useState(false);

  const isAdmin = currentUser?.Role === 'Admin';

  // Load Settings from Firestore
  useEffect(() => {
    async function loadSettings() {
      try {
        await ensureAuth();
        const settingsDoc = await getDoc(doc(db, 'settings', 'org_settings'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data() as OrgSettings;
          setSettings(data);
          localStorage.setItem('ssa_org_settings', JSON.stringify(data));
        }
      } catch (err) {
        console.warn('Settings load note:', err);
      }
    }
    loadSettings();
  }, []);

  // Fetch all members, payments, and users from Firestore
  const loadAllData = async () => {
    setLoading(true);
    try {
      await ensureAuth();

      // 1. Fetch Members
      const membersSnap = await getDocs(collection(db, 'members'));
      const rawMembers: Member[] = [];
      membersSnap.forEach((d) => {
        const data = d.data();
        rawMembers.push({
          ID: d.id,
          Name: data.name || '',
          MemberNo: data.member_no || '',
          Mobile: data.mobile || '',
          InstallmentAmount: Number(data.installment_amount || settings.defaultInstallment || 1000),
          DueDay: Number(data.due_day || settings.defaultDueDay || 12),
          FineAmount: Number(data.fine_amount || settings.defaultFine || 300),
          Photo: data.photo || '',
          BloodGroup: data.blood_group || '',
          JoinDate: data.join_date || ''
        });
      });

      // Sort by member number (e.g., SH-01, SH-02)
      rawMembers.sort((a, b) => {
        const numA = parseInt(String(a.MemberNo).replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(String(b.MemberNo).replace(/\D/g, ''), 10) || 0;
        return numA - numB;
      });

      // 2. Fetch Payments for all members
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      const paymentsByMember: { [mId: string]: Payment[] } = {};

      paymentsSnap.forEach((d) => {
        const data = d.data();
        const mId = String(data.member_id || '');
        if (!paymentsByMember[mId]) paymentsByMember[mId] = [];
        paymentsByMember[mId].push({
          ID: d.id,
          MemberID: mId,
          Month: data.month || '',
          Amount: Number(data.amount || 0),
          Date: data.date || '',
          Fine: Number(data.fine || 0),
          Note: data.note || ''
        });
      });

      // Sort payments descending by date
      Object.keys(paymentsByMember).forEach((mId) => {
        paymentsByMember[mId].sort(
          (a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime()
        );
      });

      // Attach payments to members
      const membersWithPayments = rawMembers.map((m) => ({
        ...m,
        payments: paymentsByMember[m.ID] || []
      }));

      // Calculate lifetime financials & dues
      const { processedMembers } = calculateMemberFinancials(membersWithPayments);
      setMembers(processedMembers);

      // 3. Fetch Users
      const usersSnap = await getDocs(collection(db, 'users'));
      const rawUsers: UserAccount[] = [];
      usersSnap.forEach((d) => {
        const data = d.data();
        rawUsers.push({
          Username: d.id,
          Name: data.name || d.id,
          Role: (data.role as 'Admin' | 'Operator') || 'Operator'
        });
      });
      setUsers(rawUsers);
    } catch (err) {
      console.error('Failed to load data from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadAllData();
    }
  }, [currentUser]);

  // Financial calculations
  const stats: DashboardStats = useMemo(() => {
    const totalMembers = members.length;
    let totalCollected = 0;
    let totalFineCollected = 0;
    let duesAmount = 0;
    let duesFine = 0;
    let duesCount = 0;

    members.forEach((m) => {
      totalCollected += m.totalPaid || 0;
      totalFineCollected += m.totalFine || 0;
      if ((m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0) {
        duesAmount += m.dueAmount || 0;
        duesFine += m.dueFineAmount || 0;
        duesCount++;
      }
    });

    return {
      totalMembers,
      totalCollected,
      totalFineCollected,
      duesAmount,
      duesFine,
      duesCount
    };
  }, [members]);

  // Due members list
  const dueMembers = useMemo(() => {
    return members.filter((m) => (m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0);
  }, [members]);

  // Filtered members by search
  const filteredMembers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.Name.toLowerCase().includes(q) ||
        m.MemberNo.toLowerCase().includes(q) ||
        m.Mobile.includes(q)
    );
  }, [members, searchQuery]);

  // Auth actions
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    sessionStorage.setItem('ssa_user_session', JSON.stringify(user));
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ssa_user_session');
    setCurrentUser(null);
  };

  // Settings Save
  const handleSaveSettings = async (newSettings: OrgSettings) => {
    await setDoc(doc(db, 'settings', 'org_settings'), newSettings, { merge: true });
    setSettings(newSettings);
    localStorage.setItem('ssa_org_settings', JSON.stringify(newSettings));
  };

  // CRITICAL FIX: Member CRUD with rock-solid ID preservation so edit never duplicates
  const handleSaveMember = async (memberData: Partial<Member>) => {
    if (memberData.ID) {
      // Update existing member record
      const mRef = doc(db, 'members', memberData.ID);
      const updatePayload: any = {
        name: memberData.Name,
        member_no: memberData.MemberNo,
        mobile: memberData.Mobile,
        installment_amount: memberData.InstallmentAmount,
        due_day: memberData.DueDay,
        fine_amount: memberData.FineAmount,
        blood_group: memberData.BloodGroup,
        join_date: memberData.JoinDate
      };
      if (memberData.Photo !== undefined) {
        updatePayload.photo = memberData.Photo;
      }
      await setDoc(mRef, updatePayload, { merge: true });
    } else {
      // Create new member record
      await addDoc(collection(db, 'members'), {
        name: memberData.Name,
        member_no: memberData.MemberNo,
        mobile: memberData.Mobile,
        installment_amount: memberData.InstallmentAmount,
        due_day: memberData.DueDay,
        fine_amount: memberData.FineAmount,
        photo: memberData.Photo || '',
        blood_group: memberData.BloodGroup || '',
        join_date: memberData.JoinDate || new Date().toISOString()
      });
    }
    await loadAllData();
  };

  const handleDeleteMember = async (member: Member) => {
    if (!window.confirm(`Are you sure you want to delete "${member.Name}" (${member.MemberNo})?`)) return;
    try {
      await deleteDoc(doc(db, 'members', member.ID));
      await loadAllData();
    } catch (err: any) {
      alert('Failed to delete member: ' + (err?.message || err));
    }
  };

  // Payment CRUD
  const handleSavePayment = async (p: {
    MemberID: string;
    Month: string;
    Amount: number;
    Fine: number;
    Date: string;
    Note: string;
  }) => {
    await addDoc(collection(db, 'payments'), {
      member_id: p.MemberID,
      month: p.Month,
      amount: p.Amount,
      fine: p.Fine,
      date: p.Date,
      note: p.Note
    });
    await loadAllData();
  };

  const handleUpdatePayment = async (updatedPayment: Payment) => {
    const pRef = doc(db, 'payments', updatedPayment.ID);
    await setDoc(
      pRef,
      {
        month: updatedPayment.Month,
        amount: updatedPayment.Amount,
        fine: updatedPayment.Fine,
        date: updatedPayment.Date,
        note: updatedPayment.Note
      },
      { merge: true }
    );
    await loadAllData();
  };

  const handleDeletePayment = async (paymentId: string) => {
    await deleteDoc(doc(db, 'payments', paymentId));
    await loadAllData();
  };

  // User CRUD
  const handleSaveUser = async (user: UserAccount) => {
    const uRef = doc(db, 'users', user.Username);
    const data: any = {
      name: user.Name,
      role: user.Role
    };
    if (user.Password) {
      data.password = user.Password;
    }
    await setDoc(uRef, data, { merge: true });
    await loadAllData();
  };

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"?`)) return;
    await deleteDoc(doc(db, 'users', username));
    await loadAllData();
  };

  // Bulk Export All Members Data PDF
  const handleExportAllMembersPdf = async () => {
    if (members.length === 0) {
      alert('No members available to export');
      return;
    }
    setExportingAllPdf(true);
    try {
      await exportAllMembersMasterPdf(members, settings);
    } catch (err: any) {
      alert('PDF Export failed: ' + (err?.message || err));
    } finally {
      setExportingAllPdf(false);
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen settings={settings} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800 antialiased">
      {/* ── DESKTOP SIDEBAR ── */}
      <aside className="hidden w-64 flex-col bg-gradient-to-b from-teal-900 via-teal-950 to-slate-950 text-white md:flex flex-shrink-0 shadow-2xl z-20">
        {/* Org Branding Header */}
        <div className="p-5 border-b border-teal-800/60">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="h-10 w-10 rounded-xl object-cover border border-teal-400 p-0.5"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md">
                <Building2 className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold text-white uppercase">{settings.orgName}</h1>
              <p className="truncate text-[10px] font-medium text-teal-300 uppercase tracking-wider">
                {settings.orgSub}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'dashboard'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 text-teal-300" />
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'members'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-teal-300" />
              Members Directory
            </div>
            <span className="rounded-full bg-teal-800/80 px-2 py-0.5 text-[11px] font-mono font-bold text-teal-200">
              {members.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition ${
              activeTab === 'dues'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Overdue Accounts
            </div>
            {dueMembers.length > 0 && (
              <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[11px] font-mono font-bold text-white">
                {dueMembers.length}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider transition ${
                activeTab === 'users'
                  ? 'bg-teal-700/80 text-white shadow-md'
                  : 'text-teal-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserCog className="h-4 w-4 text-teal-300" />
              User Management
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-xs font-bold uppercase tracking-wider text-teal-200 hover:bg-white/10 hover:text-white transition"
            >
              <Settings className="h-4 w-4 text-teal-300" />
              System Settings
            </button>
          )}
        </nav>

        {/* Current User Info & Logout */}
        <div className="p-4 border-t border-teal-800/60 bg-teal-950/60">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-bold text-white uppercase text-xs">
              {currentUser.Name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{currentUser.Name}</div>
              <div className="truncate text-[10px] text-teal-300 font-medium">
                {isAdmin ? 'System Administrator' : 'Operator (Read-Only)'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-950/40 border border-rose-800/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 hover:text-white transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT WRAPPER ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar for Mobile and Desktop Actions */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 md:px-8">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <div>
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight">
                {activeTab === 'dashboard' && 'Dashboard Overview'}
                {activeTab === 'members' && 'Members Directory & Identity Cards'}
                {activeTab === 'dues' && 'Overdue Installments & Late Fines'}
                {activeTab === 'users' && 'User Accounts & Roles'}
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block font-medium">
                {formatBnDate(new Date().toISOString())} • {settings.orgName}
              </p>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center gap-2">
            {/* Master Export All PDF Button */}
            <button
              onClick={handleExportAllMembersPdf}
              disabled={exportingAllPdf}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition border border-slate-200 disabled:opacity-50 cursor-pointer"
              title="Download master PDF directory of all members"
            >
              {exportingAllPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              ) : (
                <Download className="h-4 w-4 text-teal-600" />
              )}
              <span className="hidden sm:inline">Export All (PDF)</span>
            </button>

            {/* Monthly Report PDF */}
            <button
              onClick={() => setIsMonthlyReportOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition border border-slate-200 cursor-pointer"
              title="Download monthly report"
            >
              <Calendar className="h-4 w-4 text-teal-600" />
              <span className="hidden sm:inline">Monthly Report</span>
            </button>

            {/* Add Member button (Admin only) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setFormMember(null);
                  setIsMemberFormOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>New Member</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex flex-col bg-teal-950 p-6 text-white md:hidden">
            <div className="flex items-center justify-between border-b border-teal-800 pb-4">
              <span className="text-base font-bold uppercase">{settings.orgName}</span>
              <button onClick={() => setMobileMenuOpen(false)}>
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="mt-6 flex-1 space-y-3">
              <button
                onClick={() => {
                  setActiveTab('dashboard');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold uppercase ${
                  activeTab === 'dashboard' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </button>

              <button
                onClick={() => {
                  setActiveTab('members');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-sm font-semibold uppercase ${
                  activeTab === 'members' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  Members Directory
                </div>
                <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-xs font-mono">
                  {members.length}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dues');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-sm font-semibold uppercase ${
                  activeTab === 'dues' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  Overdue Accounts
                </div>
                {dueMembers.length > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold">
                    {dueMembers.length}
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold uppercase ${
                    activeTab === 'users' ? 'bg-teal-700 text-white' : 'text-teal-200'
                  }`}
                >
                  <UserCog className="h-5 w-5" />
                  User Management
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-sm font-semibold uppercase text-teal-200"
                >
                  <Settings className="h-5 w-5" />
                  System Settings
                </button>
              )}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-rose-900/60 py-3 text-sm font-bold text-white cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-xs font-semibold">Loading data, please wait...</p>
            </div>
          ) : (
            <>
              {/* ── 1. DASHBOARD TAB ── */}
              {activeTab === 'dashboard' && (
                <div className="space-y-6">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Stat 1: Total Members */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Members</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-slate-900">
                        {stats.totalMembers} <span className="text-xs font-semibold text-slate-500">Active</span>
                      </div>
                      <div className="mt-1 text-[11px] text-teal-600 font-semibold">Registered Co-op Members</div>
                    </div>

                    {/* Stat 2: Total Savings Collected */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Savings Collected</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-emerald-700">
                        ৳ {money(stats.totalCollected)}
                      </div>
                      <div className="mt-1 text-[11px] text-emerald-600 font-semibold">Lifetime Cumulative Deposits</div>
                    </div>

                    {/* Stat 3: Total Fine Collected */}
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Late Fines</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <Receipt className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-amber-700">
                        ৳ {money(stats.totalFineCollected)}
                      </div>
                      <div className="mt-1 text-[11px] text-amber-600 font-semibold">Collected Delay Penalties</div>
                    </div>

                    {/* Stat 4: Total Overdue */}
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 shadow-xs hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Total Overdue (with Fine)</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-rose-700">
                        ৳ {money(stats.duesAmount + stats.duesFine)}
                      </div>
                      <div className="mt-1 text-[11px] text-rose-600 font-semibold">
                        {stats.duesCount} Overdue Member Accounts
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-800 to-teal-950 p-6 text-white shadow-xl">
                    <div>
                      <h3 className="text-base font-bold uppercase tracking-tight">Export Full Reports & Member Badges</h3>
                      <p className="mt-1 text-xs text-teal-200">
                        Download comprehensive printable PDF directories or monthly financial summaries in one click
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleExportAllMembersPdf}
                        disabled={exportingAllPdf}
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-teal-900 shadow-md hover:bg-teal-50 transition cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-teal-700" />
                        All Members Directory (PDF)
                      </button>
                      <button
                        onClick={() => setIsMonthlyReportOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-teal-700/80 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition border border-teal-600 cursor-pointer"
                      >
                        <Calendar className="h-4 w-4" />
                        Monthly Report (PDF)
                      </button>
                    </div>
                  </div>

                  {/* Overdue Members Preview Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Installments Preview</h3>
                        <p className="text-xs text-slate-500">Members with unpaid monthly installments</p>
                      </div>
                      {dueMembers.length > 0 && (
                        <button
                          onClick={() => setActiveTab('dues')}
                          className="text-xs font-bold text-teal-700 hover:underline uppercase"
                        >
                          View Full List →
                        </button>
                      )}
                    </div>

                    {dueMembers.length === 0 ? (
                      <div className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                        <p className="mt-2 text-sm font-semibold text-slate-700">Excellent! All accounts up to date</p>
                        <p className="text-xs text-slate-400">All members have paid their monthly installments</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">Member ID</th>
                              <th className="p-3">Full Name</th>
                              <th className="p-3">Mobile (WhatsApp)</th>
                              <th className="p-3">Due Installment</th>
                              <th className="p-3">Due Fine</th>
                              <th className="p-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {dueMembers.slice(0, 6).map((m) => {
                              const totalMemberDue = (m.dueAmount || 0) + (m.dueFineAmount || 0);
                              const waLink = makeWhatsAppLink(m.Mobile, m.Name, totalMemberDue, settings.orgName);
                              return (
                                <tr key={m.ID} className="hover:bg-slate-50/60">
                                  <td className="p-3 font-mono font-bold text-teal-700">{m.MemberNo}</td>
                                  <td className="p-3 font-bold text-slate-900">{m.Name}</td>
                                  <td className="p-3">
                                    {waLink ? (
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 font-mono text-emerald-700 hover:underline font-semibold"
                                        title="Click to message on WhatsApp"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                        {formatMobile(m.Mobile)}
                                      </a>
                                    ) : (
                                      <span className="font-mono text-slate-500">{formatMobile(m.Mobile) || '—'}</span>
                                    )}
                                  </td>
                                  <td className="p-3 font-bold text-rose-600">৳ {money(m.dueAmount)}</td>
                                  <td className="p-3 font-bold text-amber-600">৳ {money(m.dueFineAmount)}</td>
                                  <td className="p-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={() => {
                                          setDueListMember(m);
                                          setIsDueListOpen(true);
                                        }}
                                        className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer"
                                      >
                                        Months Due
                                      </button>
                                      {isAdmin && (
                                        <button
                                          onClick={() => {
                                            setPayMember(m);
                                            setIsPayOpen(true);
                                          }}
                                          className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 shadow-xs cursor-pointer"
                                        >
                                          Pay
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── 2. MEMBERS TAB ── */}
              {activeTab === 'members' && (
                <div className="space-y-6">
                  {/* Search and Action Bar */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search by name, member ID, or phone number..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportAllMembersPdf}
                        disabled={exportingAllPdf}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 transition cursor-pointer"
                      >
                        <Download className="h-4 w-4 text-teal-600" />
                        Directory PDF
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setFormMember(null);
                            setIsMemberFormOpen(true);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          New Member
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-center">#</th>
                            <th className="p-3.5 text-center">Photo</th>
                            <th className="p-3.5">Member ID</th>
                            <th className="p-3.5">Full Name</th>
                            <th className="p-3.5">Mobile Phone</th>
                            <th className="p-3.5">Monthly Rate</th>
                            <th className="p-3.5">Total Savings</th>
                            <th className="p-3.5">Status</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredMembers.map((m, idx) => {
                            const hasDues = (m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0;
                            const totalMemberDue = (m.dueAmount || 0) + (m.dueFineAmount || 0);
                            const waLink = makeWhatsAppLink(m.Mobile, m.Name, totalMemberDue, settings.orgName);

                            return (
                              <tr key={m.ID} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5 text-center font-mono text-slate-500">{idx + 1}</td>
                                <td className="p-3.5 text-center">
                                  <img
                                    src={m.Photo || FALLBACK_AVATAR}
                                    alt={m.Name}
                                    className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-xs inline-block"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = FALLBACK_AVATAR;
                                    }}
                                  />
                                </td>
                                <td className="p-3.5 font-mono font-bold text-teal-700">{m.MemberNo}</td>
                                <td className="p-3.5 font-bold text-slate-900">
                                  <button
                                    onClick={() => setIdCardMember(m)}
                                    className="hover:text-teal-700 hover:underline text-left cursor-pointer"
                                  >
                                    {m.Name}
                                  </button>
                                  {m.BloodGroup && (
                                    <span className="ml-2 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 border border-rose-200">
                                      {m.BloodGroup}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5">
                                  {waLink ? (
                                    <a
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 font-mono text-emerald-700 hover:underline font-semibold"
                                      title="Click to message on WhatsApp"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                      {formatMobile(m.Mobile)}
                                    </a>
                                  ) : (
                                    <span className="font-mono text-slate-500">{formatMobile(m.Mobile) || '—'}</span>
                                  )}
                                </td>
                                <td className="p-3.5 font-semibold text-slate-700">৳ {money(m.InstallmentAmount)}</td>
                                <td className="p-3.5 font-bold text-emerald-700">৳ {money(m.totalPaid || 0)}</td>
                                <td className="p-3.5">
                                  {hasDues ? (
                                    <button
                                      onClick={() => {
                                        setDueListMember(m);
                                        setIsDueListOpen(true);
                                      }}
                                      className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px] cursor-pointer"
                                    >
                                      Due ৳{money((m.dueAmount || 0) + (m.dueFineAmount || 0))}
                                    </button>
                                  ) : (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200 text-[11px]">
                                      Regular
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Vertical ID Card Preview & Download */}
                                    <button
                                      onClick={() => setIdCardMember(m)}
                                      className="flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition cursor-pointer"
                                      title="Preview & download portrait ID card"
                                    >
                                      <CreditCard className="h-3.5 w-3.5" />
                                      ID Card
                                    </button>

                                    {/* Statement Modal */}
                                    <button
                                      onClick={() => {
                                        setStatementMember(m);
                                        setIsStatementOpen(true);
                                      }}
                                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                                      title="View account ledger statement"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Statement
                                    </button>

                                    {/* Pay Installment (Admin only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setPayMember(m);
                                          setIsPayOpen(true);
                                        }}
                                        className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition cursor-pointer"
                                      >
                                        Pay
                                      </button>
                                    )}

                                    {/* Edit Member (Admin only) - FIXED TO PRESERVE ID */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setFormMember(m);
                                          setIsMemberFormOpen(true);
                                        }}
                                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                        title="Edit Member Information"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Delete Member (Admin only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteMember(m)}
                                        className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                        title="Delete Member"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 3. DUES TAB ── */}
              {activeTab === 'dues' && (
                <div className="space-y-6">
                  {/* Summary Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-rose-50 border border-rose-200 p-5">
                    <div>
                      <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">
                        Overdue Accounts Roster — {dueMembers.length} Members
                      </h3>
                      <p className="mt-1 text-xs text-rose-700">
                        Pending Installments: ৳{money(stats.duesAmount)} | Accrued Fines: ৳{money(stats.duesFine)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-[11px] text-rose-600 font-semibold uppercase">Grand Total Uncollected</div>
                      <div className="text-2xl font-black text-rose-700">
                        ৳ {money(stats.duesAmount + stats.duesFine)}
                      </div>
                    </div>
                  </div>

                  {/* Due Members Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-center">#</th>
                            <th className="p-3.5">Member ID</th>
                            <th className="p-3.5">Full Name</th>
                            <th className="p-3.5">Mobile (Click for WhatsApp)</th>
                            <th className="p-3.5">Pending Installment</th>
                            <th className="p-3.5">Late Fine</th>
                            <th className="p-3.5">Total Overdue</th>
                            <th className="p-3.5 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {dueMembers.map((m, idx) => {
                            const totalMemberDue = (m.dueAmount || 0) + (m.dueFineAmount || 0);
                            const waLink = makeWhatsAppLink(
                              m.Mobile,
                              m.Name,
                              totalMemberDue,
                              settings.orgName
                            );

                            return (
                              <tr key={m.ID} className="hover:bg-rose-50/30">
                                <td className="p-3.5 text-center font-mono">{idx + 1}</td>
                                <td className="p-3.5 font-mono font-bold text-teal-700">{m.MemberNo}</td>
                                <td className="p-3.5 font-bold text-slate-900">{m.Name}</td>
                                <td className="p-3.5">
                                  {waLink ? (
                                    <a
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 font-mono text-emerald-700 hover:underline font-semibold"
                                      title="Open WhatsApp chat with reminder"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
                                      {formatMobile(m.Mobile)}
                                    </a>
                                  ) : (
                                    <span className="font-mono text-slate-500">{formatMobile(m.Mobile) || '—'}</span>
                                  )}
                                </td>
                                <td className="p-3.5 font-bold text-rose-600">৳ {money(m.dueAmount)}</td>
                                <td className="p-3.5 font-bold text-amber-600">৳ {money(m.dueFineAmount)}</td>
                                <td className="p-3.5">
                                  <button
                                    onClick={() => {
                                      setDueListMember(m);
                                      setIsDueListOpen(true);
                                    }}
                                    className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-700 hover:bg-rose-200 transition cursor-pointer"
                                  >
                                    ৳ {money(totalMemberDue)}
                                  </button>
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* Direct WhatsApp Action Button */}
                                    {waLink && (
                                      <a
                                        href={waLink}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                                      >
                                        <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                                        WhatsApp
                                      </a>
                                    )}

                                    {/* Collect Installment */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setPayMember(m);
                                          setIsPayOpen(true);
                                        }}
                                        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700 shadow-xs cursor-pointer"
                                      >
                                        Pay
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 4. USERS TAB (Admin only) ── */}
              {activeTab === 'users' && isAdmin && (
                <div className="space-y-6 max-w-4xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">User Accounts & Roles</h3>
                      <p className="text-xs text-slate-500">
                        Administrators have full management rights; operators can view and export records.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUserModalData(null);
                        setIsUserModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add User
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Full Name</th>
                          <th className="p-3.5">Username</th>
                          <th className="p-3.5">Role</th>
                          <th className="p-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {users.map((u) => (
                          <tr key={u.Username} className="hover:bg-slate-50/70">
                            <td className="p-3.5 font-bold text-slate-900">{u.Name}</td>
                            <td className="p-3.5 font-mono text-teal-700 font-bold">{u.Username}</td>
                            <td className="p-3.5">
                              {u.Role === 'Admin' ? (
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10.5px] font-bold text-amber-700 border border-amber-200">
                                  System Admin
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10.5px] font-bold text-slate-600">
                                  Operator (Read-Only)
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setUserModalData(u);
                                    setIsUserModalOpen(true);
                                  }}
                                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.Username)}
                                  className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* ── ALL MODALS ── */}
      {/* 1. Vertical ID Card Preview & PDF/Image download modal */}
      <IdCardPreviewModal
        member={idCardMember}
        settings={settings}
        isOpen={!!idCardMember}
        onClose={() => setIdCardMember(null)}
      />

      {/* 2. Member Form Modal (Add / Edit) - FIXED: Preserves member ID on edit */}
      <MemberFormModal
        member={formMember}
        settings={settings}
        isOpen={isMemberFormOpen}
        onClose={() => setIsMemberFormOpen(false)}
        onSave={handleSaveMember}
      />

      {/* 3. Payment Modal */}
      <PaymentModal
        member={payMember}
        settings={settings}
        isOpen={isPayOpen}
        onClose={() => setIsPayOpen(false)}
        onSavePayment={handleSavePayment}
      />

      {/* 4. Statement Modal */}
      <StatementModal
        member={statementMember}
        settings={settings}
        isAdmin={isAdmin}
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
        onOpenPayForMonth={(m, ym) => {
          setIsStatementOpen(false);
          setPayMember(m);
          setIsPayOpen(true);
        }}
        onDeletePayment={handleDeletePayment}
        onEditPayment={(p) => {
          setEditingPayment(p);
          setIsEditPaymentOpen(true);
        }}
        onOpenIdCard={(m) => {
          setIsStatementOpen(false);
          setIdCardMember(m);
        }}
      />

      {/* 5. Edit Payment Modal */}
      <EditPaymentModal
        payment={editingPayment}
        isOpen={isEditPaymentOpen}
        onClose={() => setIsEditPaymentOpen(false)}
        onUpdate={handleUpdatePayment}
      />

      {/* 6. Admin System Settings & Customization Modal */}
      <AdminSettingsModal
        settings={settings}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={handleSaveSettings}
      />

      {/* 7. User Management Modal */}
      <UserModal
        user={userModalData}
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onSave={handleSaveUser}
      />

      {/* 8. Monthly Report Modal */}
      <MonthlyReportModal
        members={members}
        settings={settings}
        isOpen={isMonthlyReportOpen}
        onClose={() => setIsMonthlyReportOpen(false)}
      />

      {/* 9. Due Months List Modal */}
      <DueMonthsListModal
        member={dueListMember}
        isOpen={isDueListOpen}
        onClose={() => setIsDueListOpen(false)}
        onPayMonth={(m, ym) => {
          setIsDueListOpen(false);
          setPayMember(m);
          setIsPayOpen(true);
        }}
      />
    </div>
  );
}

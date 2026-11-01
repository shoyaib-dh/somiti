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
  query,
  where,
  ensureAuth
} from './firebase';
import {
  money,
  toBn,
  formatBnDate,
  formatMobile,
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
  DollarSign,
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
  CheckCircle2
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
        console.warn('Settings load notice:', err);
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

  // Member CRUD
  const handleSaveMember = async (memberData: Partial<Member>) => {
    if (memberData.ID) {
      // Update existing
      const mRef = doc(db, 'members', memberData.ID);
      await setDoc(
        mRef,
        {
          name: memberData.Name,
          member_no: memberData.MemberNo,
          mobile: memberData.Mobile,
          installment_amount: memberData.InstallmentAmount,
          due_day: memberData.DueDay,
          fine_amount: memberData.FineAmount,
          photo: memberData.Photo,
          blood_group: memberData.BloodGroup,
          join_date: memberData.JoinDate
        },
        { merge: true }
      );
    } else {
      // Create new
      await addDoc(collection(db, 'members'), {
        name: memberData.Name,
        member_no: memberData.MemberNo,
        mobile: memberData.Mobile,
        installment_amount: memberData.InstallmentAmount,
        due_day: memberData.DueDay,
        fine_amount: memberData.FineAmount,
        photo: memberData.Photo,
        blood_group: memberData.BloodGroup,
        join_date: memberData.JoinDate || new Date().toISOString()
      });
    }
    await loadAllData();
  };

  const handleDeleteMember = async (member: Member) => {
    if (!window.confirm(`আপনি কি নিশ্চিত যে "${member.Name}" সদস্যকে মুছে ফেলতে চান?`)) return;
    try {
      await deleteDoc(doc(db, 'members', member.ID));
      await loadAllData();
    } catch (err: any) {
      alert('সদস্য মোছা যায়নি: ' + (err?.message || err));
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
    if (!window.confirm(`আপনি কি "${username}" ইউজার ডিলিট করতে চান?`)) return;
    await deleteDoc(doc(db, 'users', username));
    await loadAllData();
  };

  // Bulk Export All Members Data PDF
  const handleExportAllMembersPdf = async () => {
    if (members.length === 0) {
      alert('এক্সপোর্ট করার জন্য কোনো সদস্য নেই');
      return;
    }
    setExportingAllPdf(true);
    try {
      await exportAllMembersMasterPdf(members, settings);
    } catch (err: any) {
      alert('পিডিএফ এক্সপোর্ট ব্যর্থ হয়েছে: ' + (err?.message || err));
    } finally {
      setExportingAllPdf(false);
    }
  };

  // If not logged in, show Login Screen
  if (!currentUser) {
    return <LoginScreen settings={settings} onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-800">
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
              <h1 className="truncate text-base font-bold text-white">{settings.orgName}</h1>
              <p className="truncate text-[10.5px] font-medium text-teal-300 uppercase tracking-wider">
                {settings.orgSub}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 p-4 overflow-y-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <LayoutDashboard className="h-4.5 w-4.5 text-teal-300" />
            ড্যাশবোর্ড
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              activeTab === 'members'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4.5 w-4.5 text-teal-300" />
              সদস্য তালিকা
            </div>
            <span className="rounded-full bg-teal-800/80 px-2 py-0.5 text-xs text-teal-200">
              {toBn(members.length)}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('dues')}
            className={`flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
              activeTab === 'dues'
                ? 'bg-teal-700/80 text-white shadow-md'
                : 'text-teal-200 hover:bg-white/10 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
              বকেয়া সদস্য
            </div>
            {dueMembers.length > 0 && (
              <span className="rounded-full bg-rose-500/80 px-2 py-0.5 text-xs font-bold text-white">
                {toBn(dueMembers.length)}
              </span>
            )}
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('users')}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                activeTab === 'users'
                  ? 'bg-teal-700/80 text-white shadow-md'
                  : 'text-teal-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <UserCog className="h-4.5 w-4.5 text-teal-300" />
              ইউজার ম্যানেজমেন্ট
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-teal-200 hover:bg-white/10 hover:text-white transition"
            >
              <Settings className="h-4.5 w-4.5 text-teal-300" />
              সিস্টেম কাস্টমাইজেশন
            </button>
          )}
        </nav>

        {/* Current User Info & Logout */}
        <div className="p-4 border-t border-teal-800/60 bg-teal-950/60">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 font-bold text-white uppercase">
              {currentUser.Name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-white">{currentUser.Name}</div>
              <div className="truncate text-[10px] text-teal-300">
                {isAdmin ? 'প্রধান প্রশাসক (Admin)' : 'মেম্বার (Read-Only)'}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-950/40 border border-rose-800/40 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-900/60 hover:text-white transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            লগআউট করুন
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
              <h2 className="text-lg font-bold text-slate-900">
                {activeTab === 'dashboard' && 'ড্যাশবোর্ড ওভারভিউ'}
                {activeTab === 'members' && 'সদস্য তালিকা ও পরিচয়পত্র'}
                {activeTab === 'dues' && 'বকেয়া কিস্তি ও জরিমানা'}
                {activeTab === 'users' && 'ইউজার অ্যাকাউন্ট ম্যানেজমেন্ট'}
              </h2>
              <p className="hidden text-xs text-slate-500 sm:block">
                {formatBnDate(new Date().toISOString())} • {settings.orgName}
              </p>
            </div>
          </div>

          {/* Quick Header Buttons */}
          <div className="flex items-center gap-2">
            {/* Master Export All PDF Button (Prompt fulfillment!) */}
            <button
              onClick={handleExportAllMembersPdf}
              disabled={exportingAllPdf}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition border border-slate-200 disabled:opacity-50"
              title="সকল সদস্যদের বিস্তারিত তালিকা পিডিএফ আকারে সেভ করুন"
            >
              {exportingAllPdf ? (
                <Loader2 className="h-4 w-4 animate-spin text-teal-600" />
              ) : (
                <Download className="h-4 w-4 text-teal-600" />
              )}
              <span className="hidden sm:inline">সকল সদস্যের ডেটা (PDF)</span>
            </button>

            {/* Monthly Report PDF */}
            <button
              onClick={() => setIsMonthlyReportOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition border border-slate-200"
              title="মাসিক প্রতিবেদন পিডিএফ ডাউনলোড করুন"
            >
              <Calendar className="h-4 w-4 text-teal-600" />
              <span className="hidden sm:inline">মাসিক রিপোর্ট</span>
            </button>

            {/* Add Member button (Admin only) */}
            {isAdmin && (
              <button
                onClick={() => {
                  setFormMember(null);
                  setIsMemberFormOpen(true);
                }}
                className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition"
              >
                <Plus className="h-4 w-4" />
                <span>নতুন সদস্য</span>
              </button>
            )}
          </div>
        </header>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-40 flex flex-col bg-teal-950 p-6 text-white md:hidden">
            <div className="flex items-center justify-between border-b border-teal-800 pb-4">
              <span className="text-lg font-bold">{settings.orgName}</span>
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
                className={`flex w-full items-center gap-3 rounded-xl p-3 text-base font-semibold ${
                  activeTab === 'dashboard' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                ড্যাশবোর্ড
              </button>

              <button
                onClick={() => {
                  setActiveTab('members');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-base font-semibold ${
                  activeTab === 'members' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5" />
                  সদস্য তালিকা
                </div>
                <span className="rounded-full bg-teal-800 px-2.5 py-0.5 text-xs">
                  {toBn(members.length)}
                </span>
              </button>

              <button
                onClick={() => {
                  setActiveTab('dues');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl p-3 text-base font-semibold ${
                  activeTab === 'dues' ? 'bg-teal-700 text-white' : 'text-teal-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  বকেয়া সদস্য
                </div>
                {dueMembers.length > 0 && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold">
                    {toBn(dueMembers.length)}
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  onClick={() => {
                    setActiveTab('users');
                    setMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-base font-semibold ${
                    activeTab === 'users' ? 'bg-teal-700 text-white' : 'text-teal-200'
                  }`}
                >
                  <UserCog className="h-5 w-5" />
                  ইউজার ম্যানেজমেন্ট
                </button>
              )}

              {isAdmin && (
                <button
                  onClick={() => {
                    setIsSettingsOpen(true);
                    setMobileMenuOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-3 text-base font-semibold text-teal-200"
                >
                  <Settings className="h-5 w-5" />
                  সিস্টেম কাস্টমাইজেশন
                </button>
              )}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl bg-rose-900/60 py-3 text-sm font-bold text-white"
            >
              <LogOut className="h-4 w-4" />
              লগআউট করুন
            </button>
          </div>
        )}

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {loading ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
              <p className="text-sm font-semibold">তথ্য সংগ্রহ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...</p>
            </div>
          ) : (
            <>
              {/* ── 1. DASHBOARD TAB ── */}
              {activeTab === 'dashboard' && (
                <div className="space-y-7">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Stat 1: Total Members */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">মোট সদস্য সংখ্যা</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-slate-900">
                        {toBn(stats.totalMembers)} <span className="text-sm font-semibold text-slate-500">জন</span>
                      </div>
                      <div className="mt-1 text-xs text-teal-600 font-medium">নিবন্ধিত ও সক্রিয় সদস্য</div>
                    </div>

                    {/* Stat 2: Total Savings Collected */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">মোট সঞ্চয় জমা</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                          <TrendingUp className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-emerald-700">
                        ৳{money(stats.totalCollected)}
                      </div>
                      <div className="mt-1 text-xs text-emerald-600 font-medium">আজীবন সফল আদায়কৃত সঞ্চয়</div>
                    </div>

                    {/* Stat 3: Total Fine Collected */}
                    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-500">মোট জরিমানা আদায়</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                          <Receipt className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-amber-700">
                        ৳{money(stats.totalFineCollected)}
                      </div>
                      <div className="mt-1 text-xs text-amber-600 font-medium">বিলম্ব ফি বাবদ সংগৃহীত</div>
                    </div>

                    {/* Stat 4: Total Dues */}
                    <div className="rounded-2xl border border-rose-200/90 bg-rose-50/40 p-5 shadow-sm hover:shadow-md transition">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-rose-700">মোট বকেয়া (জরিমানাসহ)</span>
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                          <AlertTriangle className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="mt-3 text-2xl font-black text-rose-700">
                        ৳{money(stats.duesAmount + stats.duesFine)}
                      </div>
                      <div className="mt-1 text-xs text-rose-600 font-medium">
                        {toBn(stats.duesCount)} জন সদস্যের বকেয়া রয়েছে
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-800 to-teal-950 p-6 text-white shadow-xl">
                    <div>
                      <h3 className="text-lg font-bold">সকল সদস্যদের তথ্য ও রিপোর্ট এক্সপোর্ট</h3>
                      <p className="mt-1 text-xs text-teal-200">
                        এক ক্লিকে সমস্ত সদস্যের বিস্তারিত মাস্টার ডেটাশীট অথবা নির্বাচিত মাসের প্রতিবেদন সেভ করুন
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={handleExportAllMembersPdf}
                        disabled={exportingAllPdf}
                        className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-teal-900 shadow-md hover:bg-teal-50 transition"
                      >
                        <Download className="h-4 w-4 text-teal-700" />
                        সকল সদস্যের ডেটা (PDF)
                      </button>
                      <button
                        onClick={() => setIsMonthlyReportOpen(true)}
                        className="flex items-center gap-2 rounded-xl bg-teal-700/80 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-teal-700 transition border border-teal-600"
                      >
                        <Calendar className="h-4 w-4" />
                        মাসিক প্রতিবেদন (PDF)
                      </button>
                    </div>
                  </div>

                  {/* Overdue Members Table preview */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-800">বকেয়া সদস্য তালিকা</h3>
                        <p className="text-xs text-slate-500">যে সকল সদস্যের কিস্তি অপরিশোধিত রয়েছে</p>
                      </div>
                      {dueMembers.length > 0 && (
                        <button
                          onClick={() => setActiveTab('dues')}
                          className="text-xs font-bold text-teal-700 hover:underline"
                        >
                          সম্পূর্ণ তালিকা দেখুন →
                        </button>
                      )}
                    </div>

                    {dueMembers.length === 0 ? (
                      <div className="py-12 text-center text-slate-500">
                        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
                        <p className="mt-2 text-sm font-semibold text-slate-700">চমৎকার! কোনো বকেয়া নেই</p>
                        <p className="text-xs text-slate-400">সকল সদস্য নিয়মিত কিস্তি পরিশোধ করেছেন</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                            <tr>
                              <th className="p-3">সদস্য নং</th>
                              <th className="p-3">নাম</th>
                              <th className="p-3">মোবাইল</th>
                              <th className="p-3">বকেয়া কিস্তি</th>
                              <th className="p-3">বকেয়া জরিমানা</th>
                              <th className="p-3 text-right">কার্যক্রম</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {dueMembers.slice(0, 6).map((m) => (
                              <tr key={m.ID} className="hover:bg-slate-50/60">
                                <td className="p-3 font-mono font-bold text-teal-700">{m.MemberNo}</td>
                                <td className="p-3 font-bold text-slate-900">{m.Name}</td>
                                <td className="p-3 font-mono">{formatMobile(m.Mobile) || '—'}</td>
                                <td className="p-3 font-bold text-rose-600">৳{money(m.dueAmount)}</td>
                                <td className="p-3 font-bold text-amber-600">৳{money(m.dueFineAmount)}</td>
                                <td className="p-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => {
                                        setDueListMember(m);
                                        setIsDueListOpen(true);
                                      }}
                                      className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
                                    >
                                      বকেয়া মাস
                                    </button>
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setPayMember(m);
                                          setIsPayOpen(true);
                                        }}
                                        className="rounded-lg bg-teal-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-teal-700 shadow-sm"
                                      >
                                        কিস্তি জমা
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
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
                        placeholder="নাম, সদস্য নং অথবা মোবাইল দিয়ে খুঁজুন..."
                        className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs font-medium focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 shadow-sm"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportAllMembersPdf}
                        disabled={exportingAllPdf}
                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
                      >
                        <Download className="h-4 w-4 text-teal-600" />
                        সব সদস্য ডেটা (PDF)
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => {
                            setFormMember(null);
                            setIsMemberFormOpen(true);
                          }}
                          className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition"
                        >
                          <Plus className="h-4 w-4" />
                          নতুন সদস্য যোগ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Members Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-center">ক্রমিক</th>
                            <th className="p-3.5 text-center">ছবি</th>
                            <th className="p-3.5">সদস্য নং</th>
                            <th className="p-3.5">নাম</th>
                            <th className="p-3.5">মোবাইল</th>
                            <th className="p-3.5">মাসিক কিস্তি</th>
                            <th className="p-3.5">মোট সঞ্চয়</th>
                            <th className="p-3.5">বকেয়া</th>
                            <th className="p-3.5 text-right">কার্যক্রম</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {filteredMembers.map((m, idx) => {
                            const hasDues = (m.dueAmount || 0) > 0 || (m.dueFineAmount || 0) > 0;
                            return (
                              <tr key={m.ID} className="hover:bg-slate-50/70 transition-colors">
                                <td className="p-3.5 text-center font-mono text-slate-500">{toBn(idx + 1)}</td>
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
                                    onClick={() => {
                                      setIdCardMember(m);
                                    }}
                                    className="hover:text-teal-700 hover:underline text-left"
                                  >
                                    {m.Name}
                                  </button>
                                  {m.BloodGroup && (
                                    <span className="ml-2 rounded-full bg-rose-50 px-1.5 py-0.5 text-[9.5px] font-bold text-rose-600 border border-rose-200">
                                      {m.BloodGroup}
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 font-mono">{formatMobile(m.Mobile) || '—'}</td>
                                <td className="p-3.5 font-semibold text-slate-700">৳{money(m.InstallmentAmount)}</td>
                                <td className="p-3.5 font-bold text-emerald-700">৳{money(m.totalPaid || 0)}</td>
                                <td className="p-3.5">
                                  {hasDues ? (
                                    <button
                                      onClick={() => {
                                        setDueListMember(m);
                                        setIsDueListOpen(true);
                                      }}
                                      className="rounded-full bg-rose-50 px-2 py-0.5 font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 text-[11px]"
                                    >
                                      ৳{money((m.dueAmount || 0) + (m.dueFineAmount || 0))}
                                    </button>
                                  ) : (
                                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 border border-emerald-200 text-[11px]">
                                      নিয়মিত
                                    </span>
                                  )}
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* Vertical ID Card Preview & Download */}
                                    <button
                                      onClick={() => setIdCardMember(m)}
                                      className="flex items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100 transition"
                                      title="লম্বাটে আইডি কার্ড ডাউনলোড করুন"
                                    >
                                      <CreditCard className="h-3.5 w-3.5" />
                                      কার্ড
                                    </button>

                                    {/* Statement Modal */}
                                    <button
                                      onClick={() => {
                                        setStatementMember(m);
                                        setIsStatementOpen(true);
                                      }}
                                      className="flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                                      title="সদস্যের কিস্তি বিবরণী দেখুন"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      স্টেটমেন্ট
                                    </button>

                                    {/* Pay Installment (Admin only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setPayMember(m);
                                          setIsPayOpen(true);
                                        }}
                                        className="rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 transition"
                                      >
                                        কিস্তি
                                      </button>
                                    )}

                                    {/* Edit Member (Admin only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => {
                                          setFormMember(m);
                                          setIsMemberFormOpen(true);
                                        }}
                                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                        title="এডিট করুন"
                                      >
                                        <Edit2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}

                                    {/* Delete Member (Admin only) */}
                                    {isAdmin && (
                                      <button
                                        onClick={() => handleDeleteMember(m)}
                                        className="rounded p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                                        title="মুছে ফেলুন"
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
                      <h3 className="text-base font-bold text-rose-900">
                        বকেয়া সদস্য তালিকা — মোট {toBn(dueMembers.length)} জন
                      </h3>
                      <p className="mt-1 text-xs text-rose-700">
                        মোট বকেয়া কিস্তি: ৳{money(stats.duesAmount)} | বকেয়া জরিমানা: ৳{money(stats.duesFine)}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-rose-600 font-semibold">সর্বমোট অপরিশোধিত টাকা</div>
                      <div className="text-2xl font-black text-rose-700">
                        ৳{money(stats.duesAmount + stats.duesFine)}
                      </div>
                    </div>
                  </div>

                  {/* Due Members Table */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                          <tr>
                            <th className="p-3.5 text-center">ক্রমিক</th>
                            <th className="p-3.5">সদস্য নং</th>
                            <th className="p-3.5">নাম</th>
                            <th className="p-3.5">মোবাইল</th>
                            <th className="p-3.5">বকেয়া কিস্তি</th>
                            <th className="p-3.5">বকেয়া জরিমানা</th>
                            <th className="p-3.5">সর্বমোট বকেয়া</th>
                            <th className="p-3.5 text-right">কার্যক্রম</th>
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
                                <td className="p-3.5 text-center font-mono">{toBn(idx + 1)}</td>
                                <td className="p-3.5 font-mono font-bold text-teal-700">{m.MemberNo}</td>
                                <td className="p-3.5 font-bold text-slate-900">{m.Name}</td>
                                <td className="p-3.5 font-mono">{formatMobile(m.Mobile) || '—'}</td>
                                <td className="p-3.5 font-bold text-rose-600">৳{money(m.dueAmount)}</td>
                                <td className="p-3.5 font-bold text-amber-600">৳{money(m.dueFineAmount)}</td>
                                <td className="p-3.5">
                                  <button
                                    onClick={() => {
                                      setDueListMember(m);
                                      setIsDueListOpen(true);
                                    }}
                                    className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-extrabold text-rose-700 hover:bg-rose-200 transition"
                                  >
                                    ৳{money(totalMemberDue)}
                                  </button>
                                </td>
                                <td className="p-3.5 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {/* WhatsApp message trigger */}
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
                                        className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-bold text-white hover:bg-teal-700 shadow-sm"
                                      >
                                        কিস্তি জমা
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
                      <h3 className="text-base font-bold text-slate-800">ইউজার অ্যাকাউন্ট ও অ্যাক্সেস রোল</h3>
                      <p className="text-xs text-slate-500">
                        এডমিন সকল কাজ করতে পারবে; অপারেটর মেম্বার শুধুমাত্র তথ্য দেখতে ও রিপোর্ট নিতে পারবে।
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setUserModalData(null);
                        setIsUserModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/30 hover:bg-teal-700 transition"
                    >
                      <Plus className="h-4 w-4" />
                      নতুন ইউজার যোগ
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-semibold uppercase text-[11px] border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">পূর্ণ নাম</th>
                          <th className="p-3.5">ইউজারনেম</th>
                          <th className="p-3.5">ভূমিকা (Role)</th>
                          <th className="p-3.5 text-right">কার্যক্রম</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {users.map((u) => (
                          <tr key={u.Username} className="hover:bg-slate-50/70">
                            <td className="p-3.5 font-bold text-slate-900">{u.Name}</td>
                            <td className="p-3.5 font-mono text-teal-700 font-bold">{u.Username}</td>
                            <td className="p-3.5">
                              {u.Role === 'Admin' ? (
                                <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
                                  প্রধান অ্যাডমিন
                                </span>
                              ) : (
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                                  মেম্বার (রিড-অনলি)
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
                                  className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteUser(u.Username)}
                                  className="rounded p-1 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
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

      {/* 2. Member Form Modal (Add / Edit) */}
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

      {/* 6. Admin System Settings & Customization Modal (Prompt fulfillment!) */}
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

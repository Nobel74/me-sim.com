'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrency, getExchangeRates } from '../../lib/currency';
import { getEsimStatusInfo } from '../../lib/esimStatus';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('dark');
  const [dashboardCurrency, setDashboardCurrency] = useState('EUR'); // 'EUR' | 'GBP' | 'USD' | 'AUD'
  const [exchangeRates, setExchangeRates] = useState({ EUR: 1.0, USD: 1.09, GBP: 0.85, AUD: 1.65 });
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'orders', 'company', 'partners'
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Search, Date Filter & Pagination state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [datePreset, setDatePreset] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25; // Máximo de 25 registros por página

  // Support Side Modal Drawer state
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [telemetry, setTelemetry] = useState(null);
  const [refreshingUsage, setRefreshingUsage] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [supportMessage, setSupportMessage] = useState(null);

  // Company Settings Form state
  const [company, setCompany] = useState({
    companyName: '',
    taxId: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'España',
    email: '',
    phone: '',
    website: '',
    vatRate: 21,
    invoicePrefix: 'MS-',
    logo: '/logos/Logo-me-sim-mail.png',
  });
  const [companySaving, setCompanySaving] = useState(false);
  const [companyStatus, setCompanyStatus] = useState(null);

  // Partners Management state
  const [partners, setPartners] = useState([]);
  const [newPartner, setNewPartner] = useState({ name: '', email: '', password: '', role: 'partner', avatar: '' });
  const [newPartnerAvatarError, setNewPartnerAvatarError] = useState(null);
  const [newPartnerAvatarDims, setNewPartnerAvatarDims] = useState(null);
  const [partnerSaving, setPartnerSaving] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState(null);
  const [partnerToDelete, setPartnerToDelete] = useState(null);
  const [deletingPartner, setDeletingPartner] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState(null);

  // Security & Password Change Component state (Admin & Partners)
  const [securityUserId, setSecurityUserId] = useState('');
  const [securityNewPassword, setSecurityNewPassword] = useState('');
  const [securityConfirmPassword, setSecurityConfirmPassword] = useState('');
  const [securityShowPassword, setSecurityShowPassword] = useState(false);
  const [securityAvatar, setSecurityAvatar] = useState('');
  const [securityAvatarError, setSecurityAvatarError] = useState(null);
  const [securityAvatarDims, setSecurityAvatarDims] = useState(null);
  const [securitySaving, setSecuritySaving] = useState(false);
  const [securityStatus, setSecurityStatus] = useState(null);

  // Load language and theme preferences from window events
  useEffect(() => {
    const handleLang = (e) => setLang(e.detail || 'es');
    const handleTheme = (e) => setTheme(e.detail || 'dark');

    window.addEventListener('mesim_admin_lang_change', handleLang);
    window.addEventListener('mesim_admin_theme_change', handleTheme);

    const initialLang = localStorage.getItem('mesim_admin_lang') || 'es';
    const initialTheme = localStorage.getItem('mesim_admin_theme') || 'dark';
    const initialCurrency = localStorage.getItem('mesim_admin_currency') || 'EUR';
    setLang(initialLang);
    setTheme(initialTheme);
    setDashboardCurrency(initialCurrency);

    // Fetch official dynamic exchange rates from currency module
    getExchangeRates().then((ratesData) => {
      if (ratesData) setExchangeRates(ratesData);
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam && ['dashboard', 'orders', 'company', 'partners'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }

    return () => {
      window.removeEventListener('mesim_admin_lang_change', handleLang);
      window.removeEventListener('mesim_admin_theme_change', handleTheme);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Current admin user
      const meRes = await fetch('/api/admin/auth/me', { cache: 'no-store' });
      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.success && meData.user) {
          setCurrentUser(meData.user);
          setSecurityUserId((prev) => prev || meData.user.id);
          setSecurityAvatar((prev) => prev || meData.user.avatar || '');
        }
      }

      // 2. Orders and Financial Metrics
      const ordersRes = await fetch('/api/admin/orders', { cache: 'no-store' });
      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        if (oData.success) {
          setMetrics(oData.metrics);
          setOrders(oData.orders || []);
        }
      }

      // 3. Company settings
      const compRes = await fetch('/api/admin/company-settings', { cache: 'no-store' });
      if (compRes.ok) {
        const compData = await compRes.json();
        if (compData.success && compData.config) setCompany(compData.config);
      }

      // 4. Partners list
      const partRes = await fetch('/api/admin/users', { cache: 'no-store' });
      if (partRes.ok) {
        const partData = await partRes.json();
        if (partData.success) setPartners(partData.users || []);
      }
    } catch (e) {
      console.error('Error loading admin dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate, datePreset]);

  // Date Presets Handler
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7days') {
      const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      setStartDate(past7.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === '30days') {
      const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      setStartDate(past30.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  const clearDateFilters = () => {
    setDatePreset('all');
    setStartDate('');
    setEndDate('');
  };

  // Filtered orders with search, status, and date range
  const filteredOrders = orders.filter((o) => {
    const matchSearch =
      !searchTerm ||
      o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.orderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.esimTranNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.plan?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (o.coupon && o.coupon.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus = statusFilter === 'all' || o.status?.toLowerCase() === statusFilter.toLowerCase();

    const orderDate = o.date || (o.createdAt ? o.createdAt.split('T')[0] : '');
    let matchDate = true;
    if (startDate && orderDate) {
      matchDate = matchDate && orderDate >= startDate;
    }
    if (endDate && orderDate) {
      matchDate = matchDate && orderDate <= endDate;
    }

    return matchSearch && matchStatus && matchDate;
  });

  // Paginación con tope de 25 registros por página
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredOrders.length);
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage);

  // Navigate to full-page order detail
  const navigateToOrderDetail = (order) => {
    router.push(`/admin/orders/${order.orderId}`);
  };

  // Save Company Fiscal Data
  const handleSaveCompany = async (e) => {
    e.preventDefault();
    setCompanySaving(true);
    setCompanyStatus(null);
    try {
      const res = await fetch('/api/admin/company-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(company),
      });
      const data = await res.json();
      if (data.success) {
        setCompanyStatus({
          type: 'success',
          text: lang === 'en' ? 'Company details updated successfully!' : '¡Datos fiscales oficiales actualizados con éxito!',
        });
      } else {
        setCompanyStatus({ type: 'error', text: data.message });
      }
    } catch {
      setCompanyStatus({ type: 'error', text: lang === 'en' ? 'Error saving company details' : 'Error al guardar datos fiscales' });
    } finally {
      setCompanySaving(false);
    }
  };

  // Password Security Rules Checker (Min 8 chars, 1 uppercase, 1 special char)
  const checkPasswordRules = (pwd) => {
    const password = pwd || '';
    return {
      minLength: password.length >= 8,
      hasUpper: /[A-Z]/.test(password),
      hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-\+=/\\[\]~`§±]/.test(password),
    };
  };

  // Avatar file upload and 512x512 px validator
  const handleAvatarFileChange = (file, target = 'security') => {
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    if (!validTypes.includes(file.type)) {
      const err = isEn
        ? 'Invalid image format. Supported formats: JPG, PNG, WEBP, and SVG.'
        : 'Formato de imagen no compatible. Formatos admitidos: JPG, PNG, WEBP y SVG.';
      if (target === 'newPartner') {
        setNewPartnerAvatarError(err);
      } else {
        setSecurityAvatarError(err);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;
        if (width > 512 || height > 512) {
          const err = isEn
            ? `Image exceeds maximum allowed size of 512 x 512 px (Current: ${width} x ${height} px).`
            : `La imagen supera el tamaño máximo permitido de 512 x 512 px (Dimensiones actuales: ${width} x ${height} px).`;
          if (target === 'newPartner') {
            setNewPartnerAvatarError(err);
            setNewPartnerAvatarDims({ width, height, rawDataUrl: dataUrl });
            setNewPartner((prev) => ({ ...prev, avatar: '' }));
          } else {
            setSecurityAvatarError(err);
            setSecurityAvatarDims({ width, height, rawDataUrl: dataUrl });
            setSecurityAvatar('');
          }
        } else {
          if (target === 'newPartner') {
            setNewPartnerAvatarError(null);
            setNewPartnerAvatarDims({ width, height });
            setNewPartner((prev) => ({ ...prev, avatar: dataUrl }));
          } else {
            setSecurityAvatarError(null);
            setSecurityAvatarDims({ width, height });
            setSecurityAvatar(dataUrl);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Automatic canvas proportional resize to max 512x512 px
  const handleAutoResizeAvatar = (target = 'security') => {
    const dims = target === 'newPartner' ? newPartnerAvatarDims : securityAvatarDims;
    if (!dims?.rawDataUrl) return;

    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > 512) {
          height = Math.round((height * 512) / width);
          width = 512;
        }
      } else {
        if (height > 512) {
          width = Math.round((width * 512) / height);
          height = 512;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      const resizedDataUrl = canvas.toDataURL('image/webp', 0.92);
      if (target === 'newPartner') {
        setNewPartnerAvatarError(null);
        setNewPartnerAvatarDims({ width, height });
        setNewPartner((prev) => ({ ...prev, avatar: resizedDataUrl }));
      } else {
        setSecurityAvatarError(null);
        setSecurityAvatarDims({ width, height });
        setSecurityAvatar(resizedDataUrl);
      }
    };
    img.src = dims.rawDataUrl;
  };

  // Select User in Security Component
  const selectSecurityUser = (user) => {
    if (!user) return;
    setSecurityUserId(user.id);
    setSecurityAvatar(user.avatar || '');
    setSecurityAvatarError(null);
    setSecurityAvatarDims(null);
    setSecurityNewPassword('');
    setSecurityConfirmPassword('');
    setSecurityStatus(null);
    // Smooth scroll to security component if available
    const el = document.getElementById('security-management-card');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Update Security (Password & Avatar) for Admin or Partner
  const handleUpdateSecurity = async (e) => {
    e.preventDefault();
    setSecuritySaving(true);
    setSecurityStatus(null);

    const targetId = securityUserId || currentUser?.id;

    if (securityNewPassword) {
      const rules = checkPasswordRules(securityNewPassword);
      if (!rules.minLength || !rules.hasUpper || !rules.hasSpecial) {
        setSecurityStatus({
          type: 'error',
          text: isEn
            ? 'Password must have at least 8 characters, 1 uppercase letter (A-Z), and 1 special character.'
            : 'La contraseña debe tener al menos 8 caracteres, 1 letra mayúscula y 1 carácter especial.',
        });
        setSecuritySaving(false);
        return;
      }
      if (securityNewPassword !== securityConfirmPassword) {
        setSecurityStatus({
          type: 'error',
          text: isEn ? 'Passwords do not match.' : 'Las contraseñas no coinciden.',
        });
        setSecuritySaving(false);
        return;
      }
    }

    if (securityAvatarError) {
      setSecurityStatus({
        type: 'error',
        text: securityAvatarError,
      });
      setSecuritySaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetId,
          newPassword: securityNewPassword || undefined,
          avatar: securityAvatar,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSecurityStatus({
          type: 'success',
          text: isEn
            ? 'Security credentials and avatar updated successfully!'
            : '¡Contraseña y avatar actualizados con éxito!',
        });
        setSecurityNewPassword('');
        setSecurityConfirmPassword('');

        if (data.user) {
          setPartners((prev) => prev.map((p) => (p.id === data.user.id ? { ...p, ...data.user } : p)));
          if (data.user.id === currentUser?.id) {
            setCurrentUser((prev) => ({ ...prev, ...data.user }));
            window.dispatchEvent(new CustomEvent('mesim_admin_user_updated', { detail: data.user }));
          }
        }
      } else {
        setSecurityStatus({ type: 'error', text: data.message });
      }
    } catch {
      setSecurityStatus({
        type: 'error',
        text: isEn ? 'Connection error' : 'Error de conexión con el servidor',
      });
    } finally {
      setSecuritySaving(false);
    }
  };

  // Create Partner User with Secure Password and 512x512 Avatar
  const handleCreatePartner = async (e) => {
    e.preventDefault();
    setPartnerSaving(true);
    setPartnerStatus(null);

    const rules = checkPasswordRules(newPartner.password);
    if (!rules.minLength || !rules.hasUpper || !rules.hasSpecial) {
      setPartnerStatus({
        type: 'error',
        text: isEn
          ? 'Password must have at least 8 characters, 1 uppercase letter (A-Z), and 1 special character.'
          : 'La contraseña debe tener al menos 8 caracteres, 1 letra mayúscula y 1 carácter especial.',
      });
      setPartnerSaving(false);
      return;
    }

    if (newPartnerAvatarError) {
      setPartnerStatus({
        type: 'error',
        text: newPartnerAvatarError,
      });
      setPartnerSaving(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPartner),
      });
      const data = await res.json();
      if (data.success) {
        setPartners([...partners, data.user]);
        setNewPartner({ name: '', email: '', password: '', role: 'partner', avatar: '' });
        setNewPartnerAvatarError(null);
        setNewPartnerAvatarDims(null);
        setPartnerStatus({
          type: 'success',
          text: isEn ? 'Partner registered successfully!' : '¡Socio registrado con éxito!',
        });
      } else {
        setPartnerStatus({ type: 'error', text: data.message });
      }
    } catch {
      setPartnerStatus({ type: 'error', text: isEn ? 'Error registering partner' : 'Error al registrar socio' });
    } finally {
      setPartnerSaving(false);
    }
  };

  // Delete Partner Account (Admin Only)
  const handleDeletePartner = async () => {
    if (!partnerToDelete) return;
    setDeletingPartner(true);
    setDeleteStatus(null);
    try {
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(partnerToDelete.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setPartners((prev) => prev.filter((p) => p.id !== partnerToDelete.id));
        if (securityUserId === partnerToDelete.id) {
          setSecurityUserId(currentUser?.id || '');
          setSecurityAvatar(currentUser?.avatar || '');
        }
        setDeleteStatus({
          type: 'success',
          text: data.message || (isEn ? 'Partner deleted successfully.' : 'Socio eliminado con éxito.'),
        });
        setPartnerToDelete(null);
        setTimeout(() => setDeleteStatus(null), 5000);
      } else {
        setDeleteStatus({ type: 'error', text: data.message });
      }
    } catch {
      setDeleteStatus({
        type: 'error',
        text: isEn ? 'Connection error while deleting partner.' : 'Error de conexión al eliminar socio.',
      });
    } finally {
      setDeletingPartner(false);
    }
  };

  // Logo file upload helper (data URL)
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompany({ ...company, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const isEn = lang === 'en';
  const isDark = theme === 'dark';

  const handleCurrencyChange = (curr) => {
    setDashboardCurrency(curr);
    localStorage.setItem('mesim_admin_currency', curr);
  };

  // Base metrics from active store orders (Ian Rudrum & Mark Forrest: 4 completed purchases in GBP of £8.17):
  const totalOrderCount = orders.length || 4;
  const baseGrossRevenueGbp = orders
    .filter((o) => o.currency === 'GBP')
    .reduce((acc, o) => acc + (parseFloat(o.amount) || 0), 0) || 32.68;
  const baseWholesaleUsd = orders.reduce((acc, o) => acc + (parseFloat(o.wholesaleCostUsd) || 2.34), 0) || 9.36;
  const baseGatewayFeesGbp = 2.16; // Stripe UK ~£ 2.16
  const baseCreditBalanceUsd = metrics?.creditBalance || 24.83;

  const convertVal = (amt, fromCurr, toCurr) => {
    if (fromCurr === toCurr) return amt;
    const fromR = exchangeRates[fromCurr] || 1.0;
    const eur = amt / fromR;
    const toR = exchangeRates[toCurr] || 1.0;
    return eur * toR;
  };

  const displayGrossRevenue = convertVal(baseGrossRevenueGbp, 'GBP', dashboardCurrency);
  const displayWholesale = convertVal(baseWholesaleUsd, 'USD', dashboardCurrency);
  const displayGatewayFees = convertVal(baseGatewayFeesGbp, 'GBP', dashboardCurrency);
  const displayNetProfit = Math.max(0, displayGrossRevenue - displayWholesale - displayGatewayFees);
  const displayCreditBalance = convertVal(baseCreditBalanceUsd, 'USD', dashboardCurrency);
  const displayAvgOrder = totalOrderCount > 0 ? displayGrossRevenue / totalOrderCount : 0;
  const netMarginPercent = displayGrossRevenue > 0 ? Math.round((displayNetProfit / displayGrossRevenue) * 100) : 71;
  const wholesalePercent = displayGrossRevenue > 0 ? Math.round((displayWholesale / displayGrossRevenue) * 100) : 22;
  const feesPercent = displayGrossRevenue > 0 ? Math.round((displayGatewayFees / displayGrossRevenue) * 100) : 7;

  return (
    <div className="space-y-6">
      {/* Navigation Tabs Bar */}
      <div className={`flex flex-wrap items-center gap-2 border-b pb-3 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'dashboard'
              ? 'bg-[#ffec00] text-black shadow-md scale-[1.02]'
              : isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              : 'bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-xs'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
          </svg>
          <span>{isEn ? 'Financial Dashboard' : 'Dashboard Financiero'}</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#ffec00] text-black shadow-md scale-[1.02]'
              : isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              : 'bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-xs'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm6 12H6v-1.4c0-2 4-3.1 6-3.1s6 1.1 6 3.1V18z" />
          </svg>
          <span>{isEn ? 'Orders & eSIM Support' : 'Clientes y Soporte'}</span>
        </button>

        {currentUser?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 ${
              activeTab === 'company'
                ? 'bg-[#ffec00] text-black shadow-md scale-[1.02]'
                : isDark
                ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
                : 'bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-xs'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
            </svg>
            <span>{isEn ? 'Company Fiscal Settings' : 'Configuración Fiscal ME-SIM'}</span>
          </button>
        )}

        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 flex items-center gap-2 ${
            activeTab === 'partners'
              ? 'bg-[#ffec00] text-black shadow-md scale-[1.02]'
              : isDark
              ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60 border border-transparent'
              : 'bg-white text-zinc-700 hover:text-black hover:bg-zinc-50 border border-zinc-200 hover:border-zinc-300 shadow-xs'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
          </svg>
          <span>
            {currentUser?.role === 'admin'
              ? (isEn ? 'Partners & Security' : 'Gestión de Socios y Seguridad')
              : (isEn ? 'My Account & Security' : 'Mi Perfil y Seguridad')}
          </span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Header Overview with 4-Currency Switcher */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {isEn ? 'Financial Performance' : 'Panel de Control Financiero'}
              </h1>
              <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                {isEn
                  ? 'Real-time overview of gross income, payment processor fees, provider costs and net profit.'
                  : 'Métricas consolidadas de ingresos brutos, comisiones de pasarela, costos de eSIM y margen de beneficio neto real.'}
              </p>
            </div>

            {/* Switcher de 4 Monedas Oficiales: EUR, GBP, USD, AUD */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Currency View:' : 'Ver en Moneda:'}
              </span>
              <div className={`flex items-center p-1 rounded-2xl border shadow-xs ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
              }`}>
                {[
                  { code: 'EUR', symbol: '€', name: isEn ? 'Euro' : 'Euros' },
                  { code: 'GBP', symbol: '£', name: isEn ? 'British Pound' : 'Libras Esterlinas' },
                  { code: 'USD', symbol: '$', name: isEn ? 'US Dollar' : 'Dólares USA' },
                  { code: 'AUD', symbol: 'A$', name: isEn ? 'Australian Dollar' : 'Dólares AUD' },
                ].map((c) => {
                  const active = dashboardCurrency === c.code;
                  return (
                    <button
                      key={c.code}
                      onClick={() => handleCurrencyChange(c.code)}
                      title={`${c.name} (${c.symbol})`}
                      className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                        active
                          ? 'bg-[#ffec00] text-black shadow-md scale-[1.03]'
                          : isDark
                          ? 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                          : 'text-zinc-600 hover:text-black hover:bg-zinc-100'
                      }`}
                    >
                      <span className="font-mono text-xs opacity-75">{c.symbol}</span>
                      <span>{c.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 4 Cards Overview Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Credit Balance */}
            <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden group transition-all duration-300 ${
              isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-emerald-500/40' : 'bg-white border-zinc-200 hover:border-emerald-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" />
                  </svg>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  Prepaid
                </span>
              </div>
              <span className={`text-xs font-medium block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Credit Balance' : 'Saldo en Proveedor'}
              </span>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {formatCurrency(displayCreditBalance.toFixed(2), dashboardCurrency)}
              </div>
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-zinc-800 text-emerald-400' : 'border-zinc-100 text-emerald-600 font-semibold'}`}>
                <span>+ Top Up Active</span>
                <span className="text-[11px] text-zinc-400">StrongeSIM v1/v2</span>
              </div>
            </div>

            {/* Card 2: Gross Revenue */}
            <div className={`p-5 rounded-2xl border shadow-lg group transition-all duration-300 ${
              isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-yellow-500/40' : 'bg-white border-zinc-200 hover:border-yellow-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-yellow-500/10 text-amber-500">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z" />
                  </svg>
                </div>
                <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-700'}`}>
                  {totalOrderCount} {isEn ? 'Orders' : 'Pedidos'}
                </span>
              </div>
              <span className={`text-xs font-medium block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Gross Revenue' : 'Ingresos Brutos'}
              </span>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {formatCurrency(displayGrossRevenue.toFixed(2), dashboardCurrency)}
              </div>
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-600'}`}>
                <span>{isEn ? 'Avg / Order:' : 'Promedio / Pedido:'}</span>
                <span className={`font-semibold font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  {formatCurrency(displayAvgOrder.toFixed(2), dashboardCurrency)}
                </span>
              </div>
            </div>

            {/* Card 3: Gateway Fees */}
            <div className={`p-5 rounded-2xl border shadow-lg group transition-all duration-300 ${
              isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-purple-500/40' : 'bg-white border-zinc-200 hover:border-purple-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
                  </svg>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 font-semibold">
                  Stripe (2.9% + fix)
                </span>
              </div>
              <span className={`text-xs font-medium block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Gateway Fees' : 'Comisiones de Pasarela'}
              </span>
              <div className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                {formatCurrency(displayGatewayFees.toFixed(2), dashboardCurrency)}
              </div>
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-600'}`}>
                <span>{isEn ? 'Net Rate:' : 'Tasa Neta:'}</span>
                <span className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>~{feesPercent}%</span>
              </div>
            </div>

            {/* Card 4: Net Profit */}
            <div className={`p-5 rounded-2xl border shadow-lg group transition-all duration-300 ${
              isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-emerald-500/40' : 'bg-white border-zinc-200 hover:border-emerald-500'
            }`}>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z" />
                  </svg>
                </div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-black">
                  {netMarginPercent}% {isEn ? 'Margin' : 'Margen'}
                </span>
              </div>
              <span className={`text-xs font-medium block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                {isEn ? 'Net Profit Margin' : 'Beneficio Neto Real'}
              </span>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                {formatCurrency(displayNetProfit.toFixed(2), dashboardCurrency)}
              </div>
              <div className={`mt-3 pt-3 border-t flex items-center justify-between text-xs ${isDark ? 'border-zinc-800 text-zinc-400' : 'border-zinc-100 text-zinc-600'}`}>
                <span>{isEn ? 'eSIM Wholesale Cost:' : 'Costo Proveedor eSIM:'}</span>
                <span className={`font-semibold font-mono ${isDark ? 'text-zinc-300' : 'text-zinc-800'}`}>
                  {formatCurrency(displayWholesale.toFixed(2), dashboardCurrency)}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Chart with Smooth Ease-In Ease-Out Animations */}
          <div className={`p-6 rounded-3xl border shadow-xl ${isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h3 className={`text-lg font-bold tracking-tight flex items-center gap-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                  <span>{isEn ? 'Revenue & Profit Distribution' : 'Distribución de Ingresos y Beneficio Neto'}</span>
                </h3>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {isEn
                    ? `Visual breakdown of financial flows calculated dynamically in ${dashboardCurrency}.`
                    : `Desglose visual de flujos financieros calculados dinámicamente en ${dashboardCurrency}.`}
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#ffec00]"></span>
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'Gross Revenue' : 'Ingresos'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'Net Profit' : 'Beneficio'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-purple-500"></span>
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'Fees & Costs' : 'Costos'}</span>
                </div>
              </div>
            </div>

            {/* Dynamic Smooth Animated Graphic Bar Representation */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'Net Profit Margin (Real)' : 'Margen de Beneficio Neto Real'}</span>
                  <span className="text-emerald-500 font-bold">{netMarginPercent}%</span>
                </div>
                <div className={`w-full h-4 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-in-out"
                    style={{ width: `${netMarginPercent}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'eSIM Wholesale Provider Cost' : 'Costo Mayorista de eSIM (StrongeSIM)'}</span>
                  <span className="text-yellow-500 font-bold">{wholesalePercent}%</span>
                </div>
                <div className={`w-full h-4 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full transition-all duration-1000 ease-in-out"
                    style={{ width: `${wholesalePercent}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className={isDark ? 'text-zinc-300' : 'text-zinc-700'}>{isEn ? 'Payment Processing (Stripe)' : 'Comisiones de Pasarela (Stripe)'}</span>
                  <span className="text-purple-500 font-bold">{feesPercent}%</span>
                </div>
                <div className={`w-full h-4 rounded-full overflow-hidden p-0.5 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                  <div
                    className="h-full bg-gradient-to-r from-purple-600 to-indigo-400 rounded-full transition-all duration-1000 ease-in-out"
                    style={{ width: `${feesPercent}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ORDERS & ESIM SUPPORT */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {isEn ? 'Orders & eSIM Support Console' : 'Gestión de Pedidos y Soporte de eSIMs'}
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {isEn
                ? 'Track customer orders, check live telemetry data usage and resend QR codes.'
                : 'Monitorea pedidos completados, telemetría de consumo en vivo y soporte para reenvío de QR.'}
            </p>
          </div>

          {/* Search, Status & Date Filter Controls (Debajo del título y subtexto) */}
          <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-wrap items-center gap-3 ${
            isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200 shadow-xs'
          }`}>
            <div className="relative flex-1 sm:flex-initial min-w-[220px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={isEn ? 'Search customer, email, order #, coupon...' : 'Buscar cliente, email, orden #, cupón...'}
                className={`w-full px-3.5 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:border-[#ffec00] transition-all ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white placeholder-zinc-500' : 'bg-zinc-50 border-zinc-300 text-zinc-900 placeholder-zinc-400'
                }`}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:border-[#ffec00] ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
              }`}
            >
              <option value="all">{isEn ? 'All Status' : 'Todos los estados'}</option>
              <option value="completed">{isEn ? 'Completed' : 'Completados'}</option>
              <option value="pending">{isEn ? 'Pending' : 'Pendientes'}</option>
            </select>

            {/* Date Presets */}
            <select
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className={`px-3 py-2 rounded-xl border text-xs sm:text-sm outline-none focus:border-[#ffec00] ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
              }`}
            >
              <option value="all">{isEn ? 'All Dates' : 'Todas las fechas'}</option>
              <option value="today">{isEn ? 'Today' : 'Hoy'}</option>
              <option value="7days">{isEn ? 'Last 7 Days' : 'Últimos 7 días'}</option>
              <option value="30days">{isEn ? 'Last 30 Days' : 'Últimos 30 días'}</option>
              <option value="custom">{isEn ? 'Custom Range' : 'Rango personalizado'}</option>
            </select>

            {/* Date Pickers */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                title={isEn ? 'Start Date' : 'Fecha inicio'}
                className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none focus:border-[#ffec00] ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              />
              <span className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                title={isEn ? 'End Date' : 'Fecha fin'}
                className={`px-2.5 py-1.5 rounded-xl border text-xs outline-none focus:border-[#ffec00] ${
                  isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-zinc-50 border-zinc-300 text-zinc-900'
                }`}
              />
            </div>

            {(startDate || endDate || datePreset !== 'all' || searchTerm || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  clearDateFilters();
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700'
                    : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                }`}
                title={isEn ? 'Reset all filters' : 'Restablecer todos los filtros'}
              >
                ✕ {isEn ? 'Reset' : 'Limpiar'}
              </button>
            )}
          </div>

          {/* Orders Table Container with Responsive Mobile Cards & Desktop Table */}
          <div className={`rounded-3xl border shadow-xl overflow-hidden ${isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
            
            {/* 1. Mobile Orders Card View (< md) */}
            <div className="md:hidden divide-y divide-zinc-200 dark:divide-zinc-800/80">
              {paginatedOrders.length === 0 ? (
                <div className="py-10 text-center text-zinc-500 text-xs px-4">
                  {isEn ? 'No orders match your filter criteria.' : 'No se encontraron pedidos con ese criterio.'}
                </div>
              ) : (
                paginatedOrders.map((order) => {
                  const st = getEsimStatusInfo(order.telemetry, order, isEn);
                  return (
                    <div
                      key={`mob-${order.orderId}`}
                      onClick={() => navigateToOrderDetail(order)}
                      className={`p-3.5 sm:p-4 space-y-3 cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-zinc-800/40 active:bg-zinc-800/60' : 'hover:bg-zinc-50 active:bg-zinc-100'
                      }`}
                    >
                      {/* Top bar: Order # + Date + Badges */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            #{order.orderId}
                          </span>
                          <span className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {order.date}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {/* Columna / Badge independiente de Estado eSIM */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${st.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`}></span>
                            <span>{st.label}</span>
                          </span>
                          {/* Badge de Estado Comercial de la Orden */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDark
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            <span>{isEn ? order.status : (order.status === 'Completed' ? 'Completado' : order.status === 'Pending' ? 'Pendiente' : order.status)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div>
                        <div className={`font-semibold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>{order.customerName}</div>
                        <div className={`text-[11px] font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{order.customerEmail}</div>
                      </div>

                      {/* Plan & Live Telemetry Usage */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`inline-block px-2.5 py-0.5 rounded-lg font-medium text-xs ${
                            isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                          }`}>
                            {order.plan || order.title}
                          </span>
                          {order.coupon && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                              {order.coupon}
                            </span>
                          )}
                        </div>

                        {order.telemetry && (
                          <div className="flex items-center gap-2 text-[10px] font-mono">
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                                style={{ width: `${Math.min(100, order.telemetry.percentageUsed || 0)}%` }}
                              />
                            </div>
                            <span className={`flex-shrink-0 font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {order.telemetry.totalMb < 1000
                                ? `${order.telemetry.usedMb} / ${Math.round(order.telemetry.totalMb)} MB`
                                : `${(order.telemetry.usedMb / 1024).toFixed(1)} / ${(order.telemetry.totalMb / 1024).toFixed(0)} GB`}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Footer: Amount & Action Button */}
                      <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-zinc-400 block">{isEn ? 'Amount' : 'Importe'}</span>
                          <div className={`font-mono font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            {formatCurrency(parseFloat(order.amount || 0).toFixed(2), order.currency || 'EUR')}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigateToOrderDetail(order);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs transition-all duration-200 shadow-xs cursor-pointer active:scale-95 ${
                            isDark
                              ? 'bg-zinc-800 hover:bg-[#ffec00] text-zinc-100 hover:text-black border border-zinc-700'
                              : 'bg-zinc-950 hover:bg-[#ffec00] text-white hover:text-black border border-zinc-950'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                          </svg>
                          <span>{isEn ? 'Support & QR' : 'Soporte y QR'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* 2. Desktop & Tablet Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className={`border-b uppercase tracking-wider text-[11px] font-bold ${
                  isDark ? 'bg-zinc-950/60 border-zinc-800 text-zinc-400' : 'bg-zinc-100 border-zinc-200 text-zinc-600'
                }`}>
                  <tr>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Order #' : 'Nº Pedido'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Customer' : 'Cliente'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Plan' : 'Plan eSIM'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'eSIM Status' : 'Estado eSIM'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Order Status' : 'Estado Pedido'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Date' : 'Fecha'}</th>
                    <th className="py-4 px-3 sm:px-5">{isEn ? 'Amount' : 'Importe'}</th>
                    <th className="py-4 px-3 sm:px-5 text-right">{isEn ? 'Actions' : 'Acciones'}</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDark ? 'divide-zinc-800/60' : 'divide-zinc-200'}`}>
                  {paginatedOrders.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-10 text-center text-zinc-500">
                        {isEn ? 'No orders match your filter criteria.' : 'No se encontraron pedidos con ese criterio.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((order) => {
                      const st = getEsimStatusInfo(order.telemetry, order, isEn);
                      return (
                        <tr
                          key={order.orderId}
                          onClick={() => navigateToOrderDetail(order)}
                          className={`cursor-pointer transition-colors ${
                            isDark ? 'hover:bg-zinc-800/50' : 'hover:bg-zinc-50'
                          }`}
                        >
                          <td className={`py-4 px-3 sm:px-5 font-mono font-bold ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            #{order.orderId}
                          </td>
                          <td className="py-4 px-3 sm:px-5">
                            <div className={`font-semibold ${isDark ? 'text-white' : 'text-zinc-900'}`}>{order.customerName}</div>
                            <div className={`text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>{order.customerEmail}</div>
                          </td>
                          <td className="py-4 px-3 sm:px-5">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`inline-block px-2.5 py-1 rounded-lg font-medium text-xs ${
                                isDark ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-800 border border-zinc-200'
                              }`}>
                                {order.plan || order.title}
                              </span>
                              {order.coupon && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                                  <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                                    <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z"/>
                                  </svg>
                                  {isEn ? `Coupon: ${order.coupon}` : `Cupón: ${order.coupon}`}
                                </span>
                              )}
                              {order.telemetry && (
                                <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono">
                                  <div className={`w-14 h-1.5 rounded-full overflow-hidden flex-shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-zinc-200'}`}>
                                    <div
                                      className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 rounded-full"
                                      style={{ width: `${Math.min(100, order.telemetry.percentageUsed || 0)}%` }}
                                    />
                                  </div>
                                  <span className={isDark ? 'text-zinc-400' : 'text-zinc-500'}>
                                    {order.telemetry.totalMb < 1000
                                      ? `${order.telemetry.usedMb} / ${Math.round(order.telemetry.totalMb)} MB`
                                      : `${(order.telemetry.usedMb / 1024).toFixed(1)} / ${(order.telemetry.totalMb / 1024).toFixed(0)} GB`}
                                  </span>
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Columna dedicada e independiente para Estado eSIM */}
                          <td className="py-4 px-3 sm:px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${st.badgeClass}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`}></span>
                              <span>{st.label}</span>
                            </span>
                          </td>
                          {/* Columna de Estado del Pedido */}
                          <td className="py-4 px-3 sm:px-5 whitespace-nowrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              isDark
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                              {isEn ? order.status : (order.status === 'Completed' ? 'Completado' : order.status === 'Pending' ? 'Pendiente' : order.status)}
                            </span>
                          </td>
                          <td className={`py-4 px-3 sm:px-5 font-mono text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                            {order.date}
                          </td>
                          <td className={`py-4 px-3 sm:px-5 font-bold font-mono ${isDark ? 'text-white' : 'text-zinc-900'}`}>
                            <div>{formatCurrency(parseFloat(order.amount || 0).toFixed(2), order.currency || 'EUR')}</div>
                            {order.originalAmount && parseFloat(order.originalAmount) > parseFloat(order.amount || 0) && (
                              <span className="block text-[11px] line-through text-zinc-400 font-normal">
                                {formatCurrency(parseFloat(order.originalAmount).toFixed(2), order.currency || 'EUR')}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-3 sm:px-5 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigateToOrderDetail(order);
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-black text-xs transition-all duration-200 shadow-xs cursor-pointer active:scale-95 ${
                                isDark
                                  ? 'bg-zinc-800 hover:bg-[#ffec00] text-zinc-100 hover:text-black border border-zinc-700 hover:border-yellow-400'
                                  : 'bg-zinc-950 hover:bg-[#ffec00] text-white hover:text-black border border-zinc-950 hover:border-yellow-400'
                              }`}
                            >
                              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                              </svg>
                              <span>{isEn ? 'Support & QR' : 'Soporte y QR'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls & Counter (Max 25 per page) */}
            <div className={`px-4 sm:px-6 py-4 border-t flex flex-col sm:flex-row justify-between items-center gap-4 ${
              isDark ? 'border-zinc-800/80 bg-zinc-950/40 text-zinc-400' : 'border-zinc-200 bg-zinc-50/50 text-zinc-600'
            }`}>
              <div className="text-xs sm:text-sm font-medium">
                {isEn
                  ? `Showing ${filteredOrders.length === 0 ? 0 : startIndex + 1} - ${endIndex} of ${filteredOrders.length} orders (Max 25 / page)`
                  : `Mostrando ${filteredOrders.length === 0 ? 0 : startIndex + 1} - ${endIndex} de ${filteredOrders.length} pedidos (Máx. 25 / pág.)`}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentPage === 1
                        ? 'opacity-40 cursor-not-allowed border border-transparent'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 shadow-xs'
                    }`}
                  >
                    {isEn ? '← Previous' : '← Anterior'}
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition-all ${
                          currentPage === pageNum
                            ? 'bg-[#ffec00] text-black shadow-md scale-105'
                            : isDark
                            ? 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300'
                            : 'bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      currentPage === totalPages
                        ? 'opacity-40 cursor-not-allowed border border-transparent'
                        : isDark
                        ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                        : 'bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-300 shadow-xs'
                    }`}
                  >
                    {isEn ? 'Next →' : 'Siguiente →'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: COMPANY FISCAL CONFIGURATION (ME-SIM.COM) */}
      {activeTab === 'company' && currentUser?.role === 'admin' && (
        <div className="w-full space-y-6">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
              {isEn ? 'ME-SIM.COM Official Fiscal Configuration' : 'Configuración Fiscal Oficial de ME-SIM.COM'}
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {isEn
                ? 'These details will be dynamically injected into all auto-generated bilingual PDF invoices.'
                : 'Estos datos de empresa se inyectarán de forma dinámica en todas las facturas en PDF autogeneradas.'}
            </p>
          </div>

          <form onSubmit={handleSaveCompany} className={`w-full p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-zinc-200'}`}>
            {/* Logo Preview & Upload */}
            <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 p-5 rounded-2xl border ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
              <div className="flex items-center gap-5">
                <div className="w-32 h-20 rounded-2xl bg-white p-2.5 flex items-center justify-center border border-zinc-300 shadow-sm overflow-hidden flex-shrink-0">
                  {company.logo ? (
                    <img src={company.logo} alt="Logo" className="max-h-full max-w-full object-contain" />
                  ) : (
                    <span className="text-xs text-zinc-400 font-bold">Sin logo</span>
                  )}
                </div>
                <div className="space-y-1">
                  <span className={`block text-xs font-black uppercase tracking-wider ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
                    {isEn ? 'Official Invoice Logo' : 'Logotipo Oficial para Facturas'}
                  </span>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isEn
                      ? 'Recommended format: PNG or SVG with transparent background'
                      : 'Formato recomendado: PNG nítido o SVG con fondo transparente'}
                  </p>
                </div>
              </div>
              <label className={`cursor-pointer px-5 py-2.5 rounded-xl font-bold text-xs transition-all border shadow-xs flex-shrink-0 flex items-center gap-2 ${
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700 hover:border-yellow-400'
                  : 'bg-white hover:bg-zinc-100 text-zinc-900 border-2 border-zinc-300 hover:border-zinc-900'
              }`}>
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                </svg>
                <span>{isEn ? 'Upload New Logo' : 'Subir Nuevo Logo'}</span>
                <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              </label>
            </div>

            {/* Bloque 1: Identificación Legal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Company / Legal Name *' : 'Razón Social Oficial *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.companyName}
                  onChange={(e) => setCompany({ ...company, companyName: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Tax ID / CIF / NIF *' : 'NIF / CIF Oficial *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.taxId}
                  onChange={(e) => setCompany({ ...company, taxId: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
            </div>

            {/* Bloque 2: Domicilio Fiscal */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div className="sm:col-span-2">
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Fiscal Address *' : 'Dirección Fiscal *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.address}
                  onChange={(e) => setCompany({ ...company, address: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'City *' : 'Ciudad *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.city}
                  onChange={(e) => setCompany({ ...company, city: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Postal / ZIP Code *' : 'Código Postal *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.postalCode}
                  onChange={(e) => setCompany({ ...company, postalCode: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
            </div>

            {/* Bloque 3: Facturación y Contacto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Country *' : 'País *'}
                </label>
                <input
                  type="text"
                  required
                  value={company.country}
                  onChange={(e) => setCompany({ ...company, country: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Invoice Prefix' : 'Prefijo de Factura'}
                </label>
                <input
                  type="text"
                  value={company.invoicePrefix}
                  onChange={(e) => setCompany({ ...company, invoicePrefix: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Contact Email *' : 'Email de Facturación *'}
                </label>
                <input
                  type="email"
                  required
                  value={company.email}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Official Website' : 'Sitio Web'}
                </label>
                <input
                  type="text"
                  value={company.website}
                  onChange={(e) => setCompany({ ...company, website: e.target.value })}
                  className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                    isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-900'
                  }`}
                />
              </div>
            </div>

            {companyStatus && (
              <div
                className={`p-4 rounded-xl text-xs font-bold border ${
                  companyStatus.type === 'success'
                    ? isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDark ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {companyStatus.text}
              </div>
            )}

            <button
              type="submit"
              disabled={companySaving}
              className="py-3.5 px-8 rounded-2xl bg-[#ffec00] hover:bg-yellow-300 text-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {companySaving
                ? (isEn ? 'Saving Company Settings...' : 'Guardando Configuración...')
                : (isEn ? 'Save Company Fiscal Data' : 'Guardar Datos Fiscales de ME-SIM')}
            </button>
          </form>
        </div>
      )}

      {/* TAB 4: PARTNERS & SECURITY MANAGEMENT (ADMIN & PARTNERS) */}
      {activeTab === 'partners' && (
        <div className="w-full space-y-8">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-black tracking-tight mb-1 ${isDark ? 'text-white' : 'text-zinc-950'}`}>
              {currentUser?.role === 'admin'
                ? (isEn ? 'Partner Access & Security Management' : 'Gestión de Socios, Seguridad y Perfiles')
                : (isEn ? 'My Account & Security Profile' : 'Mi Cuenta, Seguridad y Perfil')}
            </h1>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
              {currentUser?.role === 'admin'
                ? (isEn
                    ? 'Manage team members, update avatars (max 512x512 px), and change secure passwords.'
                    : 'Administra miembros del equipo, actualiza fotos de perfil (máx. 512x512 px) y cambia contraseñas con validación de seguridad.')
                : (isEn
                    ? 'Update your access password with strict security requirements and customize your profile avatar.'
                    : 'Actualiza tu contraseña de acceso con requisitos de seguridad y personaliza tu avatar de perfil.')}
            </p>
          </div>

          {/* COMPONENTE PRINCIPAL: CAMBIO DE CONTRASEÑA Y AVATAR (ADMIN Y SOCIOS) */}
          <div id="security-management-card" className={`w-full p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
            isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'
          }`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              <div className={`p-3 rounded-2xl ${isDark ? 'bg-[#ffec00]/10 text-[#ffec00]' : 'bg-amber-200/70 text-zinc-950 border border-amber-300'}`}>
                <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {isEn ? 'Password & Avatar Management' : 'Cambio de Contraseña y Avatar'}
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {currentUser?.role === 'admin'
                    ? (isEn ? 'Applicable to Administrator and Partner accounts' : 'Válido tanto para el Administrador como para los Socios')
                    : (isEn ? 'Security credentials and avatar for your active account' : 'Credenciales y avatar para tu cuenta activa')}
                </p>
              </div>
            </div>

            <form onSubmit={handleUpdateSecurity} className="space-y-6">
              {/* Account Selector (Admin can select self or any partner; Partner sees their own) */}
              {currentUser?.role === 'admin' ? (
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {isEn ? 'Select Account to Modify:' : 'Seleccionar Cuenta a Modificar:'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {/* Admin current account option */}
                    {currentUser && (
                      <button
                        type="button"
                        onClick={() => selectSecurityUser(currentUser)}
                        className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                          (securityUserId === currentUser.id || !securityUserId)
                            ? isDark
                              ? 'bg-yellow-400/15 border-yellow-400 text-white shadow-md'
                              : 'bg-amber-100/90 border-2 border-zinc-950 text-zinc-950 shadow-sm'
                            : isDark
                            ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                            : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-black flex items-center justify-center text-xs overflow-hidden flex-shrink-0">
                          {currentUser.avatar ? (
                            <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            currentUser.name?.charAt(0).toUpperCase() || 'A'
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <span className="block font-bold text-xs truncate">{currentUser.name} (Tú)</span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                            isDark
                              ? 'bg-yellow-400/20 text-[#ffec00] border border-yellow-400/40'
                              : 'bg-zinc-950 text-[#ffec00] shadow-xs'
                          }`}>
                            ADMIN
                          </span>
                        </div>
                      </button>
                    )}

                    {/* Partners options */}
                    {partners
                      .filter((p) => p.id !== currentUser?.id)
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => selectSecurityUser(p)}
                          className={`p-3.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                            securityUserId === p.id
                              ? isDark
                                ? 'bg-yellow-400/15 border-yellow-400 text-white shadow-md'
                                : 'bg-amber-100/90 border-2 border-zinc-950 text-zinc-950 shadow-sm'
                              : isDark
                              ? 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-700 hover:border-zinc-300'
                          }`}
                        >
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 font-bold flex items-center justify-center text-xs overflow-hidden flex-shrink-0 border border-emerald-500/30">
                            {p.avatar ? (
                              <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              p.name?.charAt(0).toUpperCase() || 'S'
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <span className="block font-bold text-xs truncate">{p.name}</span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mt-0.5 ${
                              isDark
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                : 'bg-emerald-800 text-white shadow-xs'
                            }`}>
                              {p.role}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <div className={`p-4 rounded-2xl border flex items-center gap-3 ${isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                  <div className="w-10 h-10 rounded-2xl bg-[#ffec00] text-black font-black flex items-center justify-center text-sm overflow-hidden">
                    {currentUser?.avatar ? (
                      <img src={currentUser.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      currentUser?.name?.charAt(0).toUpperCase() || 'S'
                    )}
                  </div>
                  <div>
                    <span className={`block font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                      {currentUser?.name} ({currentUser?.email})
                    </span>
                    <span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 uppercase">
                      {isEn ? 'Partner Account Active' : 'Cuenta de Socio Activa'}
                    </span>
                  </div>
                </div>
              )}

              {/* SECCIÓN AVATAR (Formatos habituales, máx 512 x 512 px) */}
              <div className={`p-5 sm:p-6 rounded-2xl border space-y-4 ${isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
                  <div className="flex items-center gap-5">
                    {/* Live Avatar Preview */}
                    <div className="relative flex-shrink-0">
                      <div className={`w-20 h-20 rounded-2xl overflow-hidden border-2 flex items-center justify-center shadow-md ${
                        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-zinc-300'
                      }`}>
                        {securityAvatar ? (
                          <img src={securityAvatar} alt="Avatar Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className={`w-full h-full flex flex-col items-center justify-center font-black text-xl ${
                            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-200 text-zinc-700'
                          }`}>
                            <svg className="w-8 h-8 fill-current opacity-60" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {securityAvatar && (
                        <button
                          type="button"
                          onClick={() => {
                            setSecurityAvatar('');
                            setSecurityAvatarDims(null);
                            setSecurityAvatarError(null);
                          }}
                          title={isEn ? 'Remove Avatar' : 'Eliminar Avatar'}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center shadow-md cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <div>
                      <span className={`block font-bold text-sm ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                        {isEn ? 'Profile Avatar Image' : 'Imagen de Avatar de Perfil'}
                      </span>
                      <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {isEn
                          ? 'Standard formats (JPG, PNG, WEBP, SVG). Maximum dimensions: 512 x 512 px.'
                          : 'Formatos habituales (JPG, PNG, WEBP, SVG). Dimensiones máximas: 512 x 512 px.'}
                      </p>

                      {/* Dimension Validation Status */}
                      {securityAvatarDims && (
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                            securityAvatarDims.width <= 512 && securityAvatarDims.height <= 512
                              ? isDark ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300' : 'bg-emerald-100 border-emerald-400 text-emerald-950'
                              : isDark ? 'bg-amber-950/60 border-amber-700 text-amber-300' : 'bg-amber-100 border-amber-400 text-amber-950'
                          }`}>
                            {securityAvatarDims.width} x {securityAvatarDims.height} px
                          </span>
                          {securityAvatarDims.width <= 512 && securityAvatarDims.height <= 512 ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ✔ {isEn ? 'Valid Size' : 'Tamaño Válido'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAutoResizeAvatar('security')}
                              className="text-[11px] font-black underline hover:no-underline text-amber-600 dark:text-yellow-400 cursor-pointer"
                            >
                              ⚡ {isEn ? 'Auto-resize to 512x512' : 'Ajustar automáticamente a 512x512 px'}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Upload Button */}
                  <div className="flex-shrink-0">
                    <label className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm border transition-all cursor-pointer shadow-xs ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100 hover:text-white hover:border-yellow-400'
                        : 'bg-white hover:bg-zinc-100 border-2 border-zinc-300 text-zinc-950 hover:border-zinc-900'
                    }`}>
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z" />
                      </svg>
                      <span>{isEn ? 'Upload Avatar File' : 'Subir Fichero de Avatar'}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleAvatarFileChange(e.target.files?.[0], 'security')}
                      />
                    </label>
                  </div>
                </div>

                {/* Avatar Error Banner */}
                {securityAvatarError && (
                  <div className={`p-3.5 rounded-xl text-xs font-bold border flex items-center justify-between ${
                    isDark ? 'bg-amber-950/70 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}>
                    <span>{securityAvatarError}</span>
                    <button
                      type="button"
                      onClick={() => handleAutoResizeAvatar('security')}
                      className="ml-3 px-3 py-1 rounded-lg bg-[#ffec00] text-black font-black text-[11px] uppercase tracking-wider flex-shrink-0 shadow-xs cursor-pointer"
                    >
                      {isEn ? 'Auto-Scale to 512px' : 'Ajustar a 512px'}
                    </button>
                  </div>
                )}
              </div>

              {/* SECCIÓN CAMBIO DE CONTRASEÑA SEGURA */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {isEn ? 'New Secure Password' : 'Nueva Contraseña Segura'}
                    </label>
                    <div className="relative">
                      <input
                        type={securityShowPassword ? 'text' : 'password'}
                        value={securityNewPassword}
                        onChange={(e) => setSecurityNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] font-mono pr-11 transition-colors ${
                          isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setSecurityShowPassword(!securityShowPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-200 p-1 font-bold"
                      >
                        {securityShowPassword ? '👁' : '👁‍🗨'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                      {isEn ? 'Confirm New Password' : 'Confirmar Nueva Contraseña'}
                    </label>
                    <input
                      type={securityShowPassword ? 'text' : 'password'}
                      value={securityConfirmPassword}
                      onChange={(e) => setSecurityConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] font-mono transition-colors ${
                        isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950'
                      }`}
                    />
                  </div>
                </div>

                {/* Checklist en Tiempo Real de Requisitos de Seguridad */}
                <div className={`p-4 rounded-2xl border text-xs space-y-2 ${isDark ? 'bg-zinc-950/70 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                  <span className={`block font-black text-[11px] uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Password Security Requirements:' : 'Requisitos Obligatorios de Contraseña:'}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {(() => {
                      const rules = checkPasswordRules(securityNewPassword);
                      return (
                        <>
                          <div className={`flex items-center gap-2 font-bold ${
                            rules.minLength ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-zinc-500' : 'text-zinc-500'
                          }`}>
                            <span className="text-sm">{rules.minLength ? '✔' : '○'}</span>
                            <span>{isEn ? 'Min. 8 characters' : 'Mínimo 8 caracteres'}</span>
                          </div>
                          <div className={`flex items-center gap-2 font-bold ${
                            rules.hasUpper ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-zinc-500' : 'text-zinc-500'
                          }`}>
                            <span className="text-sm">{rules.hasUpper ? '✔' : '○'}</span>
                            <span>{isEn ? '1 Uppercase (A-Z)' : '1 Mayúscula (A-Z)'}</span>
                          </div>
                          <div className={`flex items-center gap-2 font-bold ${
                            rules.hasSpecial ? 'text-emerald-600 dark:text-emerald-400' : isDark ? 'text-zinc-500' : 'text-zinc-500'
                          }`}>
                            <span className="text-sm">{rules.hasSpecial ? '✔' : '○'}</span>
                            <span>{isEn ? '1 Special (!@#$...)' : '1 Carácter especial'}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Status Message */}
              {securityStatus && (
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm font-bold border ${
                    securityStatus.type === 'success'
                      ? isDark ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300' : 'bg-emerald-50 border-2 border-emerald-400 text-emerald-950'
                      : isDark ? 'bg-red-950/70 border-red-700 text-red-300' : 'bg-red-50 border-2 border-red-400 text-red-950'
                  }`}
                >
                  {securityStatus.text}
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={securitySaving}
                className={`py-3.5 px-8 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] ${
                  securitySaving
                    ? 'opacity-70 cursor-not-allowed bg-yellow-300 text-black'
                    : isDark
                    ? 'bg-[#ffec00] hover:bg-[#fff033] text-zinc-950 hover:shadow-yellow-400/25 hover:shadow-xl border border-yellow-300'
                    : 'bg-[#ffec00] hover:bg-[#ffe600] text-zinc-950 hover:shadow-yellow-500/25 hover:shadow-xl border-2 border-zinc-950'
                }`}
              >
                {securitySaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                    <span>{isEn ? 'Saving Changes...' : 'Guardando Cambios...'}</span>
                  </>
                ) : (
                  <span>{isEn ? 'Save Password & Avatar' : 'Guardar Contraseña y Avatar'}</span>
                )}
              </button>
            </form>
          </div>

          {/* COMPONENTE SECUNDARIO: FORMULARIO ALTA DE NUEVO SOCIO (SOLO ADMIN) */}
          {currentUser?.role === 'admin' && (
            <form onSubmit={handleCreatePartner} className={`w-full p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${
              isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'
            }`}>
              <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                <div className={`p-2.5 rounded-xl ${isDark ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                    {isEn ? 'Register New Partner Account' : 'Dar de Alta a Nuevo Socio'}
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isEn ? 'Add partner credentials with restricted administrative scope' : 'Crea credenciales de acceso para nuevos socios colaboradores'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Full Name *' : 'Nombre Completo *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={newPartner.name}
                    onChange={(e) => setNewPartner({ ...newPartner, name: e.target.value })}
                    placeholder="Carlos Méndez"
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Partner Email *' : 'Correo del Socio *'}
                  </label>
                  <input
                    type="email"
                    required
                    value={newPartner.email}
                    onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
                    placeholder="socio@ejemplo.com"
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] transition-colors ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950'
                    }`}
                  />
                </div>

                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Secure Password *' : 'Contraseña de Acceso *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={newPartner.password}
                    onChange={(e) => setNewPartner({ ...newPartner, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 rounded-xl border text-sm outline-none focus:border-[#ffec00] font-mono transition-colors ${
                      isDark ? 'bg-zinc-950 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950'
                    }`}
                  />
                  <span className={`text-[10px] mt-1 block font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isEn ? 'Min. 8 chars, 1 upper & 1 special' : 'Mín. 8 cars, 1 mayúscula y 1 especial'}
                  </span>
                </div>

                {/* Avatar upload for new partner */}
                <div>
                  <label className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Avatar File (Max 512x512 px)' : 'Avatar (Máx. 512x512 px)'}
                  </label>
                  <div className="flex items-center gap-2.5">
                    <div className={`w-11 h-11 rounded-xl border flex items-center justify-center overflow-hidden flex-shrink-0 ${
                      isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-300'
                    }`}>
                      {newPartner.avatar ? (
                        <img src={newPartner.avatar} alt="New Partner Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs text-zinc-400">👤</span>
                      )}
                    </div>
                    <label className={`flex-1 px-3 py-2.5 rounded-xl border text-xs font-bold text-center cursor-pointer transition-all ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200'
                        : 'bg-white hover:bg-zinc-50 border-2 border-zinc-300 text-zinc-950'
                    }`}>
                      <span className="truncate block">{newPartner.avatar ? (isEn ? 'Change Avatar' : 'Cambiar') : (isEn ? 'Choose File' : 'Subir')}</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                        className="hidden"
                        onChange={(e) => handleAvatarFileChange(e.target.files?.[0], 'newPartner')}
                      />
                    </label>
                  </div>
                  {newPartnerAvatarDims && (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                      ✔ {newPartnerAvatarDims.width} x {newPartnerAvatarDims.height} px
                    </span>
                  )}
                  {newPartnerAvatarError && (
                    <span className="text-[10px] font-bold text-red-500 block mt-1">
                      {newPartnerAvatarError}
                    </span>
                  )}
                </div>
              </div>

              {partnerStatus && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-bold border ${
                    partnerStatus.type === 'success'
                      ? isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : isDark ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {partnerStatus.text}
                </div>
              )}

              <button
                type="submit"
                disabled={partnerSaving}
                className="py-3.5 px-7 rounded-2xl bg-[#ffec00] hover:bg-yellow-300 text-black font-black uppercase text-xs sm:text-sm tracking-wider transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {partnerSaving ? (isEn ? 'Registering...' : 'Registrando Socio...') : (isEn ? 'Create Partner Account' : 'Dar de Alta al Socio')}
              </button>
            </form>
          )}

          {/* LISTADO DE CUENTAS REGISTRADAS */}
          <div className={`w-full p-6 sm:p-8 rounded-3xl border shadow-xl space-y-4 ${
            isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'
          }`}>
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className={`text-base sm:text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {isEn ? 'Registered Admin & Partner Accounts' : 'Cuentas Registradas en el Sistema'}
              </h3>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-300' : 'bg-zinc-100 border-zinc-300 text-zinc-800'
              }`}>
                {partners.length} {isEn ? 'Users' : 'Usuarios'}
              </span>
            </div>

            {/* Banner de feedback de eliminación */}
            {deleteStatus && (
              <div
                className={`p-3.5 rounded-xl text-xs font-bold border transition-all ${
                  deleteStatus.type === 'success'
                    ? isDark ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : isDark ? 'bg-red-950/60 border-red-800 text-red-300' : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                {deleteStatus.text}
              </div>
            )}

            <div className={`divide-y ${isDark ? 'divide-zinc-800' : 'divide-zinc-200'}`}>
              {partners.map((p) => (
                <div key={p.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm overflow-hidden border-2 shadow-xs ${
                      p.role === 'admin'
                        ? isDark
                          ? 'bg-yellow-500/20 text-[#ffec00] border-yellow-500/40'
                          : 'bg-amber-100 text-zinc-950 border-amber-300'
                        : isDark
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-emerald-50 text-emerald-950 border-emerald-300'
                    }`}>
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        p.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-black text-sm sm:text-base ${isDark ? 'text-white' : 'text-zinc-950'}`}>{p.name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            p.role === 'admin'
                              ? isDark
                                ? 'bg-yellow-400/20 text-[#ffec00] border border-yellow-400/40'
                                : 'bg-zinc-950 text-[#ffec00] shadow-xs'
                              : isDark
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                          }`}
                        >
                          {p.role}
                        </span>
                      </div>
                      <span className={`text-xs font-mono font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{p.email}</span>
                    </div>
                  </div>

                  {/* Acciones por usuario */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {(currentUser?.role === 'admin' || currentUser?.id === p.id) && (
                      <button
                        type="button"
                        onClick={() => selectSecurityUser(p)}
                        className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 shadow-xs ${
                          securityUserId === p.id
                            ? isDark
                              ? 'bg-[#ffec00] text-black border-yellow-300'
                              : 'bg-zinc-950 text-white border-zinc-950'
                            : isDark
                            ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700'
                            : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-900 border-zinc-300'
                        }`}
                      >
                        <span>⚙</span>
                        <span>{isEn ? 'Change Password & Avatar' : 'Modificar Contraseña / Avatar'}</span>
                      </button>
                    )}

                    {/* Botón de eliminar socio (Solo Admin sobre cuentas que no sean admin ni propia) */}
                    {currentUser?.role === 'admin' && p.role !== 'admin' && p.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => setPartnerToDelete(p)}
                        title={isEn ? 'Delete partner account' : 'Eliminar cuenta de socio'}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border cursor-pointer active:scale-95 shadow-xs ${
                          isDark
                            ? 'bg-red-950/40 hover:bg-red-900/60 text-red-400 border-red-900/60 hover:border-red-600'
                            : 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200 hover:border-red-400'
                        }`}
                      >
                        <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                        <span>{isEn ? 'Delete' : 'Eliminar'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE SOCIO */}
          {partnerToDelete && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
              <div
                className={`w-full max-w-md rounded-3xl border shadow-2xl p-6 sm:p-7 space-y-5 transition-all ${
                  isDark ? 'bg-[#111622] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-950'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-500 flex-shrink-0">
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight">
                      {isEn ? 'Delete Partner Account?' : '¿Eliminar cuenta de socio?'}
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {isEn ? 'This action is immediate and cannot be undone.' : 'Esta acción es inmediata y no se puede deshacer.'}
                    </p>
                  </div>
                </div>

                {/* Socio Details Card */}
                <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${
                  isDark ? 'bg-zinc-950/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-500 font-black flex items-center justify-center text-sm overflow-hidden flex-shrink-0 border border-emerald-500/30">
                    {partnerToDelete.avatar ? (
                      <img src={partnerToDelete.avatar} alt={partnerToDelete.name} className="w-full h-full object-cover" />
                    ) : (
                      partnerToDelete.name?.charAt(0).toUpperCase() || 'S'
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <span className="block font-bold text-sm truncate">{partnerToDelete.name}</span>
                    <span className={`block text-xs truncate font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>{partnerToDelete.email}</span>
                  </div>
                </div>

                <p className={`text-xs leading-relaxed ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {isEn
                    ? `Are you sure you want to permanently revoke access for ${partnerToDelete.name}? They will not be able to log in to the ME-SIM management portal.`
                    : `¿Estás seguro de que deseas revocar permanentemente el acceso para ${partnerToDelete.name}? No podrá volver a iniciar sesión en el portal de socios de ME-SIM.`}
                </p>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={deletingPartner}
                    onClick={() => setPartnerToDelete(null)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border-zinc-700'
                        : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border-zinc-300'
                    }`}
                  >
                    {isEn ? 'Cancel' : 'Cancelar'}
                  </button>
                  <button
                    type="button"
                    disabled={deletingPartner}
                    onClick={handleDeletePartner}
                    className="px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white transition-all shadow-md active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {deletingPartner ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>{isEn ? 'Deleting...' : 'Eliminando...'}</span>
                      </>
                    ) : (
                      <span>{isEn ? 'Confirm & Delete' : 'Sí, Eliminar Socio'}</span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

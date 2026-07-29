'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getTranslation } from '../../lib/i18n';

export default function DashboardPage() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [activeTab, setActiveTab] = useState('esims'); // 'esims', 'billing', 'settings'
  const [userOrders, setUserOrders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeQrModal, setActiveQrModal] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);

  // Billing form state
  const [billing, setBilling] = useState({
    firstName: '',
    lastName: '',
    company: '',
    vatId: '',
    address: '',
    city: '',
    postcode: '',
    country: 'España',
    phone: '',
  });

  const [billingMessage, setBillingMessage] = useState(null);
  const [billingSaving, setBillingSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Change Password state
  const [passwords, setPasswords] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordStatus, setPasswordStatus] = useState(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwords.newPassword || passwords.newPassword.length < 6) {
      setPasswordStatus({ type: 'error', text: lang === 'en' ? 'Password must be at least 6 characters.' : 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordStatus({ type: 'error', text: lang === 'en' ? 'Passwords do not match.' : 'Las contraseñas no coinciden.' });
      return;
    }

    setPasswordSaving(true);
    setPasswordStatus(null);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: passwords.newPassword,
          email: currentUser?.email,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPasswordStatus({ type: 'success', text: data.message });
        setPasswords({ newPassword: '', confirmPassword: '' });
      } else {
        setPasswordStatus({ type: 'error', text: data.message });
      }
    } catch {
      setPasswordStatus({ type: 'error', text: lang === 'en' ? 'Connection error.' : 'Error al conectar con el servidor.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  const t = getTranslation(lang);

  const syncState = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');

    const orders = JSON.parse(localStorage.getItem('mesim_user_orders') || '[]');
    if (orders.length === 0) {
      const demoOrder = {
        orderId: 'ORD-98214',
        esimTranNo: '898523400019283741',
        qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA:1$rsp.strongesim.com$898523400019283741',
        lpaString: 'LPA:1$rsp.strongesim.com$898523400019283741',
        title: 'eSIM España 10GB 30Days',
        country: 'España',
        iso: 'es',
        dataAmount: '10 GB',
        days: 30,
        usedGb: 8.0,
        totalGb: 10.0,
        date: '2026-07-28',
        totalPrice: '14.90 €',
      };
      setUserOrders([demoOrder]);
    } else {
      setUserOrders(orders);
    }

    const savedBilling = JSON.parse(localStorage.getItem('mesim_billing') || 'null');
    if (savedBilling) {
      setBilling(savedBilling);
    }
  };

  useEffect(() => {
    syncState();

    const handleLangChange = () => setLang(localStorage.getItem('mesim_lang') || 'es');
    window.addEventListener('mesim_lang_changed', handleLangChange);

    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch {
        setCurrentUser(null);
      }
    };
    checkSession();

    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setCurrentUser(null);
      window.dispatchEvent(new Event('mesim_auth_changed'));
      router.push('/');
    } catch {
      // ignore
    }
  };

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSaveBilling = async (e) => {
    e.preventDefault();
    setBillingSaving(true);
    setBillingMessage(null);

    try {
      const res = await fetch('/api/auth/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billing),
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('mesim_billing', JSON.stringify(billing));
        setBillingMessage({ type: 'success', text: lang === 'en' ? 'Billing details updated successfully!' : '¡Datos de facturación actualizados correctamente!' });
      } else {
        setBillingMessage({ type: 'error', text: data.message });
      }
    } catch {
      setBillingMessage({ type: 'error', text: lang === 'en' ? 'Error saving billing details.' : 'Error al guardar datos de facturación.' });
    } finally {
      setBillingSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await fetch('/api/auth/delete-account', { method: 'POST' });
      localStorage.removeItem('mesim_user_orders');
      localStorage.removeItem('mesim_billing');
      localStorage.removeItem('mesim_coupon');
      window.dispatchEvent(new Event('mesim_auth_changed'));
      alert(lang === 'en' ? 'Your account has been deleted.' : 'Tu cuenta ha sido eliminada correctamente.');
      router.push('/');
    } catch {
      alert(lang === 'en' ? 'Error deleting account.' : 'Error al eliminar la cuenta.');
    } finally {
      setDeleting(false);
    }
  };

  const handleBuyAgain = (order) => {
    const existingCart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
    const newItem = {
      cartId: `${order.iso || 'es'}-${Date.now()}`,
      iso: order.iso || 'es',
      countryName: order.country || 'España',
      planName: order.title || 'eSIM España 10GB 30Days',
      dataAmount: order.dataAmount || '10 GB',
      days: order.days || 30,
      priceEur: 14.90,
    };
    existingCart.push(newItem);
    localStorage.setItem('mesim_cart', JSON.stringify(existingCart));
    window.dispatchEvent(new Event('mesim_cart_changed'));
    router.push('/cart');
  };

  return (
    <div className="container-naked max-w-6xl font-sans pb-16">
      {/* Header Profile Title - Clean & Title Cased without surrounding white box */}
      <div className="mb-8 text-left pt-2">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-4 h-4 text-black fill-current" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
          <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            {lang === 'en' ? 'Customer Account' : 'Panel de usuario'}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-black tracking-tight mb-2">
          {lang === 'en' ? 'My Account' : 'Mi cuenta'}
        </h1>
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
          <span>
            {currentUser?.email ? `Conectado como ${currentUser.email}` : (lang === 'en' ? 'Manage your lines and profile details' : 'Gestiona tus líneas activas y tus datos de facturación')}
          </span>
        </div>
      </div>

      {/* Grid Layout: Left Sidebar Navigation + Right Content Area (Mobile First Responsive) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        {/* Left Sidebar Menu - Perfectly Leveled with Right Header */}
        <aside className="md:col-span-4 lg:col-span-3 bg-white p-3 sm:p-4 rounded-3xl border border-zinc-200 shadow-sm space-y-1.5 sticky top-6">
          {/* 1. Mis eSIMs y mi consumo */}
          <button
            onClick={() => setActiveTab('esims')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-3 ${
              activeTab === 'esims'
                ? 'bg-black text-[#ffec00] shadow-md'
                : 'text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold'
            }`}
          >
            <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
            </svg>
            <span>{lang === 'en' ? 'My eSIMs and Data Usage' : 'Mis eSIMs y mi consumo'}</span>
          </button>

          {/* 2. Datos de facturación */}
          <button
            onClick={() => setActiveTab('billing')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-3 ${
              activeTab === 'billing'
                ? 'bg-black text-[#ffec00] shadow-md'
                : 'text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold'
            }`}
          >
            <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            <span>{lang === 'en' ? 'Billing details' : 'Datos de facturación'}</span>
          </button>

          {/* 3. Ajustes y cuenta */}
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-3 ${
              activeTab === 'settings'
                ? 'bg-black text-[#ffec00] shadow-md'
                : 'text-zinc-700 hover:bg-zinc-100 hover:text-black font-semibold'
            }`}
          >
            <svg className="w-4 h-4 fill-current flex-shrink-0" viewBox="0 0 24 24">
              <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
            </svg>
            <span>{lang === 'en' ? 'Account & Settings' : 'Ajustes y cuenta'}</span>
          </button>

          {/* 4. Salir */}
          <div className="pt-2 border-t border-zinc-100 mt-2">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 rounded-2xl font-bold text-xs sm:text-sm text-zinc-600 hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-3"
            >
              <svg className="w-4 h-4 fill-current text-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
              </svg>
              <span>{lang === 'en' ? 'Sign out' : 'Salir'}</span>
            </button>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="md:col-span-8 lg:col-span-9 w-full space-y-6">
          {/* TAB 1: Mis eSIMs y mi consumo */}
          {activeTab === 'esims' && (
            <div className="space-y-6 w-full">
              {/* Section Header Title h3 + Comprar nueva eSIM button aligned perfectly */}
              <div className="flex justify-between items-center h-10">
                <h3 className="text-2xl font-bold text-black tracking-tight leading-none flex items-center">
                  {lang === 'en' ? 'My eSIMs' : 'Mis eSIMs'}
                </h3>

                <Link
                  href="/"
                  className="bg-black hover:bg-zinc-800 text-[#ffec00] font-semibold font-condensed tracking-wider uppercase px-4 py-2.5 rounded-xl text-xs sm:text-sm transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-4 h-4 fill-current text-[#ffec00] flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                  </svg>
                  <span>{lang === 'en' ? 'Buy new eSIM' : 'Comprar nueva eSIM'}</span>
                </Link>
              </div>

              {userOrders.map((order) => {
                const lpaString = order.lpaString || `LPA:1$rsp.strongesim.com$${order.esimTranNo}`;
                const qrUrl = order.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpaString)}`;

                const rawTitle = order.title || 'eSIM España 10 GB (30 días)';
                const isUnlimited = rawTitle.toLowerCase().includes('ilimitado') ||
                                    rawTitle.toLowerCase().includes('unlimited') ||
                                    rawTitle.toLowerCase().includes('/ día') ||
                                    rawTitle.toLowerCase().includes('/ day');

                // Formatted clean title display
                const cleanTitle = isUnlimited
                  ? (rawTitle.toLowerCase().includes('ilimitado') ? rawTitle : `eSIM ${order.country || 'España'} Datos Ilimitados (${order.days || 7} días)`)
                  : rawTitle;

                // Fixed GB calculation
                const used = order.usedGb || 8.0;
                const total = order.totalGb || 10.0;
                const pct = Math.min(100, Math.round((used / total) * 100));

                return (
                  <div key={order.orderId} className="bg-white rounded-3xl border border-zinc-200 p-4 sm:p-6 md:p-8 shadow-xl w-full">
                    {/* Header Row: Title, Order ID, Status & Action Button */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-100">
                      <div className="flex items-center gap-4 w-full md:w-auto">
                        <img src={`/flags/${(order.iso || 'es').toLowerCase()}.webp`} alt={order.country} className="w-12 h-12 rounded-full border border-zinc-200 object-cover shadow-sm flex-shrink-0" />
                        <div>
                          <h2 className="text-xl md:text-2xl font-bold text-black tracking-tight">{cleanTitle}</h2>
                          <p className="text-xs text-zinc-500 font-medium">
                            ID Pedido: <span className="font-mono text-black font-semibold">{order.orderId}</span> • {order.date}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-3 py-2 rounded-full uppercase tracking-wider border border-emerald-200 text-center w-full md:w-auto">
                          ● {lang === 'en' ? 'ACTIVE & OPERATIONAL' : 'ACTIVA Y OPERATIVA'}
                        </span>
                        
                        {/* Conditional Action Button: Fixed -> Comprar de nuevo | Unlimited -> Renovar plan */}
                        {!isUnlimited ? (
                          <button
                            onClick={() => handleBuyAgain(order)}
                            className="bg-black hover:bg-zinc-800 text-[#ffec00] font-bold font-condensed tracking-wider uppercase px-4 py-2.5 rounded-full text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 w-full md:w-auto"
                          >
                            <svg className="w-3.5 h-3.5 fill-current text-[#ffec00]" viewBox="0 0 24 24">
                              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
                            </svg>
                            <span>{lang === 'en' ? 'Buy again' : 'Comprar de nuevo'}</span>
                          </button>
                        ) : (
                          <Link
                            href={`/destination/${order.iso || 'es'}?tab=unlimited#plan-selector-switch`}
                            className="bg-black hover:bg-zinc-800 text-[#ffec00] font-bold font-condensed tracking-wider uppercase px-4 py-2.5 rounded-full text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 w-full md:w-auto text-center"
                          >
                            <svg className="w-3.5 h-3.5 fill-current text-[#ffec00]" viewBox="0 0 24 24">
                              <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
                            </svg>
                            <span>{lang === 'en' ? 'Renew plan' : 'Renovar plan'}</span>
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Card Content Top Row: 2 Balanced Columns (Left: Data Usage | Right: SIM Details) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 pb-6 border-b border-zinc-100">
                      {/* Left Column: Data Usage */}
                      <div className="bg-zinc-50 p-3.5 sm:p-5 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-3">
                        {!isUnlimited ? (
                          <>
                            <div className="flex flex-col text-xs font-semibold items-start gap-2.5 w-full">
                              <span className="font-bold text-black uppercase text-[11px] tracking-wide block">
                                {lang === 'en' ? 'Data Usage:' : 'Consumo de datos:'}
                              </span>
                              <div className="flex items-center gap-2 w-full flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    pct < 40
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : pct < 75
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {pct < 40
                                    ? (lang === 'en' ? 'Low' : 'Bajo')
                                    : pct < 75
                                    ? (lang === 'en' ? 'Moderate' : 'Medio')
                                    : (lang === 'en' ? 'High' : 'Alto')}
                                </span>
                                <span className="text-black font-mono font-bold text-xs sm:text-sm">{used}GB/{total}GB({pct}%)</span>
                              </div>
                            </div>

                            {/* Animated Progress Bar */}
                            <div className="w-full bg-zinc-200/70 h-6 rounded-full overflow-hidden border border-zinc-300/60 shadow-inner relative flex items-center p-0.5">
                              <div
                                className="h-full rounded-full transition-all animate-fill-bar shadow-sm flex items-center justify-center px-2 overflow-hidden"
                                style={{
                                  '--target-width': `${pct}%`,
                                  background:
                                    pct < 40
                                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                                      : pct < 75
                                      ? 'linear-gradient(90deg, #10b981 0%, #f59e0b 100%)'
                                      : 'linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%)',
                                }}
                              >
                                <span className="text-[11px] font-black text-white font-mono leading-none flex items-center justify-center h-full drop-shadow-md tracking-tight">
                                  {pct}%
                                </span>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-zinc-700 font-sans flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0"></span>
                                <span className="font-bold text-black uppercase text-[11px] tracking-wide">
                                  {lang === 'en' ? 'Data Status:' : 'Estado de datos:'}
                                </span>
                              </span>
                              <span className="text-emerald-700 font-mono font-bold text-xs">
                                {lang === 'en' ? '4G / 5G High Speed' : '4G / 5G Alta Velocidad'}
                              </span>
                            </div>

                            <div className="w-full bg-emerald-500 h-6 rounded-full overflow-hidden border border-emerald-600 shadow-sm flex items-center justify-center p-0.5">
                              <span className="text-[11px] font-black text-white font-mono leading-none tracking-wider uppercase">
                                ∞ {lang === 'en' ? 'UNLIMITED HIGH-SPEED DATA' : 'DATOS ILIMITADOS ALTA VELOCIDAD'}
                              </span>
                            </div>
                          </>
                        )}
                      </div>

                      {/* Right Column: SIM Details */}
                      <div className="bg-zinc-50 p-4 sm:p-5 rounded-2xl border border-zinc-200 text-xs space-y-2 flex flex-col justify-center">
                        <p className="font-bold text-black font-sans uppercase text-[11px] tracking-wide mb-1">
                          {lang === 'en' ? 'SIM Details' : 'Detalles de la SIM'}
                        </p>
                        <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-zinc-200">
                          <span className="text-zinc-500 font-semibold">ICCID:</span>
                          <strong className="text-black font-mono text-xs">{order.esimTranNo}</strong>
                        </div>
                        <p className="text-emerald-700 font-semibold font-sans flex items-center gap-1.5 pt-1 text-[11px]">
                          <span>✓</span>
                          <span>{lang === 'en' ? 'Automatic APN Configuration' : 'Configuración APN Automática'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Card Content Bottom Row: QR Code & Manual Code (Full Width Section) */}
                    <div className="pt-6">
                      <div className="bg-zinc-50 p-4 sm:p-6 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center gap-6">
                        <div
                          onClick={() => setActiveQrModal({ qrUrl, title: order.title, lpaString, iccid: order.esimTranNo })}
                          className="bg-white p-3 rounded-2xl border border-zinc-200 text-center cursor-pointer hover:border-black transition-all group flex-shrink-0 shadow-xs"
                          title={lang === 'en' ? 'Click to enlarge QR' : 'Clic para ampliar QR'}
                        >
                          <img src={qrUrl} alt="QR eSIM" className="w-28 h-28 object-contain mb-1 group-hover:scale-105 transition-transform" />
                          <span className="text-[10px] font-bold text-black group-hover:underline uppercase block">
                            🔍 {lang === 'en' ? 'Enlarge QR' : 'Ampliar QR'}
                          </span>
                        </div>

                        <div className="space-y-2.5 text-xs w-full min-w-0">
                          <h4 className="font-bold text-black font-sans uppercase text-xs flex items-center gap-1.5">
                            <span>📱</span>
                            <span>{lang === 'en' ? 'eSIM Installation Options' : 'Opciones de Instalación eSIM'}</span>
                          </h4>
                          <p className="text-zinc-600 text-[11px] leading-tight">
                            {lang === 'en' ? 'Scan the QR code with your phone camera or copy the manual code:' : 'Escanea el código QR con la cámara de tu móvil o copia el código manual:'}
                          </p>
                          <div className="w-full bg-white rounded-xl border border-zinc-300 p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 shadow-2xs">
                            <span className="font-mono text-[11px] text-zinc-800 truncate px-1" title={lpaString}>
                              {lpaString}
                            </span>
                            <button
                              onClick={() => handleCopyText(lpaString, order.orderId)}
                              className="text-black font-bold font-sans text-xs bg-[#ffec00] hover:bg-yellow-300 px-4 py-1.5 rounded-lg flex-shrink-0 transition-all text-center"
                            >
                              {copiedKey === order.orderId ? '¡Copiado!' : 'Copiar'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Datos de facturación */}
          {activeTab === 'billing' && (
            <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 shadow-xl w-full">
              <h2 className="text-2xl font-bold text-black mb-2 flex items-center gap-2">
                <svg className="w-6 h-6 fill-current text-black flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
                </svg>
                <span>{lang === 'en' ? 'Billing Address' : 'Dirección de Facturación'}</span>
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium mb-6">
                {lang === 'en' ? 'Manage your invoice and tax data.' : 'Gestiona tus datos de facturación para la emisión de tus facturas.'}
              </p>

              <form onSubmit={handleSaveBilling} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'First Name *' : 'Nombre *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={billing.firstName}
                      onChange={(e) => setBilling({ ...billing, firstName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'Last Name *' : 'Apellidos *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={billing.lastName}
                      onChange={(e) => setBilling({ ...billing, lastName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'Company Name (Optional)' : 'Nombre de Empresa (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={billing.company}
                      onChange={(e) => setBilling({ ...billing, company: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'VAT / NIF Number (Optional)' : 'NIF / CIF / DNI (Opcional)'}
                    </label>
                    <input
                      type="text"
                      value={billing.vatId}
                      onChange={(e) => setBilling({ ...billing, vatId: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                    {lang === 'en' ? 'Street Address *' : 'Dirección *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={billing.address}
                    onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'Town / City *' : 'Ciudad *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={billing.city}
                      onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'Postcode / ZIP *' : 'Código Postal *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={billing.postcode}
                      onChange={(e) => setBilling({ ...billing, postcode: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase mb-1.5 text-black">
                      {lang === 'en' ? 'Country *' : 'País *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={billing.country}
                      onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black"
                    />
                  </div>
                </div>

                {billingMessage && (
                  <p className={`text-xs font-semibold p-4 rounded-xl ${billingMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                    {billingMessage.text}
                  </p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={billingSaving}
                    className="bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-condensed tracking-wider uppercase px-8 py-3.5 rounded-xl text-base transition-all shadow-md border border-black/10"
                  >
                    {billingSaving ? (lang === 'en' ? 'Saving...' : 'Guardando...') : (lang === 'en' ? 'Save Billing Address' : 'Guardar Datos de Facturación')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: Ajustes y cuenta */}
          {activeTab === 'settings' && (
            <div className="space-y-8 w-full">
              {/* General Security & Change Password */}
              <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xl w-full text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-black mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 fill-current text-black flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                  </svg>
                  <span>{lang === 'en' ? 'Change Password & Security' : 'Cambiar Contraseña y Seguridad'}</span>
                </h2>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium mb-6">
                  {lang === 'en' ? 'Update your account password securely.' : 'Actualiza la contraseña de tu cuenta de cliente de forma segura.'}
                </p>

                {/* Change Password Form */}
                <form onSubmit={handleChangePasswordSubmit} className="space-y-4 mb-6 bg-zinc-50 p-4 sm:p-5 rounded-2xl border border-zinc-200 w-full">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                      {lang === 'en' ? 'New Password' : 'Nueva Contraseña'}
                    </label>
                    <input
                      type="password"
                      required
                      value={passwords.newPassword}
                      onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black font-sans bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                      {lang === 'en' ? 'Confirm New Password' : 'Confirmar Nueva Contraseña'}
                    </label>
                    <input
                      type="password"
                      required
                      value={passwords.confirmPassword}
                      onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-xl border border-zinc-300 text-black text-sm outline-none focus:border-black font-sans bg-white"
                    />
                  </div>

                  {passwordStatus && (
                    <div
                      className={`p-3 rounded-xl text-xs font-semibold border ${
                        passwordStatus.type === 'success'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {passwordStatus.text}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="w-full sm:w-auto bg-black hover:bg-zinc-800 text-[#ffec00] font-bold font-condensed tracking-wider uppercase px-6 py-3 rounded-xl text-sm transition-all shadow-md"
                  >
                    {passwordSaving
                      ? (lang === 'en' ? 'Updating...' : 'Actualizando...')
                      : (lang === 'en' ? 'Update Password' : 'Cambiar Contraseña')}
                  </button>
                </form>

                <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-xs text-zinc-700 space-y-1 w-full">
                  <p className="font-semibold text-black">✓ Email: {currentUser?.email || 'cliente@ejemplo.com'}</p>
                  <p>✓ {lang === 'en' ? 'Session Encryption: 256-bit AES Server Side' : 'Cifrado de Sesión: 256-bit AES por Servidor'}</p>
                </div>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="bg-red-50/60 rounded-3xl border border-red-200 p-6 sm:p-8 shadow-xl w-full text-left">
                <h2 className="text-xl sm:text-2xl font-bold text-red-900 mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 fill-current text-red-700 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                  </svg>
                  <span>{lang === 'en' ? 'Delete Account (GDPR)' : 'Eliminar Cuenta y Datos (RGPD)'}</span>
                </h2>
                <p className="text-xs sm:text-sm text-red-700 font-medium mb-6 leading-relaxed">
                  {lang === 'en'
                    ? 'Deleting your account will remove your saved billing data, active lines and session cookies permanently.'
                    : 'Al eliminar tu cuenta se borrarán permanentemente tus datos de facturación, líneas registradas y cookies de sesión conforme a la normativa de protección de datos.'}
                </p>

                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold font-condensed tracking-wider uppercase px-6 py-3.5 rounded-xl text-sm sm:text-base transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>{lang === 'en' ? 'Delete My Account' : 'Borrar Mi Cuenta Permanentemente'}</span>
                  </button>
                ) : (
                  <div className="bg-white p-5 rounded-2xl border border-red-300 shadow-inner space-y-4">
                    <p className="text-xs sm:text-sm font-semibold text-red-900">
                      {lang === 'en' ? 'Are you absolutely sure you want to delete your account?' : '¿Estás completamente seguro de que deseas eliminar tu cuenta?'}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting}
                        className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold font-condensed tracking-wider uppercase px-5 py-3 rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4 fill-current text-white flex-shrink-0" viewBox="0 0 24 24">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                        <span>{deleting ? (lang === 'en' ? 'Deleting...' : 'Eliminando...') : (lang === 'en' ? 'Yes, Delete Permanently' : 'Sí, Eliminar Ahora')}</span>
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="w-full sm:w-auto bg-zinc-200 hover:bg-zinc-300 text-black font-semibold font-condensed tracking-wider uppercase px-5 py-3 rounded-xl text-sm transition-all text-center"
                      >
                        {lang === 'en' ? 'Cancel' : 'Cancelar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* FULLSIZE QR CODE MODAL FOR ULTRA EASY PHONE CAMERA SCANNING */}
      {activeQrModal && (
        <div
          onClick={() => setActiveQrModal(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center space-y-4 relative border border-zinc-200"
          >
            <button
              onClick={() => setActiveQrModal(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black font-bold text-xl w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center"
            >
              ✕
            </button>

            <h3 className="text-xl font-bold font-sans text-black">{activeQrModal.title}</h3>
            <p className="text-xs text-zinc-500 font-medium">
              {lang === 'en' ? 'Scan with your mobile camera to install eSIM profile instantly' : 'Escanea con la cámara de tu teléfono para instalar el perfil de eSIM'}
            </p>

            <div className="bg-zinc-50 p-6 rounded-2xl border border-zinc-200 flex justify-center">
              <img src={activeQrModal.qrUrl} alt="QR eSIM Full" className="w-64 h-64 object-contain" />
            </div>

            <div className="text-left bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-xs space-y-1 font-mono">
              <p className="text-zinc-500 font-sans text-[11px] uppercase font-bold">{lang === 'en' ? 'eSIM Code' : 'Código de activación'}</p>
              <p className="text-black font-semibold break-all text-[11px]">{activeQrModal.lpaString}</p>
            </div>

            <button
              onClick={() => setActiveQrModal(null)}
              className="w-full bg-black hover:bg-zinc-800 text-[#ffec00] font-bold py-3 rounded-2xl text-sm uppercase tracking-wider transition-all"
            >
              {lang === 'en' ? 'Close' : 'Cerrar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

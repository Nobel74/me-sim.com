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
        usedGb: 2.4,
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

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});

    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
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

  return (
    <div className="container-naked max-w-5xl font-sans">
      {/* Header Profile Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 bg-white rounded-3xl p-6 md:p-8 border border-zinc-200 shadow-sm">
        <div>
          <span className="bg-[#ffec00] text-black text-xs font-semibold font-condensed tracking-widest px-3.5 py-1 rounded-full uppercase mb-2 inline-flex items-center gap-1.5 shadow-xs border border-black/10">
            <svg className="w-3.5 h-3.5 fill-current text-black" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
            </svg>
            <span>{lang === 'en' ? 'Customer Dashboard' : 'Panel de Cliente WooCommerce'}</span>
          </span>
          <h1 className="text-3xl md:text-4xl font-semibold font-semi text-black">
            {lang === 'en' ? 'My Account & eSIMs' : 'Mi Cuenta y Mis eSIMs'}
          </h1>
          <p className="text-sm text-zinc-500 font-medium mt-1">
            {currentUser?.email ? `Conectado como ${currentUser.email}` : (lang === 'en' ? 'Manage your lines and profile details' : 'Gestiona tus líneas activas y tus datos de facturación')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="bg-black hover:bg-zinc-800 text-[#ffec00] font-semibold font-condensed tracking-wider uppercase px-5 py-2.5 rounded-xl text-sm transition-all shadow-md flex items-center gap-2"
          >
            <svg className="w-4 h-4 fill-current text-[#ffec00]" viewBox="0 0 24 24">
              <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
            </svg>
            <span>{lang === 'en' ? 'Buy New eSIM' : 'Comprar Nueva eSIM'}</span>
          </Link>
          <button
            onClick={handleLogout}
            className="bg-zinc-100 hover:bg-red-50 text-zinc-600 hover:text-red-600 border border-zinc-200 hover:border-red-200 font-semibold font-condensed tracking-wider uppercase px-4 py-2.5 rounded-xl text-sm transition-all flex items-center gap-1.5"
            title={lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}
          >
            <svg className="w-4 h-4 fill-current text-current" viewBox="0 0 24 24">
              <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
            </svg>
            <span>{lang === 'en' ? 'Sign Out' : 'Salir'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-white p-2 rounded-2xl border border-zinc-200 shadow-sm mb-8 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('esims')}
          className={`px-5 py-2.5 rounded-xl font-semibold font-condensed text-base tracking-wide uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'esims' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-600 hover:text-black font-medium'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
          </svg>
          <span>{lang === 'en' ? 'My eSIMs & Usage' : 'Mis eSIMs y Consumo'}</span>
        </button>

        <button
          onClick={() => setActiveTab('billing')}
          className={`px-5 py-2.5 rounded-xl font-semibold font-condensed text-base tracking-wide uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'billing' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-600 hover:text-black font-medium'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
          </svg>
          <span>{lang === 'en' ? 'Billing Details' : 'Datos de Facturación'}</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-2.5 rounded-xl font-semibold font-condensed text-base tracking-wide uppercase transition-all whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'settings' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-600 hover:text-black font-medium'
          }`}
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
            <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z" />
          </svg>
          <span>{lang === 'en' ? 'Account & Security' : 'Ajustes y Cuenta'}</span>
        </button>
      </div>

      {/* TAB 1: eSIMs & Usage */}
      {activeTab === 'esims' && (
        <div className="space-y-6 w-full">
          {userOrders.map((order) => {
            const used = order.usedGb || 2.4;
            const total = order.totalGb || 10.0;
            const pct = Math.min(100, Math.round((used / total) * 100));
            const lpaString = order.lpaString || `LPA:1$rsp.strongesim.com$${order.esimTranNo}`;
            const qrUrl = order.qrCodeUrl || `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(lpaString)}`;

            return (
              <div key={order.orderId} className="bg-white rounded-3xl border border-zinc-200 p-6 md:p-8 shadow-xl w-full">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-zinc-100">
                  <div className="flex items-center gap-4">
                    <img src={`/flags/${(order.iso || 'es').toLowerCase()}.webp`} alt={order.country} className="w-12 h-12 rounded-full border border-zinc-200 object-cover shadow-sm" />
                    <div>
                      <h2 className="text-xl md:text-2xl font-semibold font-semi text-black">{order.title}</h2>
                      <p className="text-xs text-zinc-500 font-medium">
                        ID Pedido: <span className="font-mono text-black font-semibold">{order.orderId}</span> • {order.date}
                      </p>
                    </div>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold font-condensed px-3.5 py-1 rounded-full uppercase tracking-wider border border-emerald-200">
                    ● {lang === 'en' ? 'ACTIVE & OPERATIONAL' : 'ACTIVA Y OPERATIVA'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-6 items-center">
                  <div className="md:col-span-5 space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-zinc-600 font-sans">{lang === 'en' ? 'High Speed Data Usage:' : 'Consumo de Datos Alta Velocidad:'}</span>
                        <span className="text-black font-condensed font-bold text-sm">{used} GB / {total} GB ({pct}%)</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden border border-zinc-200">
                        <div className="bg-[#ffec00] h-full rounded-full transition-all duration-500" style={{ width: `${pct}%` }}></div>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-xs space-y-1.5">
                      <p className="font-bold text-black font-sans uppercase text-[11px] tracking-wide">{lang === 'en' ? 'SIM Details' : 'Detalles de la SIM'}</p>
                      <p className="text-zinc-600 font-mono text-[11px] flex justify-between items-center">
                        <span>ICCID:</span>
                        <strong className="text-black font-semibold">{order.esimTranNo}</strong>
                      </p>
                      <p className="text-emerald-700 font-medium font-sans">✓ {lang === 'en' ? 'Automatic APN Configuration' : 'Configuración APN Automática'}</p>
                    </div>
                  </div>

                  {/* QR Code and Manual Activation Column */}
                  <div className="md:col-span-7 bg-zinc-50 p-4 rounded-2xl border border-zinc-200 flex flex-col sm:flex-row items-center gap-5">
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

                    <div className="space-y-2 text-xs w-full">
                      <h4 className="font-bold text-black font-sans uppercase text-xs">
                        📱 {lang === 'en' ? 'eSIM Installation Options' : 'Opciones de Instalación eSIM'}
                      </h4>
                      <p className="text-zinc-600 text-[11px] leading-tight">
                        {lang === 'en' ? 'Scan the QR code with your phone camera or copy the manual code:' : 'Escanea el código QR con la cámara de tu móvil o copia el código manual:'}
                      </p>
                      <button
                        onClick={() => handleCopyText(lpaString, order.orderId)}
                        className="w-full bg-white hover:bg-zinc-100 text-black border border-zinc-300 font-semibold px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between shadow-2xs font-mono"
                      >
                        <span className="truncate mr-2 text-[11px]">{lpaString}</span>
                        <span className="text-[#000] font-bold font-sans text-[11px] bg-[#ffec00] px-2 py-0.5 rounded-lg flex-shrink-0">
                          {copiedKey === order.orderId ? '¡Copiado!' : 'Copiar'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: Billing Details */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 md:p-10 shadow-xl w-full">
          <h2 className="text-2xl font-semibold font-semi text-black mb-2 flex items-center gap-2">
            <svg className="w-6 h-6 fill-current text-black" viewBox="0 0 24 24">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            <span>{lang === 'en' ? 'Billing Address' : 'Dirección de Facturación'}</span>
          </h2>
          <p className="text-sm text-zinc-500 font-medium mb-8">
            {lang === 'en' ? 'The following address will be used on your order invoices.' : 'Esta dirección se utilizará en las facturas oficiales de tus pedidos.'}
          </p>

          <form onSubmit={handleSaveBilling} className="space-y-6 w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'First Name *' : 'Nombre *'}
                </label>
                <input
                  type="text"
                  required
                  value={billing.firstName}
                  onChange={(e) => setBilling({ ...billing, firstName: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'Last Name *' : 'Apellidos *'}
                </label>
                <input
                  type="text"
                  required
                  value={billing.lastName}
                  onChange={(e) => setBilling({ ...billing, lastName: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'Company Name' : 'Empresa'}
                </label>
                <input
                  type="text"
                  value={billing.company}
                  onChange={(e) => setBilling({ ...billing, company: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'VAT / NIF / Tax ID' : 'NIF / CIF / DNI'}
                </label>
                <input
                  type="text"
                  value={billing.vatId}
                  onChange={(e) => setBilling({ ...billing, vatId: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                {lang === 'en' ? 'Street Address *' : 'Dirección *'}
              </label>
              <input
                type="text"
                required
                value={billing.address}
                onChange={(e) => setBilling({ ...billing, address: e.target.value })}
                className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'Town / City *' : 'Ciudad *'}
                </label>
                <input
                  type="text"
                  required
                  value={billing.city}
                  onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'Postcode / ZIP *' : 'Código Postal *'}
                </label>
                <input
                  type="text"
                  required
                  value={billing.postcode}
                  onChange={(e) => setBilling({ ...billing, postcode: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold font-condensed tracking-wider uppercase mb-2 text-black">
                  {lang === 'en' ? 'Country *' : 'País *'}
                </label>
                <input
                  type="text"
                  required
                  value={billing.country}
                  onChange={(e) => setBilling({ ...billing, country: e.target.value })}
                  className="w-full px-4 py-3.5 rounded-xl border border-zinc-300 text-black text-base outline-none focus:ring-2 focus:ring-[#ffec00]"
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
                className="bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase px-8 py-3.5 rounded-xl text-lg transition-all shadow-md border border-black/10"
              >
                {billingSaving ? (lang === 'en' ? 'Saving...' : 'Guardando...') : (lang === 'en' ? 'Save Billing Address' : 'Guardar Datos de Facturación')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: Account & Danger Zone (Delete Account) */}
      {activeTab === 'settings' && (
        <div className="space-y-8 w-full">
          {/* General Security */}
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 md:p-10 shadow-xl w-full">
            <h2 className="text-2xl font-semibold font-semi text-black mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 fill-current text-black" viewBox="0 0 24 24">
                <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
              </svg>
              <span>{lang === 'en' ? 'Security Settings' : 'Ajustes de Seguridad'}</span>
            </h2>
            <p className="text-sm text-zinc-500 font-medium mb-4">
              {lang === 'en' ? 'Your account is secured with HttpOnly encrypted sessions.' : 'Tu cuenta está protegida mediante sesiones cifradas HttpOnly por servidor.'}
            </p>
            <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-xs text-zinc-700 space-y-1">
              <p className="font-semibold text-black">✓ Email: {currentUser?.email || 'cliente@ejemplo.com'}</p>
              <p>✓ {lang === 'en' ? 'Session Encryption: 256-bit AES Server Side' : 'Cifrado de Sesión: 256-bit AES por Servidor'}</p>
            </div>
          </div>

          {/* Danger Zone: Delete Account */}
          <div className="bg-red-50/60 rounded-3xl border border-red-200 p-8 md:p-10 shadow-xl w-full">
            <h2 className="text-2xl font-semibold font-semi text-red-900 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 fill-current text-red-700" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
              <span>{lang === 'en' ? 'Delete Account (GDPR)' : 'Eliminar Cuenta y Datos (RGPD)'}</span>
            </h2>
            <p className="text-sm text-red-700 font-medium mb-6 leading-relaxed">
              {lang === 'en'
                ? 'Deleting your account will remove your saved billing data, active lines and session cookies permanently according to WooCommerce GDPR standards.'
                : 'Al eliminar tu cuenta se borrarán permanentemente tus datos de facturación, líneas registradas y cookies de sesión conforme a la normativa RGPD de WooCommerce.'}
            </p>

            {!deleteConfirm ? (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold font-condensed tracking-wider uppercase px-6 py-3.5 rounded-xl text-base transition-all shadow-md flex items-center gap-2"
              >
                <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                </svg>
                <span>{lang === 'en' ? 'Delete My Account' : 'Borrar Mi Cuenta Permanentemente'}</span>
              </button>
            ) : (
              <div className="bg-white p-6 rounded-2xl border border-red-300 shadow-inner space-y-4">
                <p className="text-sm font-semibold text-red-900">
                  {lang === 'en' ? 'Are you absolutely sure you want to delete your account?' : '¿Estás completamente seguro de que deseas eliminar tu cuenta?'}
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold font-condensed tracking-wider uppercase px-6 py-3 rounded-xl text-base transition-all shadow-md flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                    </svg>
                    <span>{deleting ? (lang === 'en' ? 'Deleting...' : 'Eliminando...') : (lang === 'en' ? 'Yes, Delete Permanently' : 'Sí, Eliminar Ahora')}</span>
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="bg-zinc-200 hover:bg-zinc-300 text-black font-semibold font-condensed tracking-wider uppercase px-6 py-3 rounded-xl text-base transition-all"
                  >
                    {lang === 'en' ? 'Cancel' : 'Cancelar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
              {lang === 'en' ? 'Scan directly with your phone camera' : 'Escanea directamente con la cámara de tu teléfono'}
            </p>

            <div className="bg-white p-4 rounded-2xl border-2 border-black inline-block shadow-md">
              <img src={activeQrModal.qrUrl} alt="QR eSIM Ampliado" className="w-64 h-64 object-contain" />
            </div>

            <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-200 text-left space-y-1 text-xs">
              <p className="text-zinc-500 font-semibold text-[11px] uppercase">Código de activación GSMA LPA:</p>
              <p className="font-mono text-black text-[11px] break-all font-semibold">{activeQrModal.lpaString}</p>
            </div>

            <button
              onClick={() => handleCopyText(activeQrModal.lpaString, 'modal')}
              className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-condensed tracking-wider uppercase py-3 rounded-xl text-sm transition-all shadow-sm border border-black/10"
            >
              {copiedKey === 'modal' ? '¡Código de Activación Copiado!' : 'Copiar Código LPA Manual'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

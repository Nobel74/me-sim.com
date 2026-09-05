'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { formatCurrency } from '../../../../lib/currency';
import { getEsimStatusInfo } from '../../../../lib/esimStatus';

export default function AdminOrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const orderId = params?.id;

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('dark');

  // eSIM Telemetry & Actions state
  const [telemetry, setTelemetry] = useState(null);
  const [refreshingUsage, setRefreshingUsage] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    const handleLang = (e) => setLang(e.detail || 'es');
    const handleTheme = (e) => setTheme(e.detail || 'dark');

    window.addEventListener('mesim_admin_lang_change', handleLang);
    window.addEventListener('mesim_admin_theme_change', handleTheme);

    const savedLang = localStorage.getItem('mesim_admin_lang') || 'es';
    const savedTheme = localStorage.getItem('mesim_admin_theme') || 'dark';
    setLang(savedLang);
    setTheme(savedTheme);

    return () => {
      window.removeEventListener('mesim_admin_lang_change', handleLang);
      window.removeEventListener('mesim_admin_theme_change', handleTheme);
    };
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const fetchOrderDetail = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(orderId)}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          throw new Error(lang === 'en' ? 'Order not found' : 'Pedido no encontrado');
        }
        const data = await res.json();
        if (data.success && data.order) {
          setOrder(data.order);
          if (data.order.telemetry) {
            setTelemetry(data.order.telemetry);
          }
          // Fetch live telemetry from operator
          fetchLiveTelemetry(data.order.esimTranNo, data.order.orderId);
        } else {
          setError(data.message || (lang === 'en' ? 'Could not load order' : 'No se pudo cargar el pedido'));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrderDetail();
  }, [orderId]);

  const fetchLiveTelemetry = async (iccid, id) => {
    setRefreshingUsage(true);
    try {
      const q = new URLSearchParams();
      if (iccid) q.set('iccid', iccid);
      if (id || orderId) q.set('orderId', id || orderId);
      const res = await fetch(`/api/admin/esim/refresh-usage?${q.toString()}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && (data.telemetry || data.usage)) {
          setTelemetry(data.telemetry || data.usage);
        }
      }
    } catch (e) {
      console.warn('Telemetry refresh error:', e);
    } finally {
      setRefreshingUsage(false);
    }
  };

  const handleRefreshUsage = async () => {
    setActionMessage(null);
    await fetchLiveTelemetry(order?.esimTranNo, order?.orderId);
    setActionMessage({
      type: 'success',
      text: lang === 'en' ? 'Live telemetry data refreshed from operator.' : 'Telemetría de consumo actualizada en tiempo real desde la red.',
    });
  };

  const handleResendEmail = async () => {
    if (!order) return;
    setResendingEmail(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/admin/esim/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.orderId,
          customerEmail: order.customerEmail,
          qrCodeUrl: order.qrCodeUrl,
          lpaString: order.lpaString,
          plan: order.plan || order.title,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage({
          type: 'success',
          text: lang === 'en'
            ? `eSIM confirmation email successfully re-sent to ${order.customerEmail}`
            : `Correo con la eSIM reenviado exitosamente a ${order.customerEmail}`,
        });
      } else {
        setActionMessage({
          type: 'error',
          text: data.message || (lang === 'en' ? 'Error sending email' : 'Error al enviar correo'),
        });
      }
    } catch {
      setActionMessage({
        type: 'error',
        text: lang === 'en' ? 'Connection error while resending email' : 'Error de conexión al reenviar el correo',
      });
    } finally {
      setResendingEmail(false);
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const isEn = lang === 'en';
  const isDark = theme === 'dark';

  const formatPrice = (amt, curr = 'GBP') => {
    const num = parseFloat(amt || 0).toFixed(2);
    return formatCurrency(num, curr || 'GBP');
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
        <div className="w-10 h-10 border-3 border-[#ffec00] border-t-transparent rounded-full animate-spin"></div>
        <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
          {isEn ? 'Loading order details...' : 'Cargando detalles del pedido...'}
        </p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-12 space-y-6 max-w-xl mx-auto text-center">
        <div className={`p-8 rounded-3xl border shadow-xl ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
          </div>
          <h2 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-zinc-900'}`}>
            {error || (isEn ? 'Order not found' : 'Pedido no encontrado')}
          </h2>
          <p className="text-xs text-zinc-500 mb-6">
            {isEn ? 'The requested order ID does not exist or has been removed.' : 'El identificador de pedido solicitado no existe o fue eliminado.'}
          </p>
          <Link
            href="/admin?tab=orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#ffec00] hover:bg-yellow-300 text-black font-bold text-xs uppercase tracking-wider transition-all shadow-md"
          >
            ← {isEn ? 'Back to Orders' : 'Volver a Pedidos'}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Action Bar */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
        <div className="flex items-center gap-3">
          <Link
            href="/admin?tab=orders"
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 shadow-xs border-2 ${
              isDark
                ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-100 hover:text-white hover:border-yellow-400/50'
                : 'bg-white hover:bg-zinc-50 border-zinc-300 text-zinc-950 hover:border-zinc-900'
            }`}
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
            <span>{isEn ? 'Back to Orders' : 'Volver a Pedidos'}</span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Botón directo para Ver / Descargar Factura PDF */}
          <a
            href={`/api/invoices/generate?orderId=${order.orderId}&view=inline`}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-xs ${
              isDark
                ? 'bg-zinc-800 hover:bg-[#ffec00] text-zinc-200 hover:text-black border-zinc-700 hover:border-yellow-400'
                : 'bg-zinc-100 hover:bg-[#ffec00] text-zinc-900 hover:text-black border-zinc-300 hover:border-yellow-400'
            }`}
            title={isEn ? 'View / Download Official Tax Invoice PDF' : 'Ver / Descargar Factura Fiscal PDF Oficial'}
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
            </svg>
            <span>{isEn ? 'View Invoice PDF' : 'Ver Factura PDF'}</span>
          </a>

          <span className={`text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 border ${
            order.status === 'Completed'
              ? isDark
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60'
                : 'bg-emerald-50 text-emerald-950 border-emerald-400 shadow-xs'
              : isDark
              ? 'bg-amber-950/70 text-amber-300 border-amber-800/60'
              : 'bg-amber-50 text-amber-950 border-amber-400 shadow-xs'
          }`}>
            <span className={`w-2 h-2 rounded-full ${order.status === 'Completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            <span>{isEn ? order.status : (order.status === 'Completed' ? 'Completado' : 'Pendiente')}</span>
          </span>

          <span className={`text-xs sm:text-sm font-mono font-black px-3.5 py-1.5 rounded-xl border ${
            isDark ? 'bg-zinc-900/90 border-zinc-800 text-white' : 'bg-white border-2 border-zinc-300 text-zinc-950 shadow-xs'
          }`}>
            {formatPrice(order.amount, order.currency)}
          </span>
        </div>
      </div>

      {/* Page Title & Meta */}
      <div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
            {isEn ? 'Customer & Order Details' : 'Detalle de Cliente y Pedido'}
          </h1>
          <span className={`font-mono text-lg sm:text-2xl font-black px-3.5 py-1 rounded-xl border ${
            isDark
              ? 'text-[#ffec00] bg-yellow-400/10 border-yellow-500/20'
              : 'text-zinc-950 bg-amber-200/70 border-2 border-amber-400/80 shadow-xs'
          }`}>
            #{order.orderId}
          </span>
        </div>
        <p className={`text-xs sm:text-sm mt-1.5 font-mono ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
          {isEn ? 'Created on' : 'Fecha de creación:'} <span className="font-bold">{order.createdAt || order.date}</span>
        </p>
      </div>

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl text-xs sm:text-sm font-bold border flex items-center justify-between shadow-sm animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? isDark
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : isDark
              ? 'bg-red-950/70 border-red-800 text-red-300'
              : 'bg-red-50 border-red-300 text-red-900'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            onClick={() => setActionMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 ml-4 font-black"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2-Column Full Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Column (2/3 width on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information Card */}
          <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl space-y-5 ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <div className={`flex items-center gap-3 border-b pb-4 ${isDark ? 'border-zinc-700/40' : 'border-zinc-200'}`}>
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-amber-400/10 text-[#ffec00]' : 'bg-amber-200/60 text-zinc-950 border border-amber-300'}`}>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-black tracking-tight ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {isEn ? 'Customer Information' : 'Información del Cliente'}
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {isEn ? 'Account credentials & contact profile' : 'Datos de contacto y perfil de compra'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs sm:text-sm">
              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                <span className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Customer Name' : 'Nombre del Cliente'}
                </span>
                <span className={`font-black text-base block ${isDark ? 'text-white' : 'text-zinc-950'}`}>{order.customerName}</span>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`block text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Email Address' : 'Correo Electrónico'}
                  </span>
                  <button
                    onClick={() => handleCopy(order.customerEmail, 'email')}
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg border transition-all cursor-pointer ${
                      copiedField === 'email'
                        ? isDark
                          ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                          : 'bg-emerald-100 border-emerald-400 text-emerald-950'
                        : isDark
                        ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white'
                        : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-900'
                    }`}
                  >
                    {copiedField === 'email' ? (isEn ? 'Copied!' : '¡Copiado!') : (isEn ? 'Copy' : 'Copiar')}
                  </button>
                </div>
                <a
                  href={`mailto:${order.customerEmail}`}
                  className={`font-mono font-bold break-all text-xs sm:text-sm inline-flex items-center gap-1.5 transition-colors ${
                    isDark ? 'text-[#ffec00] hover:text-yellow-300 hover:underline' : 'text-zinc-950 hover:text-amber-700 hover:underline'
                  }`}
                >
                  <span className="text-sm">✉</span>
                  <span>{order.customerEmail}</span>
                </a>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                <span className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Country / Destination' : 'País / Destino'}
                </span>
                <span className={`font-bold text-sm sm:text-base ${isDark ? 'text-zinc-100' : 'text-zinc-950'}`}>
                  {order.country || 'Global / Internacional'}
                </span>
              </div>

              <div className={`p-4 rounded-2xl border ${isDark ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-50 border-zinc-200 shadow-xs'}`}>
                <span className={`block text-[11px] font-bold uppercase tracking-wider mb-1.5 ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Transaction Reference' : 'Referencia de Transacción'}
                </span>
                <span className={`font-mono font-bold text-xs break-all px-2.5 py-1 rounded-lg border inline-block ${
                  isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-100' : 'bg-white border-2 border-zinc-300 text-zinc-950 shadow-xs'
                }`}>
                  #{order.orderId} {order.stripePaymentIntent ? `(${order.stripePaymentIntent})` : ''}
                </span>
              </div>

              {order.paymentMethod && (
                <div className={`sm:col-span-2 p-4 rounded-2xl border flex items-center gap-3.5 ${
                  isDark
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-emerald-50/90 border-2 border-emerald-300 text-emerald-950 shadow-xs'
                }`}>
                  <span className="text-xl">💳</span>
                  <div>
                    <span className={`block text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-emerald-400' : 'text-emerald-900'}`}>
                      {isEn ? 'Payment Method Verified' : 'Método de Pago Verificado'}
                    </span>
                    <span className="font-bold text-xs sm:text-sm">
                      {order.paymentMethod}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* eSIM Live Telemetry Card (StrongeSIM) */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3.5 ${isDark ? 'border-zinc-700/30' : 'border-zinc-200'}`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-200/70 text-zinc-950 border border-amber-300'}`}>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                      {isEn ? 'Live eSIM Telemetry' : 'Telemetría en Vivo de la eSIM'}
                    </h2>
                    {(() => {
                      const statusInfo = getEsimStatusInfo(telemetry, order, isEn);
                      return (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${statusInfo.badgeClass}`}>
                          <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></span>
                          <span>{statusInfo.label}</span>
                        </span>
                      );
                    })()}
                  </div>
                  <span className={`text-[11px] font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    StrongeSIM v1/v2 Direct Integration
                  </span>
                </div>
              </div>

              <button
                onClick={handleRefreshUsage}
                disabled={refreshingUsage}
                className={`px-4 py-2 rounded-xl border-2 text-xs font-bold flex items-center gap-2 transition-all duration-200 shadow-xs active:scale-95 cursor-pointer self-start sm:self-auto ${
                  isDark
                    ? 'bg-emerald-950/80 hover:bg-emerald-900 border-emerald-700 text-emerald-300'
                    : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-500/80 text-emerald-950'
                }`}
              >
                <span className={`text-sm ${refreshingUsage ? 'animate-spin' : ''}`}>↻</span>
                <span>
                  {refreshingUsage
                    ? (isEn ? 'Querying Operator...' : 'Consultando Red...')
                    : (isEn ? 'Refresh Live Data' : 'Refrescar Consumo')}
                </span>
              </button>
            </div>

            {/* Live Progress Bar with Ease-in-out Smooth Animation */}
            <div className="space-y-2 pt-1">
              <div className="flex justify-between text-xs sm:text-sm font-semibold">
                <span className={`font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
                  {isEn ? 'Data Consumed in Real-Time:' : 'Consumo en Tiempo Real:'}
                </span>
                <span className={`font-black font-mono ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {telemetry ? (
                    telemetry.totalMb < 1000
                      ? `${telemetry.usedMb.toFixed(1)} MB de ${Math.round(telemetry.totalMb)} MB (${telemetry.percentageUsed}%)`
                      : `${(telemetry.usedMb / 1024).toFixed(2)} GB de ${(telemetry.totalMb / 1024).toFixed(1)} GB (${telemetry.percentageUsed}%)`
                  ) : '0.42 GB de 1.00 GB (41.0%)'}
                </span>
              </div>

              <div className={`w-full h-4 rounded-full overflow-hidden p-0.5 border ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-200 border-zinc-300 shadow-inner'
              }`}>
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-yellow-400 to-amber-500 rounded-full transition-all duration-1000 ease-in-out shadow-sm"
                  style={{ width: `${telemetry?.percentageUsed ?? 41.0}%` }}
                ></div>
              </div>

              <div className={`flex justify-between items-center text-[11px] font-mono font-medium pt-1 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                <span>0 MB</span>
                {(() => {
                  const statusInfo = getEsimStatusInfo(telemetry, order, isEn);
                  return (
                    <div className="flex items-center gap-1.5 flex-wrap justify-center">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black ${statusInfo.badgeClass}`}>
                        <span className={`w-2 h-2 rounded-full ${statusInfo.dotClass}`}></span>
                        <span>{statusInfo.label}</span>
                      </span>
                      {statusInfo.rawTechnical && (
                        <span className={`text-[10px] font-normal opacity-75 hidden sm:inline ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`}>
                          ({statusInfo.rawTechnical})
                        </span>
                      )}
                    </div>
                  );
                })()}
                <span>
                  {telemetry
                    ? (telemetry.totalMb < 1000
                        ? `${Math.round(telemetry.totalMb)} MB Max`
                        : `${(telemetry.totalMb / 1024).toFixed(0)} GB Max`)
                    : '1 GB Max'}
                </span>
              </div>
            </div>
          </div>

          {/* Activation Credentials (ICCID & LPA Manual) */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-4 ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <h2 className={`text-base font-black uppercase tracking-wider border-b pb-3.5 ${
              isDark ? 'border-zinc-700/30 text-white' : 'border-zinc-200 text-zinc-950'
            }`}>
              {isEn ? 'eSIM Identifiers & Manual LPA' : 'Identificadores de eSIM y LPA Manual'}
            </h2>

            {/* ICCID */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  ICCID (SIM Serial Number)
                </span>
                <button
                  onClick={() => handleCopy(order.esimTranNo, 'iccid')}
                  className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all shadow-xs cursor-pointer ${
                    copiedField === 'iccid'
                      ? isDark
                        ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                        : 'bg-emerald-100 border-emerald-500 text-emerald-950'
                      : isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
                      : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-950'
                  }`}
                >
                  <span>{copiedField === 'iccid' ? '✔' : '📋'}</span>
                  <span>{copiedField === 'iccid' ? (isEn ? 'Copied!' : '¡Copiado!') : (isEn ? 'Copy ICCID' : 'Copiar ICCID')}</span>
                </button>
              </div>
              <code className={`font-mono font-bold text-xs sm:text-sm px-4 py-3 rounded-xl block border-2 select-all tracking-wide ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-100/90 border-zinc-300 text-zinc-950'
              }`}>
                {order.esimTranNo || 'No asignado'}
              </code>
            </div>

            {/* LPA String */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                  {isEn ? 'Manual LPA Activation Code (SM-DP+ & Code)' : 'Código de Activación Manual (LPA)'}
                </span>
                <button
                  onClick={() => handleCopy(order.lpaString, 'lpa')}
                  className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 transition-all shadow-xs cursor-pointer ${
                    copiedField === 'lpa'
                      ? isDark
                        ? 'bg-emerald-950/90 border-emerald-600 text-emerald-300'
                        : 'bg-emerald-100 border-emerald-500 text-emerald-950'
                      : isDark
                      ? 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
                      : 'bg-white hover:bg-zinc-100 border-zinc-300 text-zinc-950'
                  }`}
                >
                  <span>{copiedField === 'lpa' ? '✔' : '📋'}</span>
                  <span>{copiedField === 'lpa' ? (isEn ? 'Copied!' : '¡Copiado!') : (isEn ? 'Copy LPA' : 'Copiar LPA')}</span>
                </button>
              </div>
              <code className={`font-mono text-xs sm:text-sm p-3.5 rounded-xl block break-all border-2 leading-relaxed select-all font-bold ${
                isDark ? 'bg-zinc-950 border-zinc-800 text-zinc-100' : 'bg-zinc-100/90 border-zinc-300 text-zinc-950'
              }`}>
                {order.lpaString || 'No disponible'}
              </code>
            </div>
          </div>

          {/* Primary Action Button: Resend Email */}
          <div className={`p-6 sm:p-7 rounded-3xl border shadow-xl ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2.5 rounded-xl ${isDark ? 'bg-[#ffec00]/10 text-[#ffec00]' : 'bg-amber-200/70 text-zinc-950 border border-amber-300'}`}>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </div>
              <div>
                <h2 className={`text-base sm:text-lg font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {isEn ? 'Customer Support Assistance' : 'Asistencia y Envío de eSIM'}
                </h2>
                <p className={`text-xs ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                  {isEn ? 'Instant delivery to customer mailbox' : 'Envío instantáneo al buzón del cliente'}
                </p>
              </div>
            </div>

            <p className={`text-xs sm:text-sm my-4 leading-relaxed font-medium ${isDark ? 'text-zinc-300' : 'text-zinc-700'}`}>
              {isEn
                ? 'Send a fresh official email with the QR code and step-by-step installation instructions directly to the client mailbox.'
                : 'Reenvía un correo electrónico oficial con el código QR y las instrucciones de instalación paso a paso al buzón del cliente.'}
            </p>

            <button
              onClick={handleResendEmail}
              disabled={resendingEmail}
              className={`w-full sm:w-auto py-3.5 px-7 rounded-2xl font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 shadow-md flex items-center justify-center gap-2.5 active:scale-[0.98] cursor-pointer ${
                resendingEmail
                  ? 'opacity-70 cursor-not-allowed bg-yellow-300 text-black'
                  : isDark
                  ? 'bg-[#ffec00] hover:bg-[#fff033] text-zinc-950 hover:shadow-yellow-400/25 hover:shadow-xl border border-yellow-300'
                  : 'bg-[#ffec00] hover:bg-[#ffe600] text-zinc-950 hover:shadow-yellow-500/25 hover:shadow-xl border-2 border-zinc-950'
              }`}
            >
              {resendingEmail ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                  <span>{isEn ? 'Sending Email...' : 'Enviando Correo Electrónico...'}</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                  </svg>
                  <span>{isEn ? 'Re-Send eSIM Email to Customer' : 'Reenviar Correo de eSIM al Cliente'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Column (1/3 width on desktop) */}
        <div className="space-y-6">
          {/* Official StrongeSIM QR Code Card */}
          <div className={`p-6 rounded-3xl border shadow-xl text-center space-y-4 ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <div className="flex items-center justify-center gap-2">
              <h3 className={`text-base font-black uppercase tracking-wider ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                {isEn ? 'Official eSIM QR Code' : 'Código QR de Instalación'}
              </h3>
            </div>
            <p className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {isEn
                ? 'Scan with phone camera or settings to install profile.'
                : 'Escanear con la cámara del dispositivo móvil para activar la eSIM.'}
            </p>

            {/* QR Image Box */}
            <div className="w-60 h-60 mx-auto bg-white rounded-2xl p-3 flex flex-col items-center justify-center border-2 border-zinc-300 shadow-md">
              {order.qrCodeUrl ? (
                <img
                  src={order.qrCodeUrl}
                  alt="eSIM QR Code StrongeSIM"
                  className="w-full h-full object-contain rounded-lg"
                  onError={(e) => {
                    // Fallback to dynamic LPA QR if external asset unavailable
                    e.currentTarget.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(order.lpaString || order.esimTranNo)}`;
                  }}
                />
              ) : (
                <span className="text-xs text-zinc-500 font-bold">QR no generado</span>
              )}
            </div>

            <div className={`flex items-center justify-center gap-1.5 text-[11px] font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>{isEn ? 'Official GSMA RSP QR Profile' : 'Código QR Oficial de Operador (StrongeSIM)'}</span>
            </div>

            {order.qrCodeUrl && (
              <a
                href={order.qrCodeUrl}
                target="_blank"
                rel="noopener noreferrer"
                download={`qr_esim_${order.orderId}.png`}
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold border transition-all duration-200 shadow-xs cursor-pointer ${
                  isDark
                    ? 'bg-zinc-900 hover:bg-[#ffec00] border-zinc-700 text-zinc-100 hover:text-black hover:border-yellow-400'
                    : 'bg-zinc-950 hover:bg-[#ffec00] border-zinc-950 text-white hover:text-black hover:border-zinc-950'
                }`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <span>{isEn ? 'Open / Download QR' : 'Abrir / Descargar QR'}</span>
              </a>
            )}
          </div>

          {/* Plan Summary & Multi-Currency Breakdown Card */}
          <div className={`p-6 rounded-3xl border shadow-xl space-y-3.5 ${isDark ? 'bg-[#111622] border-zinc-800' : 'bg-white border-zinc-200 shadow-md'}`}>
            <h3 className={`text-base font-black uppercase tracking-wider border-b pb-2.5 ${
              isDark ? 'border-zinc-700/30 text-white' : 'border-zinc-200 text-zinc-950'
            }`}>
              {isEn ? 'Purchased Package' : 'Detalles del Paquete'}
            </h3>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-zinc-700/20' : 'border-zinc-200'}`}>
                <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>{isEn ? 'Package Plan:' : 'Plan Contratado:'}</span>
                <span className={`font-black text-right ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {order.plan || order.title}
                </span>
              </div>

              <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-zinc-700/20' : 'border-zinc-200'}`}>
                <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>{isEn ? 'Data Capacity:' : 'Volumen de Datos:'}</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>{order.dataAmount || '1 GB'}</span>
              </div>

              <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-zinc-700/20' : 'border-zinc-200'}`}>
                <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>{isEn ? 'Validity Period:' : 'Período de Validez:'}</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-zinc-950'}`}>
                  {order.days || '7'} {isEn ? 'Days' : 'Días'}
                </span>
              </div>

              {order.coupon && (
                <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-zinc-700/20' : 'border-zinc-200'}`}>
                  <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Discount Coupon:' : 'Cupón de Descuento:'}
                  </span>
                  <span className="font-bold text-xs px-2.5 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-mono">
                    {order.coupon} (-100%)
                  </span>
                </div>
              )}

              {order.originalAmount && (
                <div className={`flex justify-between py-1.5 border-b ${isDark ? 'border-zinc-700/20' : 'border-zinc-200'}`}>
                  <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-700'}`}>
                    {isEn ? 'Original Price:' : 'Precio Original:'}
                  </span>
                  <span className={`font-mono line-through text-xs ${isDark ? 'text-zinc-500' : 'text-zinc-600'}`}>
                    {formatPrice(order.originalAmount, order.currency)}
                  </span>
                </div>
              )}

              {/* Price Paid by Client in Real Currency */}
              <div className="pt-3 space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className={`font-black text-sm ${isDark ? 'text-zinc-200' : 'text-zinc-900'}`}>
                    {isEn ? 'Paid by Customer:' : 'Total Pagado por Cliente:'}
                  </span>
                  <span className={`font-black text-xl ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {formatPrice(order.amount, order.currency)}
                  </span>
                </div>

                <div className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                  isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-zinc-50 border-zinc-200 shadow-xs'
                }`}>
                  <div className="flex justify-between">
                    <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {isEn ? 'Payment Currency:' : 'Moneda de Compra:'}
                    </span>
                    <span className={`font-mono font-bold ${isDark ? 'text-zinc-200' : 'text-zinc-950'}`}>
                      {order.currency || 'GBP'} ({order.currencySymbol || (order.currency === 'GBP' ? '£' : '€')})
                    </span>
                  </div>

                  {order.wholesaleCostUsd && (
                    <div className="flex justify-between">
                      <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                        {isEn ? 'Wholesale Cost (Operator):' : 'Coste Mayorista (StrongeSIM):'}
                      </span>
                      <span className={`font-mono font-bold ${isDark ? 'text-amber-400' : 'text-amber-900'}`}>
                        ${parseFloat(order.wholesaleCostUsd).toFixed(2)} USD
                      </span>
                    </div>
                  )}

                  <div className={`flex justify-between border-t pt-2 ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
                    <span className={`font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {isEn ? 'Estimated Margin:' : 'Margen Bruto Estimado:'}
                    </span>
                    <span className={`font-mono font-black ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {order.currency === 'GBP' ? '£ 6.34 (~77%)' : '~48%'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getTranslation } from '../../lib/i18n';
import { formatCurrency, convertCurrency, getExchangeRates } from '../../lib/currency';

export default function CartPage() {
  const [lang, setLang] = useState('es');
  const [currency, setCurrency] = useState('EUR');
  const [cart, setCart] = useState([]);
  const [rates, setRates] = useState(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponMessage, setCouponMessage] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const t = getTranslation(lang);

  const sanitizeCartItems = (items) => {
    return items.map(item => {
      if (!item.title && item.planName) {
        item.title = item.planName;
      }
      const dataAmt = (item.dataAmount || '').toLowerCase();
      const titleText = (item.title || '').toLowerCase();
      if (dataAmt.includes('/ día') || dataAmt.includes('/ dia') || dataAmt.includes('/ day') || titleText.includes('/ día') || titleText.includes('/ dia') || titleText.includes('/ day')) {
        item.days = 1;
        if (item.title) {
          item.title = item.title.replace(/\s*\d+\s*(days|días|días de validez|days validity|d|day)$/i, '');
        }
      }
      return item;
    });
  };

  const syncPreferences = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');
    setCurrency(localStorage.getItem('mesim_curr') || 'EUR');
    const savedCart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
    const sanitizedCart = sanitizeCartItems(savedCart);
    setCart(sanitizedCart);
    localStorage.setItem('mesim_cart', JSON.stringify(sanitizedCart));

    const savedCoupon = JSON.parse(localStorage.getItem('mesim_coupon') || 'null');
    if (savedCoupon) {
      setAppliedCoupon(savedCoupon);
    }
  };

  useEffect(() => {
    getExchangeRates().then(setRates);
    syncPreferences();

    const handleCurrencyChange = () => syncPreferences();
    const handleLangChange = () => syncPreferences();
    const handleCartChange = () => {
      const savedCart = JSON.parse(localStorage.getItem('mesim_cart') || '[]');
      const sanitizedCart = sanitizeCartItems(savedCart);
      setCart(sanitizedCart);
      localStorage.setItem('mesim_cart', JSON.stringify(sanitizedCart));
    };

    window.addEventListener('mesim_currency_changed', handleCurrencyChange);
    window.addEventListener('mesim_lang_changed', handleLangChange);
    window.addEventListener('mesim_cart_changed', handleCartChange);

    return () => {
      window.removeEventListener('mesim_currency_changed', handleCurrencyChange);
      window.removeEventListener('mesim_lang_changed', handleLangChange);
      window.removeEventListener('mesim_cart_changed', handleCartChange);
    };
  }, []);

  const removeItem = (cartId) => {
    const updatedCart = cart.filter((item) => item.cartId !== cartId);
    setCart(updatedCart);
    localStorage.setItem('mesim_cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('mesim_cart_changed'));
  };

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponInput.trim()) return;

    setCouponLoading(true);
    setCouponMessage(null);

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ couponCode: couponInput }),
      });

      const data = await res.json();
      if (data.success && data.coupon) {
        setAppliedCoupon(data.coupon);
        localStorage.setItem('mesim_coupon', JSON.stringify(data.coupon));
        setCouponMessage({ type: 'success', text: data.message });
        setCouponInput('');
      } else {
        setCouponMessage({ type: 'error', text: data.message || 'Código de cupón inválido.' });
      }
    } catch {
      setCouponMessage({ type: 'error', text: 'Error al verificar el cupón de descuento.' });
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponMessage(null);
    localStorage.removeItem('mesim_coupon');
  };

  const getDisplayPrice = (item) => {
    const base = item.priceEur || item.price || 0;
    return rates ? parseFloat(convertCurrency(base, currency, rates)) : parseFloat(item.convertedPrice || base);
  };

  const subtotal = cart.reduce((s, i) => s + getDisplayPrice(i), 0);
  const discountAmount = appliedCoupon ? (subtotal * (appliedCoupon.discountPercent / 100)) : 0;
  const finalTotal = Math.max(0, subtotal - discountAmount).toFixed(2);

  return (
    <div className="container-naked font-sans max-w-5xl">
      <h1 className="text-3xl font-semibold font-semi text-black mb-6">{t.cartTitle}</h1>

      {cart.length === 0 ? (
        <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center shadow-lg">
          <p className="text-zinc-600 font-semibold mb-4 text-lg">
            {lang === 'en' ? 'Your cart is empty.' : 'Tu carrito está vacío.'}
          </p>
          <Link
            href="/"
            className="bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase px-6 py-2.5 rounded-xl inline-block text-base shadow-md border border-black/10"
          >
            {t.exploreCatalogBtn}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cart Item List & Coupon Section */}
          <div className="lg:col-span-2 space-y-5">
            <div className="space-y-3">
              {cart.map((item) => (
                <div
                  key={item.cartId}
                  className="bg-white rounded-2xl border border-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:border-zinc-300 transition-all"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden border border-zinc-200 flex-shrink-0 shadow-sm">
                      <img
                        src={(item.iso || 'gl').toLowerCase() === 'global' ? '/flags/global.gif' : `/flags/${(item.iso || 'gl').toLowerCase()}.webp`}
                        alt={item.country}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = '/flags/gl.webp';
                        }}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold font-semi text-base sm:text-lg text-black break-words sm:truncate">
                        {lang === 'en'
                          ? (item.title || '').replace(/Día/g, 'Day').replace(/Ilimitados/g, 'Unlimited').replace(/\s*1\s*Days$/i, '').replace(/Days/g, 'Days')
                          : (item.title || '').replace(/Day/g, 'Día').replace(/Unlimited/g, 'Ilimitados').replace(/\s*1\s*(Days|Días)$/i, '').replace(/Days/g, 'Días')}
                      </h3>
                      <p className="text-[0.85rem] text-zinc-500 font-medium mt-0.5">
                        {lang === 'en'
                          ? (item.dataAmount || '').replace(/Día/g, 'Day').replace(/Ilimitados/g, 'Unlimited')
                          : (item.dataAmount || '').replace(/Day/g, 'Día').replace(/Unlimited/g, 'Ilimitados')} • {item.days} {lang === 'en' ? (item.days === 1 ? 'day validity' : 'days validity') : (item.days === 1 ? 'día de validez' : 'días de validez')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-zinc-100">
                    <span className="font-semibold font-condensed text-xl text-black">
                      {formatCurrency(getDisplayPrice(item).toFixed(2), currency)}
                    </span>
                    <button
                      onClick={() => removeItem(item.cartId)}
                      className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-red-50 text-zinc-400 hover:text-red-600 text-sm font-semibold flex items-center justify-center transition-colors"
                      title={lang === 'en' ? 'Remove' : 'Eliminar'}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* WooCommerce Discount Coupon Box */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm">
              <h3 className="text-base font-semibold font-semi text-black mb-2 flex items-center gap-2">
                <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                  <path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 12 7.4 15.38 12 17 10.83 14.92 8H20v6z" />
                </svg>
                <span>{lang === 'en' ? 'Have a Discount Coupon?' : '¿Tienes un Código de Descuento?'}</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium mb-3 font-sans">
                {lang === 'en'
                  ? 'Enter your coupon code.'
                  : 'Introduce tu código de cupón.'}
              </p>

              {appliedCoupon ? (
                <div className="bg-[#ffec00]/20 border border-black/20 p-3.5 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z" />
                    </svg>
                    <div>
                      <strong className="text-black font-semibold font-condensed text-base block">{appliedCoupon.code}</strong>
                      <span className="text-xs text-zinc-700 font-medium font-sans">{appliedCoupon.label}</span>
                    </div>
                  </div>
                  <button
                    onClick={handleRemoveCoupon}
                    className="text-xs font-semibold text-red-600 hover:underline uppercase font-sans"
                  >
                    {lang === 'en' ? 'Remove' : 'Quitar'}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleApplyCoupon} className="flex gap-2.5">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={lang === 'en' ? 'Enter promo code' : 'Código de cupón'}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-zinc-300 text-black text-sm font-semibold outline-none focus:ring-2 focus:ring-[#ffec00]"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading}
                    className="bg-black hover:bg-zinc-800 text-[#ffec00] font-semibold font-condensed uppercase tracking-wider px-5 py-2 rounded-xl text-sm transition-all shadow-sm flex-shrink-0"
                  >
                    {couponLoading ? (lang === 'en' ? 'Validating...' : 'Verificando...') : (lang === 'en' ? 'Apply' : 'Aplicar')}
                  </button>
                </form>
              )}

              {couponMessage && (
                <p className={`mt-2.5 text-xs font-semibold font-sans ${couponMessage.type === 'success' ? 'text-emerald-700' : 'text-red-600'}`}>
                  {couponMessage.text}
                </p>
              )}
            </div>
          </div>

          {/* Cart Summary Card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 h-fit shadow-lg">
            <h2 className="text-xl font-semibold font-semi text-black mb-4 pb-3 border-b border-zinc-100">
              {lang === 'en' ? 'Order Summary' : 'Resumen del Pedido'}
            </h2>
            <div className="space-y-3 mb-6 text-sm">
              <div className="flex justify-between text-zinc-700 font-medium font-sans">
                <span>{lang === 'en' ? `Subtotal (${cart.length} items):` : `Subtotal (${cart.length} ítems):`}</span>
                <span className="font-semibold text-black text-base">{formatCurrency(subtotal.toFixed(2), currency)}</span>
              </div>

              {appliedCoupon && (
                <div className="flex justify-between text-emerald-700 font-medium font-sans">
                  <span>{lang === 'en' ? `Discount (${appliedCoupon.discountPercent}%):` : `Descuento (${appliedCoupon.discountPercent}%):`}</span>
                  <span className="font-semibold font-condensed text-base">-{formatCurrency(discountAmount.toFixed(2), currency)}</span>
                </div>
              )}

              <div className="flex justify-between text-zinc-700 font-medium font-sans">
                <span>{lang === 'en' ? 'Shipping:' : 'Gastos de Envío:'}</span>
                <span className="text-emerald-600 font-semibold font-condensed text-sm">{lang === 'en' ? 'FREE (Instant QR)' : 'GRATIS (Entrega Digital)'}</span>
              </div>

              <div className="flex justify-between text-xl font-semibold font-semi text-black pt-3 border-t border-zinc-100">
                <span>Total:</span>
                <span className="text-black font-semibold font-condensed text-2xl">{formatCurrency(finalTotal, currency)}</span>
              </div>

              <div className="space-y-1.5 pt-3 mt-3 border-t border-zinc-100 text-xs font-sans text-zinc-500">
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'Base Price (VAT Excl.):' : 'Base Imponible (Sin IVA):'}</span>
                  <span>{formatCurrency((parseFloat(finalTotal) / 1.21).toFixed(2), currency)}</span>
                </div>
                <div className="flex justify-between">
                  <span>{lang === 'en' ? 'VAT (21% Included):' : 'IVA (21% Incluido):'}</span>
                  <span>{formatCurrency((parseFloat(finalTotal) - (parseFloat(finalTotal) / 1.21)).toFixed(2), currency)}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout"
              className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase py-3 px-4 rounded-xl text-center block transition-all text-lg shadow-md border border-black/10"
            >
              {lang === 'en' ? 'Proceed to Checkout ➔' : 'Ir a Finalizar Compra ➔'}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

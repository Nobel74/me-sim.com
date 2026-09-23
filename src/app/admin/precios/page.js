'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Globe,
  RotateCcw,
  Check,
  Search,
  ArrowUpRight,
  ShieldCheck,
  Shield,
  TrendingUp,
  Zap,
  Percent,
  X,
  Save,
  Sparkles,
} from 'lucide-react';
import { getExchangeRates } from '../../../lib/currency';
import LoadingProgressBar from '../../../components/LoadingProgressBar';

const REGION_LABELS = {
  'europe': { es: 'Europa (35+ Países)', en: 'Europe (35+ Countries)' },
  'north-america': { es: 'Norteamérica (US, CA, MX)', en: 'North America (US, CA, MX)' },
  'asia': { es: 'Asia General', en: 'Asia General' },
  'japan-korea-taiwan': { es: 'Japón, Corea y Taiwán', en: 'Japan, Korea & Taiwan' },
  'southeast-asia': { es: 'Sudeste Asiático (SEA 10)', en: 'Southeast Asia (SEA 10)' },
  'china-hk-macau': { es: 'China, HK y Macao', en: 'China, HK & Macau' },
  'middle-east': { es: 'Oriente Medio', en: 'Middle East' },
  'south-america': { es: 'América del Sur', en: 'South America' },
  'caribbean': { es: 'Caribe', en: 'Caribbean' },
  'africa': { es: 'África', en: 'Africa' },
  'oceania': { es: 'Oceanía (AU, NZ)', en: 'Oceania (AU, NZ)' },
  'aukus': { es: 'Alianza AUKUS (AU, UK, US)', en: 'AUKUS Alliance' },
  'europe-morocco': { es: 'Europa + Marruecos', en: 'Europe + Morocco' },
  'global': { es: 'Global Multidestino', en: 'Global Multi-destination' },
};

export default function AdminPreciosPage() {
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [selectedCurrency, setSelectedCurrency] = useState('EUR'); // 'EUR' | 'GBP' | 'USD' | 'AUD'
  const [exchangeRates, setExchangeRates] = useState({ EUR: 1.0, USD: 1.145, GBP: 0.858, AUD: 1.61 });
  const [mode, setMode] = useState('draft'); // 'draft' | 'live'
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);
  const [hasBackup, setHasBackup] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Reglas
  const [rules, setRules] = useState({
    floorPriceEur: 2.90,
    minProfitNetEur: 1.50,
    usdToEurRate: 0.926,
    defaultFallbackMarkup: 1.60,
    regionMarkups: {},
  });
  const [liveRules, setLiveRules] = useState(null);

  // Muestra de planes auditados comerciales
  const [samplePlans, setSamplePlans] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegionFilter, setSelectedRegionFilter] = useState('all');
  const [quickFilter, setQuickFilter] = useState('all'); // 'all' | 'floor' | 'variation'

  // Escuchar cambio de idioma, tema y moneda desde layout y almacenamiento local
  useEffect(() => {
    const savedLang = localStorage.getItem('mesim_admin_lang') || 'es';
    setLang(savedLang);
    const savedTheme = localStorage.getItem('mesim_admin_theme') || 'dark';
    setTheme(savedTheme);
    const savedCurrency = localStorage.getItem('mesim_admin_currency') || 'EUR';
    setSelectedCurrency(savedCurrency);

    const handleLangEvent = (e) => setLang(e.detail || 'es');
    const handleThemeEvent = (e) => setTheme(e.detail || 'dark');
    const handleCurrencyEvent = (e) => setSelectedCurrency(e.detail || 'EUR');

    window.addEventListener('mesim_admin_lang_change', handleLangEvent);
    window.addEventListener('mesim_admin_theme_change', handleThemeEvent);
    window.addEventListener('mesim_admin_currency_change', handleCurrencyEvent);

    getExchangeRates()
      .then((rates) => {
        if (rates) setExchangeRates(rates);
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('mesim_admin_lang_change', handleLangEvent);
      window.removeEventListener('mesim_admin_theme_change', handleThemeEvent);
      window.removeEventListener('mesim_admin_currency_change', handleCurrencyEvent);
    };
  }, []);

  const handleCurrencyChange = (curr) => {
    setSelectedCurrency(curr);
    localStorage.setItem('mesim_admin_currency', curr);
    window.dispatchEvent(new CustomEvent('mesim_admin_currency_change', { detail: curr }));
  };

  // Cargar datos del servidor
  const fetchRulesAndPlans = async (targetMode = mode) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/pricing-rules?mode=${targetMode}&includeSample=true`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        setLiveRules(data.liveRules);
        setHasBackup(!!data.hasBackup);
        if (data.exchangeRates) {
          setExchangeRates((prev) => ({ ...prev, ...data.exchangeRates }));
        }
        if (data.samplePlans) {
          setSamplePlans(data.samplePlans);
        }
      } else {
        setFeedback({ type: 'error', message: data.message || 'Error cargando reglas de precios' });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: `Fallo de conexión: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRulesAndPlans(mode);
  }, [mode]);

  // Manejador de cambio en inputs numéricos (soporta coma y punto decimal)
  const handleMarkupChange = (key, val) => {
    const cleanStr = String(val ?? '').replace(',', '.');
    const num = parseFloat(cleanStr);
    setRules((prev) => ({
      ...prev,
      regionMarkups: {
        ...prev.regionMarkups,
        [key]: isNaN(num) ? val : num,
      },
    }));
  };

  const handleGlobalParamChange = (field, val) => {
    const cleanStr = String(val ?? '').replace(',', '.');
    const num = parseFloat(cleanStr);
    setRules((prev) => ({
      ...prev,
      [field]: isNaN(num) ? val : num,
    }));
  };

  // Guardar borrador
  const handleSaveDraft = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', rules }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        setFeedback({
          type: 'success',
          message: lang === 'es' ? 'Borrador guardado correctamente. Listo para simular o publicar.' : 'Draft saved successfully. Ready to simulate or publish.',
        });
        fetchRulesAndPlans(mode);
      } else {
        const errorMsg = data.error ? `${data.message || 'Error'}: ${data.error}` : (data.message || data.error || 'Error al guardar');
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Restablecer borrador desde En Vivo
  const handleResetDraft = async () => {
    if (!confirm(lang === 'es' ? '¿Restablecer el borrador a los valores actualmente En Vivo?' : 'Reset draft to live values?')) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset_draft' }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        setFeedback({
          type: 'success',
          message: lang === 'es' ? 'Borrador sincronizado con producción.' : 'Draft synchronized with live production.',
        });
        fetchRulesAndPlans(mode);
      } else {
        const errorMsg = data.error ? `${data.message || 'Error'}: ${data.error}` : (data.message || data.error || 'Error al restablecer');
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Publicar cambios a producción
  const handlePublishLive = async () => {
    const confirmMsg = lang === 'es'
      ? '¿PUBLICAR CAMBIOS A PRODUCCIÓN?\n\nEsta acción actualizará de inmediato los precios en la tienda pública de ME-SIM para todos los clientes en vivo. Se creará una copia de seguridad automática para Rollback.'
      : 'PUBLISH CHANGES TO PRODUCTION?\n\nThis will immediately update live public store prices for all clients. An automatic backup will be created for Rollback.';

    if (!confirm(confirmMsg)) return;

    setPublishing(true);
    setFeedback(null);
    try {
      await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_draft', rules }),
      });

      const res = await fetch('/api/admin/pricing-rules', {
        method: 'PUT',
      });
      const data = await res.json();
      if (data.success) {
        setLiveRules(data.rules);
        setHasBackup(true);
        setFeedback({
          type: 'success',
          message: lang === 'es'
            ? '¡Precios publicados con éxito en producción! La tienda pública opera con las nuevas tarifas.'
            : 'Pricing published successfully to production! Public store is now running on new rates.',
        });
        fetchRulesAndPlans(mode);
      } else {
        const errorMsg = data.error ? `${data.message || 'Error'}: ${data.error}` : (data.message || data.error || 'Error al publicar');
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setPublishing(false);
    }
  };

  // Ejecutar Rollback
  const handleRollback = async () => {
    const confirmMsg = lang === 'es'
      ? '¿REVERTIR A LA VERSIÓN ANTERIOR (ROLLBACK)?\n\nSe restablecerán las reglas previas desde la copia de seguridad y se actualizará la tienda pública de inmediato.'
      : 'ROLLBACK TO PREVIOUS VERSION?\n\nPrevious rules from backup will be restored immediately to production.';

    if (!confirm(confirmMsg)) return;

    setRollingBack(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/pricing-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback' }),
      });
      const data = await res.json();
      if (data.success) {
        setRules(data.rules);
        setLiveRules(data.rules);
        setFeedback({
          type: 'success',
          message: lang === 'es'
            ? '¡Rollback completado con éxito! Se han restaurado las tarifas anteriores en producción.'
            : 'Rollback completed successfully! Previous production rates restored.',
        });
        fetchRulesAndPlans(mode);
      } else {
        const errorMsg = data.error ? `${data.message || 'Error'}: ${data.error}` : (data.message || data.error || 'Error al revertir');
        setFeedback({ type: 'error', message: errorMsg });
      }
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setRollingBack(false);
    }
  };

  // Helper de Formateo de Dinero en la Moneda Activa con 2 Decimales Fijos
  const formatMoney = (amountInEur, targetCurrency = selectedCurrency) => {
    const num = parseFloat(amountInEur) || 0;
    const rate = exchangeRates[targetCurrency] || 1.0;
    const converted = num * rate;
    const fixedStr = converted.toFixed(2);
    switch (targetCurrency) {
      case 'USD':
        return `$${fixedStr}`;
      case 'GBP':
        return `£${fixedStr}`;
      case 'AUD':
        return `A$${fixedStr}`;
      case 'EUR':
      default:
        return `${fixedStr} €`;
    }
  };

  // Helper para coste de proveedor dinámico
  const formatProviderCost = (plan, targetCurrency = selectedCurrency) => {
    if (targetCurrency === 'USD') {
      const usdVal = plan.costUsd !== undefined ? plan.costUsd : (plan.costEur / (rules.usdToEurRate || 0.926));
      return `$${(parseFloat(usdVal) || 0).toFixed(2)}`;
    }
    const rate = exchangeRates[targetCurrency] || 1.0;
    if (targetCurrency === 'EUR') {
      return `${(parseFloat(plan.costEur) || 0).toFixed(2)} €`;
    }
    const val = (parseFloat(plan.costEur) || 0) * rate;
    const fixed = val.toFixed(2);
    if (targetCurrency === 'GBP') return `£${fixed}`;
    if (targetCurrency === 'AUD') return `A$${fixed}`;
    return `${fixed} ${targetCurrency}`;
  };

  // Helper para PVP WEB en la moneda activa (100% alineado con tienda pública)
  const formatPvpWeb = (plan, targetCurrency = selectedCurrency) => {
    const rate = exchangeRates[targetCurrency] || 1.0;
    if (targetCurrency === 'EUR') {
      return `${(parseFloat(plan.pvpFinal) || 0).toFixed(2)} €`;
    }
    const val = (parseFloat(plan.pvpFinal) || 0) * rate;
    const fixed = val.toFixed(2);
    if (targetCurrency === 'USD') return `$${fixed}`;
    if (targetCurrency === 'GBP') return `£${fixed}`;
    if (targetCurrency === 'AUD') return `A$${fixed}`;
    return `${fixed} ${targetCurrency}`;
  };

  // Filtrado reactivo de la tabla de planes comerciales
  const filteredPlans = useMemo(() => {
    return samplePlans.filter((p) => {
      // 1. Buscador texto
      const q = searchTerm.toLowerCase().trim();
      const matchSearch = !q ||
        (p.iso && p.iso.includes(q)) ||
        (p.countryNameEs && p.countryNameEs.toLowerCase().includes(q)) ||
        (p.countryNameEn && p.countryNameEn.toLowerCase().includes(q)) ||
        (p.region && p.region.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Filtro de región
      if (selectedRegionFilter !== 'all' && p.region !== selectedRegionFilter) {
        return false;
      }

      // 3. Filtros rápidos
      if (quickFilter === 'floor') {
        return p.isFloorApplied === true || p.isMinProfitApplied === true;
      }
      if (quickFilter === 'variation') {
        return Math.abs(p.variationPct || 0) >= 20;
      }

      return true;
    });
  }, [samplePlans, searchTerm, selectedRegionFilter, quickFilter]);

  const isEs = lang === 'es';
  const isDark = theme === 'dark';

  return (
    <div className={`space-y-6 transition-colors duration-300 ${
      isDark ? 'text-zinc-100' : 'text-zinc-900'
    }`}>

      {/* 1. CABECERA PRINCIPAL (LIBERADA): Título, Modo y Selector de Divisa Global (Formato idéntico a Finanzas) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-900'
            }`}>
              {isEs ? 'Directivas de Precios y Márgenes por Zonas' : 'Regional Pricing & Margins Directives'}
            </h1>
            <span
              className={`px-3 py-1 text-xs font-black uppercase tracking-wider rounded-xl border flex items-center gap-1.5 ${
                mode === 'draft'
                  ? isDark
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                  : isDark
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${mode === 'draft' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
              {mode === 'draft' ? (isEs ? 'Modo Borrador' : 'Draft Mode') : (isEs ? 'En Vivo (Producción)' : 'Live Production')}
            </span>
          </div>
          <p className={`text-xs sm:text-sm ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEs
              ? 'Audita, simula y ajusta los multiplicadores regionales, el suelo de PVP y la tasa de conversión con cero riesgo en producción.'
              : 'Audit, simulate and update regional markups, Floor Price and FX conversion rate with zero production risk.'}
          </p>
        </div>

        {/* Switcher de 4 Monedas Oficiales: EUR, GBP, USD, AUD (Idéntico a Finanzas) */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-bold uppercase tracking-wider hidden sm:inline ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            {isEs ? 'Ver en Moneda:' : 'Currency View:'}
          </span>
          <div className={`flex items-center p-1 rounded-2xl border shadow-xs ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'
          }`}>
            {[
              { code: 'EUR', symbol: '€', name: isEs ? 'Euros' : 'Euro' },
              { code: 'GBP', symbol: '£', name: isEs ? 'Libras Esterlinas' : 'British Pound' },
              { code: 'USD', symbol: '$', name: isEs ? 'Dólares USA' : 'US Dollar' },
              { code: 'AUD', symbol: 'A$', name: isEs ? 'Dólares AUD' : 'Australian Dollar' },
            ].map((c) => {
              const active = selectedCurrency === c.code;
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

      {/* Barra de Acciones y Controles (Formato Toolbar unificado idéntico a Clientes) */}
      <div className={`p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-xs ${
        isDark ? 'bg-zinc-900/60 border-zinc-800' : 'bg-white border-zinc-200'
      }`}>
        {/* Toggle Principal de Estado: Borrador vs En Vivo */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold uppercase tracking-wider hidden md:inline ${
            isDark ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            {isEs ? 'Vista:' : 'View:'}
          </span>
          <div className={`flex items-center p-1 rounded-xl border text-xs ${
            isDark ? 'bg-zinc-950 border-zinc-800' : 'bg-zinc-100 border-zinc-200'
          }`}>
            <button
              onClick={() => setMode('draft')}
              className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 ${
                mode === 'draft'
                  ? 'bg-[#ffec00] text-black shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>{isEs ? 'Borrador' : 'Draft'}</span>
            </button>
            <button
              onClick={() => setMode('live')}
              className={`px-3.5 py-1.5 rounded-lg font-extrabold transition-all flex items-center gap-1.5 ${
                mode === 'live'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-600 hover:text-black'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isEs ? 'En Vivo' : 'Live'}</span>
            </button>
          </div>
        </div>

        {/* Botones de Acción: Secundarios (Outline) + Primario (Verde Destacado) */}
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {/* Botón Secundario: Rollback */}
          {hasBackup && (
            <button
              onClick={handleRollback}
              disabled={rollingBack || publishing || saving}
              title={isEs ? 'Restablecer versión anterior desde backup' : 'Rollback to previous backup'}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                isDark
                  ? 'border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white'
                  : 'border-zinc-300 bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-black'
              }`}
            >
              <RotateCcw className={`w-3.5 h-3.5 ${rollingBack ? 'animate-spin' : ''}`} />
              <span>{rollingBack ? (isEs ? 'Revirtiendo...' : 'Rolling back...') : (isEs ? 'Rollback / Revertir' : 'Rollback')}</span>
            </button>
          )}

          {/* Botón Secundario: Reset Borrador */}
          {mode === 'draft' && (
            <>
              <button
                onClick={handleResetDraft}
                disabled={saving || publishing}
                title={isEs ? 'Descartar cambios y sincronizar con En Vivo' : 'Discard changes and sync with Live'}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  isDark
                    ? 'border-zinc-700 bg-transparent hover:bg-zinc-800 text-zinc-300 hover:text-white'
                    : 'border-zinc-300 bg-transparent hover:bg-zinc-100 text-zinc-700 hover:text-black'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${saving ? 'animate-spin' : ''}`} />
                <span>{isEs ? 'Reset Borrador' : 'Reset Draft'}</span>
              </button>

              {/* Botón Guardar Borrador */}
              <button
                onClick={handleSaveDraft}
                disabled={saving || publishing}
                className={`px-3.5 py-2 font-extrabold rounded-xl text-xs transition-all shadow-sm flex items-center gap-1.5 ${
                  isDark
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                    : 'bg-zinc-200 hover:bg-zinc-300 text-zinc-900 border border-zinc-300'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? (isEs ? 'Guardando...' : 'Saving...') : (isEs ? 'Guardar Borrador' : 'Save Draft')}</span>
              </button>
            </>
          )}

          {/* Botón Primario: Publicar a Producción (Destacado en Verde Esmeralda) */}
          <button
            onClick={handlePublishLive}
            disabled={publishing || saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition-all shadow-md flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            <CheckCircle2 className={`w-4 h-4 ${publishing ? 'animate-spin' : ''}`} />
            <span>{publishing ? (isEs ? 'Publicando...' : 'Publishing...') : (isEs ? 'Publicar a Producción' : 'Publish to Production')}</span>
          </button>
        </div>
      </div>

      {/* Alerta de Notificación / Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold transition-all shadow-sm ${
            feedback.type === 'success'
              ? isDark
                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-200'
                : 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : isDark
                ? 'bg-rose-950/50 border-rose-500/50 text-rose-200'
                : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-75 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. PARÁMETROS GLOBALES: 3 Tarjetas Limpias (Eliminada la tarjeta redundante de FX) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: PVP Suelo (Floor Price) */}
        <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-amber-500/40' : 'bg-white border-zinc-200 hover:border-amber-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
              isDark
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                : 'bg-amber-50 text-amber-800 border-amber-300'
            }`}>
              Min 2.50 €
            </span>
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {isEs ? 'PVP Suelo (Floor Price)' : 'Floor Price (Min PVP)'}
          </p>

          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              step="0.10"
              min="2.50"
              max="10.00"
              disabled={mode === 'live'}
              value={rules.floorPriceEur ?? 2.90}
              onChange={(e) => handleGlobalParamChange('floorPriceEur', e.target.value)}
              className={`w-28 rounded-xl px-2.5 py-1 text-2xl font-black transition-all border-2 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white focus:border-[#ffec00]'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-amber-500'
              }`}
            />
            <span className={`text-xl font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>€</span>
            {selectedCurrency !== 'EUR' && (
              <span className="text-xs font-extrabold text-amber-400 font-mono ml-auto">
                ≈ {formatMoney(rules.floorPriceEur, selectedCurrency)}
              </span>
            )}
          </div>

          <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEs ? 'Ningún plan se venderá por debajo de este importe (IVA incl).' : 'No plan will sell below this price (VAT incl).'}
          </p>
        </div>

        {/* Card 2: Beneficio Neto Mínimo */}
        <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-emerald-500/40' : 'bg-white border-zinc-200 hover:border-emerald-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
              isDark
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                : 'bg-emerald-50 text-emerald-800 border-emerald-300'
            }`}>
              {isEs ? 'Margen Garantizado' : 'Guaranteed Margin'}
            </span>
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {isEs ? 'Beneficio Neto Mínimo' : 'Min Net Profit'}
          </p>

          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              step="0.10"
              min="0.50"
              max="10.00"
              disabled={mode === 'live'}
              value={rules.minProfitNetEur ?? 1.50}
              onChange={(e) => handleGlobalParamChange('minProfitNetEur', e.target.value)}
              className={`w-28 rounded-xl px-2.5 py-1 text-2xl font-black transition-all border-2 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white focus:border-[#ffec00]'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-amber-500'
              }`}
            />
            <span className={`text-xl font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>€</span>
            {selectedCurrency !== 'EUR' && (
              <span className="text-xs font-extrabold text-emerald-400 font-mono ml-auto">
                ≈ {formatMoney(rules.minProfitNetEur, selectedCurrency)}
              </span>
            )}
          </div>

          <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEs ? 'Garantía limpia tras liquidar 21% IVA y pasarela Stripe.' : 'Clean profit guarantee after 21% VAT and Stripe.'}
          </p>
        </div>

        {/* Card 3: Multiplicador Fallback */}
        <div className={`p-5 rounded-2xl border shadow-lg relative overflow-hidden transition-all duration-300 ${
          isDark ? 'bg-zinc-900/80 border-zinc-800/80 hover:border-purple-500/40' : 'bg-white border-zinc-200 hover:border-purple-500'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
              <Sliders className="w-5 h-5" />
            </div>
            <span className={`text-[11px] font-black px-2.5 py-0.5 rounded-lg border ${
              isDark
                ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                : 'bg-purple-50 text-purple-800 border-purple-300'
            }`}>
              {isEs ? 'Sin región' : 'Unmapped'}
            </span>
          </div>

          <p className={`text-xs font-bold uppercase tracking-wider ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
            {isEs ? 'Multiplicador Fallback' : 'Fallback Markup'}
          </p>

          <div className="flex items-baseline gap-2 mt-1">
            <input
              type="number"
              step="0.05"
              min="1.00"
              max="5.00"
              disabled={mode === 'live'}
              value={rules.defaultFallbackMarkup ?? 1.60}
              onChange={(e) => handleGlobalParamChange('defaultFallbackMarkup', e.target.value)}
              className={`w-28 rounded-xl px-2.5 py-1 text-2xl font-black transition-all border-2 ${
                isDark
                  ? 'bg-zinc-950 border-zinc-700 text-white focus:border-[#ffec00]'
                  : 'bg-zinc-50 border-zinc-300 text-zinc-950 focus:border-amber-500'
              }`}
            />
            <span className={`text-xl font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>×</span>
            <span className="text-xs font-extrabold text-purple-400 font-mono ml-auto">
              +{Math.round(((rules.defaultFallbackMarkup || 1.6) - 1) * 100)}%
            </span>
          </div>

          <p className={`text-xs mt-3 leading-relaxed ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
            {isEs ? 'Aplicado a destinos que no pertenezcan a las 14 zonas.' : 'Applied to destinations outside the 14 defined zones.'}
          </p>
        </div>
      </div>

      {/* 3. MULTIPLICADORES COMERCIALES POR ZONAS (14 Bloques Oficiales) */}
      <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border shadow-lg transition-all ${
        isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-zinc-200'
      }`}>
        <div className={`flex flex-wrap items-center justify-between gap-2 border-b pb-4 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
            isDark ? 'text-white' : 'text-zinc-950'
          }`}>
            <Globe className="w-5 h-5 text-[#ffec00]" />
            <span>{isEs ? 'Multiplicadores Comerciales por Zonas (14 Bloques Oficiales)' : 'Commercial Multipliers by Zone (14 Official Blocks)'}</span>
          </h2>
          {mode === 'draft' && (
            <span className={`text-xs font-extrabold flex items-center gap-1.5 ${isDark ? 'text-amber-300' : 'text-amber-800'}`}>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>{isEs ? 'Edición en modo borrador activa' : 'Draft editing mode active'}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
          {Object.entries(REGION_LABELS).map(([regKey, labelObj]) => {
            const currentVal = rules.regionMarkups?.[regKey] ?? 1.60;
            const liveVal = liveRules?.regionMarkups?.[regKey] ?? currentVal;
            const hasChanged = mode === 'draft' && currentVal !== liveVal;

            return (
              <div
                key={regKey}
                className={`p-3.5 rounded-xl border transition-all ${
                  hasChanged
                    ? isDark
                      ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-500/30'
                      : 'bg-amber-50 border-amber-400 ring-1 ring-amber-300'
                    : isDark
                      ? 'bg-zinc-950 border-zinc-800/90 hover:border-zinc-700'
                      : 'bg-zinc-50 border-zinc-200 hover:border-zinc-300 hover:bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-2">
                  <span className={`text-xs font-extrabold truncate ${
                    isDark ? 'text-zinc-200' : 'text-zinc-900'
                  }`} title={labelObj[lang] || labelObj.es}>
                    {labelObj[lang] || labelObj.es}
                  </span>
                  {hasChanged && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${
                      isDark
                        ? 'bg-amber-500/30 text-amber-200'
                        : 'bg-amber-200 text-amber-900'
                    }`}>
                      Live: {liveVal}×
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="1.00"
                    max="5.00"
                    disabled={mode === 'live'}
                    value={currentVal}
                    onChange={(e) => handleMarkupChange(regKey, e.target.value)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-sm font-black border-2 transition-all ${
                      isDark
                        ? 'bg-zinc-900 border-zinc-700 text-white focus:border-[#ffec00] focus:outline-none'
                        : 'bg-white border-zinc-300 text-zinc-950 focus:border-amber-500 focus:outline-none'
                    }`}
                  />
                  <span className={`text-xs font-black ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>×</span>
                  <span className={`text-xs font-extrabold whitespace-nowrap ${
                    isDark ? 'text-[#ffec00]' : 'text-amber-700'
                  }`}>
                    +{Math.round((currentVal - 1) * 100)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TABLA DE AUDITORÍA Y DESGLOSE FINANCIERO (Una Sola Columna de Coste Proveedor) */}
      <div className={`rounded-2xl p-5 sm:p-6 space-y-4 border shadow-lg transition-all ${
        isDark ? 'bg-zinc-900/80 border-zinc-800/80' : 'bg-white border-zinc-200'
      }`}>
        {/* Cabecera de la Tabla con Filtros Rápidos */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <div>
            <h2 className={`text-base sm:text-lg font-black flex items-center gap-2 ${
              isDark ? 'text-white' : 'text-zinc-950'
            }`}>
              <Layers className="w-5 h-5 text-[#ffec00]" />
              <span>{isEs ? 'Tabla de Desglose Financiero y Auditoría de Márgenes' : 'Financial Breakdown & Margins Audit Table'}</span>
            </h2>
            <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {isEs
                ? `Mostrando ${filteredPlans.length} planes evaluados con la directiva activa en pantalla (${mode.toUpperCase()}) en ${selectedCurrency}.`
                : `Showing ${filteredPlans.length} plans calculated with the displayed directive (${mode.toUpperCase()}) in ${selectedCurrency}.`}
            </p>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border ${
                quickFilter === 'all'
                  ? 'bg-[#ffec00] text-black border-[#ffec00] shadow-sm'
                  : isDark
                    ? 'bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
              }`}
            >
              {isEs ? 'Todos' : 'All'}
            </button>
            <button
              onClick={() => setQuickFilter('floor')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                quickFilter === 'floor'
                  ? 'bg-amber-400 text-black border-amber-400 shadow-sm'
                  : isDark
                    ? 'bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>{isEs ? 'Floor Price Aplicado' : 'Floor Price Applied'}</span>
            </button>
            <button
              onClick={() => setQuickFilter('variation')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all border flex items-center gap-1.5 ${
                quickFilter === 'variation'
                  ? 'bg-purple-400 text-black border-purple-400 shadow-sm'
                  : isDark
                    ? 'bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    : 'bg-zinc-100 text-zinc-800 border-zinc-300 hover:bg-zinc-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{isEs ? 'Variación >20%' : 'Variation >20%'}</span>
            </button>
          </div>
        </div>

        {/* Buscador de Destinos y Filtro de Región */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="w-full sm:w-80 relative">
            <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`} />
            <input
              type="text"
              placeholder={isEs ? 'Buscar por país o ISO (ej. ES, UAE)...' : 'Search by country or ISO...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-xl pl-9 pr-8 py-2 text-xs sm:text-sm font-semibold border-2 transition-all ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#ffec00] focus:outline-none'
                  : 'bg-white border-zinc-300 text-zinc-950 focus:border-amber-500 focus:outline-none'
              }`}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black ${
                  isDark ? 'text-zinc-400 hover:text-white' : 'text-zinc-500 hover:text-black'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            value={selectedRegionFilter}
            onChange={(e) => setSelectedRegionFilter(e.target.value)}
            className={`w-full sm:w-72 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold border-2 transition-all ${
              isDark
                ? 'bg-zinc-950 border-zinc-800 text-white focus:border-[#ffec00] focus:outline-none'
                : 'bg-white border-zinc-300 text-zinc-950 focus:border-amber-500 focus:outline-none'
            }`}
          >
            <option value="all">{isEs ? 'Todas las Regiones' : 'All Regions'}</option>
            {Object.entries(REGION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v[lang] || v.es}</option>
            ))}
          </select>
        </div>

        {/* Tabla Responsiva con Columna Única de Coste Proveedor */}
        <div className={`overflow-x-auto rounded-xl border ${
          isDark ? 'border-zinc-800' : 'border-zinc-200'
        }`}>
          <table className="w-full text-left text-xs border-collapse min-w-[940px]">
            <thead>
              <tr className={`border-b font-black uppercase tracking-wider text-[11px] ${
                isDark
                  ? 'bg-zinc-950 border-zinc-800 text-zinc-300'
                  : 'bg-zinc-100 border-zinc-200 text-zinc-700'
              }`}>
                <th className="py-3 px-3.5">{isEs ? 'Destino (ISO)' : 'Destination (ISO)'}</th>
                <th className="py-3 px-3">{isEs ? 'Plan / Días' : 'Plan / Validity'}</th>
                <th className="py-3 px-3 text-right">
                  {isEs ? `Coste Proveedor (${selectedCurrency})` : `Provider Cost (${selectedCurrency})`}
                </th>
                <th className="py-3 px-3 text-center">{isEs ? 'Margen (%)' : 'Markup (%)'}</th>
                <th className="py-3 px-3 text-right">
                  {isEs ? `PVP Web (${selectedCurrency})` : `Store Retail (${selectedCurrency})`}
                </th>
                <th className="py-3 px-3 text-right">{isEs ? 'IVA (21%)' : 'VAT (21%)'}</th>
                <th className="py-3 px-3 text-right">{isEs ? 'Stripe (Pasarela)' : 'Stripe Fee'}</th>
                <th className="py-3 px-3 text-right">{isEs ? 'Beneficio Neto' : 'Net Profit'}</th>
                <th className="py-3 px-3 text-center">{isEs ? 'Estado' : 'Status'}</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-sans ${
              isDark ? 'divide-zinc-800/70' : 'divide-zinc-200'
            }`}>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8">
                    <LoadingProgressBar
                      lang={lang}
                      isDark={isDark}
                      messageEs="Cargando planes..."
                      messageEn="Loading plans..."
                    />
                  </td>
                </tr>
              ) : filteredPlans.length === 0 ? (
                <tr>
                  <td colSpan={9} className={`py-8 text-center font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                    {isEs ? 'No se encontraron planes que coincidan con los filtros aplicados.' : 'No plans match the applied filters.'}
                  </td>
                </tr>
              ) : (
                filteredPlans.map((p, idx) => {
                  return (
                    <tr
                      key={`${p.id || idx}-${p.iso}-${p.dataAmount}`}
                      className={`transition-colors ${
                        isDark ? 'hover:bg-zinc-800/40 text-zinc-100' : 'hover:bg-amber-50/50 text-zinc-900'
                      }`}
                    >
                      {/* Destino (ISO) */}
                      <td className="py-2.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-black uppercase px-1.5 py-0.5 rounded border text-[11px] ${
                            isDark
                              ? 'bg-zinc-900 border-zinc-700 text-[#ffec00]'
                              : 'bg-zinc-100 border-zinc-300 text-zinc-900 font-extrabold'
                          }`}>
                            {p.iso}
                          </span>
                          <span className="font-extrabold truncate max-w-[130px]" title={p.countryNameEs}>
                            {isEs ? p.countryNameEs : p.countryNameEn}
                          </span>
                        </div>
                      </td>

                      {/* Plan / Días */}
                      <td className="py-2.5 px-3">
                        <span className="font-black block">{p.dataAmount}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[11px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {p.days}{isEs ? ' días' : ' days'}
                          </span>
                          {p.slug && (
                            <span
                              className={`font-mono text-[9px] px-1.5 py-0.5 rounded border truncate max-w-[150px] ${
                                isDark
                                  ? 'bg-zinc-950 border-zinc-700 text-zinc-400'
                                  : 'bg-zinc-100 border-zinc-300 text-zinc-600 font-semibold'
                              }`}
                              title={p.title || ''}
                            >
                              {p.slug}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Coste Proveedor Único (Convertido a la Divisa Seleccionada) */}
                      <td className="py-2.5 px-3 text-right font-mono font-extrabold">
                        <span className={isDark ? 'text-zinc-200' : 'text-zinc-800'}>
                          {formatProviderCost(p, selectedCurrency)}
                        </span>
                      </td>

                      {/* Multiplicador / Margen (%) */}
                      <td className={`py-2.5 px-3 text-center font-black ${isDark ? 'text-zinc-100' : 'text-zinc-900'}`}>
                        {p.multiplier?.toFixed(2)}×
                        <span className={`text-[11px] font-extrabold block ${
                          isDark ? 'text-zinc-400' : 'text-zinc-600'
                        }`}>
                          +{Math.round(((p.multiplier || 1) - 1) * 100)}%
                        </span>
                      </td>

                      {/* PVP Web (Sincronizado con Tienda Pública y en Divisa Activa) */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span className={`text-sm font-black block ${
                          isDark ? 'text-[#ffec00]' : 'text-amber-700'
                        }`}>
                          {formatPvpWeb(p, selectedCurrency)}
                        </span>
                        {selectedCurrency !== 'EUR' && (
                          <span className={`text-[10px] font-bold block ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                            {p.pvpFinal?.toFixed(2)} €
                          </span>
                        )}
                      </td>

                      {/* IVA (21%) */}
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>
                        {formatMoney(p.vat21, selectedCurrency)}
                      </td>

                      {/* Stripe (1.5% + 0.25) */}
                      <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                        isDark ? 'text-zinc-300' : 'text-zinc-700'
                      }`}>
                        {formatMoney(p.stripeFee, selectedCurrency)}
                      </td>

                      {/* Beneficio Neto Real */}
                      <td className="py-2.5 px-3 text-right font-mono">
                        <span
                          className={`font-black block ${
                            p.profitNetEur >= (rules.minProfitNetEur || 1.50)
                              ? isDark ? 'text-emerald-400' : 'text-emerald-700'
                              : p.profitNetEur > 0
                              ? isDark ? 'text-amber-400' : 'text-amber-700'
                              : 'text-rose-600'
                          }`}
                        >
                          +{formatMoney(p.profitNetEur, selectedCurrency)}
                        </span>
                        <span className={`text-[10px] font-bold block ${isDark ? 'text-zinc-400' : 'text-zinc-600'}`}>
                          {p.profitNetPct}% {isEs ? 'neto' : 'net'}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-2.5 px-3 text-center">
                        {p.isFloorApplied ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black whitespace-nowrap border inline-flex items-center gap-1 ${
                            isDark
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                              : 'bg-amber-100 text-amber-900 border-amber-300'
                          }`}>
                            <Shield className="w-3 h-3" />
                            <span>Floor ({formatMoney(rules.floorPriceEur, selectedCurrency)})</span>
                          </span>
                        ) : p.isMinProfitApplied ? (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black whitespace-nowrap border inline-flex items-center gap-1 ${
                            isDark
                              ? 'bg-blue-500/20 text-blue-300 border-blue-500/50'
                              : 'bg-blue-100 text-blue-900 border-blue-300'
                          }`}>
                            <TrendingUp className="w-3 h-3" />
                            <span>Margen Mín. (+{formatMoney(rules.minProfitNetEur || 1.50, selectedCurrency)})</span>
                          </span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded text-[11px] font-black whitespace-nowrap border inline-flex items-center gap-1 ${
                            isDark
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}>
                            <Check className="w-3 h-3" />
                            <span>{isEs ? 'Óptimo' : 'Optimal'}</span>
                          </span>
                        )}
                        {mode === 'draft' && Math.abs(p.variationPct || 0) >= 20 && (
                          <span className={`mt-1 px-1.5 py-0.5 rounded text-[10px] font-black block border ${
                            isDark
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                              : 'bg-purple-100 text-purple-900 border-purple-300'
                          }`}>
                            {p.variationPct > 0 ? `+${p.variationPct}%` : `${p.variationPct}%`}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

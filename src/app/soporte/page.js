'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SUPPORT_CATEGORIES, SUPPORT_ARTICLES } from '../../lib/supportData';
import CompatibilityModal from '../../components/CompatibilityModal';

export default function SupportMainPage() {
  const [lang, setLang] = useState('es');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('mesim_lang') || 'es';
    setLang(savedLang);

    const handleLangChange = () => {
      setLang(localStorage.getItem('mesim_lang') || 'es');
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const categoryList = Object.values(SUPPORT_CATEGORIES);

  const filteredArticles = SUPPORT_ARTICLES.filter((art) => {
    if (!searchQuery.trim()) return false;
    const q = searchQuery.toLowerCase().trim();
    const title = (art.title[lang] || art.title.es).toLowerCase();
    const desc = (art.desc[lang] || art.desc.es).toLowerCase();
    return title.includes(q) || desc.includes(q);
  });

  return (
    <div className="container-naked max-w-5xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">{lang === 'en' ? 'Support Center' : 'Centro de Soporte'}</span>
      </nav>

      {/* Dark Hero Header Mobile First */}
      <div className="relative rounded-3xl bg-zinc-900 text-white p-6 sm:p-10 md:p-12 mb-10 shadow-2xl overflow-hidden border border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/40 z-10"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffec00]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-20 max-w-3xl">
          <span className="bg-[#ffec00] text-black text-xs font-bold px-3.5 py-1.5 rounded-full uppercase tracking-wider mb-4 inline-block shadow-xs">
            💬 {lang === 'en' ? 'ME-SIM 24/7 Support Center' : 'Centro de Soporte ME-SIM 24/7'}
          </span>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white mb-4 leading-tight">
            {lang === 'en' ? 'How can we help you today?' : '¿En qué podemos ayudarte hoy?'}
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg mb-8 leading-relaxed font-sans">
            {lang === 'en'
              ? 'Find quick answers for activation, device compatibility, APN setup, and web account management.'
              : 'Encuentra respuestas rápidas sobre instalación, activación de datos, compatibilidad y gestión desde Tu Cuenta.'}
          </p>

          {/* Search Bar inside Hero */}
          <div className="relative max-w-xl">
            <div className="flex items-center bg-white rounded-full p-2 pl-5 shadow-2xl border-2 border-white/20 hover:border-[#ffec00] transition-all">
              <svg className="w-5 h-5 text-zinc-400 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'en' ? 'Search help articles (e.g. installation, WhatsApp, APN)...' : 'Buscar artículos de ayuda (ej. instalación, WhatsApp, recargas)...'}
                className="w-full text-black font-semibold text-sm sm:text-base outline-none bg-transparent placeholder-zinc-400"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-400 hover:text-black px-2">
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Search Results Container if Search Active */}
      {searchQuery.trim() && (
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 mb-10 shadow-xl">
          <h3 className="text-lg font-bold text-black mb-4">
            {lang === 'en' ? `Search Results for "${searchQuery}":` : `Resultados para "${searchQuery}":`}
          </h3>
          {filteredArticles.length === 0 ? (
            <p className="text-zinc-500 text-sm">
              {lang === 'en' ? 'No articles found matching your query.' : 'No se encontraron artículos con esa búsqueda.'}
            </p>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((art) => (
                <Link
                  key={art.slug}
                  href={`/soporte/articles/${art.slug}`}
                  className="block p-4 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 transition-all"
                >
                  <strong className="text-black font-bold block mb-1">{art.title[lang] || art.title.es}</strong>
                  <p className="text-zinc-600 text-xs sm:text-sm">{art.desc[lang] || art.desc.es}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main 6 Support Categories Grid */}
      <h2 className="text-2xl sm:text-3xl font-bold text-black mb-6">
        {lang === 'en' ? 'Support Categories' : 'Categorías de Soporte'}
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-14">
        {categoryList.map((cat) => {
          if (cat.isCompatibilityTrigger) {
            return (
              <button
                key={cat.slug}
                onClick={() => setIsCompModalOpen(true)}
                type="button"
                className="bg-white rounded-3xl border border-zinc-200 hover:border-black p-6 flex flex-col justify-between hover:shadow-xl transition-all group text-left w-full"
              >
                <div>
                  <div className="w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-[#ffec00] flex items-center justify-center mb-4 transition-colors">
                    {cat.icon}
                  </div>
                  <h3 className="text-xl font-bold text-black mb-2">{cat.title[lang] || cat.title.es}</h3>
                  <p className="text-zinc-600 text-sm leading-relaxed mb-4">{cat.desc[lang] || cat.desc.es}</p>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-black group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  {lang === 'en' ? 'Check Phone ➔' : 'Comprobar Móvil ➔'}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={cat.slug}
              href={`/soporte/${cat.slug}`}
              className="bg-white rounded-3xl border border-zinc-200 hover:border-black p-6 flex flex-col justify-between hover:shadow-xl transition-all group"
            >
              <div>
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 group-hover:bg-[#ffec00] flex items-center justify-center mb-4 transition-colors">
                  {cat.icon}
                </div>
                <h3 className="text-xl font-bold text-black mb-2">{cat.title[lang] || cat.title.es}</h3>
                <p className="text-zinc-600 text-sm leading-relaxed mb-4">{cat.desc[lang] || cat.desc.es}</p>
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-black group-hover:translate-x-1 transition-transform flex items-center gap-1">
                {lang === 'en' ? 'Explore Category ➔' : 'Ver Categoría ➔'}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Human Assistance Contact Banner */}
      <div className="relative rounded-3xl bg-zinc-900 text-white p-8 sm:p-10 text-center mb-14 shadow-2xl overflow-hidden border border-zinc-800">
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/50 z-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#ffec00]/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-20 max-w-2xl mx-auto space-y-4">
          <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white leading-tight">
            {lang === 'en' ? 'Did this fix your issue?' : '¿Te ha servido de ayuda esta información?'}
          </h3>

          <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-sans max-w-xl mx-auto">
            {lang === 'en'
              ? 'If not, a real human is awake right now. Reach us and we will sort it together, usually in minutes.'
              : 'Si necesitas asistencia adicional, nuestro equipo de soporte humano está activo ahora mismo. Escríbenos y lo resolveremos juntos en pocos minutos.'}
          </p>

          <div className="pt-2 flex justify-center items-center">
            <a
              href="mailto:info@me-sim.com"
              className="inline-flex items-center gap-2.5 bg-white/10 hover:bg-[#ffec00] text-white hover:text-black border border-white/20 hover:border-[#ffec00] font-semibold font-condensed tracking-wider uppercase px-6 py-3.5 rounded-full text-sm sm:text-base transition-all shadow-lg backdrop-blur-md group"
            >
              <svg className="w-5 h-5 fill-current flex-shrink-0 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
              </svg>
              <span>Email info@me-sim.com</span>
            </a>
          </div>
        </div>
      </div>

      {/* Subsection: Frequently Asked Questions (Articles List) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-zinc-100">
          <div>
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest block mb-1">
              {lang === 'en' ? 'POPULAR GUIDES' : 'GUÍAS MÁS BUSCADAS'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">
              {lang === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes'}
            </h2>
          </div>
          <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider self-start sm:self-center">
            {SUPPORT_ARTICLES.length} {lang === 'en' ? 'Articles' : 'Artículos'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SUPPORT_ARTICLES.map((art) => (
            <Link
              key={art.slug}
              href={`/soporte/articles/${art.slug}`}
              className="p-5 rounded-2xl bg-zinc-50/80 hover:bg-zinc-100 border border-zinc-200/80 hover:border-black transition-all group flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold text-black text-base sm:text-lg mb-2 group-hover:text-black leading-tight">
                  {art.title[lang] || art.title.es}
                </h3>
                <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed mb-4">
                  {art.desc[lang] || art.desc.es}
                </p>
              </div>
              <span className="text-xs font-bold text-black uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                {lang === 'en' ? 'Read Guide' : 'Leer Guía'} ➔
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Compatibility Modal */}
      <CompatibilityModal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

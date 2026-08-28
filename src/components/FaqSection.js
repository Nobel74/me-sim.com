'use client';

import { useState, useEffect } from 'react';
import { getFaqData } from '../lib/i18n';

export default function FaqSection() {
  const [lang, setLang] = useState('es');
  const [activeCategory, setActiveCategory] = useState('basics');
  const [openQuestionIndex, setOpenQuestionIndex] = useState(0);

  const syncLang = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');
  };

  useEffect(() => {
    syncLang();
    const handleLangChange = () => syncLang();
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const data = getFaqData(lang);
  const currentCategoryData = data.categories.find((c) => c.id === activeCategory) || data.categories[0];

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId);
    setOpenQuestionIndex(0);
  };

  const toggleQuestion = (index) => {
    setOpenQuestionIndex(openQuestionIndex === index ? null : index);
  };

  return (
    <section className="mt-16 mb-16 bg-white border border-zinc-200 rounded-3xl p-6 md:p-12 shadow-sm font-sans">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8">
        <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-flex items-center gap-1.5 shadow-2xs border border-black/10">
          <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          FAQS
        </span>
        <h2 className="text-3xl md:text-4xl font-bold font-semi text-black mb-3 leading-tight">
          {data.sectionTitle}
        </h2>
        <p className="text-zinc-600 text-sm md:text-base font-normal">
          {data.sectionSubtitle}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-8 scrollbar-none justify-start md:justify-center">
        {data.categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all shadow-2xs ${
                isActive
                  ? 'bg-black text-[#ffec00] shadow-md'
                  : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 border border-zinc-200'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Content Rendering */}
      {currentCategoryData.isSpecialList ? (
        <div className="max-w-3xl mx-auto space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 gap-3.5">
            {currentCategoryData.brands.map((b, idx) => {
              const renderBrandIcon = (brandId) => {
                if (brandId === 'apple') {
                  return (
                    <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.74 1.04-1.79.92-2.87-.96.04-2.13.64-2.79 1.41-.57.66-1.07 1.73-.94 2.79 1.08.08 2.18-.55 2.81-1.33z" />
                    </svg>
                  );
                }
                if (brandId === 'google') {
                  return (
                    <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                    </svg>
                  );
                }
                if (brandId === 'xiaomi') {
                  return (
                    <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M7 2v11h3v9l7-12h-4l4-8z" />
                    </svg>
                  );
                }
                if (brandId === 'other') {
                  return (
                    <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                      <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h6v4H9v-4z" />
                    </svg>
                  );
                }
                return (
                  <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                    <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
                  </svg>
                );
              };

              return (
                <div
                  key={idx}
                  className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 shadow-2xs hover:border-black transition-all flex items-start gap-3.5"
                >
                  <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center flex-shrink-0 shadow-2xs">
                    {renderBrandIcon(b.brandId)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-black text-base">{b.brand}</h4>
                      <span className="bg-[#ffec00] text-black text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-black/10">
                        ✓ Compatible
                      </span>
                    </div>
                    <p className="text-zinc-600 text-xs sm:text-sm leading-relaxed font-normal">
                      {b.models}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Important Note Callout Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
            <div className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
              </svg>
            </div>
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="font-bold text-amber-950 block mb-0.5">
                {currentCategoryData.noteTitle}:
              </strong>
              {currentCategoryData.noteText}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Smooth Accordion */
        <div className="max-w-3xl mx-auto space-y-3.5 animate-fade-in">
          {currentCategoryData.items.map((item, idx) => {
            const isOpen = openQuestionIndex === idx;

            return (
              <div
                key={idx}
                className={`bg-zinc-50 rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'border-black shadow-xs bg-white' : 'border-zinc-200 hover:border-zinc-300'
                }`}
              >
                <button
                  onClick={() => toggleQuestion(idx)}
                  className="w-full p-4 sm:p-5 text-left font-bold text-black text-sm sm:text-base flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="flex-1 leading-snug">{item.q}</span>
                  <div
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-transform duration-350 flex-shrink-0 ${
                      isOpen ? 'bg-black text-[#ffec00] rotate-180' : 'bg-zinc-200 text-zinc-600'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                <div className={`accordion-grid ${isOpen ? 'open' : ''}`}>
                  <div className="accordion-inner px-4 sm:px-5 pb-4 pt-0 text-zinc-600 text-xs sm:text-sm leading-relaxed border-t border-zinc-100">
                    <div className="pt-3 text-zinc-700 font-normal">
                      {item.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

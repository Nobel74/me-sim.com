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
        <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block shadow-2xs border border-black/10">
          💡 FAQS
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
            {currentCategoryData.brands.map((b, idx) => (
              <div
                key={idx}
                className="bg-zinc-50 rounded-2xl border border-zinc-200 p-4 shadow-2xs hover:border-black transition-all flex items-start gap-3.5"
              >
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-xl flex-shrink-0 shadow-2xs">
                  {b.icon}
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
            ))}
          </div>

          {/* Important Note Callout Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 shadow-2xs">
            <div className="text-xl flex-shrink-0">⚠️</div>
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

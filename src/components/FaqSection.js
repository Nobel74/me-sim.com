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
    <section className="mt-20 mb-16 bg-slate-50 border border-slate-200 rounded-3xl p-6 md:p-12 shadow-sm">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <span className="bg-yellow-400 text-black text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block shadow-sm">
          💡 FAQS
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-3 leading-tight">
          {data.sectionTitle}
        </h2>
        <p className="text-slate-600 text-sm md:text-base font-medium">
          {data.sectionSubtitle}
        </p>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none justify-start md:justify-center">
        {data.categories.map((cat) => {
          const isActive = cat.id === activeCategory;
          return (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-5 py-3 rounded-2xl font-extrabold text-sm whitespace-nowrap transition-all shadow-sm ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-200'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Content Rendering: Special Structured List for Category 5 vs Accordion for 1-4 */}
      {currentCategoryData.isSpecialList ? (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {currentCategoryData.brands.map((b, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-blue-300 transition-all flex items-start gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {b.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-black text-slate-900 text-lg">{b.brand}</h4>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                      ✓ Compatible
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed font-medium">
                    {b.models}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Important Note Callout Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-start gap-4 text-amber-900 shadow-sm">
            <div className="text-2xl flex-shrink-0">⚠️</div>
            <div className="text-xs md:text-sm leading-relaxed">
              <strong className="font-black text-amber-950 block mb-0.5">
                {currentCategoryData.noteTitle}:
              </strong>
              {currentCategoryData.noteText}
            </div>
          </div>
        </div>
      ) : (
        /* Standard Accordion for Categories 1 to 4 */
        <div className="max-w-3xl mx-auto space-y-4">
          {currentCategoryData.items.map((item, idx) => {
            const isOpen = openQuestionIndex === idx;

            return (
              <div
                key={idx}
                className={`bg-white rounded-2xl border transition-all overflow-hidden ${
                  isOpen ? 'border-blue-500 shadow-md ring-1 ring-blue-100' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <button
                  onClick={() => toggleQuestion(idx)}
                  className="w-full p-5 text-left font-black text-slate-900 text-base md:text-lg flex justify-between items-center gap-4 focus:outline-none"
                >
                  <span className="flex-1 leading-snug">{item.q}</span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform duration-300 flex-shrink-0 ${
                      isOpen ? 'bg-blue-600 text-white rotate-180' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0 text-slate-600 text-sm md:text-base leading-relaxed border-t border-slate-100 mt-1">
                    <div className="pt-4 text-slate-700 font-medium">
                      {item.a}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

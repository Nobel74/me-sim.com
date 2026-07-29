'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SUPPORT_CATEGORIES } from '../../../lib/supportData';

export default function SupportCategoryPage() {
  const params = useParams();
  const categorySlug = params?.category || 'about';
  const [lang, setLang] = useState('es');

  useEffect(() => {
    const savedLang = localStorage.getItem('mesim_lang') || 'es';
    setLang(savedLang);

    const handleLangChange = () => {
      setLang(localStorage.getItem('mesim_lang') || 'es');
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const category = SUPPORT_CATEGORIES[categorySlug] || SUPPORT_CATEGORIES.about;

  return (
    <div className="container-naked max-w-4xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <Link href="/soporte-prueba" className="hover:text-black transition-colors">
          {lang === 'en' ? 'Support Center' : 'Centro de Soporte'}
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">{category.title[lang] || category.title.es}</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#ffec00] flex items-center justify-center flex-shrink-0">
            {category.icon}
          </div>
          <span className="bg-black text-[#ffec00] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            {lang === 'en' ? 'Category' : 'Categoría'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-6 tracking-tight">
          {category.title[lang] || category.title.es}
        </h1>

        <div
          className="wp-content font-sans text-base sm:text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: category.content[lang] || category.content.es }}
        />

        <div className="mt-10 pt-6 border-t border-zinc-200 flex justify-between items-center">
          <Link
            href="/soporte-prueba"
            className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-1.5"
          >
            ← {lang === 'en' ? 'Back to Support Center' : 'Volver a Soporte'}
          </Link>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { SUPPORT_ARTICLES } from '../../../../lib/supportData';

export default function SupportArticlePage() {
  const params = useParams();
  const articleSlug = params?.slug || 'no-internet-after-landing';
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

  const article = SUPPORT_ARTICLES.find((a) => a.slug === articleSlug) || SUPPORT_ARTICLES[0];

  return (
    <div className="container-naked max-w-4xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <Link href="/soporte" className="hover:text-black transition-colors">
          {lang === 'en' ? 'Support Center' : 'Centro de Soporte'}
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">{lang === 'en' ? 'Article' : 'Artículo'}</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-4 inline-flex items-center gap-1.5 shadow-xs">
          <svg className="w-3.5 h-3.5 text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          {lang === 'en' ? 'Help Article' : 'Artículo de Ayuda'}
        </span>

        <h1 className="text-3xl sm:text-4xl font-bold text-black mb-6 tracking-tight">
          {article.title[lang] || article.title.es}
        </h1>

        <div
          className="wp-content font-sans text-base sm:text-lg leading-relaxed"
          dangerouslySetInnerHTML={{ __html: article.content[lang] || article.content.es }}
        />

        <div className="mt-10 pt-6 border-t border-zinc-200 flex justify-between items-center">
          <Link
            href="/soporte"
            className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-1.5"
          >
            ← {lang === 'en' ? 'Back to Support Center' : 'Volver a Soporte'}
          </Link>
        </div>
      </div>
    </div>
  );
}

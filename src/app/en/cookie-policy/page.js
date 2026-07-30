'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CookiePolicyPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch cookie policy page from WordPress REST API
    const fetchWpPage = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://me-sim.com/wp-json/wp/v2/pages?slug=cookie-policy');
        
        if (res.ok) {
          const pages = await res.json();
          if (Array.isArray(pages) && pages.length > 0) {
            setPageData(pages[0]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching WP Cookie Policy:', err);
      }

      // Fallback structure with structured HTML hierarchy
      setPageData({
        title: { rendered: 'Cookie Policy' },
        content: {
          rendered: `
            <p>At <strong>ME-SIM.COM</strong> we are committed to transparency and compliance with data protection laws (including the European GDPR). Below we inform you about the use of cookies on our platform.</p>
            
            <h2>1. What are Cookies?</h2>
            <p>Cookies are small text files that websites you visit store on your device (computer, smartphone, tablet). They are used to make the website work properly, improve security, and offer a better user experience.</p>
            
            <h2>2. Types of Cookies Used on Our Website</h2>
            <ul>
              <li><strong>Technical or Obligatory Cookies:</strong> Essential for the website to function (shopping cart, selected language, consent preferences). They cannot be disabled.</li>
              <li><strong>Analytics Cookies (Google Analytics):</strong> Help us measure website performance and optimize the browsing experience anonymously.</li>
              <li><strong>Marketing & Advertising Cookies (Google Tag Manager):</strong> Allow us to measure the effectiveness of our campaigns and deliver relevant ads.</li>
            </ul>

            <h2>3. How can you manage or revoke your preferences?</h2>
            <p>You can change your cookie settings at any time from the interactive banner in the footer of the website, or by adjusting your privacy settings directly in your browser.</p>
          `
        }
      });
      setLoading(false);
    };

    fetchWpPage();
  }, []);

  return (
    <div className="container-naked max-w-4xl font-sans">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Cookie Policy</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          {pageData?.title?.rendered || 'Cookie Policy'}
        </h1>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 font-medium animate-pulse">
            Loading Cookie Policy from WordPress...
          </div>
        ) : (
          <div
            className="wp-content font-sans text-base sm:text-lg leading-relaxed"
            dangerouslySetInnerHTML={{ __html: pageData?.content?.rendered || '' }}
          />
        )}
      </div>
    </div>
  );
}

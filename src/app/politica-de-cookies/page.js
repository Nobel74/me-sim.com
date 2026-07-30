'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PoliticaDeCookiesPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch cookie policy page from WordPress REST API
    const fetchWpPage = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://me-sim.com/wp-json/wp/v2/pages?slug=politica-de-cookies');
        
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
        title: { rendered: 'Política de Cookies' },
        content: {
          rendered: `
            <p>En <strong>ME-SIM.COM</strong> estamos comprometidos con la transparencia y el cumplimiento de las normativas de protección de datos (incluidos el RGPD europeo y las directrices de la AEPD). A continuación te informamos sobre el uso de cookies en nuestra plataforma.</p>
            
            <h2>1. ¿Qué son las Cookies?</h2>
            <p>Las cookies son pequeños archivos de texto que los sitios web que visitas almacenan en tu dispositivo (ordenador, smartphone, tablet). Se utilizan para que el sitio funcione correctamente, sea más seguro y ofrezca una mejor experiencia al usuario.</p>
            
            <h2>2. Tipos de Cookies que Utiliza Este Sitio Web</h2>
            <ul>
              <li><strong>Cookies Técnicas u Obligatorias:</strong> Indispensables para que la web funcione (carrito de compras, idioma seleccionado, preferencias de consentimiento). No se pueden desactivar.</li>
              <li><strong>Cookies de Análisis Estadístico (Google Analytics):</strong> Nos ayudan a medir el rendimiento de la web y a optimizar la experiencia de navegación de forma completamente anónima.</li>
              <li><strong>Cookies de Publicidad y Marketing (Google Tag Manager):</strong> Permiten medir la eficacia de nuestras campañas y ofrecer anuncios relevantes.</li>
            </ul>

            <h2>3. ¿Cómo configurar o revocar tus preferencias?</h2>
            <p>Puedes cambiar la configuración de tus cookies en cualquier momento desde el banner interactivo situado en el footer del sitio web, o ajustando la privacidad directamente en la configuración de tu navegador.</p>
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
        <span className="text-black font-semibold">Política de Cookies</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          {pageData?.title?.rendered || 'Política de Cookies'}
        </h1>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 font-medium animate-pulse">
            Cargando Política de Cookies desde WordPress...
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

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CondicionesDeServicioPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch terms and conditions page from WordPress REST API
    const fetchWpPage = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://me-sim.com/wp-json/wp/v2/pages?slug=condiciones-de-servicio');
        
        if (res.ok) {
          const pages = await res.json();
          if (Array.isArray(pages) && pages.length > 0) {
            setPageData(pages[0]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching WP Terms and Conditions:', err);
      }

      // Fallback structure with structured HTML hierarchy
      setPageData({
        title: { rendered: 'Condiciones de Servicio' },
        content: {
          rendered: `
            <p>Bienvenido a <strong>ME-SIM.COM</strong>. Al adquirir y utilizar nuestros perfiles de datos eSIM internacionales, usted acepta las presentes condiciones de servicio contractuales.</p>
            
            <h2>1. Descripción del Servicio</h2>
            <p><strong>ME-SIM.COM</strong> proporciona servicios de datos móviles internacionales prepagados a través de tecnología eSIM de solo datos. Los servicios no incluyen número telefónico para llamadas de voz ni SMS tradicionales, salvo uso de aplicaciones sobre datos (como WhatsApp o Telegram).</p>

            <h2>2. Compatibilidad del Dispositivo</h2>
            <p>El cliente es responsable de verificar la compatibilidad de su teléfono móvil o tablet con la tecnología eSIM y asegurarse de que el dispositivo esté libre/desbloqueado por su operador de origen antes de realizar la compra.</p>
            <ul>
              <li>Los perfiles eSIM son de un solo uso en la mayoría de los casos y no pueden transferirse a otro dispositivo una vez escaneados.</li>
              <li>El periodo de validez del plan comienza al conectarse por primera vez a una red móvil compatible en el país o región de destino.</li>
            </ul>

            <h2>3. Política de Cancelación y Reembolso</h2>
            <p>Garantizamos la máxima satisfacción. En caso de que el perfil eSIM no funcione debido a fallos técnicos imputables a nuestra red y nuestro servicio de soporte 24/7 no pueda resolverlo, se procederá al reembolso íntegro del importe abonado.</p>
            <ul>
              <li>No se emitirán reembolsos si el dispositivo del usuario no es compatible con eSIM o se encuentra bloqueado por su operador de origen.</li>
              <li>Tampoco habrá lugar a reembolso una vez comenzado el consumo de datos de forma efectiva en el destino.</li>
            </ul>

            <h2>4. Uso Aceptable</h2>
            <p>El usuario se compromete a hacer un uso lícito de la red de datos, absteniéndose de actividades fraudulentas, ataques de red o distribución de malware.</p>
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
        <span className="text-black font-semibold">Condiciones de Servicio</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          {pageData?.title?.rendered || 'Condiciones de Servicio'}
        </h1>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 font-medium animate-pulse">
            Cargando Condiciones de Servicio desde WordPress...
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

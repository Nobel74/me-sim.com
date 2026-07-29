'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PolliticaDePrivacidadPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch privacy policy page from WordPress REST API
    const fetchWpPage = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://me-sim.com/wp-json/wp/v2/pages?slug=pollitica-de-privacidad');
        
        if (res.ok) {
          const pages = await res.json();
          if (Array.isArray(pages) && pages.length > 0) {
            setPageData(pages[0]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching WP Privacy Policy:', err);
      }

      // Fallback structure with structured HTML hierarchy
      setPageData({
        title: { rendered: 'Política de Privacidad' },
        content: {
          rendered: `
            <p>En <strong>ME-SIM.COM</strong> nos tomamos muy en serio la protección y privacidad de sus datos personales. Esta política de privacidad detalla cómo recopilamos, gestionamos y salvaguardamos su información cuando contrata nuestros servicios de eSIM internacional.</p>
            
            <h2>1. Información que Recopilamos</h2>
            <p>Para poder ofrecerle nuestros servicios de conectividad internacional, recopilamos la siguiente información técnica y de contacto:</p>
            <ul>
              <li><strong>Datos de contacto:</strong> Nombre, apellidos y dirección de correo electrónico para el envío de confirmaciones y códigos QR de activación.</li>
              <li><strong>Datos de transacción:</strong> Historial de compras de planes de datos e identificador único ICCID de las eSIMs generadas.</li>
              <li><strong>Datos de pago cifrados:</strong> Procesamiento seguro mediante pasarelas de pago homologadas (Stripe) con cifrado SSL/TLS. No almacenamos datos de tarjetas de crédito.</li>
            </ul>

            <h2>2. Finalidad y Uso de los Datos</h2>
            <p>La información recopilada se destina de forma exclusiva a las siguientes finalidades del servicio:</p>
            <ul>
              <li>Emisión instantánea y entrega de perfiles eSIM en su correo electrónico y panel de cliente.</li>
              <li>Monitoreo de consumo de datos móviles en tiempo real y soporte técnico 24/7 durante sus viajes.</li>
              <li>Cumplimiento de las obligaciones fiscales y legales de facturación vigentes.</li>
            </ul>

            <h2>3. Seguridad y Protección de la Información</h2>
            <p>Garantizamos la confidencialidad absoluta de sus datos personales. <strong>ME-SIM.COM</strong> no vende, alquila ni cede sus datos a terceros con fines comerciales o publicitarios.</p>

            <h2>4. Sus Derechos de Privacidad</h2>
            <p>En cualquier momento puede ejercer sus derechos de acceso, rectificación, cancelación u oposición (ARCO) sobre sus datos de usuario poniéndose en contacto con nuestro equipo a través de <strong>info@me-sim.com</strong>.</p>
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
        <span className="text-black font-semibold">Política de Privacidad</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          {pageData?.title?.rendered || 'Política de Privacidad'}
        </h1>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 font-medium animate-pulse">
            Cargando Política de Privacidad desde WordPress...
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

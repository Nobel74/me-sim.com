'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function PoliticaDeReembolsoPage() {
  const [pageData, setPageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch refund policy page from WordPress REST API
    const fetchWpPage = async () => {
      try {
        setLoading(true);
        const res = await fetch('https://me-sim.com/wp-json/wp/v2/pages?slug=politica-de-reembolso');
        
        if (res.ok) {
          const pages = await res.json();
          if (Array.isArray(pages) && pages.length > 0) {
            setPageData(pages[0]);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error fetching WP Refund Policy:', err);
      }

      // Fallback structure with structured HTML hierarchy
      setPageData({
        title: { rendered: 'Política de Reembolso' },
        content: {
          rendered: `
            <p>En <strong>ME-SIM.COM</strong> estamos comprometidos con la satisfacción total de nuestros clientes y la calidad de nuestra conectividad móvil global. Esta política detalla los supuestos y procedimientos para solicitar la devolución o reembolso de su compra.</p>
            
            <h2>1. Garantía de Conexión y Casos Reembolsables</h2>
            <p>Se aprobará el reembolso del 100% del importe de la eSIM en las siguientes situaciones comprobables:</p>
            <ul>
              <li><strong>Fallo técnico de red:</strong> Si la eSIM no puede conectarse ni activar datos móviles en el país de destino debido a incidencias de la red proveedora o error en la generación del perfil QR.</li>
              <li><strong>Imposibilidad de solución por soporte:</strong> Cuando nuestro equipo de atención 24/7 no logre restablecer la conectividad de su plan tras seguir los pasos de configuración guiados.</li>
              <li><strong>Duplicación de pedido:</strong> Si se ha realizado una compra duplicada accidentalmente antes de escanear o instalar el perfil.</li>
            </ul>

            <h2>2. Excepciones y Supuestos No Reembolsables</h2>
            <p>No se procesarán devoluciones ni reembolsos en las siguientes circunstancias:</p>
            <ul>
              <li><strong>Dispositivo incompatible o bloqueado:</strong> Si el teléfono del usuario no soporta tecnología eSIM o se encuentra bloqueado por la compañía telefónica de origen. El usuario debe comprobar la compatibilidad de su modelo antes de comprar.</li>
              <li><strong>Uso y consumo iniciado:</strong> Una vez que la eSIM se ha conectado exitosamente a la red móvil y ha comenzado el consumo efectivo de megabytes.</li>
              <li><strong>Datos de contacto incorrectos introducidos por el usuario:</strong> Si se ingresa una dirección de correo errónea en el checkout (aunque nuestro soporte podrá reenviar el QR a la cuenta correcta).</li>
            </ul>

            <h2>3. Procedimiento para Solicitar un Reembolso</h2>
            <p>Para gestionar una solicitud de reembolso, envíe un correo a <strong>info@me-sim.com</strong> adjuntando:</p>
            <ul>
              <li>Número de pedido o código ICCID de la eSIM.</li>
              <li>Captura de pantalla de los ajustes de red móvil de su dispositivo.</li>
              <li>Breve descripción del fallo experimentado.</li>
            </ul>
            <p>Las solicitudes se evalúan y procesan en un plazo máximo de 24 a 48 horas hábiles. La devolución se abonará mediante el mismo método de pago utilizado en la compra original.</p>
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
        <span className="text-black font-semibold">Política de Reembolso</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black mb-6 tracking-tight">
          {pageData?.title?.rendered || 'Política de Reembolso'}
        </h1>

        {loading ? (
          <div className="py-12 text-center text-zinc-400 font-medium animate-pulse">
            Cargando Política de Reembolso desde WordPress...
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

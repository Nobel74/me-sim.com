'use client';

import Link from 'next/link';

export default function PoliticaDeCookiesPage() {
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
          Política de Cookies
        </h1>

        <div className="wp-content font-sans text-base sm:text-lg leading-relaxed">
          <p>En <strong>ME-SIM.COM</strong> estamos comprometidos con la transparencia y el cumplimiento de las normativas de protección de datos (incluidos el RGPD europeo y las directrices de la AEPD). A continuación te informamos sobre el uso de cookies en nuestra plataforma.</p>
          
          <h2>1. ¿Qué son las Cookies?</h2>
          <p>Las cookies son pequeños archivos de texto que los sitios web que visitas almacenan en tu dispositivo (ordenador, smartphone, tablet). Se utilizan para que el sitio funcione correctamente, sea más seguro y ofrezca una mejor experiencia al usuario.</p>
          
          <h2>2. Tipos de Cookies que Utiliza Este Sitio Web</h2>
          <ul>
            <li><strong>Cookies Técnicas u Obligatorias:</strong> Indispensables para que la web funcione (carrito de compras, idioma seleccionado, preferencias de consentimiento). No se pueden desactivar.</li>
            <li><strong>Cookies de Análisis Estadístico (Google Analytics):</strong> Nos ayudan a medir el rendimiento de la web y a optimizar la experiencia de navegación de forma completamente anónima.</li>
            <li><strong>Cookies de Publicidad y Marketing (Google Tag Manager):</strong> Permiten medir la eficacia de nuestras campañas y ofrecer anuncios relevantes.</li>
          </ul>

          <h2>3. Listado Detallado de Cookies Utilizadas</h2>
          <table>
            <thead>
              <tr>
                <th>Proveedor / Cookie</th>
                <th>Nombre técnico / Almacenamiento</th>
                <th>Duración</th>
                <th>Finalidad</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_lang</code> / <code>localStorage</code></td>
                <td>Persistente</td>
                <td>Guarda la preferencia de idioma del usuario (ES/EN).</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_curr</code> / <code>localStorage</code></td>
                <td>Persistente</td>
                <td>Almacena la preferencia de moneda (EUR, USD, etc.).</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_cart</code> / <code>localStorage</code></td>
                <td>Persistente</td>
                <td>Guarda la información del carrito de compras del usuario.</td>
              </tr>
              <tr>
                <td><strong>ME-SIM.COM</strong></td>
                <td><code>mesim_cookie_consent</code> / <code>localStorage</code></td>
                <td>1 año</td>
                <td>Registra las preferencias de consentimiento del usuario sobre cookies.</td>
              </tr>
              <tr>
                <td><strong>Google Analytics (G-XZ9CSKPTFH)</strong></td>
                <td><code>_ga</code>, <code>_ga_*</code>, <code>_gid</code></td>
                <td>Hasta 2 años</td>
                <td>Analiza estadísticas de tráfico y visitas del usuario de forma anónima.</td>
              </tr>
              <tr>
                <td><strong>Google Tag Manager (GTM-PHSFJ537)</strong></td>
                <td>Contenedor de scripts</td>
                <td>Sesión</td>
                <td>Inyección y gestión de tags de marketing, píxeles de conversión y analítica.</td>
              </tr>
            </tbody>
          </table>

          <h2>4. ¿Cómo configurar o revocar tus preferencias?</h2>
          <p>Puedes cambiar la configuración de tus cookies en cualquier momento desde el banner interactivo situado en el footer del sitio web, o ajustando la privacidad directamente en la configuración de tu navegador.</p>
        </div>
      </div>
    </div>
  );
}

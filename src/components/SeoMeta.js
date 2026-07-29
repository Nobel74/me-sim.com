'use client';

import { useEffect } from 'react';

/**
 * Componente SeoMeta para inyectar dinámicamente canónicas, alternates hreflang y JSON-LD.
 * Debido a que se usa Next.js client-side rendering en algunas páginas con hooks interactivos,
 * este componente nos permite actualizar el <head> de forma reactiva y limpia.
 */
export default function SeoMeta({
  path = '',
  schemaJson = null,
}) {
  useEffect(() => {
    const siteUrl = 'https://me-sim.com';
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const canonicalUrl = `${siteUrl}${cleanPath === '/' ? '' : cleanPath}`;
    
    // 1. Manejar link canonical
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', canonicalUrl);

    // 2. Manejar alternates (hreflang)
    // Eliminamos hreflangs previos que correspondan al path dinámico para evitar duplicaciones
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

    const isEnglishPath = cleanPath.startsWith('/en');
    const baseSlug = isEnglishPath ? cleanPath.replace(/^\/en/, '') : cleanPath;

    const hreflangEs = `${siteUrl}${baseSlug === '/' ? '' : baseSlug}`;
    const hreflangEn = `${siteUrl}/en${baseSlug === '/' ? '' : baseSlug}`;

    // Español alternate
    const linkEs = document.createElement('link');
    linkEs.setAttribute('rel', 'alternate');
    linkEs.setAttribute('hreflang', 'es');
    linkEs.setAttribute('href', hreflangEs);
    document.head.appendChild(linkEs);

    // Inglés alternate
    const linkEn = document.createElement('link');
    linkEn.setAttribute('rel', 'alternate');
    linkEn.setAttribute('hreflang', 'en');
    linkEn.setAttribute('href', hreflangEn);
    document.head.appendChild(linkEn);

    // x-default (Español como fallback principal)
    const linkDefault = document.createElement('link');
    linkDefault.setAttribute('rel', 'alternate');
    linkDefault.setAttribute('hreflang', 'x-default');
    linkDefault.setAttribute('href', hreflangEs);
    document.head.appendChild(linkDefault);

    // 3. Manejar datos estructurados JSON-LD
    document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach(el => el.remove());
    if (schemaJson) {
      const script = document.createElement('script');
      script.setAttribute('type', 'application/ld+json');
      script.setAttribute('data-seo', 'true');
      script.text = JSON.stringify(schemaJson);
      document.head.appendChild(script);
    }

    return () => {
      // Limpieza al desmontar
      document.querySelectorAll('script[type="application/ld+json"][data-seo]').forEach(el => el.remove());
    };
  }, [path, schemaJson]);

  return null;
}

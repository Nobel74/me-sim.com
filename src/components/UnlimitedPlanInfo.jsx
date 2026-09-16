'use client';

import React from 'react';
import { getUnlimitedInfo } from '../lib/i18n';

/**
 * Componente informativo de Planes Ilimitados y Política de Uso Justo (FUP)
 * Diseñado bajo directivas Mobile & Tablet First de ME-SIM:
 * - Textos literales exactos i18n (ES / EN)
 * - Dinamización del nombre del país si no es España
 * - Paleta premium con acento corporativo amarillo #ffec00
 * - Iconografía plana vectorial sin esqueumorfismo
 */
export default function UnlimitedPlanInfo({ countryName = 'España', lang = 'es', className = '' }) {
  const info = getUnlimitedInfo(countryName, lang);

  if (!info) return null;

  const isEs = lang === 'es';

  return (
    <section
      aria-labelledby="unlimited-fup-title"
      className={`bg-white rounded-3xl border border-zinc-200 p-5 sm:p-10 shadow-xl space-y-6 sm:space-y-8 font-sans ${className}`}
    >
      {/* Cabecera Principal */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="bg-[#ffec00] text-black text-[11px] sm:text-xs font-black px-3.5 py-1.5 rounded-full uppercase tracking-wider shadow-xs border border-black/10 inline-flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-4H9V7h2v5zm4 4h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <span>{isEs ? 'POLÍTICA DE USO JUSTO (FUP)' : 'FAIR USE POLICY (FUP)'}</span>
          </span>

          <span className="bg-zinc-900 text-white text-[11px] sm:text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider inline-flex items-center gap-1.5 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            <span>{isEs ? 'Sin Cortes ni Cobros Extra' : 'Zero Cutoffs & No Overage'}</span>
          </span>
        </div>

        <h2 id="unlimited-fup-title" className="text-xl sm:text-3xl md:text-4xl font-bold text-black tracking-tight leading-tight">
          {info.section1_title}
        </h2>

        <p className="text-sm sm:text-base text-zinc-700 leading-relaxed font-normal pt-1">
          {info.section1_text}
        </p>
      </div>

      {/* Cuadrícula de 3 Pilares Informativos (Responsive 1 col móvil / 3 col escritorio) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 text-left">
        {/* Bloque 2: Cómo funciona la cuota diaria */}
        <div className="bg-zinc-50 p-5 sm:p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-4 hover:border-black/30 transition-colors shadow-2xs">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#ffec00] flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-base sm:text-lg leading-snug">
              {info.section2_title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {info.section2_text}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-[11px] font-bold text-zinc-900 bg-amber-100/80 px-2.5 py-1 rounded-md inline-block">
              ⚡ 2 GB 4G/5G {isEs ? 'alta velocidad / día' : 'high-speed / day'}
            </span>
          </div>
        </div>

        {/* Bloque 3: Qué esperar en tu viaje */}
        <div className="bg-zinc-50 p-5 sm:p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-4 hover:border-black/30 transition-colors shadow-2xs">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#ffec00] flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-base sm:text-lg leading-snug">
              {info.section3_title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {info.section3_text}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-[11px] font-bold text-zinc-900 bg-emerald-100/80 px-2.5 py-1 rounded-md inline-block">
              ✓ {isEs ? 'Navegación, WhatsApp y Mapas' : 'Maps, WhatsApp & Navigation'}
            </span>
          </div>
        </div>

        {/* Bloque 4: Tú eliges el número de días */}
        <div className="bg-zinc-50 p-5 sm:p-7 rounded-2xl border border-zinc-200 flex flex-col justify-between space-y-4 hover:border-black/30 transition-colors shadow-2xs">
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-xl bg-black text-[#ffec00] flex items-center justify-center shadow-md flex-shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20a2 2 0 002 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z" />
              </svg>
            </div>
            <h3 className="font-bold text-black text-base sm:text-lg leading-snug">
              {info.section4_title}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {info.section4_text}
            </p>
          </div>
          <div className="pt-2 border-t border-zinc-200">
            <span className="text-[11px] font-bold text-zinc-900 bg-blue-100/80 px-2.5 py-1 rounded-md inline-block">
              📅 {isEs ? 'Pago por días exactos' : 'Pay for exact days'}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

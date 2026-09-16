'use client';

import { useState, useEffect } from 'react';

/**
 * Componente de barra de carga con porcentaje y texto bilingüe.
 * Cumple estrictamente con las directivas de ME-SIM:
 * - Borde gris oscuro en modo claro y gris claro en modo oscuro.
 * - Relleno con amarillo corporativo #ffec00.
 * - Soporte bilingüe ES / EN.
 * - Contador de porcentaje fluido e interactivo.
 */
export default function LoadingProgressBar({
  lang = 'es',
  isDark = false,
  messageEs = 'Cargando planes...',
  messageEn = 'Loading plans...',
  className = '',
}) {
  const [progress, setProgress] = useState(12);

  useEffect(() => {
    // Progresión fluida y realista mientras se resuelve la API
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 94) {
          clearInterval(interval);
          return 94;
        }
        // Incremento con ritmo decreciente suave
        const step = Math.max(1, Math.floor((95 - prev) / 6));
        return Math.min(94, prev + step);
      });
    }, 120);

    return () => clearInterval(interval);
  }, []);

  const label = lang === 'en' ? messageEn : messageEs;

  return (
    <div className={`w-full max-w-md mx-auto py-8 px-4 flex flex-col items-center justify-center ${className}`}>
      {/* Texto superior y porcentaje */}
      <div className="w-full flex items-center justify-between mb-2 text-xs sm:text-sm font-bold tracking-wide">
        <span className={`flex items-center gap-2 ${isDark ? 'text-zinc-200' : 'text-zinc-800'}`}>
          <span className="w-2 h-2 rounded-full bg-[#ffec00] animate-ping inline-block" />
          {label}
        </span>
        <span className={`font-mono font-black ${isDark ? 'text-[#ffec00]' : 'text-zinc-950'}`}>
          {progress}%
        </span>
      </div>

      {/* Contenedor exterior de la barra con borde gris oscuro en claro y gris claro en oscuro */}
      <div
        className={`w-full h-3.5 rounded-full overflow-hidden p-0.5 border-2 transition-colors duration-200 ${
          isDark
            ? 'bg-zinc-900 border-zinc-400' // Gris claro en modo oscuro
            : 'bg-zinc-100 border-zinc-800' // Gris oscuro en modo claro
        }`}
      >
        {/* Relleno con acento amarillo corporativo y microanimación */}
        <div
          className="h-full rounded-full bg-[#ffec00] transition-all duration-150 ease-out shadow-sm relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_1.5s_infinite] w-full" />
        </div>
      </div>
    </div>
  );
}

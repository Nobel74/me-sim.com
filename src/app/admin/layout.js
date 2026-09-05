'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'

  useEffect(() => {
    const savedTheme = localStorage.getItem('mesim_admin_theme') || 'dark';
    setTheme(savedTheme);
    const savedLang = localStorage.getItem('mesim_admin_lang') || 'es';
    setLang(savedLang);

    // Skip auth check if on login page
    if (pathname === '/admin/login') {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      try {
        const res = await fetch('/api/admin/auth/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            setUser(data.user);
            setLoading(false);
            return;
          }
        }
        router.push('/admin/login');
      } catch {
        router.push('/admin/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    const handleUserUpdated = (e) => {
      if (e.detail) {
        setUser((prev) => ({ ...prev, ...e.detail }));
      }
    };
    window.addEventListener('mesim_admin_user_updated', handleUserUpdated);

    return () => {
      window.removeEventListener('mesim_admin_user_updated', handleUserUpdated);
    };
  }, [pathname, router]);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('mesim_admin_theme', next);
    window.dispatchEvent(new CustomEvent('mesim_admin_theme_change', { detail: next }));
  };

  const toggleLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('mesim_admin_lang', newLang);
    window.dispatchEvent(new CustomEvent('mesim_admin_lang_change', { detail: newLang }));
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth/me', { method: 'POST' });
    window.location.href = '/admin/login';
  };

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-[#0b0e14] text-white' : 'bg-zinc-100 text-black'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#ffec00] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold tracking-wider uppercase text-zinc-400">ME-SIM Admin</span>
        </div>
      </div>
    );
  }

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0b0e14] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'}`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        isDark ? 'bg-[#111622]/90 border-zinc-800/80 backdrop-blur-md' : 'bg-white/90 border-zinc-200/80 backdrop-blur-md'
      }`}>
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-black text-lg sm:text-xl tracking-tight">
              <span className="text-inherit">ME-SIM</span>
              <span className="px-2 py-0.5 rounded-lg bg-[#ffec00] text-black font-extrabold text-xs tracking-wider uppercase">
                ADMIN
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              title={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              className={`p-2 rounded-xl border transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-yellow-400 hover:bg-zinc-800' : 'bg-zinc-100 border-zinc-300 text-zinc-700 hover:bg-zinc-200'
              }`}
            >
              {isDark ? (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0s-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-3.03 0-5.5-2.47-5.5-5.5 0-1.82.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              )}
            </button>

            {/* Language Switcher */}
            <div className={`flex items-center rounded-xl border p-1 text-xs ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <button
                onClick={() => toggleLang('es')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${lang === 'es' ? 'bg-[#ffec00] text-black' : 'text-zinc-400 hover:text-inherit'}`}
              >
                ES
              </button>
              <button
                onClick={() => toggleLang('en')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${lang === 'en' ? 'bg-[#ffec00] text-black' : 'text-zinc-400 hover:text-inherit'}`}
              >
                EN
              </button>
            </div>

            {/* User Profile Badge with Avatar */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-700/50">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-black flex items-center justify-center text-xs overflow-hidden shadow-sm">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.name || user.email || 'A').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left leading-tight">
                  <span className="block text-xs font-bold text-inherit">{user.name || user.email}</span>
                  <span className={`text-[10px] uppercase tracking-wider ${
                    isDark
                      ? (user.role === 'admin' ? 'text-[#ffec00] font-extrabold' : 'text-emerald-400 font-bold')
                      : (user.role === 'admin' ? 'text-zinc-950 font-black' : 'text-emerald-700 font-bold')
                  }`}>
                    {user.role === 'admin' ? (lang === 'en' ? 'Administrator' : 'Administrador') : (lang === 'en' ? 'Partner' : 'Socio')}
                  </span>
                </div>
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={lang === 'en' ? 'Sign out' : 'Cerrar sesión'}
              className={`p-2 rounded-xl border transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950/40' : 'bg-white border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 flex-1">
        {children}
      </main>

      {/* Footer Simplificado para Área Privada de Administración (Sticky footer pegado al fondo) */}
      <footer className={`mt-auto border-t text-xs font-sans transition-colors ${
        isDark ? 'bg-[#111622] border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-600 shadow-xs'
      }`}>
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <span className={`font-black text-sm tracking-tight ${isDark ? 'text-white' : 'text-zinc-900'}`}>ME-SIM</span>
            <span className="px-1.5 py-0.5 rounded bg-[#ffec00] text-black font-extrabold text-[10px] tracking-wider uppercase">
              {lang === 'en' ? 'ADMIN CONSOLE' : 'CONSOLA ADMIN'}
            </span>
            <span className={`text-xs ml-1 sm:ml-2 font-medium ${isDark ? 'text-zinc-200' : 'text-zinc-600'}`}>
              © {new Date().getFullYear()} ME-SIM Connectivity S.L. {lang === 'en' ? 'Internal Management Area & eSIM Support.' : 'Área Interna y Soporte de eSIMs.'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span className={isDark ? 'text-zinc-200' : 'text-zinc-600'}>
              {lang === 'en' ? 'Internal Support:' : 'Soporte Interno:'} <a href="mailto:info@me-sim.com" className="hover:underline">info@me-sim.com</a>
            </span>
            <span className={isDark ? 'text-zinc-500' : 'text-zinc-300'}>•</span>
            <Link
              href="/"
              className={`font-bold hover:underline transition-colors ${
                isDark ? 'text-[#ffec00] hover:text-yellow-300' : 'text-zinc-900 hover:text-black'
              }`}
            >
              {lang === 'en' ? 'Go to Public Store' : 'Ir a Tienda Pública'}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

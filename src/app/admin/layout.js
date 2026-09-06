'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

function MeSimAdminLogo({ isDark }) {
  return (
    <div className="flex items-center gap-2.5 no-underline hover:scale-105 transition-transform">
      <svg
        viewBox="0 0 409.22 146.78"
        className="h-8 sm:h-9 md:h-10 w-auto flex-shrink-0"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Yellow box with ME */}
        <polygon fill="#ffec00" points="13.4 38.33 13.4 133.39 208.2 133.39 208.2 13.4 38.33 13.4 13.4 38.33" />
        <path fill={isDark ? '#ffffff' : '#1e1e1c'} d="M32.78,0,0,32.78v114H221.6V0ZM208.2,133.39H13.4V38.33L38.33,13.4H208.2Z" />
        {/* ME letters inside yellow box */}
        <path fill="#1e1e1c" d="M96.32,34.77h17.76a1.74,1.74,0,0,1,1.26.45,1.71,1.71,0,0,1,.45,1.25v76.29a1.56,1.56,0,0,1-1.71,1.71h-18a1.69,1.69,0,0,1-1.25-.45,1.72,1.72,0,0,1-.45-1.26V71.43c0-.3-.08-.47-.23-.51s-.31.06-.46.28L86,83.84a2.24,2.24,0,0,1-2,1.14H75.26a2.23,2.23,0,0,1-2.05-1.14L65.46,71.2c-.15-.22-.3-.32-.45-.28s-.23.21-.23.51v41.33a1.56,1.56,0,0,1-1.71,1.71h-18a1.69,1.69,0,0,1-1.25-.45,1.72,1.72,0,0,1-.45-1.26V36.47a1.56,1.56,0,0,1,1.7-1.7H62.85a2.22,2.22,0,0,1,2,1.14L79.24,59q.35.69.69,0L94.27,35.91A2.24,2.24,0,0,1,96.32,34.77Z" />
        <path fill="#1e1e1c" d="M182,52.64a1.7,1.7,0,0,1-1.26.46h-34a.5.5,0,0,0-.57.57v10.7a.5.5,0,0,0,.57.57h21.06a1.59,1.59,0,0,1,1.71,1.71v14.8a1.59,1.59,0,0,1-1.71,1.71H146.65a.5.5,0,0,0-.57.57V95.57a.5.5,0,0,0,.57.57h34a1.58,1.58,0,0,1,1.71,1.71v14.91a1.56,1.56,0,0,1-1.71,1.71H126.38a1.58,1.58,0,0,1-1.71-1.71V36.47a1.68,1.68,0,0,1,.46-1.25,1.69,1.69,0,0,1,1.25-.45h54.31a1.74,1.74,0,0,1,1.26.45,1.71,1.71,0,0,1,.45,1.25V51.39A1.69,1.69,0,0,1,182,52.64Z" />
        {/* SIM letters: dark charcoal in light mode, crisp white in dark mode */}
        <path fill={isDark ? '#ffffff' : '#1e1e1c'} d="M253.17,112.37a24.29,24.29,0,0,1-10.82-8.66,22.72,22.72,0,0,1-3.81-13V88.51a1.35,1.35,0,0,1,1.36-1.37h15.83a1.37,1.37,0,0,1,1.37,1.37v1.37q0,3.75,3.75,6.54T271,99.21c3.34,0,5.8-.72,7.4-2.16a6.59,6.59,0,0,0,2.39-5,5,5,0,0,0-1.42-3.7A11.21,11.21,0,0,0,275.54,86q-2.39-1-7.4-2.68a6.7,6.7,0,0,0-1.37-.51,9.66,9.66,0,0,1-1.25-.4,87.91,87.91,0,0,1-12.87-5.18,27.78,27.78,0,0,1-9.33-7.74,19.27,19.27,0,0,1-3.87-12.24,21,21,0,0,1,3.7-12.36,23.6,23.6,0,0,1,10.3-8.14,40.65,40.65,0,0,1,30.69.34,26.15,26.15,0,0,1,11,9,23,23,0,0,1,4,13.32V61a1.28,1.28,0,0,1-.4,1,1.29,1.29,0,0,1-1,.4H281.92a1.31,1.31,0,0,1-1-.4,1.28,1.28,0,0,1-.4-1v-.8A9.17,9.17,0,0,0,277,53.1Q273.5,50,267.57,50a11.54,11.54,0,0,0-6.94,1.83A5.94,5.94,0,0,0,258.12,57a5.73,5.73,0,0,0,1.6,4.16,15,15,0,0,0,4.95,3.07Q268,65.63,275,67.9q8,2.73,12.41,4.78a24.86,24.86,0,0,1,8.37,6.67q3.93,4.61,3.93,12.12a21.55,21.55,0,0,1-3.76,12.75,24.06,24.06,0,0,1-10.53,8.26,39.87,39.87,0,0,1-15.77,2.9A41.36,41.36,0,0,1,253.17,112.37Z" />
        <path fill={isDark ? '#ffffff' : '#1e1e1c'} d="M309.3,114.07a1.32,1.32,0,0,1-.4-1v-77a1.35,1.35,0,0,1,1.37-1.36h16.17a1.35,1.35,0,0,1,1.37,1.36v77a1.37,1.37,0,0,1-1.37,1.37H310.27A1.31,1.31,0,0,1,309.3,114.07Z" />
        <path fill={isDark ? '#ffffff' : '#1e1e1c'} d="M391.8,34.77h16.05a1.35,1.35,0,0,1,1.37,1.36v77a1.37,1.37,0,0,1-1.37,1.37H391.68a1.35,1.35,0,0,1-1.36-1.37V67.33c0-.3-.08-.45-.23-.45s-.31.11-.46.34l-9.79,15.71a1.63,1.63,0,0,1-1.59.91h-8.09a1.62,1.62,0,0,1-1.59-.91L358.66,67.1c-.15-.22-.3-.34-.45-.34s-.23.16-.23.46V113.1a1.37,1.37,0,0,1-1.37,1.37H340.44a1.37,1.37,0,0,1-1.36-1.37v-77a1.35,1.35,0,0,1,1.36-1.36H356.5a1.78,1.78,0,0,1,1.59.91L373.92,60.5c.23.46.46.46.68,0l15.6-24.82A1.64,1.64,0,0,1,391.8,34.77Z" />
      </svg>
      <span className="px-2 py-0.5 rounded-lg bg-[#ffec00] text-black font-extrabold text-[10px] sm:text-xs tracking-wider uppercase shadow-xs">
        ADMIN
      </span>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState('es');
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light'
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('mesim_admin_theme') || 'dark';
    setTheme(savedTheme);
    const savedLang = localStorage.getItem('mesim_admin_lang') || 'es';
    setLang(savedLang);

    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab') || localStorage.getItem('mesim_admin_tab') || 'dashboard';
      if (['dashboard', 'orders', 'company', 'partners'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }

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

    const handleTabEvent = (e) => {
      if (e.detail && ['dashboard', 'orders', 'company', 'partners'].includes(e.detail)) {
        setActiveTab(e.detail);
      }
    };

    window.addEventListener('mesim_admin_user_updated', handleUserUpdated);
    window.addEventListener('mesim_admin_tab_change', handleTabEvent);

    return () => {
      window.removeEventListener('mesim_admin_user_updated', handleUserUpdated);
      window.removeEventListener('mesim_admin_tab_change', handleTabEvent);
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

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('mesim_admin_tab', tabId);
    setIsMobileMenuOpen(false);
    window.dispatchEvent(new CustomEvent('mesim_admin_tab_change', { detail: tabId }));

    if (pathname !== '/admin') {
      router.push(`/admin?tab=${tabId}`);
    } else {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tabId);
      window.history.replaceState({}, '', url.toString());
    }
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

  // Navigation Items matching the front header and mobile drawer style
  const navItems = [
    {
      id: 'dashboard',
      label: { es: 'Dashboard Financiero', en: 'Financial Dashboard' },
      shortLabel: { es: 'Dashboard', en: 'Dashboard' },
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
        </svg>
      ),
    },
    {
      id: 'orders',
      label: { es: 'Clientes y Soporte', en: 'Orders & eSIM Support' },
      shortLabel: { es: 'Clientes y Soporte', en: 'Orders & Support' },
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
        </svg>
      ),
    },
    ...(user?.role === 'admin'
      ? [
          {
            id: 'company',
            label: { es: 'Configuración Fiscal ME-SIM', en: 'Company Fiscal Settings' },
            shortLabel: { es: 'Configuración Fiscal', en: 'Fiscal Settings' },
            icon: (
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z" />
              </svg>
            ),
          },
        ]
      : []),
    {
      id: 'partners',
      label: {
        es: user?.role === 'admin' ? 'Gestión de Socios y Seguridad' : 'Mi Perfil y Seguridad',
        en: user?.role === 'admin' ? 'Partners & Security' : 'My Account & Security',
      },
      shortLabel: {
        es: user?.role === 'admin' ? 'Socios y Seguridad' : 'Mi Perfil',
        en: user?.role === 'admin' ? 'Partners & Security' : 'My Profile',
      },
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
        </svg>
      ),
    },
  ];

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${isDark ? 'bg-[#0b0e14] text-zinc-100' : 'bg-[#f4f5f7] text-zinc-900'}`}>
      {/* Top Navbar */}
      <header className={`sticky top-0 z-40 border-b transition-colors ${
        isDark ? 'bg-[#111622]/95 border-zinc-800/80 backdrop-blur-md' : 'bg-white/95 border-zinc-200/80 backdrop-blur-md'
      }`}>
        <div className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
          {/* 1. Official ME-SIM Logo (matching client front) */}
          <Link href="/admin" onClick={() => handleSelectTab('dashboard')} className="flex items-center no-underline flex-shrink-0">
            <MeSimAdminLogo isDark={isDark} />
          </Link>

          {/* 2. Desktop Navigation Menu (clean typography, no awkward wrapping, matching client front) */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-8 font-semibold font-sans">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`relative py-2 font-semibold text-xs xl:text-sm 2xl:text-[15px] whitespace-nowrap transition-colors cursor-pointer flex items-center ${
                    isActive
                      ? isDark
                        ? 'text-white font-bold'
                        : 'text-black font-bold'
                      : isDark
                      ? 'text-zinc-400 hover:text-white'
                      : 'text-zinc-600 hover:text-black'
                  }`}
                >
                  <span className="hidden xl:inline">{item.label[lang] || item.label.es}</span>
                  <span className="xl:hidden">{item.shortLabel[lang] || item.shortLabel.es}</span>
                  {isActive && (
                    <span className="absolute -bottom-[15px] left-0 right-0 h-[3px] bg-[#ffec00] rounded-full shadow-xs" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* 3. Controls (Desktop: Theme, Lang, User Badge, Logout; Mobile: Theme + Hamburger) */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
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

            {/* Desktop Language Switcher */}
            <div className={`hidden sm:flex items-center rounded-xl border p-1 text-xs ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-zinc-200'}`}>
              <button
                onClick={() => toggleLang('es')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${lang === 'es' ? 'bg-[#ffec00] text-black shadow-xs' : 'text-zinc-400 hover:text-inherit'}`}
              >
                ES
              </button>
              <button
                onClick={() => toggleLang('en')}
                className={`px-2 py-1 rounded-lg font-bold transition-all ${lang === 'en' ? 'bg-[#ffec00] text-black shadow-xs' : 'text-zinc-400 hover:text-inherit'}`}
              >
                EN
              </button>
            </div>

            {/* Desktop User Profile Badge with Avatar */}
            {user && (
              <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-zinc-700/50">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-black flex items-center justify-center text-xs overflow-hidden shadow-xs flex-shrink-0">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(user.name || user.email || 'A').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="text-left leading-tight">
                  <span className="block text-xs font-bold text-inherit truncate max-w-[120px]">{user.name || user.email}</span>
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

            {/* Desktop Logout Button */}
            <button
              onClick={handleLogout}
              title={lang === 'en' ? 'Sign out' : 'Cerrar sesión'}
              className={`hidden lg:flex p-2 rounded-xl border transition-all ${
                isDark ? 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-950/40' : 'bg-white border-zinc-200 text-zinc-500 hover:text-red-600 hover:bg-red-50'
              }`}
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
              </svg>
            </button>

            {/* Mobile / Tablet Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`lg:hidden w-10 h-10 rounded-xl border flex items-center justify-center transition-all ${
                isDark
                  ? 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
                  : 'bg-zinc-100 border-zinc-300 text-black hover:bg-zinc-200'
              }`}
              aria-label="Abrir Menú de Administración"
            >
              {isMobileMenuOpen ? (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Slide-in Drawer Menu Overlay (Directly below header - NO DUPLICATE LOGO OR CLOSE BUTTON) */}
        {isMobileMenuOpen && (
          <div className={`lg:hidden border-b p-5 sm:p-6 space-y-5 shadow-2xl transition-colors animate-slide-down ${
            isDark ? 'bg-[#111622] border-zinc-800 text-white' : 'bg-white border-zinc-200 text-zinc-900'
          }`}>
            {/* Navigation List with Flat Icons */}
            <div className="space-y-1">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`w-full text-left font-semibold text-base sm:text-lg py-3.5 border-b flex items-center justify-between transition-colors ${
                      isDark ? 'border-zinc-800/80 hover:text-[#ffec00]' : 'border-zinc-100 hover:text-black'
                    } ${isActive ? (isDark ? 'text-[#ffec00] font-bold' : 'text-black font-bold') : (isDark ? 'text-zinc-300' : 'text-zinc-700')}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={isActive ? 'text-[#ffec00]' : 'text-zinc-400'}>
                        {item.icon}
                      </span>
                      <span>{item.label[lang] || item.label.es}</span>
                    </div>
                    {isActive && (
                      <span className="w-2.5 h-2.5 rounded-full bg-[#ffec00] shadow-xs"></span>
                    )}
                  </button>
                );
              })}

              {/* Link to public front */}
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full text-left font-semibold text-base sm:text-lg py-3.5 border-b flex items-center gap-3 ${
                  isDark ? 'border-zinc-800/80 text-zinc-300 hover:text-white' : 'border-zinc-100 text-zinc-700 hover:text-black'
                }`}
              >
                <svg className="w-5 h-5 fill-current text-zinc-400 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z" />
                </svg>
                <span>{lang === 'en' ? 'Go to Public Store' : 'Ir a la Tienda Pública'}</span>
              </Link>

              {/* Sign Out in red */}
              <button
                onClick={handleLogout}
                className="w-full text-left font-semibold text-base sm:text-lg text-red-600 py-3.5 border-b border-transparent flex items-center gap-3"
              >
                <svg className="w-5 h-5 fill-current text-red-600 flex-shrink-0" viewBox="0 0 24 24">
                  <path d="M13 3h-2v10h2V3zm4.83 2.17l-1.42 1.42C17.99 7.86 19 9.81 19 12c0 3.87-3.13 7-7 7s-7-3.13-7-7c0-2.19 1.01-4.14 2.58-5.42L6.17 5.17C4.23 6.82 3 9.26 3 12c0 4.97 4.03 9 9 9s9-4.03 9-9c0-2.74-1.23-5.18-3.17-6.83z" />
                </svg>
                <span>{lang === 'en' ? 'Sign Out' : 'Cerrar Sesión'}</span>
              </button>
            </div>

            {/* Bottom Selectors Section (Exact match to Image 1) */}
            <div className={`pt-4 border-t space-y-3 text-xs ${isDark ? 'border-zinc-800' : 'border-zinc-200'}`}>
              {/* Language Selector */}
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-zinc-400">
                  {lang === 'en' ? 'LANGUAGE:' : 'IDIOMA:'}
                </span>
                <div className={`flex items-center rounded-xl border p-1 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
                  <button
                    onClick={() => toggleLang('es')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      lang === 'es' ? 'bg-[#ffec00] text-black shadow-xs' : 'text-zinc-500 hover:text-inherit'
                    }`}
                  >
                    ES
                  </button>
                  <button
                    onClick={() => toggleLang('en')}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      lang === 'en' ? 'bg-[#ffec00] text-black shadow-xs' : 'text-zinc-500 hover:text-inherit'
                    }`}
                  >
                    EN
                  </button>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-zinc-400">
                  {lang === 'en' ? 'THEME:' : 'TEMA:'}
                </span>
                <div className={`flex items-center rounded-xl border p-1 ${isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-zinc-100 border-zinc-300'}`}>
                  <button
                    onClick={() => theme !== 'dark' && toggleTheme()}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      isDark ? 'bg-black text-[#ffec00] shadow-xs' : 'text-zinc-500 hover:text-inherit'
                    }`}
                  >
                    {lang === 'en' ? 'DARK' : 'OSCURO'}
                  </button>
                  <button
                    onClick={() => theme !== 'light' && toggleTheme()}
                    className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                      !isDark ? 'bg-[#ffec00] text-black shadow-xs' : 'text-zinc-500 hover:text-inherit'
                    }`}
                  >
                    {lang === 'en' ? 'LIGHT' : 'CLARO'}
                  </button>
                </div>
              </div>

              {/* Connected User Badge */}
              {user && (
                <div className={`p-3 rounded-2xl border flex items-center gap-3 ${
                  isDark ? 'bg-zinc-900/80 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
                }`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-yellow-500 to-amber-300 text-black font-black flex items-center justify-center text-sm shadow-xs flex-shrink-0">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span>{(user.name || user.email || 'A').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="leading-tight truncate">
                    <span className="block text-xs font-bold text-inherit truncate">{user.name || user.email}</span>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#ffec00] bg-black px-1.5 py-0.5 rounded inline-block mt-0.5">
                      {user.role === 'admin' ? (lang === 'en' ? 'ADMINISTRATOR' : 'ADMINISTRADOR') : (lang === 'en' ? 'PARTNER' : 'SOCIO')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-2.5 sm:px-6 lg:px-8 py-6 flex-1">
        {children}
      </main>

      {/* Footer Simplificado para Área Privada de Administración */}
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


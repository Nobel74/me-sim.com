'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('es');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        router.push('/admin');
      } else {
        setError(data.message || (lang === 'en' ? 'Invalid credentials' : 'Credenciales incorrectas'));
      }
    } catch {
      setError(lang === 'en' ? 'Connection error' : 'Error de conexión con el servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white flex flex-col justify-center items-center px-4 sm:px-6">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs">
        <button
          onClick={() => setLang('es')}
          className={`px-2 py-0.5 rounded font-bold transition-all ${lang === 'es' ? 'bg-[#ffec00] text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          ES
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-2 py-0.5 rounded font-bold transition-all ${lang === 'en' ? 'bg-[#ffec00] text-black' : 'text-zinc-400 hover:text-white'}`}
        >
          EN
        </button>
      </div>

      <div className="w-full max-w-md bg-[#161b22] border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-700 text-[#ffec00] mb-4">
            <svg className="w-7 h-7 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
            ME-SIM <span className="text-[#ffec00]">Admin</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {lang === 'en'
              ? 'Enter your credentials to access the operations console'
              : 'Acceso seguro al panel de control y soporte de eSIMs'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {lang === 'en' ? 'Email Address' : 'Correo Electrónico'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="paxfer@gmail.com"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-600 text-sm outline-none focus:border-[#ffec00] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
              {lang === 'en' ? 'Password' : 'Contraseña'}
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-white placeholder-zinc-600 text-sm outline-none focus:border-[#ffec00] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-6 rounded-xl bg-[#ffec00] hover:bg-yellow-300 text-black font-bold font-condensed tracking-wider uppercase text-sm transition-all shadow-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>{lang === 'en' ? 'Sign In to Console' : 'Iniciar Sesión'}</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
          <Link
            href="/"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
          >
            <span>← {lang === 'en' ? 'Back to ME-SIM Store' : 'Volver a la tienda ME-SIM'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

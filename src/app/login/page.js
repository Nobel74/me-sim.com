'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getTranslation } from '../../lib/i18n';

export default function LoginPage() {
  const router = useRouter();
  const [lang, setLang] = useState('es');
  const [authMode, setAuthMode] = useState('password'); // 'password' or 'magic'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [magicCode, setMagicCode] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [codeSent, setCodeSent] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  const t = getTranslation(lang);

  const syncLang = () => {
    setLang(localStorage.getItem('mesim_lang') || 'es');
  };

  useEffect(() => {
    syncLang();
    const handleLangChange = () => syncLang();
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const handleSendMagicCode = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatusMessage({ type: 'error', text: lang === 'en' ? 'Please enter a valid email address.' : 'Introduce un correo electrónico válido.' });
      return;
    }

    setSendingEmail(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'magic_code', lang }),
      });

      const data = await res.json();
      if (data.success) {
        setCodeSent(true);
        setStatusMessage({ type: 'success', text: data.message });
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Error al enviar el correo.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: lang === 'en' ? 'Connection error.' : 'Error al conectar con el servidor de correo.' });
    } finally {
      setSendingEmail(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password: authMode === 'password' ? password : null,
          magicCode: authMode === 'magic' ? magicCode : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        window.dispatchEvent(new Event('mesim_auth_changed'));
        router.push('/dashboard');
      } else {
        setStatusMessage({ type: 'error', text: data.message || (lang === 'en' ? 'Login failed.' : 'Error al iniciar sesión.') });
      }
    } catch {
      setStatusMessage({ type: 'error', text: lang === 'en' ? 'Connection error.' : 'Error de conexión con el servidor.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-naked max-w-md font-sans py-10">
      {/* Clean White Login Card matching reference screenshot */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 md:p-10 shadow-xl">
        <div className="mb-8 text-left">
          <p className="text-sm font-medium text-zinc-500 mb-1">
            {lang === 'en' ? 'Please enter your details' : 'Por favor introduce tus datos'}
          </p>
          <h1 className="text-3xl md:text-4xl font-extrabold font-semi text-black tracking-tight">
            {lang === 'en' ? 'Welcome back' : 'Bienvenido de nuevo'}
          </h1>
        </div>

        {/* Option Toggle */}
        <div className="flex gap-4 text-xs font-semibold font-condensed uppercase tracking-wider mb-6 pb-3 border-b border-zinc-100">
          <button
            onClick={() => {
              setAuthMode('password');
              setStatusMessage(null);
            }}
            className={`pb-1 transition-colors ${authMode === 'password' ? 'text-black border-b-2 border-black font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            🔒 {lang === 'en' ? 'Password' : 'Contraseña'}
          </button>
          <button
            onClick={() => {
              setAuthMode('magic');
              setStatusMessage(null);
            }}
            className={`pb-1 transition-colors ${authMode === 'magic' ? 'text-black border-b-2 border-black font-semibold' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            ✉️ {lang === 'en' ? 'Email Code' : 'Código por Email'}
          </button>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === 'en' ? 'Email address' : 'Correo electrónico'}
              className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 text-black placeholder-zinc-400 text-base outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all font-sans"
            />
          </div>

          {authMode === 'password' && (
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={lang === 'en' ? 'Password' : 'Contraseña'}
                className="w-full px-4 py-3.5 rounded-2xl border border-zinc-200 text-black placeholder-zinc-400 text-base outline-none focus:border-black focus:ring-2 focus:ring-black/10 transition-all font-sans"
              />
            </div>
          )}

          {authMode === 'magic' && (
            <>
              {!codeSent ? (
                <button
                  type="button"
                  onClick={handleSendMagicCode}
                  disabled={sendingEmail}
                  className="w-full bg-black hover:bg-zinc-800 text-[#ffec00] font-semibold font-condensed tracking-wider uppercase py-3.5 px-5 rounded-2xl text-base transition-all shadow-md flex items-center justify-center gap-2"
                >
                  {sendingEmail
                    ? (lang === 'en' ? 'Sending code...' : 'Enviando código...')
                    : `📩 ${lang === 'en' ? 'Send Login Code' : 'Enviar Código de Acceso'}`}
                </button>
              ) : (
                <div>
                  <input
                    type="text"
                    required
                    value={magicCode}
                    onChange={(e) => setMagicCode(e.target.value)}
                    placeholder={lang === 'en' ? 'Verification code (123456)' : 'Código de verificación (123456)'}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-black text-black text-center text-xl font-mono font-bold tracking-widest outline-none bg-zinc-50"
                  />
                </div>
              )}
            </>
          )}

          {/* Remember me & Forgot Password */}
          <div className="flex justify-between items-center text-xs font-sans text-zinc-600 pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-300 text-black focus:ring-black accent-black"
              />
              <span>{lang === 'en' ? 'Remember for 30 days' : 'Recordarme 30 días'}</span>
            </label>
            <button
              type="button"
              onClick={() => alert(lang === 'en' ? 'Password reset link sent to your email.' : 'Enlace de restablecimiento enviado a tu correo.')}
              className="text-zinc-600 hover:text-black font-medium underline"
            >
              {lang === 'en' ? 'Forgot password' : '¿Olvidaste tu contraseña?'}
            </button>
          </div>

          {statusMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold leading-relaxed border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-red-50 text-red-800 border-red-200'
              }`}
            >
              {statusMessage.text}
            </div>
          )}

          {(authMode === 'password' || codeSent) && (
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase py-3.5 px-6 rounded-2xl text-lg transition-all shadow-md border border-black/10 mt-4"
            >
              {loading ? (lang === 'en' ? 'Authenticating...' : 'Iniciando sesión...') : (lang === 'en' ? 'Sign in' : 'Iniciar Sesión')}
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-zinc-100 text-center text-xs text-zinc-500 font-sans">
          <p>
            {lang === 'en' ? "Don't have an account?" : '¿Aún no tienes cuenta?'}{' '}
            <Link href="/" className="text-black font-bold hover:underline">
              {lang === 'en' ? 'Buy an eSIM' : 'Comprar una eSIM'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

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

  const [showLostPasswordModal, setShowLostPasswordModal] = useState(false);
  const [lostPasswordEmail, setLostPasswordEmail] = useState('');
  const [lostPasswordLoading, setLostPasswordLoading] = useState(false);

  const handleLostPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!lostPasswordEmail || !lostPasswordEmail.includes('@')) {
      setStatusMessage({ type: 'error', text: lang === 'en' ? 'Please enter a valid email address.' : 'Introduce un correo electrónico válido.' });
      return;
    }

    setLostPasswordLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/auth/lost-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: lostPasswordEmail, lang }),
      });

      const data = await res.json();
      if (data.success) {
        setShowLostPasswordModal(false);
        setStatusMessage({ type: 'success', text: data.message });
      } else {
        setStatusMessage({ type: 'error', text: data.message });
      }
    } catch {
      setStatusMessage({ type: 'error', text: lang === 'en' ? 'Error contacting server.' : 'Error al conectar con el servidor.' });
    } finally {
      setLostPasswordLoading(false);
    }
  };

  return (
    <div className="container-naked max-w-md font-sans py-10">
      {/* Clean White Login Card matching reference screenshot */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-8 md:p-10 shadow-xl">
        <div className="mb-8 text-left">
          <h1 className="text-3xl font-semibold font-semi text-black mb-1">
            {lang === 'en' ? 'Welcome Back' : 'Iniciar Sesión'}
          </h1>
          <p className="text-sm text-zinc-500 font-normal">
            {lang === 'en'
              ? 'Sign in to access your active eSIMs, QR codes, and data usage'
              : 'Accede a tus eSIMs activas, códigos QR de instalación y consumo de datos'}
          </p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl mb-6 border border-zinc-200">
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold font-condensed tracking-wider uppercase rounded-xl transition-all ${
              authMode === 'password' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-600 hover:text-black font-medium'
            }`}
          >
            {lang === 'en' ? 'Password' : 'Contraseña'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('magic');
              setStatusMessage(null);
            }}
            className={`flex-1 py-2.5 px-3 text-xs sm:text-sm font-semibold font-condensed tracking-wider uppercase rounded-xl transition-all ${
              authMode === 'magic' ? 'bg-black text-[#ffec00] shadow-md' : 'text-zinc-600 hover:text-black font-medium'
            }`}
          >
            📩 {lang === 'en' ? 'Magic Code (OTP)' : 'Código de Acceso'}
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === 'en' ? 'Email address' : 'Correo Electrónico'}
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
              onClick={() => {
                setLostPasswordEmail(email);
                setShowLostPasswordModal(true);
              }}
              className="text-zinc-600 hover:text-black font-medium underline"
            >
              {lang === 'en' ? 'Forgot password?' : '¿Olvidaste tu contraseña?'}
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

      {/* Lost Password Modal */}
      {showLostPasswordModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-zinc-200 shadow-2xl relative animate-scale-in">
            <button
              onClick={() => setShowLostPasswordModal(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-black font-bold text-lg"
            >
              ✕
            </button>

            <h3 className="text-2xl font-bold text-black mb-2">
              {lang === 'en' ? 'Reset Password' : 'Recuperar Contraseña'}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 mb-6 leading-relaxed">
              {lang === 'en'
                ? 'Enter your account email to receive a password reset link or verification code.'
                : 'Introduce el correo de tu cuenta para recibir un enlace o código de recuperación.'}
            </p>

            <form onSubmit={handleLostPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                  {lang === 'en' ? 'Email Address' : 'Correo Electrónico'}
                </label>
                <input
                  type="email"
                  required
                  value={lostPasswordEmail}
                  onChange={(e) => setLostPasswordEmail(e.target.value)}
                  placeholder="ejemplo@email.com"
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-black text-sm outline-none focus:border-black font-sans"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLostPasswordModal(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all"
                >
                  {lang === 'en' ? 'Cancel' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  disabled={lostPasswordLoading}
                  className="flex-1 bg-black hover:bg-zinc-800 text-[#ffec00] font-bold py-3 rounded-2xl text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  {lostPasswordLoading
                    ? (lang === 'en' ? 'Sending...' : 'Enviando...')
                    : (lang === 'en' ? 'Send Link' : 'Enviar Enlace')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

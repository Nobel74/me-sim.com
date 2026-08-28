'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CompatibilityModal from '../../../components/CompatibilityModal';

const FAQS_SPECIFIC = [
  {
    qEs: '¿Es el Samsung Galaxy S10 compatible con eSIM?',
    qEn: 'Is the Samsung Galaxy S10 compatible with eSIM?',
    aEs: 'Lamentablemente, el Samsung Galaxy S10 no admite tecnología eSIM. Para utilizar eSIM en la serie Samsung Galaxy, necesitarás un modelo más reciente como el Galaxy S20 o posterior.',
    aEn: 'Unfortunately, the Samsung Galaxy S10 does not support eSIM. To use eSIM on Samsung Galaxy, you’ll need a newer model such as the Galaxy S20 or later.'
  },
  {
    qEs: '¿Es el iPhone 10 (iPhone X) compatible con eSIM?',
    qEn: 'Does the iPhone 10 support eSIM?',
    aEs: 'Lamentablemente, el iPhone X (10) no admite eSIM. Los primeros teléfonos de Apple en admitir eSIM fueron el iPhone XR y el iPhone XS en 2018. Los modelos anteriores no son compatibles.',
    aEn: 'Unfortunately, the iPhone 10 does not support eSIM. The first Apple phones to do so were the iPhone XR and the iPhone XS in 2018. Previous models are not supported.'
  },
  {
    qEs: '¿Es el Huawei P40 Pro+ compatible con eSIM?',
    qEn: 'Is the Huawei P40 Pro + compatible with eSIM?',
    aEs: 'No, únicamente los modelos P40 y P40 Pro son compatibles. La cubierta trasera de cerámica del Pro+ impide la funcionalidad eSIM.',
    aEn: 'No, only the P40 and P40 Pro models are compatible. It seems that the ceramic case of the Pro+ prevents this.'
  },
  {
    qEs: '¿Es el Xiaomi 12T compatible con eSIM?',
    qEn: 'Is the Xiaomi 12T compatible with eSIM?',
    aEs: 'No, solo el Xiaomi 12T Pro es compatible con eSIM (el modelo 12T estándar no lo es).',
    aEn: 'No, only the Xiaomi 12T Pro is eSIM Compatible.'
  },
  {
    qEs: '¿Admite OnePlus tecnología eSIM?',
    qEn: 'Does OnePlus support eSIM?',
    aEs: 'Sí, actualmente modelos como OnePlus 11, 12, 13 y OnePlus Open cuentan con tecnología eSIM integrada.',
    aEn: 'Yes, currently, OnePlus 11, 12, and 13 phones support eSIM technology.'
  }
];

export default function CompatibleDevicesSupportPage() {
  const [lang, setLang] = useState('es');
  const [isCompModalOpen, setIsCompModalOpen] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('mesim_lang') || 'es';
    setLang(savedLang);

    const handleLangChange = () => {
      setLang(localStorage.getItem('mesim_lang') || 'es');
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  return (
    <div className="container-naked max-w-5xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <Link href="/soporte" className="hover:text-black transition-colors">
          {lang === 'en' ? 'Support Center' : 'Centro de Soporte'}
        </Link>
        <span>/</span>
        <span className="text-black font-semibold">
          {lang === 'en' ? 'eSIM Compatible Devices' : 'Dispositivos Compatibles con eSIM'}
        </span>
      </nav>

      {/* Hero Header */}
      <div className="bg-zinc-900 rounded-3xl p-6 sm:p-10 md:p-12 text-white shadow-2xl mb-10 border border-zinc-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffec00]/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#ffec00] text-black flex items-center justify-center shadow-xs flex-shrink-0">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
            </div>
            <span className="bg-white/10 text-[#ffec00] text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/10">
              {lang === 'en' ? 'Official Compatibility Guide' : 'Guía Oficial de Compatibilidad'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
            {lang === 'en' ? 'eSIM Compatible Devices List' : 'Lista de Dispositivos Compatibles con eSIM'}
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg leading-relaxed font-sans">
            {lang === 'en'
              ? 'Check the complete list of mobile phones, tablets, and smartwatches compatible with ME-SIM.COM eSIM. Use our instant interactive search tool or review key manufacturer details below.'
              : 'Consulta la lista completa de teléfonos móviles, tablets y dispositivos compatibles con la eSIM de ME-SIM.COM. Utiliza nuestro buscador interactivo instantáneo o revisa los detalles por marca.'}
          </p>

          <div className="pt-2">
            <button
              onClick={() => setIsCompModalOpen(true)}
              className="bg-[#ffec00] hover:bg-yellow-300 text-black font-bold px-6 py-3.5 rounded-2xl text-base transition-all shadow-lg flex items-center gap-2 group"
            >
              <svg className="w-5 h-5 fill-current text-black group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
              </svg>
              <span>{lang === 'en' ? 'Open Model Checker' : 'Abrir Buscador de Modelos'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Sections */}
      <div className="space-y-10">
        {/* Apple Section */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black flex items-center justify-center font-bold">
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.61-.74 1.04-1.79.92-2.87-.96.04-2.13.64-2.79 1.41-.57.66-1.07 1.73-.94 2.79 1.08.08 2.18-.55 2.81-1.33z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black">Apple iPhone & iPad</h2>
          </div>
          <p className="text-zinc-600 text-base leading-relaxed mb-4">
            {lang === 'en'
              ? 'Apple supports eSIM from iPhone XR / XS onwards. iPhone 13 and newer models allow two active eSIMs simultaneously. USA models of iPhone 14/15/16/17 are eSIM-only (no physical SIM slot).'
              : 'Apple admite eSIM a partir del iPhone XR / XS. Los modelos iPhone 13 y posteriores permiten dos eSIMs activas a la vez. Los modelos de EE.UU. de iPhone 14/15/16/17 son únicamente eSIM.'}
          </p>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-sm sm:text-base text-zinc-800 space-y-1 font-sans">
            <strong className="font-bold text-black block mb-1">
              {lang === 'en' ? 'Supported iPhones & iPads:' : 'iPhones e iPads Compatibles:'}
            </strong>
            <p>• iPhone XR, XS, XS Max, iPhone 11, 11 Pro, 11 Pro Max, iPhone SE 2 & 3</p>
            <p>• iPhone 12, 12 Mini, 12 Pro, 12 Pro Max, iPhone 13, 13 Mini, 13 Pro, 13 Pro Max</p>
            <p>• iPhone 14, 14 Plus, 14 Pro, 14 Pro Max, iPhone 15, 15 Plus, 15 Pro, 15 Pro Max</p>
            <p>• iPhone 16, 16 Plus, 16 Pro, 16 Pro Max, 16e, iPhone 17, 17 Pro, 17 Pro Max, 17e, iPhone Air</p>
            <p>• iPad Pro 11″ (A2068), 12.9″ (A2069), iPad Air (A2123), iPad Mini (A2124), iPad 10ª y 11ª gen (Cellular)</p>
          </div>
        </div>

        {/* Samsung Section */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black flex items-center justify-center font-bold">
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black">Samsung Galaxy</h2>
          </div>
          <p className="text-zinc-600 text-base leading-relaxed mb-4">
            {lang === 'en'
              ? 'Samsung integrated eSIM starting with the Galaxy S20 line, Note 20 series, and Z Fold/Flip range.'
              : 'Samsung integró la tecnología eSIM a partir de la gama Galaxy S20, Note 20 y plegables Z Fold/Flip.'}
          </p>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-sm sm:text-base text-zinc-800 space-y-1 font-sans">
            <strong className="font-bold text-black block mb-1">
              {lang === 'en' ? 'Supported Samsung Models:' : 'Modelos Samsung Compatibles:'}
            </strong>
            <p>• Galaxy S20, S20+, S20 Ultra 5G, S21, S21+, S21 Ultra, S22, S22+, S22 Ultra, S23, S23+, S23 Ultra, S23 FE, S24, S24+, S24 Ultra, S24 FE, S25, S25+, S25 Ultra, S25 Edge, S25 FE, S26, S26+, S26 Ultra</p>
            <p>• Galaxy Note 20, Note 20 Ultra 5G, Galaxy Fold, Z Fold2 a Z Fold7, Z Flip, Z Flip3 a Z Flip7, Z TriFold</p>
            <p>• Galaxy A54, A55 5G, A35, A56, A36, A27</p>
          </div>
        </div>

        {/* Google Pixel Section */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black flex items-center justify-center font-bold">
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black">Google Pixel</h2>
          </div>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-sm sm:text-base text-zinc-800 space-y-1 font-sans">
            <p>• Pixel 2, 2 XL, Pixel 3, 3 XL, 3a, 3a XL, Pixel 4, 4a, 4 XL, Pixel 5, 5a, Pixel 6, 6a, 6 Pro</p>
            <p>• Pixel 7, 7a, 7 Pro, Pixel 8, 8a, 8 Pro, Pixel Fold, Pixel 9, 9 Pro, 9 Pro XL, Pixel 10, 10 Pro, 10 Pro XL, 10a</p>
          </div>
        </div>

        {/* Other Major Brands Section */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 text-black flex items-center justify-center font-bold">
              <svg className="w-5 h-5 fill-current text-black" viewBox="0 0 24 24">
                <path d="M4 6h16v12H4V6zm2 2v8h12V8H6zm3 2h6v4H9v-4z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-black">
              {lang === 'en' ? 'Xiaomi, Huawei, Oppo, Sony, Motorola & Others' : 'Xiaomi, Huawei, Oppo, Sony, Motorola y Otros'}
            </h2>
          </div>
          <div className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200 text-sm sm:text-base text-zinc-800 space-y-2 font-sans">
            <p><strong>Xiaomi / Redmi / POCO:</strong> 12T Pro, 13, 13 Lite, 13 Pro, 13T, 13T Pro, 14, 14 Pro, 14T, 14T Pro, 15, 15 Ultra, 15T, 15T Pro, 17, 17 Ultra, Redmi Note 13 Pro+, Note 14 Pro/Pro+, Note 15 Pro/Pro+, POCO X7, POCO X8 Pro Max.</p>
            <p><strong>Huawei:</strong> P40, P40 Pro, Mate 40 Pro, Pura 70 Pro.</p>
            <p><strong>Oppo:</strong> Find X3/X3 Pro, Find N2 Flip, Reno 5A, Reno 6 Pro 5G, Reno 9A, Find X5/X5 Pro, A55s 5G, Find N3/N3 Flip, Find X8/X8 Pro, Reno14/14 Pro, Find X9/X9 Pro/X9 Ultra, Reno 15/15 Pro.</p>
            <p><strong>Sony:</strong> Xperia 10 III Lite, 10 IV, 10 V, 10 VI, 10 VII, 1 IV, 5 IV, 1 V, Ace III, 5 V, 1 VI, 1 VII, 1 VIII.</p>
            <p><strong>Motorola:</strong> Razr 2019, 2022, 5G, 40, 40 Ultra, Razr+, Edge 2022, Edge 2023, Edge 40/40 Pro/40 Neo, Edge 50 Pro/Ultra/Fusion, Moto G Power 5G, G52J 5G, G53J 5G, Moto G54 5G, G84, G34, Razr 2024, Razr 60/70 Ultra.</p>
            <p><strong>Sharp / Rakuten / Honor / Vivo:</strong> Sharp AQUOS sense4 lite a sense8, Rakuten Mini/Hand 5G, Honor Magic 4 Pro a Magic 8 Pro, Magic V2/V3/V5/V6, Vivo X80 Pro, X90 Pro, X100 Pro, V29 Lite 5G, V40, X200/X300 Pro.</p>
            <p><strong>Otras marcas:</strong> Nothing Phone 3/3a/4a, Asus ROG Phone 9, Realme GT 7/8, TCL 50/NxtPaper, DOOGEE V30, HAMMER Blade, OUKITEL WP30/33 Pro, Fairphone 4/5, myPhone NOW eSIM.</p>
          </div>
        </div>

        {/* Final Specific FAQ Section */}
        <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 shadow-xl space-y-6">
          <div className="flex items-center gap-2">
            <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-black/10 flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 16h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 11.9 12 12.5 12 14h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H7c0-2.76 2.24-5 5-5s5 2.24 5 5c0 1.04-.42 1.99-1.07 2.75z" />
              </svg>
              <span>FAQS</span>
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-black">
              {lang === 'en' ? 'Frequently Asked Questions' : 'Preguntas Frecuentes Específicas'}
            </h2>
          </div>

          <div className="space-y-4">
            {FAQS_SPECIFIC.map((faq, idx) => (
              <div key={idx} className="bg-zinc-50 p-5 rounded-2xl border border-zinc-200 space-y-2">
                <h3 className="text-base sm:text-lg font-bold text-black flex items-start gap-2">
                  <span className="w-6 h-6 rounded-full bg-black text-[#ffec00] flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">
                    ?
                  </span>
                  <span>{lang === 'en' ? faq.qEn : faq.qEs}</span>
                </h3>
                <p className="text-zinc-600 text-sm sm:text-base leading-relaxed font-sans pl-8">
                  {lang === 'en' ? faq.aEn : faq.aEs}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Modal */}
      <CompatibilityModal
        isOpen={isCompModalOpen}
        onClose={() => setIsCompModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

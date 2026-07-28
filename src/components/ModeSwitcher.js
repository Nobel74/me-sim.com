'use client';

export default function ModeSwitcher({ mode = 'local', setMode, lang = 'es' }) {
  return (
    <div className="inline-flex bg-zinc-200/80 p-1 rounded-full text-sm font-semibold font-condensed tracking-wide shadow-inner border border-zinc-300/50">
      <button
        onClick={() => setMode('local')}
        className={`px-6 py-2 rounded-full transition-all uppercase ${
          mode === 'local'
            ? 'bg-black text-[#ffec00] shadow-md font-semibold'
            : 'text-zinc-700 hover:text-black font-medium'
        }`}
      >
        {lang === 'en' ? 'Local' : 'Países (Local)'}
      </button>
      <button
        onClick={() => setMode('regional')}
        className={`px-6 py-2 rounded-full transition-all uppercase ${
          mode === 'regional'
            ? 'bg-black text-[#ffec00] shadow-md font-semibold'
            : 'text-zinc-700 hover:text-black font-medium'
        }`}
      >
        {lang === 'en' ? 'Regional' : 'Regionales'}
      </button>
    </div>
  );
}

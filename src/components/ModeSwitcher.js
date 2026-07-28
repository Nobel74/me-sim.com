'use client';

export default function ModeSwitcher({ mode = 'local', setMode, lang = 'es' }) {
  return (
    <div className="flex sm:inline-flex w-full sm:w-auto bg-zinc-200/80 p-1 rounded-full text-xs sm:text-sm font-semibold font-condensed tracking-wide shadow-inner border border-zinc-300/50">
      <button
        onClick={() => setMode('local')}
        className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 sm:py-2 rounded-full transition-all uppercase text-center ${
          mode === 'local'
            ? 'bg-black text-[#ffec00] shadow-md font-bold'
            : 'text-zinc-950 hover:text-black font-bold tracking-wider'
        }`}
      >
        {lang === 'en' ? 'Local' : 'Países (Local)'}
      </button>
      <button
        onClick={() => setMode('regional')}
        className={`flex-1 sm:flex-none px-5 sm:px-6 py-2.5 sm:py-2 rounded-full transition-all uppercase text-center ${
          mode === 'regional'
            ? 'bg-black text-[#ffec00] shadow-md font-bold'
            : 'text-zinc-950 hover:text-black font-bold tracking-wider'
        }`}
      >
        {lang === 'en' ? 'Regions' : 'Regiones'}
      </button>
    </div>
  );
}

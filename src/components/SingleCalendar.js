'use client';

import { formatCurrency, convertCurrency } from '../lib/currency';

export default function SingleCalendar({
  lang = 'es',
  currency = 'EUR',
  rates = {},
  rangeStart,
  rangeEnd,
  calendarMonth,
  setCalendarMonth,
  handleDayClick,
  travelDays,
  unlimitedPriceEur,
  handleAddToCartUnlimited,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getDaysInMonthGrid = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month, d);
      dateObj.setHours(0, 0, 0, 0);
      days.push(dateObj);
    }
    return days;
  };

  const daysGrid = getDaysInMonthGrid();
  const monthName = calendarMonth.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="bg-zinc-100/90 border border-zinc-200 p-5 rounded-3xl mb-5 text-black shadow-inner">
        <div className="text-center mb-5">
          <h3 className="text-xl font-semibold font-semi text-black mb-1">
            📅 {lang === 'en' ? 'Select Dates on Calendar' : 'Selecciona las Fechas en el Calendario'}
          </h3>
          <p className="text-xs text-zinc-600 font-medium font-sans">
            {lang === 'en' ? 'Click 1st on arrival date, 2nd on departure date.' : 'Haz 1er clic en la fecha de llegada y 2º clic en la fecha de regreso.'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-md mb-5">
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-zinc-100">
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
              className="px-2 py-1 rounded-lg hover:bg-zinc-100 font-semibold text-black text-sm font-condensed"
            >
              ◀
            </button>
            <span className="font-semibold font-semi text-black capitalize text-base">{monthName}</span>
            <button
              onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
              className="px-2 py-1 rounded-lg hover:bg-zinc-100 font-semibold text-black text-sm font-condensed"
            >
              ▶
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-xs font-semibold font-condensed tracking-wider text-zinc-400 mb-2 uppercase">
            <span>{lang === 'en' ? 'Mo' : 'Lu'}</span>
            <span>{lang === 'en' ? 'Tu' : 'Ma'}</span>
            <span>{lang === 'en' ? 'We' : 'Mi'}</span>
            <span>{lang === 'en' ? 'Th' : 'Ju'}</span>
            <span>{lang === 'en' ? 'Fr' : 'Vi'}</span>
            <span>{lang === 'en' ? 'Sa' : 'Sá'}</span>
            <span>{lang === 'en' ? 'Su' : 'Do'}</span>
          </div>

          <div className="grid grid-cols-7 gap-1">
            {daysGrid.map((dayDate, index) => {
              if (!dayDate) {
                return <div key={`empty-${index}`} className="h-9"></div>;
              }

              const isPast = dayDate < today;
              const isStart = rangeStart && dayDate.getTime() === rangeStart.getTime();
              const isEnd = rangeEnd && dayDate.getTime() === rangeEnd.getTime();
              const isInRange = rangeStart && rangeEnd && dayDate > rangeStart && dayDate < rangeEnd;

              let bgClass = 'hover:bg-[#ffec00]/30 text-black';
              if (isPast) bgClass = 'text-zinc-300 pointer-events-none';
              else if (isStart || isEnd) bgClass = 'bg-black text-[#ffec00] font-semibold font-condensed shadow-md scale-105';
              else if (isInRange) bgClass = 'bg-[#ffec00]/40 text-black font-semibold';

              return (
                <button
                  key={dayDate.toISOString()}
                  disabled={isPast}
                  onClick={() => handleDayClick(dayDate)}
                  className={`h-9 rounded-xl text-sm font-semibold transition-all flex items-center justify-center ${bgClass}`}
                >
                  {dayDate.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex items-center justify-between shadow-sm">
          <div>
            <div className="flex gap-2 text-xs font-semibold text-zinc-500 font-condensed mb-0.5">
              <span>🛫 {rangeStart ? rangeStart.toLocaleDateString() : 'Select'}</span>
              <span>➔</span>
              <span>🛬 {rangeEnd ? rangeEnd.toLocaleDateString() : (rangeStart ? rangeStart.toLocaleDateString() : 'Select')}</span>
            </div>
            <strong className="text-xl font-semibold font-semi text-black block">
              {travelDays} {lang === 'en' ? (travelDays === 1 ? 'Day' : 'Days') : (travelDays === 1 ? 'Día' : 'Días')} {lang === 'en' ? 'Unlimited' : 'Ilimitados'}
            </strong>
          </div>

          <div className="text-right">
            <span className="text-xs font-semibold font-condensed tracking-wider text-zinc-400 block uppercase">{lang === 'en' ? 'Total Price' : 'Precio Total'}:</span>
            <strong className="text-2xl font-semibold font-condensed text-black">
              {formatCurrency(convertCurrency(unlimitedPriceEur, currency, rates), currency)}
            </strong>
          </div>
        </div>
      </div>

      {/* Button with balanced padding py-3 and larger font size text-xl */}
      <button
        onClick={handleAddToCartUnlimited}
        className="w-full bg-[#ffec00] hover:bg-yellow-300 text-black font-semibold font-condensed tracking-wider uppercase py-3 px-6 rounded-xl text-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 border border-black/10"
      >
        {lang === 'en' ? `Add ${travelDays} Unlimited Days to Cart` : `Añadir ${travelDays} Días Ilimitados al Carrito`} • {formatCurrency(convertCurrency(unlimitedPriceEur, currency, rates), currency)} ➔
      </button>
    </div>
  );
}

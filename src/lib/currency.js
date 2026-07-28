/**
 * Módulo de Multi-Divisa Dinámica (Sin comisión / Justo)
 * Utiliza ExchangeRate-API (gratuita) con base en EUR y caché de 24 horas.
 */

let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas en milisegundos

// Fallback rates por seguridad en caso de fallo de red
const FALLBACK_RATES = {
  EUR: 1.0,
  USD: 1.09,
  GBP: 0.85,
  AUD: 1.65,
};

export async function getExchangeRates() {
  const now = Date.now();
  if (cachedRates && now - lastFetchTime < CACHE_DURATION) {
    return cachedRates;
  }

  try {
    const apiUrl = process.env.EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/EUR';
    const response = await fetch(apiUrl, { next: { revalidate: 86400 } });
    
    if (!response.ok) {
      throw new Error(`Error al obtener tipos de cambio: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.rates) {
      cachedRates = {
        EUR: 1.0,
        USD: data.rates.USD || FALLBACK_RATES.USD,
        GBP: data.rates.GBP || FALLBACK_RATES.GBP,
        AUD: data.rates.AUD || FALLBACK_RATES.AUD,
      };
      lastFetchTime = now;
      return cachedRates;
    }
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
  }

  return cachedRates || FALLBACK_RATES;
}

/**
 * Convierte un precio en EUR a la moneda solicitada
 */
export function convertCurrency(priceInEur, targetCurrency, rates) {
  const numPrice = parseFloat(priceInEur) || 0;
  const rate = rates && rates[targetCurrency] ? rates[targetCurrency] : 1.0;
  return (numPrice * rate).toFixed(2);
}

/**
 * Formatea el precio según la regla cultural:
 * - EUR: símbolo a la derecha con espacio (ej: 14.90 €)
 * - USD, GBP, AUD: símbolo a la izquierda con espacio (ej: $ 14.90, £ 14.90, A$ 14.90)
 */
export function formatCurrency(amount, currency = 'EUR') {
  const symbols = {
    EUR: '€',
    USD: '$',
    GBP: '£',
    AUD: 'A$',
  };
  const symbol = symbols[currency] || '€';

  if (currency === 'EUR') {
    return `${amount} ${symbol}`;
  }
  return `${symbol} ${amount}`;
}

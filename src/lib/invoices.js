import { getCompanyConfig } from './companyConfig.js';
import { loadCompanyLogoBuffer } from './pdfImageLoader.js';

/**
 * Motor de Facturación y Cálculos Fiscales
 * En ME-SIM los precios mostrados en web incluyen el IVA del 21%.
 * Cálculo fiscal exacto:
 * Base Imponible = Total / 1.21
 * Importe IVA (21%) = Total - Base Imponible
 */
export function calculateTaxBreakdown(totalAmount) {
  const total = typeof totalAmount === 'number' ? totalAmount : parseFloat(String(totalAmount).replace(/[^0-9.,]/g, '').replace(',', '.')) || 0;
  const basePrice = Math.round((total / 1.21) * 100) / 100;
  const vatAmount = Math.round((total - basePrice) * 100) / 100;

  return {
    total: total.toFixed(2),
    basePrice: basePrice.toFixed(2),
    vatAmount: vatAmount.toFixed(2),
    vatRate: 21,
  };
}

/**
 * Detección automática del idioma de la factura:
 * - Si el pedido está en GBP o USD, o el país es de habla inglesa -> 'en'
 * - Si el usuario seleccionó explícitamente un idioma -> respeta la preferencia
 * - Si la cabecera del navegador contiene 'es' -> 'es', de lo contrario 'en'
 */
export function resolveInvoiceLanguage(order = {}, billing = {}, requestedLang = '') {
  if (requestedLang && (requestedLang === 'es' || requestedLang === 'en')) {
    return requestedLang;
  }
  const currency = String(order?.currency || '').toUpperCase();
  if (currency === 'GBP' || currency === 'USD') {
    return 'en';
  }
  const country = String(billing?.country || order?.country || '').toLowerCase();
  if (
    country.includes('reino unido') ||
    country.includes('united kingdom') ||
    country.includes('uk') ||
    country.includes('united states') ||
    country.includes('usa') ||
    country.includes('us') ||
    country.includes('ireland') ||
    country.includes('australia') ||
    country.includes('canada')
  ) {
    return 'en';
  }
  return 'es';
}

export function detectInvoiceLanguage(acceptLanguageHeader = '', userPreference = '', order = {}, billing = {}) {
  if (userPreference) {
    return userPreference.toLowerCase().startsWith('es') ? 'es' : 'en';
  }
  return resolveInvoiceLanguage(order, billing, acceptLanguageHeader.includes('es') ? 'es' : 'en');
}

const INVOICE_DICTIONARY = {
  es: {
    invoiceTitle: 'FACTURA',
    invoiceNumber: 'Nº Factura',
    orderNumber: 'Nº Pedido',
    date: 'Fecha de Emisión',
    dueDate: 'Fecha de Operación',
    statusPaid: 'PAGADA',
    issuerTitle: 'EMISOR',
    clientTitle: 'CLIENTE / RECEPTOR',
    cifNif: 'NIF / CIF',
    address: 'Dirección',
    description: 'Concepto / Plan eSIM',
    iccid: 'ICCID / Identificador',
    qty: 'Cant.',
    unitPrice: 'Base Unitaria',
    subtotal: 'Base Imponible',
    vat: 'IVA (21%)',
    total: 'TOTAL PAGADO',
    paymentMethod: 'Método de Pago',
    paymentMethodVal: 'Tarjeta de Crédito / Stripe (Pagado)',
    vatIncludedNote: 'Precios con 21% de IVA incluido según la normativa fiscal aplicable.',
    deliveryTitle: 'Confirmación de Entrega y Activación eSIM',
    deliveryDesc: 'Tu perfil de eSIM ha sido aprovisionado correctamente y vinculado a tu pedido.',
    deliverySupport: 'Para soporte técnico o recargas, contacta con soporte@me-sim.com o accede a tu panel.',
    footerLegal: 'Documento mercantil emitido electrónicamente con validez fiscal según el Real Decreto 1619/2012.',
    thankYou: 'Gracias por confiar en ME-SIM Connectivity para tus viajes.',
  },
  en: {
    invoiceTitle: 'INVOICE',
    invoiceNumber: 'Invoice No.',
    orderNumber: 'Order No.',
    date: 'Issue Date',
    dueDate: 'Tax Date',
    statusPaid: 'PAID',
    issuerTitle: 'ISSUER',
    clientTitle: 'CUSTOMER / BILL TO',
    cifNif: 'Tax ID / VAT No.',
    address: 'Address',
    description: 'Description / eSIM Plan',
    iccid: 'ICCID / Identifier',
    qty: 'Qty',
    unitPrice: 'Unit Price',
    subtotal: 'Tax Base (excl. VAT)',
    vat: 'VAT (21%)',
    total: 'TOTAL PAID',
    paymentMethod: 'Payment Method',
    paymentMethodVal: 'Credit Card / Stripe (Paid)',
    vatIncludedNote: 'All prices include 21% Spanish VAT pursuant to applicable regulations.',
    deliveryTitle: 'Digital eSIM Delivery & Activation Confirmation',
    deliveryDesc: 'Your eSIM profile was successfully provisioned and linked to your order.',
    deliverySupport: 'For technical support or data top-ups, contact support@me-sim.com or access your account.',
    footerLegal: 'Electronic commercial document issued with tax validity pursuant to Spanish RD 1619/2012.',
    thankYou: 'Thank you for choosing ME-SIM Connectivity for your travels.',
  },
};

/**
 * Sanitizador de texto PDF con mapeo WinAnsiEncoding (Windows-1252)
 * Elimina cualquier riesgo de caracteres rotos (â‹, ^a, ^‡, '') en cualquier visor de PDF.
 */
export function escapePdfWinAnsi(text) {
  if (text === null || text === undefined) return '';
  const str = String(text);
  let out = '';

  const winAnsiCodeMap = {
    '€': '\\200',
    '£': '\\243',
    '¥': '\\245',
    '§': '\\247',
    '©': '\\251',
    '«': '\\253',
    '®': '\\256',
    '°': '\\260',
    '±': '\\261',
    '²': '\\262',
    '³': '\\263',
    'µ': '\\265',
    '·': '\\267',
    '»': '\\273',
    '¿': '\\277',
    'À': '\\300', 'Á': '\\301', 'Â': '\\302', 'Ã': '\\303', 'Ä': '\\304', 'Å': '\\305',
    'Æ': '\\306', 'Ç': '\\307', 'È': '\\308', 'É': '\\309', 'Ê': '\\312', 'Ë': '\\313',
    'Ì': '\\314', 'Í': '\\315', 'Î': '\\316', 'Ï': '\\317', 'Ð': '\\320', 'Ñ': '\\321',
    'Ò': '\\322', 'Ó': '\\323', 'Ô': '\\324', 'Õ': '\\325', 'Ö': '\\326', '×': '\\327',
    'Ø': '\\330', 'Ù': '\\331', 'Ú': '\\332', 'Û': '\\333', 'Ü': '\\334', 'Ý': '\\335',
    'Þ': '\\336', 'ß': '\\337',
    'à': '\\340', 'á': '\\341', 'â': '\\342', 'ã': '\\343', 'ä': '\\344', 'å': '\\345',
    'æ': '\\346', 'ç': '\\347', 'è': '\\350', 'é': '\\351', 'ê': '\\352', 'ë': '\\353',
    'ì': '\\354', 'í': '\\355', 'î': '\\356', 'ï': '\\357', 'ð': '\\360', 'ñ': '\\361',
    'ò': '\\362', 'ó': '\\363', 'ô': '\\364', 'õ': '\\365', 'ö': '\\366', '÷': '\\367',
    'ø': '\\370', 'ù': '\\371', 'ú': '\\372', 'û': '\\373', 'ü': '\\374', 'ý': '\\375',
    'þ': '\\376', 'ÿ': '\\377',
    'º': '\\272', 'ª': '\\252',
    '“': '\\223', '”': '\\224', '‘': '\\221', '’': '\\222', '–': '\\226', '—': '\\227',
  };

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '\\') {
      out += '\\\\';
    } else if (ch === '(') {
      out += '\\(';
    } else if (ch === ')') {
      out += '\\)';
    } else if (winAnsiCodeMap[ch]) {
      out += winAnsiCodeMap[ch];
    } else {
      const code = ch.charCodeAt(0);
      if (code >= 32 && code <= 126) {
        out += ch;
      } else {
        out += ' ';
      }
    }
  }
  return out;
}

export function formatCurrencyAmount(amount, currency = 'EUR') {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const formatted = num.toFixed(2);
  const curr = String(currency || 'EUR').toUpperCase();
  if (curr === 'GBP') {
    return `£${formatted}`;
  }
  if (curr === 'USD') {
    return `$${formatted}`;
  }
  return `${formatted} €`;
}

/**
 * Generador nativo de Factura PDF (Standard PDF 1.4 con WinAnsiEncoding)
 * Consume el logotipo oficial configurado en la sección de configuración fiscal oficial (company.logo)
 * Header blanco, tipografía nítida y 0% amarillo en textos.
 */
export function generateInvoicePdfBuffer({ order = {}, billing = {}, lang }) {
  const finalLang = lang || resolveInvoiceLanguage(order, billing);
  const isEnglish = finalLang === 'en';
  const dict = INVOICE_DICTIONARY[finalLang] || INVOICE_DICTIONARY.en;
  const company = getCompanyConfig();
  const tax = calculateTaxBreakdown(order.priceEur || order.total || 0);

  // Cargar logotipo oficial configurado en la sección fiscal
  const logoData = loadCompanyLogoBuffer(company.logo);

  const invoiceNumber = `${company.invoicePrefix || 'MS-'}${order.orderId || Math.floor(100000 + Math.random() * 900000)}`;
  const invoiceDate = order.date || new Date().toISOString().split('T')[0];
  const currency = (order.currency || 'EUR').toUpperCase();

  const formattedBase = formatCurrencyAmount(tax.basePrice, currency);
  const formattedVat = formatCurrencyAmount(tax.vatAmount, currency);
  const formattedTotal = formatCurrencyAmount(tax.total, currency);

  const clientName = `${billing.firstName || ''} ${billing.lastName || ''}`.trim() || order.customerName || (isEnglish ? 'Valued Customer' : 'Cliente Particular');
  const clientCompany = billing.company ? String(billing.company) : '';
  const clientVat = billing.vatId || (isEnglish ? 'Not provided' : 'No aportado');

  // Normalización de país y dirección para consistencia idiomática
  let clientCountry = billing.country || order.country || '';
  if (isEnglish) {
    if (clientCountry.toLowerCase() === 'reino unido' || clientCountry.toLowerCase() === 'uk') clientCountry = 'United Kingdom';
    if (clientCountry.toLowerCase() === 'españa' || clientCountry.toLowerCase() === 'espana') clientCountry = 'Spain';
    if (clientCountry.toLowerCase() === 'estados unidos' || clientCountry.toLowerCase() === 'eeuu') clientCountry = 'United States';
  }
  const addressParts = [
    billing.address,
    billing.postcode,
    billing.city,
    clientCountry,
  ].filter(Boolean);
  const clientAddress = addressParts.join(', ') || (isEnglish ? 'Address not specified' : 'Dirección no indicada');

  const itemTitle = order.title || 'ME-SIM Travel eSIM Plan';
  const itemIccid = order.esimTranNo ? `ICCID: ${order.esimTranNo}` : (isEnglish ? 'eSIM Digital Card' : 'Tarjeta Digital eSIM');

  const companyCountry = isEnglish ? 'Spain' : 'España';
  const companyAddressLine = `${company.address}, ${company.city}, ${companyCountry}`;

  const streamOps = [];

  // 1. Fondo de página blanco puro
  streamOps.push('1 1 1 rg');
  streamOps.push('0 0 595 842 re f');

  // 2. ENCABEZADO BLANCO CON LOGOTIPO OFICIAL CONFIGURADO
  if (logoData) {
    // Dibujo del logotipo oficial configurado en el panel fiscal
    const aspect = (logoData.width && logoData.height) ? (logoData.width / logoData.height) : 2.5;
    let drawHeight = 28;
    let drawWidth = Math.round(drawHeight * aspect);
    if (drawWidth > 115) {
      drawWidth = 115;
      drawHeight = Math.round(drawWidth / aspect);
    }
    const drawX = 42;
    const drawY = 757;

    streamOps.push('q');
    streamOps.push(`${drawWidth} 0 0 ${drawHeight} ${drawX} ${drawY} cm`);
    streamOps.push('/ImLogo Do');
    streamOps.push('Q');
  } else {
    // Fallback elegante si no hubiera imagen configurada
    streamOps.push('0.07 0.10 0.16 rg');
    streamOps.push('42 760 m 42 778 l 48 784 l 74 784 l 74 760 l h f');

    streamOps.push('BT');
    streamOps.push('/F2 11 Tf');
    streamOps.push('1 1 1 rg');
    streamOps.push('49 768 Td');
    streamOps.push('(ME) Tj');
    streamOps.push('ET');

    streamOps.push('BT');
    streamOps.push('/F2 20 Tf');
    streamOps.push('0.07 0.10 0.16 rg');
    streamOps.push('82 767 Td');
    streamOps.push('(ME-SIM) Tj');
    streamOps.push('ET');
  }

  // Datos fiscales de la empresa emisora bajo el logotipo
  streamOps.push('BT');
  streamOps.push('/F2 8.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('42 741 Td');
  streamOps.push(`(${escapePdfWinAnsi(company.companyName)}) Tj`);
  streamOps.push('/F1 8 Tf');
  streamOps.push('0.45 0.50 0.58 rg');
  streamOps.push('0 -11 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.cifNif)}: ${escapePdfWinAnsi(company.taxId)}  |  ${escapePdfWinAnsi(companyAddressLine)}) Tj`);
  streamOps.push('0 -11 Td');
  streamOps.push(`(${escapePdfWinAnsi(company.email)}  |  https://${escapePdfWinAnsi(company.website)}) Tj`);
  streamOps.push('ET');

  // 3. TÍTULO Y METADATOS DE LA FACTURA (DERECHA - CERO AMARILLO)
  streamOps.push('BT');
  streamOps.push('/F2 24 Tf');
  streamOps.push('0.07 0.10 0.16 rg');
  streamOps.push('380 766 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.invoiceTitle)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 9.5 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('380 748 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.invoiceNumber)}: ${escapePdfWinAnsi(invoiceNumber)}) Tj`);
  streamOps.push('/F1 9 Tf');
  streamOps.push('0.45 0.50 0.58 rg');
  streamOps.push('0 -13 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.date)}: ${escapePdfWinAnsi(invoiceDate)}) Tj`);
  streamOps.push('ET');

  // Badge pill verde esmeralda 'PAID' / 'PAGADA' (Elegancia profesional Fintech)
  streamOps.push('0.93 0.98 0.95 rg'); // Background Emerald-50
  streamOps.push('0.65 0.90 0.75 RG 0.75 w'); // Border Emerald-300
  streamOps.push('380 714 74 16 re B');

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.06 0.48 0.28 rg'); // Text Emerald-800
  streamOps.push('395 719 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.statusPaid)}) Tj`);
  streamOps.push('ET');

  // Línea divisoria sutil bajo el header
  streamOps.push('0.90 0.92 0.95 RG 0.75 w');
  streamOps.push('42 703 511 0 re S');

  // 4. TARJETA CLIENTE / RECEPTOR
  streamOps.push('0.975 0.98 0.99 rg');
  streamOps.push('0.88 0.90 0.93 RG 1 w');
  streamOps.push('42 595 511 96 re B');

  streamOps.push('BT');
  streamOps.push('/F2 8 Tf');
  streamOps.push('0.45 0.50 0.60 rg');
  streamOps.push('56 675 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.clientTitle)}) Tj`);

  streamOps.push('/F2 12 Tf');
  streamOps.push('0.07 0.10 0.16 rg');
  streamOps.push('0 -18 Td');
  streamOps.push(`(${escapePdfWinAnsi(clientName)}${clientCompany ? ' - ' + escapePdfWinAnsi(clientCompany) : ''}) Tj`);

  streamOps.push('/F1 9 Tf');
  streamOps.push('0.35 0.40 0.48 rg');
  streamOps.push('0 -15 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.cifNif)}: ${escapePdfWinAnsi(clientVat)}) Tj`);
  streamOps.push('0 -14 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.address)}: ${escapePdfWinAnsi(clientAddress)}) Tj`);
  streamOps.push('0 -14 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.orderNumber)}: #${escapePdfWinAnsi(order.orderId || '')}   |   ${escapePdfWinAnsi(dict.paymentMethod)}: ${escapePdfWinAnsi(dict.paymentMethodVal)}) Tj`);
  streamOps.push('ET');

  // 5. TABLA DE CONCEPTOS
  streamOps.push('0.94 0.96 0.98 rg');
  streamOps.push('0.88 0.90 0.93 RG 1 w');
  streamOps.push('42 548 511 26 re B');

  streamOps.push('BT');
  streamOps.push('/F2 8.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('56 557 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.description)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 8.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('342 557 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.qty)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 8.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('402 557 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.unitPrice)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 8.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('480 557 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.total)}) Tj`);
  streamOps.push('ET');

  // Fila del artículo
  streamOps.push('1 1 1 rg');
  streamOps.push('0.88 0.90 0.93 RG 1 w');
  streamOps.push('42 485 511 63 re B');

  streamOps.push('BT');
  streamOps.push('/F2 10.5 Tf');
  streamOps.push('0.07 0.10 0.16 rg');
  streamOps.push('56 527 Td');
  streamOps.push(`(${escapePdfWinAnsi(itemTitle)}) Tj`);

  streamOps.push('/F1 8.5 Tf');
  streamOps.push('0.45 0.50 0.60 rg');
  streamOps.push('0 -14 Td');
  streamOps.push(`(${escapePdfWinAnsi(itemIccid)}) Tj`);

  streamOps.push('/F1 7.5 Tf');
  streamOps.push('0.55 0.60 0.68 rg');
  streamOps.push('0 -13 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.vatIncludedNote)}) Tj`);
  streamOps.push('ET');

  // Valores numéricos
  streamOps.push('BT');
  streamOps.push('/F1 10 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('348 518 Td');
  streamOps.push('(1) Tj');
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F1 10 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('402 518 Td');
  streamOps.push(`(${escapePdfWinAnsi(formattedBase)}) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 10.5 Tf');
  streamOps.push('0.07 0.10 0.16 rg');
  streamOps.push('480 518 Td');
  streamOps.push(`(${escapePdfWinAnsi(formattedTotal)}) Tj`);
  streamOps.push('ET');

  // 6. CAJA DE TOTALES Y DESGLOSE FISCAL (DERECHA - CERO AMARILLO)
  streamOps.push('0.975 0.98 0.99 rg');
  streamOps.push('0.88 0.90 0.93 RG 1 w');
  streamOps.push('318 350 235 105 re B');

  // Base Imponible
  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.35 0.40 0.48 rg');
  streamOps.push('334 433 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.subtotal)}:) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('480 433 Td');
  streamOps.push(`(${escapePdfWinAnsi(formattedBase)}) Tj`);
  streamOps.push('ET');

  // IVA (21%)
  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.35 0.40 0.48 rg');
  streamOps.push('334 413 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.vat)}:) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F1 9.5 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('480 413 Td');
  streamOps.push(`(${escapePdfWinAnsi(formattedVat)}) Tj`);
  streamOps.push('ET');

  // Línea sutil de separación
  streamOps.push('0.88 0.90 0.93 RG 0.75 w');
  streamOps.push('326 401 219 0 re S');

  // Bloque Total Pagado (Dark Slate con texto blanco puro, cero amarillo)
  streamOps.push('0.07 0.10 0.16 rg');
  streamOps.push('318 350 235 38 re f');

  streamOps.push('BT');
  streamOps.push('/F2 10.5 Tf');
  streamOps.push('1 1 1 rg');
  streamOps.push('334 365 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.total)}:) Tj`);
  streamOps.push('ET');

  streamOps.push('BT');
  streamOps.push('/F2 13 Tf');
  streamOps.push('1 1 1 rg');
  streamOps.push('475 365 Td');
  streamOps.push(`(${escapePdfWinAnsi(formattedTotal)}) Tj`);
  streamOps.push('ET');

  // 7. CONFIRMACIÓN DE ENTREGA Y SOPORTE
  streamOps.push('0.98 0.985 0.99 rg');
  streamOps.push('42 245 511 50 re f');
  streamOps.push('0.25 0.35 0.50 RG 2.5 w');
  streamOps.push('42 245 0 50 re S');

  streamOps.push('BT');
  streamOps.push('/F2 9 Tf');
  streamOps.push('0.15 0.20 0.30 rg');
  streamOps.push('54 278 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.deliveryTitle)}) Tj`);
  streamOps.push('/F1 8 Tf');
  streamOps.push('0.40 0.45 0.55 rg');
  streamOps.push('0 -13 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.deliveryDesc)}) Tj`);
  streamOps.push('0 -11 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.deliverySupport)}) Tj`);
  streamOps.push('ET');

  // 8. PIE DE PÁGINA Y NOTAS LEGALES
  streamOps.push('0.88 0.90 0.93 RG 0.75 w');
  streamOps.push('42 110 511 0 re S');

  streamOps.push('BT');
  streamOps.push('/F2 9.5 Tf');
  streamOps.push('0.20 0.25 0.35 rg');
  streamOps.push('42 94 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.thankYou)}) Tj`);

  streamOps.push('/F1 8 Tf');
  streamOps.push('0.45 0.50 0.58 rg');
  streamOps.push('0 -14 Td');
  streamOps.push(`(${escapePdfWinAnsi(dict.footerLegal)}) Tj`);
  streamOps.push('0 -12 Td');
  streamOps.push(`(ME-SIM Connectivity S.L.  -  https://${escapePdfWinAnsi(company.website)}  -  ${escapePdfWinAnsi(company.email)}) Tj`);
  streamOps.push('ET');

  const contentStream = streamOps.join('\n');
  const contentBuf = Buffer.from(contentStream, 'binary');

  // Ensamblado estructurado de objetos PDF con seguimiento preciso de offsets binarios
  const chunks = [];
  let currentOffset = 0;
  const offsets = [];

  function appendChunk(buf) {
    chunks.push(buf);
    currentOffset += buf.length;
  }

  function appendText(str) {
    const buf = Buffer.from(str, 'binary');
    chunks.push(buf);
    currentOffset += buf.length;
  }

  // Encabezado PDF 1.4
  appendText('%PDF-1.4\n');

  // 1 0 obj: Catalog
  offsets.push(currentOffset);
  appendText('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  // 2 0 obj: Pages
  offsets.push(currentOffset);
  appendText('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');

  // 3 0 obj: Page
  const xObjectRes = logoData ? ' /XObject << /ImLogo 7 0 R >>' : '';
  offsets.push(currentOffset);
  appendText(`3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObjectRes} >> /Contents 6 0 R >>\nendobj\n`);

  // 4 0 obj: Helvetica con WinAnsiEncoding
  offsets.push(currentOffset);
  appendText('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n');

  // 5 0 obj: Helvetica-Bold con WinAnsiEncoding
  offsets.push(currentOffset);
  appendText('5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n');

  // 6 0 obj: Content Stream
  offsets.push(currentOffset);
  appendText(`6 0 obj\n<< /Length ${contentBuf.length} >>\nstream\n`);
  appendChunk(contentBuf);
  appendText('\nendstream\nendobj\n');

  // 7 0 obj & 8 0 obj: Image XObjects para el logotipo oficial
  if (logoData) {
    offsets.push(currentOffset);
    if (logoData.type === 'jpeg') {
      appendText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoData.buffer.length} >>\nstream\n`);
      appendChunk(logoData.buffer);
      appendText('\nendstream\nendobj\n');
    } else {
      const sMaskRef = logoData.hasAlpha ? ' /SMask 8 0 R' : '';
      appendText(`7 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode${sMaskRef} /Length ${logoData.rgbDeflated.length} >>\nstream\n`);
      appendChunk(logoData.rgbDeflated);
      appendText('\nendstream\nendobj\n');

      if (logoData.hasAlpha) {
        offsets.push(currentOffset);
        appendText(`8 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode /Length ${logoData.alphaDeflated.length} >>\nstream\n`);
        appendChunk(logoData.alphaDeflated);
        appendText('\nendstream\nendobj\n');
      }
    }
  }

  // Tabla XREF
  const xrefOffset = currentOffset;
  let xref = `xref\n0 ${offsets.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) {
    xref += String(o).padStart(10, '0') + ' 00000 n \n';
  }

  const trailer = `trailer\n<< /Size ${offsets.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  appendText(xref + trailer);

  return Buffer.concat(chunks);
}

'use client';

import { useState, useMemo } from 'react';

const DEVICE_DATABASE = [
  // --- APPLE (IPHONE & IPAD) ---
  { brand: 'Apple', model: 'iPhone XR', noteEs: 'Comprueba que el teléfono esté libre de operador. Los modelos de China continental, Hong Kong y Macao no admiten eSIM (tienen 2 ranuras nano-SIM físicas).', noteEn: 'Must be carrier unlocked. Models from mainland China, Hong Kong, and Macau do not support eSIM.' },
  { brand: 'Apple', model: 'iPhone XS', noteEs: 'Comprueba que esté libre de operador. Nota: El iPhone XS de Hong Kong y Macao SÍ admite eSIM.', noteEn: 'Must be carrier unlocked. Note: iPhone XS from Hong Kong and Macau DOES support eSIM.' },
  { brand: 'Apple', model: 'iPhone XS Max', noteEs: 'Comprueba que esté libre de operador. Los modelos de China continental, Hong Kong y Macao no admiten eSIM.', noteEn: 'Must be carrier unlocked. Models from mainland China, Hong Kong, and Macau do not support eSIM.' },
  { brand: 'Apple', model: 'iPhone 11', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao llevan doble SIM física y no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models feature dual physical SIMs and no eSIM.' },
  { brand: 'Apple', model: 'iPhone 11 Pro', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao llevan doble SIM física y no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models feature dual physical SIMs and no eSIM.' },
  { brand: 'Apple', model: 'iPhone 11 Pro Max', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao llevan doble SIM física y no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models feature dual physical SIMs and no eSIM.' },
  { brand: 'Apple', model: 'iPhone SE 2 (2020)', noteEs: 'Debe estar libre de operador. Compatible con eSIM incluso en modelos comprados en Hong Kong o Macao.', noteEn: 'Must be carrier unlocked. eSIM supported including models bought in Hong Kong or Macau.' },
  { brand: 'Apple', model: 'iPhone 12', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models do not support eSIM.' },
  { brand: 'Apple', model: 'iPhone 12 Mini', noteEs: 'Debe estar libre de operador. Compatible con eSIM en todas las regiones (incluyendo Hong Kong y Macao).', noteEn: 'Must be carrier unlocked. eSIM supported in all regions (including Hong Kong and Macau).' },
  { brand: 'Apple', model: 'iPhone 12 Pro', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models do not support eSIM.' },
  { brand: 'Apple', model: 'iPhone 12 Pro Max', noteEs: 'Debe estar libre de operador. Modelos de China continental, Hong Kong y Macao no admiten eSIM.', noteEn: 'Must be carrier unlocked. China mainland, Hong Kong and Macau models do not support eSIM.' },
  { brand: 'Apple', model: 'iPhone 13', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador. (Modelos de China continental, HK y Macao no admiten eSIM).', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked. (China mainland, HK and Macau models no eSIM).' },
  { brand: 'Apple', model: 'iPhone 13 Mini', noteEs: 'Permite 2 eSIMs activas a la vez. Compatible con eSIM en todas las regiones (incluyendo Hong Kong y Macao).', noteEn: 'Allows 2 active eSIMs simultaneously. eSIM supported in all regions (including Hong Kong and Macau).' },
  { brand: 'Apple', model: 'iPhone 13 Pro', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador. (Modelos de China continental, HK y Macao no admiten eSIM).', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked. (China mainland, HK and Macau models no eSIM).' },
  { brand: 'Apple', model: 'iPhone 13 Pro Max', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador. (Modelos de China continental, HK y Macao no admiten eSIM).', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked. (China mainland, HK and Macau models no eSIM).' },
  { brand: 'Apple', model: 'iPhone SE 3 (2022)', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 14', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos vendidos en EE.UU. son 100% solo eSIM (sin bandeja física SIM). Debe estar libre.', noteEn: 'Allows 2 active eSIMs simultaneously. US models are 100% eSIM-only (no physical SIM slot). Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 14 Plus', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son 100% solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are 100% eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 14 Pro', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son 100% solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are 100% eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 14 Pro Max', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son 100% solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are 100% eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 15', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos vendidos en EE.UU. son solo eSIM (sin bandeja física SIM). Debe estar libre.', noteEn: 'Allows 2 active eSIMs. US models are eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 15 Plus', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 15 Pro', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 15 Pro Max', noteEs: 'Permite 2 eSIMs activas a la vez. Los modelos de EE.UU. son solo eSIM. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. US models are eSIM-only. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 16', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 16 Plus', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 16 Pro', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 16 Pro Max', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs simultaneously. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 16e', noteEs: 'Permite 2 eSIMs activas a la vez. Debe estar libre de operador.', noteEn: 'Allows 2 active eSIMs. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone 17', noteEs: 'Permite 2 eSIMs activas. Solo SIM física en China continental, y Solo eSIM en: EE.UU., Canadá, Japón, México, Arabia Saudita, EAU, Qatar, Omán, Kuwait, Bahréin y Guam.', noteEn: 'Supports dual eSIM. SIM-only in Mainland China, and eSIM-only in: USA, Canada, Japan, Mexico, Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain, and Guam.' },
  { brand: 'Apple', model: 'iPhone 17 Pro', noteEs: 'Permite 2 eSIMs activas. Solo SIM física en China continental, y Solo eSIM en: EE.UU., Canadá, Japón, México, Arabia Saudita, EAU, Qatar, Omán, Kuwait, Bahréin y Guam.', noteEn: 'Supports dual eSIM. SIM-only in Mainland China, and eSIM-only in: USA, Canada, Japan, Mexico, Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain, and Guam.' },
  { brand: 'Apple', model: 'iPhone 17 Pro Max', noteEs: 'Permite 2 eSIMs activas. Solo SIM física en China continental, y Solo eSIM en: EE.UU., Canadá, Japón, México, Arabia Saudita, EAU, Qatar, Omán, Kuwait, Bahréin y Guam.', noteEn: 'Supports dual eSIM. SIM-only in Mainland China, and eSIM-only in: USA, Canada, Japan, Mexico, Saudi Arabia, UAE, Qatar, Oman, Kuwait, Bahrain, and Guam.' },
  { brand: 'Apple', model: 'iPhone 17e', noteEs: 'Permite 2 eSIMs activas. Debe estar libre de operador.', noteEn: 'Supports 2 active eSIMs. Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPhone Air', noteEs: 'El primer iPhone 100% Solo eSIM a nivel global (incluyendo China continental). Debe estar libre de operador.', noteEn: 'Apple’s first globally eSIM-only iPhone (including mainland China). Must be carrier unlocked.' },
  { brand: 'Apple', model: 'iPad Pro 11″ (A2068, 2020)', noteEs: 'Exclusivo versiones con conectividad 4G/Cellular libre de operador.', noteEn: 'Requires 4G/Cellular unlocked version.' },
  { brand: 'Apple', model: 'iPad Pro 12.9″ (A2069, 2020)', noteEs: 'Exclusivo versiones con conectividad 4G/Cellular libre de operador.', noteEn: 'Requires 4G/Cellular unlocked version.' },
  { brand: 'Apple', model: 'iPad Air (A2123, 2019)', noteEs: 'Exclusivo versiones con conectividad 4G/Cellular libre de operador.', noteEn: 'Requires 4G/Cellular unlocked version.' },
  { brand: 'Apple', model: 'iPad (A2198, 2019)', noteEs: 'Exclusivo versiones con conectividad 4G/Cellular libre de operador.', noteEn: 'Requires 4G/Cellular unlocked version.' },
  { brand: 'Apple', model: 'iPad Mini (A2124, 2019)', noteEs: 'Exclusivo versiones con conectividad 4G/Cellular libre de operador.', noteEn: 'Requires 4G/Cellular unlocked version.' },
  { brand: 'Apple', model: 'iPad 10ª generación (2022)', noteEs: 'Exclusivo versiones con conectividad Cellular/5G libre de operador.', noteEn: 'Requires Cellular/5G unlocked version.' },
  { brand: 'Apple', model: 'iPad 11ª generación (2025)', noteEs: 'Exclusivo versiones con conectividad Cellular/5G libre de operador.', noteEn: 'Requires Cellular/5G unlocked version.' },

  // --- SAMSUNG ---
  { brand: 'Samsung', model: 'Samsung Galaxy S20', noteEs: 'El teléfono debe estar libre de operador. (Atención: Las versiones S20 FE y las versiones vendidas en EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: S20 FE and versions sold in the US or South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S20+', noteEs: 'Debe estar libre de operador. (Atención: Versiones compradas en EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Versions bought in the US or South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S20+ 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones compradas en EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Versions bought in the US or South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S20 Ultra', noteEs: 'Debe estar libre de operador. (Atención: Versiones compradas en EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Versions bought in the US or South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S20 Ultra 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. y Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US and South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S21', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. y Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US and South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S21+ 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. y Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US and South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S21 Ultra 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. y Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US and South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S22', noteEs: 'Debe estar libre de operador. (Atención: Modelos comprados en Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Models bought in South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S22+', noteEs: 'Debe estar libre de operador. (Atención: Modelos comprados en Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Models bought in South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S22 Ultra', noteEs: 'Debe estar libre de operador. (Atención: Modelos comprados en Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Models bought in South Korea do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S23', noteEs: 'El teléfono debe estar libre de operador. Las variantes vendidas en China continental suelen enviarse con eSIM desactivada.', noteEn: 'Must be carrier unlocked. Mainland China models ship with eSIM disabled.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S23+', noteEs: 'El teléfono debe estar libre de operador. Las variantes vendidas en China continental suelen enviarse con eSIM desactivada.', noteEn: 'Must be carrier unlocked. Mainland China models ship with eSIM disabled.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S23 Ultra', noteEs: 'El teléfono debe estar libre de operador. Las variantes vendidas en China continental suelen enviarse con eSIM desactivada.', noteEn: 'Must be carrier unlocked. Mainland China models ship with eSIM disabled.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S23 FE', noteEs: 'Debe estar libre de operador. (Atención: Los modelos comprados en China o Hong Kong NO admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Models bought in China or Hong Kong do NOT support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy S24', noteEs: 'Debe estar libre de operador. Compatibilidad total con doble eSIM activa.', noteEn: 'Must be carrier unlocked. Full dual active eSIM support.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S24+', noteEs: 'Debe estar libre de operador. Compatibilidad total con doble eSIM activa.', noteEn: 'Must be carrier unlocked. Full dual active eSIM support.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S24 Ultra', noteEs: 'Debe estar libre de operador. Compatibilidad total con doble eSIM activa.', noteEn: 'Must be carrier unlocked. Full dual active eSIM support.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S24 FE', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S25', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S25+', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S25 Ultra', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S25 Edge', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S25 FE', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S26', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S26+', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy S26 Ultra', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Note 20', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US or South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Note 20 Ultra 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones compradas en EE.UU., Hong Kong o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US, Hong Kong or South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Fold', noteEs: 'Debe estar libre de operador. (Atención: Modelos de Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: South Korean models do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold2 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU., Hong Kong y Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US, Hong Kong and South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold3 5G', noteEs: 'Debe estar libre de operador. (Atención: Modelos de Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: South Korean models do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold4', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold5 5G', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold6 5G', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Fold7', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip', noteEs: 'Debe estar libre de operador. (Atención: Única versión de Hong Kong compatible: SM-F700F. Modelos de Corea no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: Only Hong Kong version supported: SM-F700F. Korean models do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip3 5G', noteEs: 'Debe estar libre de operador. (Atención: Versiones de EE.UU. o Corea del Sur no admiten eSIM).', noteEn: 'Must be carrier unlocked. (Note: US or South Korean versions do not support eSIM).' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip4', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip5 5G', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip6 5G', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip7', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z Flip7 FE', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy Z TriFold', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A54', noteEs: 'Modelos compatibles: SCG21 (Japón), SC-53D (Japón), SM-A546B/DS (Internacional), SM-A546S (Corea), SM-A546U1 (Internacional). Debe estar libre.', noteEn: 'Supported models: SCG21 (Japan), SC-53D (Japan), SM-A546B/DS (International), SM-A546S (Korea), SM-A546U1 (International). Must be unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A55 5G', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A35', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A56', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A36', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Samsung', model: 'Samsung Galaxy A27', noteEs: 'Debe estar libre de operador.', noteEn: 'Must be carrier unlocked.' },

  // --- GOOGLE PIXEL ---
  { brand: 'Google', model: 'Google Pixel 2', noteEs: 'Solo los teléfonos comprados directamente con el servicio Google Fi son compatibles con eSIM.', noteEn: 'Only phones bought with Google Fi service support eSIM.' },
  { brand: 'Google', model: 'Google Pixel 2 XL', noteEs: 'Debe estar liberado por el operador. (Nota: Todos los Pixel vendidos en Hong Kong no son compatibles con eSIM).', noteEn: 'Must be carrier unlocked. (Note: All Pixel phones sold in Hong Kong are incompatible with eSIM).' },
  { brand: 'Google', model: 'Google Pixel 3', noteEs: 'NO compatible en modelos de Australia, Taiwán o Japón. En EE.UU. y Canadá solo funciona si se compró con Google Fi o Sprint. No compatible con teléfonos vendidos en Hong Kong.', noteEn: 'Not compatible in phones bought in Australia, Taiwan or Japan. In US/Canada only works with Google Fi or Sprint. Not compatible if sold in Hong Kong.' },
  { brand: 'Google', model: 'Google Pixel 3 XL', noteEs: 'NO compatible en modelos de Australia, Taiwán o Japón. En EE.UU. y Canadá solo funciona con Google Fi o Sprint.', noteEn: 'Not compatible in models from Australia, Taiwan or Japan. In US/Canada only works with Google Fi or Sprint.' },
  { brand: 'Google', model: 'Google Pixel 3a', noteEs: 'NO compatible en modelos comprados en Japón, Sudeste Asiático o con servicio Verizon.', noteEn: 'Not compatible in models bought in Japan, South East Asia or with Verizon service.' },
  { brand: 'Google', model: 'Google Pixel 3a XL', noteEs: 'NO compatible en modelos del Sudeste Asiático o comprados con Verizon.', noteEn: 'Not compatible in South East Asia models or bought with Verizon service.' },
  { brand: 'Google', model: 'Google Pixel 4', noteEs: 'Debe estar liberado de fábrica. (No compatible si fue vendido en Hong Kong).', noteEn: 'Must be factory unlocked. (Incompatible if sold in Hong Kong).' },
  { brand: 'Google', model: 'Google Pixel 4a', noteEs: 'Debe estar liberado de fábrica. (No compatible si fue vendido en Hong Kong).', noteEn: 'Must be factory unlocked. (Incompatible if sold in Hong Kong).' },
  { brand: 'Google', model: 'Google Pixel 4 XL', noteEs: 'Debe estar liberado de fábrica. (No compatible si fue vendido en Hong Kong).', noteEn: 'Must be factory unlocked. (Incompatible if sold in Hong Kong).' },
  { brand: 'Google', model: 'Google Pixel 5', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Google', model: 'Google Pixel 5a', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Google', model: 'Google Pixel 6', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 6a', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 6 Pro', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 7', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 7a', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 7 Pro', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 8', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 8a', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 8 Pro', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel Fold', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 9', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 9 Pro', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 9 Pro XL', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 10', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 10 Pro', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 10 Pro XL', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },
  { brand: 'Google', model: 'Google Pixel 10a', noteEs: 'Debe estar libre de origen. Admite 2 eSIMs activas a la vez.', noteEn: 'Must be carrier unlocked. Supports 2 active eSIMs simultaneously.' },

  // --- XIAOMI, REDMI & POCO ---
  { brand: 'Xiaomi', model: 'Xiaomi 12T Pro', noteEs: 'Solo la versión Pro admite eSIM (el 12T estándar no). Debe estar libre de operador.', noteEn: 'Only 12T Pro supports eSIM. Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 13', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Lite', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 14', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 14 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 14T', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 14T Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 13 Pro+', noteEs: 'Comprueba que sea la versión global liberada con eSIM activa.', noteEn: 'Check global unlocked edition with eSIM support.' },
  { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 14 Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 14 Pro+', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Poco X7', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 15', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 15 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 15T', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 15T Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 15 Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Redmi Note 15 Pro+', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi Poco X8 Pro Max', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 17', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 17 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 17T', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Xiaomi', model: 'Xiaomi 17T Pro', noteEs: 'Debe estar libre de origen.', noteEn: 'Must be carrier unlocked.' },

  // --- MOTOROLA ---
  { brand: 'Motorola', model: 'Motorola Razr 2019', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 2022', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 5G', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 40', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 40 Ultra', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr+', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 2022', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 2023', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge+ (2023)', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 40', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 40 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 40 Neo', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 50 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 50 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 50 Fusion', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Moto G Power 5G (2024)', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola G52J 5G', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola G52J 5G II', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola G53J 5G', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Moto G54 5G', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola G84', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola G34', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola Moto G53', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola Moto G54', noteEs: 'Comprueba compatibilidad en Ajustes de Red.', noteEn: 'Check Network Settings compatibility.' },
  { brand: 'Motorola', model: 'Motorola Razr+ 2024', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 2024', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Moto G Stylus 5G 2024', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Moto G35', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 60', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 60 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 60 Fusion', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 60 Stylus', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 60', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 60 Ultra', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 70', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 70 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 70 Fusion', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 70 Fusion+', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Edge 70 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 70', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 70+', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Motorola', model: 'Motorola Razr 70 Ultra', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },

  // --- HUAWEI ---
  { brand: 'Huawei', model: 'Huawei P40', noteEs: 'Debe estar liberado de fábrica. (Atención: Las versiones P40 Pro+ y P50 Pro NO son compatibles con eSIM).', noteEn: 'Must be factory unlocked. (Note: P40 Pro+ and P50 Pro versions are NOT eSIM compatible).' },
  { brand: 'Huawei', model: 'Huawei P40 Pro', noteEs: 'Debe estar liberado de fábrica. (Atención: La versión P40 Pro+ NO es compatible con eSIM debido a su cuerpo cerámico).', noteEn: 'Must be factory unlocked. (Note: P40 Pro+ version is NOT eSIM compatible due to ceramic body).' },
  { brand: 'Huawei', model: 'Huawei Mate 40 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Huawei', model: 'Huawei Pura 70 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },

  // --- OPPO ---
  { brand: 'Oppo', model: 'Oppo Find X3', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X3 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find N2 Flip', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno 5A', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno 6 Pro 5G', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno 9A', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X5', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X5 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo A55s 5G', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find N3', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find N3 Flip', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X8', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X8 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno14', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno14 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X9', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X9 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno 15', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Reno 15 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Oppo', model: 'Oppo Find X9 Ultra', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },

  // --- HONOR ---
  { brand: 'Honor', model: 'Honor Magic 4 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic 5 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic 6 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic 7 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic 8 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor 90', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor X8', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor 200 Pro', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic V2', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic V3', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor 400 Lite', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic V5', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'Honor', model: 'Honor Magic V6', noteEs: 'Debe estar liberado de origen.', noteEn: 'Must be carrier unlocked.' },

  // --- SONY ---
  { brand: 'Sony', model: 'Sony Xperia 10 III Lite', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 10 IV', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 10 V', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 10 VI', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 10 VII', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 1 IV', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 5 IV', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 1 V', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia Ace III', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 5 V', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 1 VI', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 1 VII', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sony', model: 'Sony Xperia 1 VIII', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },

  // --- ONEPLUS ---
  { brand: 'OnePlus', model: 'OnePlus Open', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 11', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 12', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 13', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 13R', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 13T', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },
  { brand: 'OnePlus', model: 'OnePlus 15', noteEs: 'Debe estar liberado por el operador.', noteEn: 'Must be carrier unlocked.' },

  // --- SHARP ---
  { brand: 'Sharp', model: 'Sharp AQUOS sense4 lite', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS Sense6s', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS sense 7', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS sense 7plus', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS Wish', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS wish 2 SHG08', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS wish3', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS zero 6', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp Simple Sumaho6', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS R7', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS R8', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS R8 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Sharp', model: 'Sharp AQUOS sense8', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },

  // --- RAKUTEN ---
  { brand: 'Rakuten', model: 'Rakuten Mini', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Rakuten', model: 'Rakuten Big-S', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Rakuten', model: 'Rakuten Big', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Rakuten', model: 'Rakuten Hand', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Rakuten', model: 'Rakuten Hand 5G', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },

  // --- VIVO ---
  { brand: 'Vivo', model: 'Vivo X80 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X90 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X100 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo V29', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo V29 Lite', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo V29 Lite 5G', noteEs: 'Soporte de eSIM disponible únicamente en las versiones comercializadas en Europa. Debe estar libre.', noteEn: 'eSIM supported only in European model variants. Must be carrier unlocked.' },
  { brand: 'Vivo', model: 'Vivo V40', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo V40 lite', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo V40 SE', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X200', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X200s', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X200 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X200 FE', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X300', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X300 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Vivo', model: 'Vivo X300 FE', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },

  // --- OTRAS MARCAS / OTHERS ---
  { brand: 'Planet Computers', model: 'Gemini PDA', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Fairphone', model: 'Fairphone 4', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Fairphone', model: 'Fairphone 5', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'DOOGEE', model: 'DOOGEE V30', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'HAMMER', model: 'HAMMER Blade 3', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'HAMMER', model: 'HAMMER Explorer PRO', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'HAMMER', model: 'HAMMER Blade 5G', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nokia', model: 'Nokia XR21', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nokia', model: 'Nokia X30', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nokia', model: 'Nokia G60 5G', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'myPhone', model: 'myPhone NOW eSIM', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'OUKITEL', model: 'OUKITEL WP30 Pro', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'OUKITEL', model: 'OUKITEL WP33 Pro', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nuu', model: 'Nuu X5', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'ZTE', model: 'ZTE Nubia Flip', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'TCL', model: 'TCL 50 5G', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'TCL', model: 'TCL 50 Pro NxtPaper', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'TCL', model: 'TCL 60 XE NxtPaper', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'TCL', model: 'TCL NxtPaper 60 Ultra', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'TCL', model: 'TCL NxtPaper 70 Pro', noteEs: 'Debe estar libre de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Asus', model: 'Asus ROG Phone 9', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Asus', model: 'Asus ROG Phone 9 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Asus', model: 'Asus Zenfone 12 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Realme', model: 'Realme 14 Pro+', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Realme', model: 'Realme GT 7', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Realme', model: 'Realme GT 8 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nothing', model: 'Nothing Phone 3', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nothing', model: 'Nothing Phone 3a Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Nothing', model: 'Nothing Phone 4a Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Infinix', model: 'Infinix Note 60 Pro', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Infinix', model: 'Infinix Note 60 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' },
  { brand: 'Tecno', model: 'Tecno Camon 50 Ultra', noteEs: 'Debe estar liberado de fábrica.', noteEn: 'Must be factory unlocked.' }
];

export default function CompatibilityModal({ isOpen, onClose, lang = 'es' }) {
  if (!isOpen) return null;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState(null);

  const filteredDevices = useMemo(() => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return DEVICE_DATABASE.slice(0, 12);
    }
    const term = searchTerm.toLowerCase();
    return DEVICE_DATABASE.filter(
      (d) =>
        d.brand.toLowerCase().includes(term) ||
        d.model.toLowerCase().includes(term)
    );
  }, [searchTerm]);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/80 backdrop-blur-md z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-[2.5rem] sm:rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-4 sm:space-y-6 relative border-t border-x border-zinc-200 sm:border h-[85vh] sm:h-auto max-h-[85vh] sm:max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-black font-bold text-xl w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#ffec00] text-black flex items-center justify-center shadow-xs flex-shrink-0">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold text-black tracking-tight">
              {lang === 'en' ? 'Is your phone compatible?' : '¿Es tu teléfono compatible?'}
            </h3>
            <p className="text-base text-zinc-500 font-medium">
              {lang === 'en'
                ? 'Type your model to verify eSIM support instantly'
                : 'Escribe tu modelo para verificar el soporte eSIM al instante'}
            </p>
          </div>
        </div>

        {/* Selected device green success card */}
        {selectedDevice && (
          <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl space-y-1.5 relative animate-fade-in shadow-xs">
            <button
              onClick={() => setSelectedDevice(null)}
              className="absolute top-3 right-3 text-emerald-700 hover:text-emerald-950 font-bold text-sm"
            >
              ✕
            </button>
            <div className="flex items-center gap-2 text-emerald-900 font-bold text-[0.9rem]">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black flex-shrink-0">
                ✓
              </span>
              <span>
                {lang === 'en'
                  ? 'Great news, your phone supports eSIM!'
                  : '¡Buenas noticias! Tu teléfono es compatible con eSIM'}
              </span>
            </div>

            <p className="text-[0.9rem] text-emerald-900 leading-relaxed font-sans pt-0.5">
              {lang === 'en' ? (
                <>
                  The <strong className="font-bold">{selectedDevice.brand} {selectedDevice.model}</strong> works perfectly with <strong className="font-bold">ME-SIM.COM</strong>. One small check: {selectedDevice.noteEn}
                </>
              ) : (
                <>
                  El modelo <strong className="font-bold">{selectedDevice.brand} {selectedDevice.model}</strong> funciona perfectamente con <strong className="font-bold">ME-SIM.COM</strong>. Una pequeña comprobación: {selectedDevice.noteEs}
                </>
              )}
            </p>
          </div>
        )}

        {/* Search input with autocompletion */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setSelectedDevice(null);
            }}
            placeholder={
              lang === 'en'
                ? 'Type model name (e.g. Galaxy S23, iPhone 14, Pixel 7...)'
                : 'Escribe tu modelo (ej. Galaxy S23, iPhone 14, Pixel 7...)'
            }
            className="w-full px-4 py-3 rounded-2xl border border-zinc-300 text-base outline-none focus:border-black font-sans pr-10 shadow-2xs"
          />
          <svg className="w-5 h-5 fill-current text-zinc-400 absolute right-3.5 top-3.5" viewBox="0 0 24 24">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
        </div>

        {/* Autocomplete model-by-model list */}
        <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
          {filteredDevices.length > 0 ? (
            filteredDevices.map((d, idx) => (
              <div
                key={idx}
                className="bg-zinc-50 hover:bg-zinc-100/90 py-2 px-3 rounded-xl border border-zinc-200 flex items-center justify-between gap-2.5 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="hidden sm:inline-block text-[11px] font-bold font-mono px-1.5 py-0.5 rounded bg-zinc-200/80 text-zinc-700 uppercase flex-shrink-0">
                    {d.brand}
                  </span>
                  <span className="font-bold text-black text-sm sm:text-base leading-tight truncate">{d.model}</span>
                </div>

                <button
                  onClick={() => setSelectedDevice(d)}
                  type="button"
                  aria-label={`Ver compatibilidad ${d.model}`}
                  className="bg-black hover:bg-zinc-800 text-[#ffec00] font-bold text-xs p-1.25 w-8 h-8 sm:w-auto sm:h-auto sm:py-1 sm:px-2.5 rounded-full sm:rounded-lg transition-all shadow-2xs whitespace-nowrap flex items-center justify-center gap-1 flex-shrink-0 aspect-square sm:aspect-auto"
                >
                  <span className="hidden sm:inline">{lang === 'en' ? 'Check' : 'Ver compatibilidad'}</span>
                  <span className="text-[#ffec00] text-xs font-bold sm:ml-0.5 flex items-center justify-center">
                    ➔
                  </span>
                </button>
              </div>
            ))
          ) : (
            <p className="text-base text-zinc-500 text-center py-6">
              {lang === 'en'
                ? 'No models match your search.'
                : 'No se encontraron modelos con esa búsqueda.'}
            </p>
          )}
        </div>

        {/* EID quick instructions */}
        <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-base space-y-1">
          <p className="font-bold text-amber-900 flex items-center gap-1.5">
            <svg className="w-5 h-5 fill-current text-amber-700 flex-shrink-0" viewBox="0 0 24 24">
              <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
            </svg>
            <span>{lang === 'en' ? 'Quick EID Check (*#06#)' : 'Comprobación rápida EID (*#06#)'}</span>
          </p>
          <p className="text-amber-800 leading-relaxed text-sm font-sans">
            {lang === 'en'
              ? 'Dial *#06# on your phone keypad. If a 32-digit EID code appears on your screen, your phone is 100% eSIM ready.'
              : 'Marca *#06# en la aplicación de llamadas de tu móvil. Si aparece un código EID de 32 dígitos, tu teléfono es 100% compatible con eSIM.'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full bg-black hover:bg-zinc-800 text-[#ffec00] font-bold py-3.5 rounded-2xl text-base uppercase tracking-wider transition-all shadow-md"
        >
          {lang === 'en' ? 'Close' : 'Cerrar'}
        </button>
      </div>
    </div>
  );
}

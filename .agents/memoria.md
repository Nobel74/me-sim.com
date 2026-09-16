# 📝 Memoria del Proyecto y Bitácora de Sesiones - ME-SIM.COM

## 📅 Última Actualización: 16 de Septiembre de 2026 - 13:50 CEST

---

### 📌 Resumen de la Sesión Actual: Unificación Tipográfica Legal (1.125rem) y T&C Bilingüe
En esta sesión se desarrollaron e integraron los requerimientos solicitados por el usuario:
1. **Tipografía Unificada en Todas las Páginas de Información Legal (`font-size: 1.125rem;`):**
   - En [`src/app/globals.css`](file:///c:/Users/Paco/Documents/me-sim/src/app/globals.css), se estableció formalmente la regla `font-size: 1.125rem;` en `.wp-content p`, `.legal-content p`, `.wp-content li` y `.legal-content li`.
   - Se estandarizó la clase contenedora a `text-[1.125rem] leading-relaxed` en las 8 páginas de información legal (ES y EN):
     1. [`src/app/condiciones-de-servicio/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/condiciones-de-servicio/page.js)
     2. [`src/app/en/terms-and-conditions/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/terms-and-conditions/page.js)
     3. [`src/app/politica-de-cookies/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/politica-de-cookies/page.js)
     4. [`src/app/en/cookie-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/cookie-policy/page.js)
     5. [`src/app/politica-de-reembolso/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/politica-de-reembolso/page.js)
     6. [`src/app/en/refund-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/refund-policy/page.js)
     7. [`src/app/pollitica-de-privacidad/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/pollitica-de-privacidad/page.js)
     8. [`src/app/en/privacy-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/privacy-policy/page.js)
   - Verificado con subagente de navegador: todos los párrafos computan de forma homogénea a 18px (`1.125rem`) tanto en móvil como en escritorio.
2. **Actualización Completa de Términos y Condiciones (EN / ES):**
   - En [`src/app/en/terms-and-conditions/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/terms-and-conditions/page.js) y [`src/app/condiciones-de-servicio/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/condiciones-de-servicio/page.js):
     - Sustitución rigurosa de toda referencia de proveedor por **ME-SIM.COM** y contacto `info@me-sim.com`.
     - Definición de **Stripe** como pasarela transaccional exclusiva y segura (tarjetas Visa, Mastercard, American Express), eliminando cualquier mención a PayPal.
     - Inclusión formal de **AUD** junto a EUR, USD y GBP en el punto 5 (Pedidos, precios y pagos).
     - Adaptación a la arquitectura **Sin App**: se eliminaron referencias a aplicaciones nativas, estableciendo que la operativa, compra y recargas se gestionan 100% a través del área web del cliente.
     - Integración de los 13 apartados legales completos con maquetación limpia y enlace directo a la Política de Reembolso.
2. **Rediseño Responsive de Pestañas de FAQs (Sin Scroll Horizontal):**
   - En [`src/components/FaqSection.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/FaqSection.js), se eliminó la barra de desplazamiento horizontal desbordada.
   - **En escritorio y tablet:** Los 6 botones se distribuyen de forma centrada y balanceada mediante *flex-wrap*, con microinteracciones fluidas y estado activo negro con acento amarillo `#ffec00`.
   - **En móvil (smartphones):** Los 6 botones se organizan en una cuadrícula simétrica de 2 columnas (`grid-cols-2`), permitiendo pulsar cualquier categoría directamente con el pulgar sin desbordamientos.
   - Cada categoría incorpora un icono vectorial SVG plano acorde a su temática (Conceptos, Instalación, Uso, Precios, FUP, Dispositivos).
3. **Diccionarios Literales de Internacionalización (`locales/es.json` y `locales/en.json`):**
   - Se crearon los archivos maestros oficiales con la estructura exacta `unlimited_spain_info` (`section1_title` hasta `section4_text`) en castellano e inglés literal.
   - En [`src/lib/i18n.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/i18n.js) se añadieron las claves y se implementó la función auxiliar `getUnlimitedInfo(countryName, lang)` que reemplaza dinámicamente el nombre del destino en los títulos manteniendo el texto literal intacto para España.
   - Se añadió la categoría de FAQ `unlimited-fup` en `faqData.es` y `faqData.en`.
4. **Componente Visual Mobile-First (`src/components/UnlimitedPlanInfo.jsx`):**
   - Estilo acorde al frontend de ME-SIM: paleta oscura/blanca, acento corporativo amarillo `#ffec00`, insignia de FUP, badge de cero cortes de servicio e iconografía plana SVG sin esqueumorfismo.
   - 4 bloques de información: introducción, cuota diaria (2 GB/día a alta velocidad + 1 Mbps continuo), expectativas de viaje y selección de días exactos.
5. **Integración en Ficha de Producto:**
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), insertado a ancho completo exactamente entre la sección *"Cómo instalar tu eSIM para [nombre del país]"* y *"Por qué elegir una eSIM de ME-SIM para [nombre del país]"*. Se eliminó la instancia duplicada que aparecía debajo del calendario de fechas para evitar redundancias visuales.
6. **Integración en Centro de Soporte y Chatbot Inteligente:**
   - En [`src/lib/supportData.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/supportData.js), creación del artículo `planes-ilimitados-politica-uso-justo-fup` con los textos literales.
   - En [`src/app/soporte/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/soporte/page.js), inclusión del componente informativo destacado.
   - En [`src/components/SupportChatbot.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/SupportChatbot.js), adición del paso guiado `unlimited_fup` en el menú principal y disparadores por palabras clave ("ilimitado", "fup", "uso justo", "unlimited", "fair use", "2gb", "1mbps").
7. **Directiva Obligatoria de Marca: Sustitución de Proveedor por 'ME-SIM.COM':**
   - Se auditó todo el repositorio y se sustituyeron todas las menciones visibles en UI y respuestas de error públicas: en [`src/app/admin/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/page.js), [`src/app/admin/orders/[id]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/orders/[id]/page.js) y [`src/app/api/orders/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/orders/route.js).
8. **Validación y Calidad (QA):**
   - Verificación automatizada con suite de pruebas y validación visual exhaustiva mediante subagente de navegador en ambas páginas legales (`/en/terms-and-conditions` y `/condiciones-de-servicio`), así como en la home en Desktop, Tablet y Mobile.

#### Objetivos Clave Completados:
1. **Auditoría Financiera y Normativa:** Detección de la bajada de tarifas de StrongeSIM y creación del documento maestro normativo [`docs/DIRECTIVAS_PRECIOS_Y_MARGENES.md`](file:///c:/Users/Paco/Documents/me-sim/docs/DIRECTIVAS_PRECIOS_Y_MARGENES.md).
2. **Motor de Reglas y Salvaguardas Financieras:** Implementación del motor centralizado [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js) con validación estricta de rangos, escrituras atómicas en disco, auditoría inmutable (`pricing-audit.log`), copias de seguridad automáticas y mecanismo instantáneo de *Rollback*.
3. **API Administrativa Segura:** Endpoint [`/api/admin/pricing-rules`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/pricing-rules/route.js) (GET, POST, PUT) con control de acceso administrativo, soporte para Modo Borrador aislado y publicación atómica con revalidación de caché en 1-click.
4. **Sincronización Comercial de PVP Web:** Corrección de la muestra de datos en el admin reemplazando los paquetes brutos diarios de StrongeSIM por los 14 tiers comerciales oficiales de ME-SIM, garantizando que el PVP mostrado en el admin coincide al 100% con la tienda pública.
5. **Rediseño Visual Premium & Switcher Multi-Divisa:** Refactorización de [`/admin/precios`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js) con estilos visuales del panel de finanzas (`rounded-2xl`, sombras refinadas, modo oscuro/claro nítido), iconografía plana **Lucide React**, selector multi-divisa (EUR, GBP, USD, AUD) con recálculo dinámico en tiempo real, consolidación a columna única de **Coste Proveedor**, eliminación de la tarjeta redundante de tipo de cambio USD->EUR y botonera jerarquizada con botón verde esmeralda para publicar.
6. **Resolución Universal de Filtro por Zonas:** Normalización de `mapIsoToRegion` para vincular de forma infalible todos los países e islas del mundo (198 destinos) y paquetes regionales multidestino a sus 14 bloques oficiales (Caribe, Europa, Sudamérica, África, etc.).
7. **Unificación de Navegación y Cabecera Liberada:**
   - En [`src/app/admin/AdminLayoutClient.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/AdminLayoutClient.js), simplificación del elemento del menú a **"Precios"** (`Pricing` en EN) en todas las resoluciones (escritorio `xl`, tablet y cajón móvil).
   - En [`src/app/admin/precios/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js), liberación de la cabecera eliminando la card contenedora envolvente para igualar el patrón exacto de diseño de Finanzas y Clientes (título + selector multi-moneda a ras de lienzo, con barra de acciones/toolbar independiente debajo).
8. **Blindaje Serverless en Vercel (Persistencia en WooCommerce & Memoria Viva):**
   - Resolución del error 500 al guardar borrador en producción causado por el sistema de archivos de solo lectura de Vercel (`EROFS: read-only file system`).
   - Implementación de persistencia multi-capa en [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js): sincronización persistente con WooCommerce MySQL (`customers/45` en `mesim_pricing_rules_draft`, `mesim_pricing_rules` y `mesim_pricing_rules_backup`), fallback de disco a `/tmp` y memoria viva para respuestas a velocidad de microsegundo.
   - Normalización universal de comas decimales (`val.replace(',', '.')`) en inputs de la UI y funciones de validación.

---

### 🛠️ Cambios Realizados y Ficheros Modificados

#### Backend / APIs:
- [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js):
  - Algoritmo financiero centralizado `computePlanPricing(costUsd, regionKey, rules)`.
  - Fórmula matemática de protección de beneficio: garantiza `minProfitNetEur >= 1.50 €` tras liquidar 21% IVA y pasarela Stripe (1.5% + 0.25 €).
  - Sanitización de rangos: `usdToEurRate` [0.70 - 1.30], `floorPriceEur` [2.50 - 10.00 €], `minProfitNetEur` [0.50 - 10.00 €], markups [1.00 - 5.00×].
  - Mapeador universal `mapIsoToRegion(iso, isRegion, fallbackRegion)` vinculado al catálogo maestro `ALL_WORLD_COUNTRIES`.
  - Función de escritura atómica `writeAtomicJson`, backup automático previo a publicar y log de auditoría inmutable en `config/pricing-audit.log`.
- [`src/app/api/admin/pricing-rules/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/pricing-rules/route.js):
  - `GET`: Devuelve configuración activa, borrador, permisos, flag de backup y muestra completa de los 14 tiers comerciales oficiales para todos los destinos y paquetes regionales (`regionMeta`).
  - `POST`: Acciones seguras autenticadas (`save_draft`, `reset_draft`, `rollback`).
  - `PUT`: Publicación de borrador a producción con copia previa de respaldo y purga de caché de `/api/plans`.
- [`src/app/api/plans/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/plans/route.js):
  - Integrado con `export const dynamic = 'force-dynamic'`.
  - Consumo directo de `getPricingRules('live')` y `computePlanPricing` para fijar el PVP público de la tienda sin cachés estáticas complacientes.

#### Frontend / UI:
- [`src/app/admin/precios/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js):
  - Rediseño con estética gemela del **Panel de Finanzas** (`rounded-2xl`, bordes `zinc-800`/`zinc-200`, fondos `bg-zinc-900/80` / `bg-white`).
  - Iconos vectoriales planos Lucide React (`DollarSign`, `RefreshCw`, `Sliders`, `CheckCircle2`, `AlertTriangle`, `Layers`, `Globe`, `RotateCcw`, `Check`, `Search`, `ShieldCheck`, `Shield`, `TrendingUp`, `Zap`, `X`, `Save`).
  - Switcher de divisa global dinámico (`EUR`, `GBP`, `USD`, `AUD`) con sincronización en `localStorage` (`mesim_admin_currency`).
  - Eliminación de la tarjeta redundante de FX, consolidando 3 tarjetas de parámetros globales con indicación de equivalencia en la moneda activa.
  - Consolidación a columna única de **Coste Proveedor** (`formatProviderCost`).
  - Botonera agrupada: selector de vista (`Borrador` vs `En Vivo`), botones secundarios con estilo contorneado (*outline*) y botón primario destacado en verde esmeralda ("Publicar a Producción").
  - Soporte bilingüe completo (ES/EN) en tiempo real.

#### Persistencia y Configuración:
- [`config/pricing-rules.json`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-rules.json): Reglas activas en producción.
- [`config/pricing-rules.draft.json`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-rules.draft.json): Estado de edición aislado para simulación sin riesgo.
- [`config/pricing-rules.backup.json`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-rules.backup.json): Respaldo automático para Rollback en 1-click.
- [`config/pricing-audit.log`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-audit.log): Historial inmutable de modificaciones con timestamp y usuario admin.

#### Control de Calidad y Pruebas Automatizadas:
- [`scratch/test-qa-margins.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-margins.ps1): Validación de fórmulas y auditoría inicial de márgenes (0 errores).
- [`scratch/test-qa-pricing-rules.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-pricing-rules.ps1): Validación de rangos, atomicidad, backup y blindaje financiero (0 errores).
- [`scratch/test-qa-currency-and-pvp.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-currency-and-pvp.ps1): Verificación de selector multi-divisa, columna consolidada y coincidencia céntimo a céntimo de PVP Web en tienda pública (0 errores).
- [`scratch/test-qa-all-regions.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-all-regions.ps1): Validación de filtrado instantáneo para las 14 zonas oficiales (0 errores).
- [`walkthrough.md`](file:///c:/Users/Paco/.gemini/antigravity-ide/brain/1fafe6b2-4c05-4a7e-95a7-8ec2bdbb33be/walkthrough.md): Informe técnico de recorrido de la sesión.

---

### 📐 Decisiones Arquitectónicas y Reglas Financieras Fijadas

1. **Matriz de 14 Zonas Comerciales + Fallback:**
   - Europa (1.85×)
   - Norteamérica (1.75×)
   - Asia General (1.68×)
   - Japón, Corea y Taiwán (1.70×)
   - Sudeste Asiático (1.68×)
   - China, HK y Macao (1.70×)
   - Oriente Medio (1.61×)
   - América del Sur (1.65×)
   - Caribe y Centroamérica (1.65×)
   - África (1.60×)
   - Oceanía (1.65×)
   - Alianza AUKUS (1.70×)
   - Europa + Marruecos (1.80×)
   - Global Multidestino (1.60×)
   - *Fallback sin región:* 1.60×
2. **Floor Price y Margen Limpio Garantizado:**
   - Suelo infranqueable: **2.90 €** (PVP mínimo final IVA incluido).
   - Beneficio Neto mínimo: **1.50 €** limpios tras descontar IVA (21%) y comisión de pasarela Stripe (1.5% + 0.25 €).
   - En caso de planes de coste ultra-bajo, el algoritmo financiero eleva el precio automáticamente para cumplir simultáneamente con ambas condiciones.
3. **Aislamiento de Entorno y Publicación en 1-Click:**
   - Todas las pruebas, simulaciones y ajustes de multiplicadores se realizan de forma aislada en `pricing-rules.draft.json`.
   - La tienda pública solo lee `pricing-rules.json`.
   - Al pulsar "Publicar a Producción", se guarda copia de seguridad para Rollback, se escribe atómicamente la configuración y se purga la caché de Next.js mediante `revalidatePath('/api/plans')`.
4. **Política Global Anti-Mocks:**
   - Prohibido terminantemente el uso de mocks o datos simulados. Todas las interfaces del panel admin operan contra datos oficiales y en vivo de las APIs (StrongeSIM, WooCommerce, Stripe).

---

### 📋 Estado Actual y Próximos Pasos (Pendientes)

- **Estado del Módulo:** 100% Completo, auditado, probado y validado con 0 errores en pruebas de QA.
- **Siguientes Hitos del Roadmap (Próximas Sesiones):**
  1. *Automatización de Tipos de Cambio:* Conexión de `usdToEurRate` con actualización periódica programada (cron/webhook) manteniendo el límite de fluctuación [0.70 - 1.30].
  2. *Historial Visual de Auditoría en Admin:* Añadir una pestaña o modal para visualizar las últimas entradas de `config/pricing-audit.log` directamente desde `/admin/precios`.
  3. *Alertas Proactivas de Margen:* Notificación al administrador si StrongeSIM sube un coste mayorista por encima de un umbral que reduzca el margen neto por debajo de 1.50 €.

# 📝 Memoria del Proyecto y Bitácora de Sesiones - ME-SIM.COM

## 📅 Última Actualización: 16 de Septiembre de 2026 - 13:00 CEST

---

### 📌 Resumen de la Sesión Actual: Sincronización de Precios Regionales (Europa 5.78 €), Cero Mocks y Barra de Carga Dinámica
En esta sesión se abordaron y resolvieron de forma integral las peticiones del usuario:
1. **Unificación y Sincronización de Precios Regionales (Europa 5.78 €):**
   - Se diagnosticó la discrepancia en Europa: en la ficha de producto (`/destination/europe`) el precio legítimo es **5.78 €** (calculado con `regionTiers` mult 0.60, margen Europa 1.85× y redondeo .x8). En `/admin/precios` mostraba 5.72 € porque iteraba sobre los tiers de países en vez de los 10 tiers de regiones.
   - Se corrigió [`/api/admin/pricing-rules/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/pricing-rules/route.js) implementando `regionTiers`, garantizando que en el panel de administración Europa refleje exactamente **5.78 €**.
2. **Cumplimiento Estricto de Cero Mocks en Tarjetas de Regiones:**
   - Se eliminaron todos los precios hardcodeados de `REGION_CARDS_DATA` en [`src/app/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/page.js) y [`src/app/home-preview/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/home-preview/page.js).
   - Se implementó `regionMinPriceMap` para leer los precios de las regiones directamente y en tiempo real de la API `/api/plans`, mostrando en la Home **`desde 5.78 €`** para Europa y el mínimo dinámico real para cada región.
3. **Componente de Barra de Carga con Porcentaje y Bilingüe (`LoadingProgressBar.js`):**
   - Creado en [`src/components/LoadingProgressBar.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/LoadingProgressBar.js) con acento amarillo corporativo `#ffec00`.
   - Cumple con la directiva visual de frontend: **borde gris oscuro en modo claro y borde gris claro en modo oscuro**.
   - Muestra contador numérico fluido de `0%` a `100%` y texto superior bilingüe (`"Cargando planes..."` / `"Loading plans..."`).
   - Integrado en: Home (`/` y `/home-preview`), Catálogo de Destinos (`/destinations`), Ficha de Producto (`/destination/[iso]`) y Panel de Precios (`/admin/precios`).
4. **Verificación de Compilación para Vercel y Control de Calidad (QA):**
   - Se ejecutó `npm run build` con Next.js 14.2.35 completando exitosamente (`✓ Compiled successfully`, `✓ Generating static pages (45/45)` con 0 errores).
   - Suite de pruebas de integración [`scratch/test-qa-regions-and-loader.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-regions-and-loader.ps1) superada al 100% (0 fallos).

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

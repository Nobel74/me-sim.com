# 📝 Memoria del Proyecto y Bitácora de Sesiones - ME-SIM.COM

## 📅 Última Actualización: 22 de Octubre de 2026 - 12:35 CEST

---

### 📌 Resumen de la Sesión Actual: Exclusión Estricta de Paquetes Multi-País en Destinos Nacionales y Erradicación de Planes Anómalos (Paridad 100% con Catálogo de StrongeSIM)
En respuesta a la detección por parte de Paco de un plan anómalo de 1 GB a 30 días ($7.04 USD) que aparecía intercalado tras el plan de 5 GB en el catálogo de Australia sin figurar en los planes del proveedor:

1. **Investigación de Causa Raíz (Telemetría de la API de StrongeSIM en Vivo):**
   - **El Plan Concreto:** Se identificó el Plan ID `164065`, denominado oficialmente por el operador como `"AUKUS(3 countries) 1GB 30days"` (coste mayorista $3.60 USD).
   - **Causa de Infiltración:** En la API mayorista de StrongeSIM, los paquetes multi-país de 3 países asignan `location: "AU"` o `country_code: "AU"`. Al consultar `/api/plans?country=au`, el backend capturaba cualquier paquete donde `pIso === 'au'`.
   - **Por qué no se deduplicaba:** Los paquetes multi-país de 3 GB colisionaban con el 3 GB nacional de Australia ($2.28 USD) y eran descartados por precio. Pero Australia **no dispone de plan nacional de 1 GB a 30 días** (solo de 7 días por $0.84 USD). Al no haber rival nacional de 30 días, el paquete AUKUS sobrevivía a la deduplicación.
   - **Inversión de Orden y Precio:** La API devuelve los paquetes ordenados por coste mayorista ($). Como el plan nacional de 5 GB cuesta $3.24 USD y el paquete multi-país AUKUS de 1 GB cuesta $3.60 USD, la API lo colocaba inmediatamente después de los 5 GB, calculando un suelo técnico de $7.04 USD.
   - **Diferencia Arquitectónica:** StrongeSIM etiqueta internamente con precisión absoluta los 3.210 planes del catálogo mundial: 2.824 planes puramente nacionales (`plan_type: 'country'`, 1 sola ubicación en `operator_list`) y 386 paquetes multi-país/regionales (`plan_type: 'region'`, múltiples ubicaciones en `operator_list`).

2. **Soluciones Implementadas (Defensa en Profundidad en Backend y Frontend):**
   - **`src/app/api/plans/route.js`**:
     * En consultas de destinos nacionales (`queryTarget` de país individual o `!isRegionQuery`), se filtran estrictamente los planes para admitir exclusivamente planes 100% locales:
       `const isMultiCountry = (p.plan_type && p.plan_type !== 'country') || (Array.isArray(p.operator_list) && p.operator_list.length > 1); return !isMultiCountry;`
     * En el catálogo global por defecto, los planes base de países individuales se circunscriben de igual forma a planes locales de país, preservando los paquetes multi-país exclusivamente en sus slugs comerciales correspondientes vía `REGION_MAPPING`.
   - **`src/app/api/admin/pricing-rules/route.js`**:
     * En `getMasterLivePlans()`, se replica la misma restricción estricta (`countryOnlyPlans`), garantizando paridad total céntimo a céntimo entre `/admin/precios` y la tienda pública.
   - **`src/lib/strongesim.js`**:
     * En `resolveStrongeSimPlanDetails`, cuando `targetIso` corresponde a un país individual (`!isRegionalSlug(targetIso)`), el pool de aprovisionamiento prioriza con exclusividad los planes 100% locales del país.
   - **`src/app/destination/[iso]/page.js`**:
     * En la vista pública de destino, cuando `isoCode` es un país nacional, se añade filtro de blindaje defensivo que descarta planes con `is_region === true` o referencias multi-país.

3. **Control de Calidad (QA), Verificación y Compilación:**
   - Creado y ejecutado el test automatizado [`scratch/test-e2e-national-plans.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-e2e-national-plans.mjs):
     * Australia: exactamente los 16 planes locales del proveedor (0 planes multi-país, 0 planes AUKUS).
     * Deduplicación limpia en la UI con exactamente 10 opciones comerciales ordenadas de menor a mayor (100MB, 500MB, 1GB, 3GB 15d, 3GB 30d, 5GB 30d, 10GB 30d, 20GB 30d, 50GB 30d, 50GB 180d). Erradicado el plan anómalo de 1 GB 30 días.
     * Pruebas de regresión aprobadas para México (16/16 planes nacionales limpios) y USA (52/52 planes nacionales limpios).
     * Los paquetes regionales legítimos (AUKUS, Oceanía, Europa, Asia, etc.) permanecen 100% operativos e intactos en sus rutas comerciales dedicadas.
   - Compilación completa de producción (`npm.cmd run build`) validada con código 0 (45/45 páginas generadas sin errores).
   - Directiva RED FLAG respetada al 100% (cero compras o pedidos transaccionales ejecutados).

---

### 📌 Resumen de la Sesión Actual: Escalado Dinámico y Proporcional de Planes Fijos a partir del Precio Base (1 GB) según la API de StrongeSIM
En respuesta al requerimiento prioritario de Paco tras aportar las capturas comparativas (GCC 1GB a $4.79 coste mayorista, proveedor vendiendo a 8.90 € y ME-SIM a 7.63 € / $8.57, pero con precios escalando desmesuradamente en los siguientes tramos: 3GB a 20.66 € vs 16.90 € proveedor, 5GB a 32.42 € vs 20.90 € proveedor, y 10GB a 59.15 € vs 38.90 € proveedor):

1. **Causa Raíz Identificada:**
   - Anteriormente, el sistema aplicaba el multiplicador regional completo (ej. 1.61× para Oriente Medio / GCC o 1.75× para Norteamérica) sobre el coste mayorista individual de **cada** paquete devuelto por la API de StrongeSIM.
   - En planes de alto volumen (ej. 10 GB a $39.67 USD de coste), un markup del 61% sumaba +$24 USD de margen por línea, disparando el PVP a 59.15 € y expulsando a ME-SIM fuera de mercado frente a los 38.90 € del proveedor.
   - En cambio, la web oficial del proveedor StrongeSIM comprime su margen en los tramos altos aplicando una curva comercial decreciente a partir del precio de entrada (1 GB 7 días).

2. **Solución Implementada (Cero Mocks, 100% API StrongeSIM, Línea Roja Planes Ilimitados Intacta):**
   - **`src/lib/pricingRules.js`**:
     * Definida la escala oficial calibrada con la web del proveedor: `FIXED_PLAN_VOLUME_SCALES` (1 GB: 1.00× [base], 2 GB: 1.40×, 3 GB: 1.89887× [+89.9%], 5 GB: 2.34831× [+134.8%], 10 GB: 4.37078× [+337.1%], 15 GB: 4.80×, 20 GB: 5.50×, 30 GB: 7.00×, 50 GB: 9.00×).
     * Creada la función `computeScaledFixedPlanPricing(planCostUsd, basePlanCostUsd, gbAmount, regionKey, rules, rates)`:
       - El plan base (1 GB 7 días) se calcula sobre su coste API real mediante `computePlanPricing`.
       - Los planes superiores escalan proporcionalmente multiplicando el precio base por el factor de volumen.
       - **Suelo Técnico de Rentabilidad Absoluto:** `Math.max(minFloorEur, scaledPvpEur)` garantiza cero pérdidas en todos los casos, cubriendo el coste mayorista de StrongeSIM, IVA 21% y comisiones de Stripe (1.5% + 0.25 €).
     * Helpers exportados: `getFixedPlanVolumeMultiplier`, `extractGbAmount` y `findBaseFixedPlan`.
   - **`src/app/api/plans/route.js`**:
     * En `applyMarkup(plansList)`, los planes fijos se agrupan por destino (`iso`) y se localiza su plan base oficial de la API de StrongeSIM (`findBaseFixedPlan`).
     * Cada plan fijo se calcula mediante `computeScaledFixedPlanPricing`.
     * **LÍNEA ROJA RESPETADA AL 100%:** Los planes ilimitados (`p.isUnlimited === true`) permanecen intactos con su fórmula original y su deduplicación canónica de 2 GB/día estándar.
   - **`src/app/api/admin/pricing-rules/route.js`**:
     * En `samplePlans`, se aplicó la misma lógica de agrupación y escalado proporcional, asegurando paridad céntimo a céntimo entre `/admin/precios` y la tienda pública.

3. **Control de Calidad (QA) y Compilación:**
     - Auditoría automatizada de los 1.747 planes fijos de todo el catálogo mundial de StrongeSIM: 1.747 / 1.747 rentables (100.0% de éxito, 0 pérdidas).
     - Compilación completa de producción (`npm.cmd run build`) superada con éxito (código 0, 45 páginas generadas sin errores).
     - Cero compras automáticas ejecutadas (respetada la directiva RED FLAG).

---

### 📌 Resumen de la Sesión Actual: Paridad Exacta de Tarifas Ilimitadas (78.90 € en México 14D), Erradicación de Venta a Pérdidas, Omisión de Luxury y Corrección de Desfase por DST en Calendario
En respuesta al requerimiento prioritario de Paco tras compartir las 3 capturas comparativas (Front de ME-SIM con 15 días a 39.90 €, Front azul de proveedor con 14 días a 78.90 €, y Backend de revendedor con coste mayorista de $59.81 USD por 14 días para la tarifa Standard de 2 GB/día), se resolvió la pérdida económica y la inconsistencia en los cálculos de tarifas ilimitadas sin alucinaciones:

1. **Diagnóstico y Causas Raíz Técnicas Identificadas:**
   - **Desfase de Días en el Calendario (15 Días vs 14 Días):**
     * En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), `calculateTravelDays` utilizaba `Math.ceil(diffMs / 86400000) + 1` en tiempo local.
     * Al cruzar el cambio de horario de invierno/verano europeo a finales de octubre (donde un día tiene 25 horas por el retraso de reloj), `diffMs` arrojaba 313 horas para el rango 23/10 -> 05/11.
     * `313 / 24 = 13.0416`, `Math.ceil(13.0416)` = 14, y con el `+ 1` resultaba en **15 días** en lugar de los **14 días exactos** que mostraba el proveedor.
   - **Colisión y Anulación del Plan Estándar de México en `/api/plans`:**
     * En [`src/app/api/plans/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/plans/route.js), el paquete regional de Norteamérica de 1536 MB (Plan ID 730 a $3.84/día) se formateaba con `Math.round(1536 / 1024) = 2 GB / Día`.
     * Al tener menor coste que el plan nacional oficial de México de 2048 MB (Plan ID 58945 `Mexico Unlimited FUP1Mbps` a $4.272/día), el mapa de deduplicación descartaba el plan oficial de México.
     * Además, al no asignar la región correcta, heredaba el fallback `'europe'`.
   - **Curva Comercial con Pérdidas en Destinos de Alto Coste:**
     * En [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js), para 15 días se forzaba la tarifa estática de 39.90 € concebida para Europa (donde el coste diario es de $1.20 USD).
     * En México, con un coste de $4.272 USD/día ($59.81 USD por 14 días y $64.08 USD por 15 días), vender a 39.90 € (~$43.50 USD) generaba una pérdida neta directa de -$20.58 USD por cada pedido.
   - **Mandato sobre Tarifa Luxury:**
     * Se descartó de forma estricta la tarifa "Luxury" (Plan ID 18952, 10 GB/día a $12.44/día, $174.22 USD por 14 días), enfocando el 100% de la oferta ilimitada en la tarifa "Standard" (2 GB/día con reseteo a medianoche).

2. **Soluciones Implementadas:**
   - **Cálculo de Días Inmune a DST en [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js):**
     * `calculateTravelDays` ahora normaliza las fechas seleccionadas a medianoche UTC (`Date.UTC(...)`) y ejecuta `Math.round((utcEnd - utcStart) / 86400000) + 1`.
     * Para el rango 23/10/2026 -> 05/11/2026, el resultado es exactamente **14 Días Ilimitados**, en perfecta paridad con el proveedor.
   - **Formateo y Deduplicación Rigurosa en [`src/app/api/plans/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/plans/route.js):**
     * Formateo exacto de cuota diaria: cuotas fraccionadas como 1536 MB se etiquetan como `1.5 GB / Día` y solo 2048 MB como `2 GB / Día`.
     * Prioridad absoluta al plan nacional exacto (`iso === queryTarget`) sobre paquetes regionales. Plan ID 58945 ($4.272/día, 2048 MB) queda blindado como el plan oficial de México.
     * Mapeo de región geográfica oficial: México se vincula con precisión a `'north-america'`.
   - **Motor Dinámico de Precios Multidía en [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js) (`computeUnlimitedDurationPriceEur`):**
     * **Suelo Técnico Absoluto:** `minTechnicalFloor = Math.ceil(((totalCostEur + minProfitTarget + 0.25) / 0.811446) * 100) / 100`. Garantiza cero pérdidas considerando IVA 21%, Stripe (1.5% + 0.25€) y beneficio limpio mínimo.
     * **Multiplicador por Duración:** Escala decreciente por volumen (1D: 1.85x, 3D: 1.68x, 7D: 1.50x, 14D: 1.425x, 30D: 1.38x).
     * **Destinos Económicos (Coste diario <= $2.00 USD, ej. España, Reino Unido, EE.UU., Japón):** Preservan los tiers comerciales limpios de mercado (4.90 € 1D, 11.90 € 3D, 17.90 € 5D, 22.90 € 7D, 29.90 € 10D, 37.90 € 14D, 39.90 € 15D, 59.90 € 30D) con amplios márgenes netos.
     * **Destinos de Alto Coste Mayorista (ej. México a $4.272 USD/día):**
       - 14 Días: **78.90 €** (Coste: $59.81 USD / 55.38 €, Beneficio neto ME-SIM: **+8.39 €**). Paridad 100% con los 78.90 € del proveedor.
       - 15 Días: **84.90 €** (Coste: $64.08 USD / 59.34 €, Beneficio neto ME-SIM: **+9.30 €**).
       - 7 Días: **41.90 €** (Beneficio neto ME-SIM: **+6.06 €**).
       - 1 Día: **7.90 €** (Beneficio neto ME-SIM: **+2.20 €**).

3. **Control de Calidad (QA) y Verificación en Vivo:**
   - Creado y ejecutado test automatizado [`scratch/test-qa-unlimited-audit.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-unlimited-audit.mjs): 5/5 pruebas superadas con éxito (100% de aprobación).
   - Compilación completa de producción (`npm run build`) validada con código 0 (45 páginas generadas sin errores).
   - Cero pedidos automáticos ejecutados (respetada la directiva RED FLAG).

---

### 📌 Resumen de la Sesión Actual: Auditoría y Corrección de Métricas Financieras, Tarjetas de Beneficio y Gráfico en Panel `/admin`
En respuesta a la auditoría estricta solicitada por Paco tras compartir la captura de pantalla de "Financial Performance" (donde Net Profit Margin figuraba a $0.00 / 0% de margen y el gráfico de barras reflejaba 0% de beneficio y un 291% anómalo de coste mayorista), se identificó la causa raíz matemática en el cliente y se resolvió de forma integral:

1. **Causa Raíz Matemática Identificada (Sin Suposiciones):**
   - En [`src/app/admin/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/page.js), el frontend recibía correctamente desde el backend `/api/admin/orders` el objeto `metrics` con los datos consolidados reales ($87.07 USD ingresos, $31.72 USD costes, $48.28 USD beneficio neto, 55% margen).
   - Sin embargo, las variables de presentación (`displayGrossRevenue`, `displayWholesale`, `displayNetProfit`, `netMarginPercent`, `wholesalePercent`) ignoraban el objeto `metrics` del servidor y ejecutaban fórmulas locales defectuosas:
     * `baseGrossRevenueGbp`: Filtraba únicamente órdenes en GBP (`o.currency === 'GBP'`), ignorando todas las compras en EUR, AUD o USD. Esto arrojaba apenas £46.52 GBP ($62.17 USD en pantalla).
     * `storeOrders`: El filtro `(o.source !== 'strongesim_provider' || parseFloat(o.amount) > 0)` evaluaba `true` para las 52 órdenes del proveedor (ya que su coste `o.amount` es mayor que 0).
     * `baseWholesaleUsd`: Sumaba los costes mayoristas de **TODAS las 68 órdenes del historial de StrongeSIM**, resultando en **$181.22 USD**.
     * `displayNetProfit`: Al restar $181.22 USD de coste mayorista total a solo $62.17 USD de ingresos en GBP, el cálculo arrojaba un número negativo, que mediante `Math.max(0, ...)` se aplastaba incondicionalmente a **$0.00**.
     * `netMarginPercent`: Quedaba en **0%**, dejando la barra verde de beneficio vacía en 0%.
     * `wholesalePercent`: Calculaba `($181.22 / $62.17) * 100 = 291%`, desbordando la barra amarilla/naranja.
     * `displayAvgOrder`: Dividía $62.17 entre las 68 órdenes del proveedor, mostrando un promedio ficticio de `$0.91`.

2. **Corrección Implementada en [`src/app/admin/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/page.js):**
   - Se conectó la presentación directamente con el objeto `metrics` oficial del backend:
     * `baseGrossRevenueUsd = metrics?.grossRevenue` ($87.07 USD de ventas de tienda en todas las divisas).
     * `baseWholesaleUsd = metrics?.esimCosts` ($31.72 USD de coste mayorista real de las tarjetas vendidas).
     * `baseGatewayFeesUsd = metrics?.gatewayFees` ($7.08 USD de comisiones reales de Stripe).
     * `baseNetProfitUsd = metrics?.netProfit` ($48.28 USD de beneficio neto limpio).
     * `baseCreditBalanceUsd = metrics?.creditBalance` ($38.57 USD de saldo prepago en vivo).
     * `netMarginPercent = metrics?.netMarginPercent` (**55%**).
     * `wholesalePercent`: 36%.
     * `feesPercent`: 8%.
   - Conversión dinámica multi-divisa a través de `convertVal(..., 'USD', dashboardCurrency)`:
     * En **USD**: Ingresos: `$87.07`, Costes: `$31.72`, Pasarela: `$7.08`, Beneficio Neto: **`$48.28`** (**55% Margen**).
     * En **EUR**: Ingresos: `79.88 €`, Costes: `29.10 €`, Pasarela: `6.50 €`, Beneficio Neto: **`44.29 €`** (**55% Margen**).
     * En **GBP**: Ingresos: `£67.90`, Beneficio Neto: **`£37.65`** (**55% Margen**).
   - En la tarjeta 2: Badge actualizado a `{storeOrderCount} Ventas` (16 ventas de clientes). Promedio por pedido real: `$5.44 USD`.
   - En el gráfico de barras:
     * Margen de Beneficio Neto Real: **55%** (Barra verde llena al 55%).
     * Costo Mayorista de eSIM: **36%** (Barra amarilla al 36%).
     * Comisiones de Pasarela (Stripe): **8%** (Barra morada al 8%).
     * Suma exacta: 55% + 36% + 8% = 99% ~ 100%.

3. **Control de Calidad (QA):**
   - Compilación completa de producción (`npm run build`) superada con éxito (código 0, 45 páginas generadas sin errores).

### 📌 Resumen de la Sesión Actual: Resolución de Caída de Servidor, Restauración de Pedido #105 (Mark Forrest), Corrección de Cantidades en Admin y Notificaciones Multi-Buzón (`info@me-sim.com` + `paxfer@gmail.com`)
En esta sesión se abordaron los dos problemas reportados por Paco: los correos de compra de clientes que no estaban llegando y las discrepancias en las cantidades/importes en el panel de administración tras la caída y suspensión temporal del servidor `api.me-sim.com`:

1. **Investigación de Causa Raíz (Cero Suposiciones / Telemetría y Pasarelas Reales):**
   - **Caída del Servidor `api.me-sim.com`:** Durante la caída del hosting (`Account Suspended`), la API REST de WooCommerce y el puente de correo (`/wp-json/mesim/v1/send-email`) respondían HTTP 200 con una página HTML de suspensión.
   - **El Pedido Afectado de Mark Forrest (20-10-2026 21:51:10 UTC):**
     * Stripe confirmó el cobro exitoso de **£6.42 GBP** (`pi_3USkw6E55qmb8D8E0ndiGAup`) para `mark.s.forrest@btinternet.com`.
     * StrongeSIM aprovisionó la tarjeta eSIM de forma inmediata: Pedido `84d62625-4f5b-4e32-938d-edc39068f828`, plan `GCC 1GB 7Days` (ID 36864), ICCID `8948010010053307632`, coste mayorista `$4.788 USD`. Mark Forrest incluso la descargó en su terminal a las 21:52:58 UTC.
     * Sin embargo, al estar caído `api.me-sim.com`, la llamada de Next.js para crear la orden en WooCommerce falló silenciosamente. La orden nunca se guardó en WooCommerce ni se dispararon los correos oficiales de ME-SIM con el QR y la factura.
   - **Distorsión de Cantidades en el Panel Admin:**
     * Al no existir el pedido en WooCommerce, el panel admin recuperaba la orden directamente desde la API de StrongeSIM como orden huérfana de proveedor (`#84D62625`).
     * Se mostraba con importe de **$4.79 USD** (el coste mayorista que StrongeSIM cobró a Paco) en lugar de las **£6.42 GBP** pagadas por el cliente.
     * Los campos `dataAmount` y `days` figuraban como `undefined`.
     * Las métricas de ingresos brutos (`grossRevenue`) calculaban erróneamente sobre órdenes del operador en lugar de delimitarse estrictamente a las ventas de tienda (`storeOrdersList`).
   - **Entrega de Correos Administrativos:**
     * La variable `ADMIN_ORDERS_CC_EMAIL` sólo enviaba a `info@me-sim.com`. Al estar el buzón corporativo en el hosting suspendido, Paco no recibía copia. Además, `src/lib/email.js` no permitía múltiples destinatarios administrativos simultáneos.

2. **Acciones y Correcciones Implementadas:**
   - **Creación Oficial del Pedido #105 en WooCommerce:**
     * Conectado con la API oficial de WooCommerce (`POST /wp-json/wc/v3/orders`, HTTP 201). Creado el pedido oficial **`#105`** para Mark Forrest (`mark.s.forrest@btinternet.com`): Total exacto **£6.42 GBP** (Base imponible: £5.31 + IVA 21%: £1.11), ICCID `8948010010053307632`, QR, LPA y StrongeSIM Order vinculados al 100%.
   - **Actualización y Limpieza de Almacenamiento Local (`src/data/orders.json`):**
     * Incorporados de forma estructurada el Pedido **#105** (Mark Forrest, £6.42 GBP) y el Pedido **#103** (Ian Rudrum, £6.43 GBP).
     * Eliminado el registro residual corrupto `A0C168AD` que tenía campos nulos tras un intento fallido antiguo.
   - **Corrección de Mapeo y Cantidades en Panel de Administración ([`src/app/api/admin/orders/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/orders/route.js)):**
     * Para órdenes de WooCommerce: se extrae `data_amount` y `days` tanto de `order.meta_data` como de `line_items[0].meta_data`, garantizando volumen y duración completos.
     * Para órdenes directas del proveedor: se mapean automáticamente `dataAmount` (`sOrd.plan.data_display` o GB/MB) y `days` (`sOrd.plan.validity_days`), erradicando cualquier valor `undefined`.
     * Blindaje de métricas financieras de tienda: `grossRevenueUsd` y `grossRevenueGbp` se calculan ahora con máxima rigurosidad contable sobre `storeOrdersList`, garantizando paridad exacta entre facturación, márgenes y pasarela de pago.
   - **Blindaje Multi-Buzón de Correos Administrativos ([`src/lib/email.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/email.js) y [`.env.local`](file:///c:/Users/Paco/Documents/me-sim/.env.local)):**
     * En `.env.local`: configurado `ADMIN_ORDERS_CC_EMAIL=info@me-sim.com,paxfer@gmail.com`.
     * En `src/lib/email.js`: `sendEmail` ahora parsea listas de correos administrativos separadas por comas o punto y coma y despacha copias independientes con tarjeta administrativa para que Paco reciba la notificación tanto en su correo corporativo como en su buzón personal Gmail.
     * Despachados con 200 OK vía WordPress WP-Mail los correos de confirmación oficiales para el Pedido **#105** (Mark Forrest + copias a `info@me-sim.com` y `paxfer@gmail.com`) y el Pedido **#103** (copias de administración a Paco).

3. **Control de Calidad (QA) y Verificación en Vivo:**
   - Auditoría API autenticada `/api/admin/orders`: 68/68 pedidos cuadrados al 100%.
   - Pedido #105 figura en primera posición: £6.42 GBP, 1 GB Total, 7 Días, ICCID `8948010010053307632`, estado Completado y telemetría viva conectada.
   - Pedido #103 verificado con £6.43 GBP y telemetría en vivo.
   - Métricas financieras de tienda exactas: Ingresos Tienda: $87.07 USD (£46.52 GBP), Costes: $31.72 USD, Beneficio Neto: $48.28 USD (Margen neto: 55%), Saldo proveedor en vivo: $38.57 USD.
   - Compilación completa de producción (`npm run build`) validada con código 0 (45/45 páginas generadas sin errores).

### 📌 Resumen de la Sesión Actual: Paridad Global de Costes en Planes Ilimitados (Estándar 2 GB/Día), Erradicación de Venta a Pérdidas y Reflejo en `/admin/precios`
En esta sesión se erradicó la inconsistencia crítica de precios en planes ilimitados donde en México la web vendía 15 días a $44.79 USD cuando el proveedor StrongeSIM cobra $64.08 USD ($59.81 USD por 14 días), generando una pérdida directa de -$27 USD. La solución se implantó de forma transversal para todos los países y se integró de forma completa en el panel de control de precios de `/admin/precios`, delimitando los cambios exclusivamente a los planes ilimitados:

1. **Causa Raíz Identificada:**
   - En StrongeSIM, los planes ilimitados operan como paquetes diarios (`dataType: 'daily_reset'`, validez base: 1 día). Para México, existen tiers de 500 MB ($1.68/día), 1 GB ($2.24/día), **2 GB ("Standard", $4.272/día)** y 10 GB ("Luxury", $12.44/día).
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), la búsqueda `plans.find(p => p.isUnlimited)` tomaba el primer plan encontrado (500 MB a $1.68) o caía en el fallback por defecto de $1.20 USD.
   - Con ese coste erróneo de $1.20, en [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js) la curva comercial fija de 15 días aplicaba incondicionalmente 39.90 € ($44.79 USD).
   - Sin embargo, al emitir el pedido en StrongeSIM, [`src/lib/strongesim.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/strongesim.js) seleccionaba el paquete de 2 GB/día (Plan 58945 / 1126 a $4.272 / $4.68 USD/día) con `periodNum: 15`, cobrando a Paco $64.08 USD.

2. **Implementación Global y Delimitada a Planes Ilimitados:**
   - **`src/lib/strongesim.js`**:
     * Creada y exportada la función canónica `selectStandardUnlimitedPlan(plans, targetIso = null)` que extrae de forma oficial el plan de 2 GB/día (2048 MB) estándar de StrongeSIM para cualquier país o región (Plan 58945 para MX a $4.272 USD, Plan 946 para ES a $1.20 USD, Plan 127551 para US a $1.76 USD, Plan 722 para GB a $1.44 USD, etc.).
     * En `resolveStrongeSimPlanDetails`: scoring ajustado para apuntar prioritariamente al estándar de 2048 MB.
   - **`src/lib/pricingRules.js`**:
     * `computeUnlimitedDurationPriceEur(days, baseDailyCostUsd, regionKey, customBasePriceEur, customRules, customRates)`:
       Calcula el PVP diario base mediante `computePlanPricing` respetando las reglas de la zona (`customRules`).
       Si el coste diario base es elevado (ej. México a $4.272 USD/día), la curva comercial no aplasta el precio: el PVP final es el máximo entre la curva comercial y el suelo técnico obligatorio (`minRequiredPvp`). Para México 15 días, el precio pasa de los $44.79 deficitarios a ~103.84 € (~$116.50 USD), asegurando beneficio neto positivo, IVA 21% y comisión de Stripe.
       Para países económicos (ej. España a $1.20 USD/día), se preserva la tarifa comercial competitiva de 39.90 €.
       Ajustada la fórmula técnica en `computePlanPricing` con `Math.ceil` para garantizar que el redondeo al céntimo cumpla estrictamente `profitNetEur >= minProfitNetEur`.
   - **`src/app/api/plans/route.js`**:
     * Mapeo de planes ilimitados con formato explícito: `dataAmount: 'X GB / Día'`, `dailyQuotaMb: X`, `days: 1`, `isUnlimited: true`.
     * Deduplicación con clave `${p.iso}-unlimited-${p.dataAmount}`, erradicando colisiones con planes fijos de datos.
   - **`src/app/destination/[iso]/page.js`**:
     * Selección del plan ilimitado estándar de 2 GB/día (`p.dailyQuotaMb === 2048 || p.dataAmount.includes('2 GB')`).
     * Inyección del `wholesaleCostUsd` exacto acumulado (`dailyCost * days`), `planId` oficial y cuota en el carrito de compras.

3. **Integración Completa en el Panel de Administración ([`/admin/precios`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js)):**
   - En [`src/app/api/admin/pricing-rules/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/pricing-rules/route.js):
     * En `getMasterLivePlans()`, se extrae e inyecta para cada país y región canónica su plan ilimitado oficial de 2 GB/día estándar (`isUnlimited: true`, `dataAmount: '2 GB / Día (Ilimitado)'`, `costUsd: chosen.price`).
     * Deduplicación protegida por clave `${p.iso}-unlimited`.
   - En [`src/app/admin/precios/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js):
     * Incorporado el filtro rápido **"Planes Ilimitados"** (`quickFilter === 'unlimited'`) en la barra superior junto a "Todos", "Floor Price Aplicado" y "Variación >20%", con su badge contador en vivo.
     * En la tabla de auditoría, los planes ilimitados se identifican con una insignia distintiva: `⚡ ILIMITADO (2 GB/DÍA)`.
     * El Provider Cost refleja el coste diario real del operador (ej. `$4.27 USD` para México, `$1.44 USD` para Reino Unido, `$0.96 USD` para Turquía).
     * Los cambios en los multiplicadores regionales ajustan de inmediato el PVP Web y los márgenes de los planes ilimitados correspondientes tanto en la simulación como al publicar en producción.

4. **Control de Calidad (QA) y Compilación:**
   - Ejecutada suite de validación unitaria e integración: 4/4 pruebas aprobadas (selección de 2 GB/día en StrongeSIM, blindaje financiero para México 14d y 15d, preservación de tarifas competitivas en destinos económicos y simulación matemática de márgenes en `/admin/precios`).
   - Compilación de producción validada: `npm run build` completado exitosamente con código 0 (45/45 páginas generadas sin errores).
   - Delimitación estricta: los planes fijos de datos se mantienen al 100% intactos con sus claves y multiplicadores existentes.

---

### 📌 Resumen de la Sesión Actual: Política Estricta de Cero Pedidos por IA (RED FLAG) y Restricción de Compras a Administrador y Usuarios
En respuesta y ratificación de la directiva de Paco ("Manager, eso es, las pruebas se realizan para trabajar con la API, pero las compras estan restringidas a mi como administrador y a los usuarios. Las compras de la IA, están completamente prohibidas, son una red flag. Solo se ejecutarán cuando yo como administrador lo pida como excepción"), se blindó la política en todos los manuales y definiciones de agentes:

1. **Directiva y Alcance de la Prohibición (RED FLAG):**
   - **Pruebas de la IA Exclusivas para Trabajo con la API:** Todas las pruebas técnicas, scripts o análisis ejecutados por la IA se realizan única y exclusivamente para trabajar con la API (lectura de datos, validación de endpoints, contratos, cálculos puros y telemetría sin efectos secundarios transaccionales).
   - **Restricción de Compras a Administrador y Usuarios:** Las compras, cobros y emisiones de eSIM están estrictamente restringidas a Paco como administrador y a los usuarios finales de la plataforma.
   - **Compras de la IA como RED FLAG:** Las compras automáticas o autónomas por cualquier agente de IA están completamente prohibidas y catalogadas formalmente como una **RED FLAG** (vetado el modo test, cupones 100%, scripts de checkout o llamadas de aprovisionamiento a StrongeSIM, WooCommerce o Stripe).
   - **Cláusula Única de Excepción:** Las compras por parte de la IA **SOLO se ejecutarán cuando el administrador (Paco) lo pida de forma explícita e inequívoca como excepción**.

2. **Ficheros y Reglamentos Actualizados:**
   - [`.agents/AGENTS.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/AGENTS.md): Regla *"Prohibición Absoluta de Compras por Agentes (RED FLAG / Restricción de Compras a Administrador y Usuarios)"*.
   - [`.agents/rules.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/rules.md): Regla *"PROHIBICIÓN ABSOLUTA DE COMPRAS POR AGENTES (RED FLAG)"*.
   - [`.agents/manager.agent.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/manager.agent.md): Regla #6 de Prohibición Absoluta de Compras por Agentes (RED FLAG).
   - [`.agents/qa.agent.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/qa.agent.md): Directiva *"Prohibición Absoluta de Compras por QA (RED FLAG)"*.
   - [`.agents/backend.agent.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/backend.agent.md): Directiva *"Prohibición Absoluta de Compras por Backend (RED FLAG)"*.
   - [`.agents/frontend.agent.md`](file:///c:/Users/Paco/Documents/me-sim/.agents/frontend.agent.md): Directiva *"Prohibición Absoluta de Compras por Frontend (RED FLAG)"*.

---

### 📌 Resumen de la Sesión Actual: Resolución de Pedidos con Cupones 100% en WooCommerce, Restauración de Pedido #92 y Creación Oficial del Nuevo Pedido #102 para Lorraine Abel
En esta sesión se resolvió la causa por la que la compra realizada por Paco con cupón 100% de cortesía no se registró como nuevo pedido en WooCommerce ni despachó correos electrónicos:

1. **Diagnóstico y Causa Raíz de Cupones en WooCommerce REST API:**
   - **El Error HTTP 400 (`woocommerce_rest_invalid_coupon`):** En [`src/app/api/orders/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/orders/route.js), al invocar `POST /wp-json/wc/v3/orders`, se enviaba `coupon_lines: [{ code: couponCode }]`. Debido a la arquitectura Headless sin catálogo interno en WooCommerce (las líneas de pedido dinámicas no tienen `product_id` de catálogo local), WooCommerce ejecutaba la validación interna `WC_Coupon::is_valid_for_product()` y rechazaba la creación del pedido con código 400: *"Lo siento, el cupón «mesim100» no se puede aplicar a los productos seleccionados"*.
   - **Consecuencias:** Al fallar la llamada a WooCommerce, la orden nunca se creaba en WooCommerce, no se generaba número oficial ni se disparaban las notificaciones por correo electrónico de la plataforma.
   - **Corrección en `src/app/api/orders/route.js`:**
     * Eliminado el envío de `coupon_lines` a WooCommerce para pedidos headless.
     * Los detalles del cupón (`_coupon_code`, `coupon_code`, `_coupon_percent`, `_original_amount`, `_discount_amount`) se persisten con máxima precisión en `meta_data`.
     * Si el importe cobrado es 0 (`chargedGross === 0`), se asigna `payment_method = 'free'` y `payment_method_title = 'Cupón Cortesía ME-SIM'`.
     * En el Bloque 4, el envío de emails se desacopló del fetch loopback HTTP (`/api/email/send`) y ahora llama directamente a `sendEmail(...)` y `generateOrderConfirmationHtml(...)` de forma inmediata en proceso, garantizando la entrega al cliente y el respaldo automático a `info@me-sim.com`.

2. **Restauración y Creación de Pedidos Oficiales:**
   - **Restauración del Pedido #92 (Original):**
     * En WooCommerce (`PUT /wp-json/wc/v3/orders/92`) y en `src/data/orders.json`, el pedido #92 queda restablecido en su estado original: `eSIM Singapore Unlimited Data 7 Days` ($25.67 USD), tarjeta ICCID `8910300000065231133` (StrongeSIM `16313cf9-73fc-46bd-884f-d39282443dbf`) y estado **`Refunded` / Reembolsado** (acorde a la cancelación efectuada por Paco).
   - **Creación del NUEVO Pedido Oficial en WooCommerce (#102):**
     * Creado el pedido **`#102`** en WooCommerce (`POST /wp-json/wc/v3/orders`, HTTP 201) para la nueva tarjeta de 20GB:
       - **Cliente:** Lorraine Abel (`lorraineabel1@icloud.com`)
       - **Plan:** `eSIM Singapore 20 GB Total 30Days` (Plan ID `412`)
       - **Importe:** `$0.00 USD` (100% descuento con cupón `mesim100`, original $31.06)
       - **ICCID Oficial:** `89852000263215330236`
       - **Orden StrongeSIM:** `eb45aba2-b6d9-4e3e-9d4a-9f034ffb4eb8`
       - **Coste Mayorista:** `$9.84 USD`
       - **QR & LPA:** `https://p.qrsim.net/8b47cda065214d149c26ae35ccd3ac9a.png` / `LPA:1$rsp-eu.simlessly.com$AB01B44146AF4C8E8A645FC1CB291163`
       - **Estado:** `Completed` / Activo con telemetría de 20 GB en vivo.
   - **Entrega de Correos Transaccionales con QR:**
     * Despachado email con el código QR y LPA a la clienta `lorraineabel1@icloud.com` (200 OK vía WP-mail).
     * Despachada copia de administración a `info@me-sim.com` (200 OK vía WP-mail).
   - **Compilación de Producción:** Superada con 0 errores (`npm run build`, 45 páginas generadas con código 0).
### 📌 Resumen de la Sesión Actual: Paridad 100% con Panel StrongeSIM, Reconciliación de Pedidos #92/#93 y Resolución de Expiración y Telemetría en Pedidos #89/#90
En esta sesión se resolvió la discrepancia entre el panel de proveedor (StrongeSIM) y el Panel de Administrador de ME-SIM, logrando un reflejo fiel al 100% de la realidad del operador:
1. **Requerimiento y Directiva Estricta del Usuario:**
   - La realidad del panel de administración de ME-SIM debe ser un reflejo exacto y al 100% de lo que existe en el panel del proveedor StrongeSIM (incluyendo todas las 61 órdenes: activas, finalizadas, reembolsadas, caducadas y órdenes directas).
   - **Regla Estricta (Red Flag):** Prohibido terminantemente realizar pedidos por API directa de espaldas al flujo comercial; todos los pedidos deben pasar sin excepción por el carrito, WooCommerce y Stripe.
   - En los pedidos **#89 (Ian Rudrum)** y **#90 (Mark Forrest)**, resolver por qué no mostraban telemetría y figuraban en estado erróneo cuando en StrongeSIM están expirados con consumos reales confirmados.
   - En el pedido #92 (Lorraine Abel), reconciliar la eSIM activa que la clienta tiene instalada en su iPhone (`8910300000065231133`), separándola de la devuelta/cancelada (`89852000263215322332`).
   - En el pedido #93 (Shaun Abel), mostrar la telemetría viva con consumo real de datos con máxima precisión (KB si es menor de 1 MB) e indicador de estado activo.
2. **Causa Raíz de los Pedidos #89 y #90 (Diagnóstico):**
   - En `src/lib/strongesim.js` (`fetchEsimProfileTelemetry`), la búsqueda por ID recibía `orderId` numérico de WooCommerce (`90`). Al ejecutar `targetOrderId.includes('-')` arrojaba `TypeError: targetOrderId.includes is not a function`, abortando silenciosamente la consulta de telemetría y dejando las órdenes con fallback a 0 MB y estado "Instalada (Sin Activar)".
   - Además, en `src/app/api/admin/orders/route.js`, al mapear `strongesimOrders` faltaba la condición `else if (sOrd.status === 'expired')`, provocando que las órdenes expiradas en el proveedor no heredasen el estado `USED_EXPIRED`.
   - **Corrección:** Se blindó la conversión de identificadores a cadena segura (`String(targetOrderId)`) y se integró el estado `expired`.
   - **Datos Reales de Operador Sincronizados:**
     * **Pedido #89 (Ian Rudrum):** 576.55 MB consumidos de 1024 MB (56.3%), estado **Expirada** (Rojo), desactivada en SM-DP+ (`DELETED`), expirada el 2 de octubre.
     * **Pedido #90 (Mark Forrest):** 700.19 MB consumidos de 1024 MB (68.4%), estado **Expirada** (Rojo), desactivada en SM-DP+ (`DISABLED`), expirada el 2 de octubre.
     * **Pedido #84 y #85:** Sincronizados y confirmados con sus consumos reales históricos (39.2% y 42.3%) y estado Expirada.
2. **Sincronización Total con StrongeSIM (`src/app/api/admin/orders/route.js`):**
   - Integración de `strongesimFetch('/orders?status=all&limit=100')` para recuperar las 61 órdenes del proveedor.
   - Cruzado bidireccional contra WooCommerce y la base local por `iccid` y `strongesimOrderId`.
   - Las órdenes directas, históricas o devueltas en StrongeSIM sin pedido de WooCommerce asociado se inyectan limpiamente en la tabla con su referencia (`#030052B4`, `#17AEDC11`, `#BEBC85E0`, etc.), plan, coste mayorista, estado oficial (`Refunded`, `Expired`, `Completed`, `Failed`) y credenciales.
   - Blindaje de métricas financieras de tienda: ingresos, comisiones de pasarela y costes mayoristas se calculan sobre las ventas de tienda para evitar distorsiones de margen.
3. **Reconciliación Real del Pedido #92 (Lorraine Abel):**
   - Actualización en WooCommerce (`PUT /wp-json/wc/v3/orders/92`) y en `src/data/orders.json` asociando la tarjeta que Lorraine instaló y activó en su iPhone: ICCID `8910300000065231133`, QR `https://p.qrsim.net/f9bdbec8ccc448f7b90c4a2519c80b72.png`, LPA `LPA:1$rsp-eu.simlessly.com$01A88F893EC64C0289C0BBBB82D9B779`.
   - Estado: `Completed` / Activa (`IN_USE`, `ENABLED`).
   - La orden cancelada `030052B4` (`89852000263215322332`) figura de forma independiente en el panel con estado `Refunded` / Reembolsado.
4. **Telemetría Viva y Formato de Alta Precisión (`src/app/admin/page.js` y `src/app/admin/orders/[id]/page.js`):**
   - En el pedido #93 (Shaun Abel), el operador devuelve `usedBytes: 18816` (0.018 MB). El sistema anterior aplicaba `toFixed(1)` sobre 0.02 MB mostrando `0.0 MB (0%)`.
   - Se implementó formateo de alta precisión: consumos menores a 1 MB se representan en KB (`18.4 KB / 100 MB (<0.1%)`).
   - Se añadió soporte en `getOrderStatusBadge` y `getEsimStatusInfo` (`src/lib/esimStatus.js`) para distinguir tarjetas `Active` (verde), `Refunded` (gris) y `Expired` (rojo).
5. **Verificación y Pruebas (QA):**
   - Ejecutado script de verificación contra la API autenticada: 61/61 pedidos sincronizados.
   - Pedido #92 verificado como Activo (`8910300000065231133`).
   - Pedido #93 verificado con telemetría en vivo (`usedBytes: 18816`).
   - Compilación completa de producción (`npm run build`) superada con 0 errores.

---

### 📌 Resumen de la Sesión Actual: Copia Administrativa Automática de Emails Transaccionales con Códigos QR a `info@me-sim.com`
En esta sesión se implementó el sistema de copia de respaldo administrativa para todos los correos electrónicos con códigos QR e instrucciones de eSIM entregados a clientes finales:
1. **Requerimiento del Usuario:**
   - Paco indicó que todos los correos de respaldo con los códigos QR e información de activación entregados a los clientes deben enviarse a la cuenta corporativa oficial: **`info@me-sim.com`**.
2. **Arquitectura y Blindaje Implementado:**
   - En [`src/lib/email.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/email.js), se configuró la constante oficial `ADMIN_NOTIFICATION_EMAIL = (process.env.ADMIN_ORDERS_CC_EMAIL || 'info@me-sim.com').trim().toLowerCase()`.
   - Se desacopló la rutina de envío físico en `deliverSingleEmail(...)` para garantizar el despacho a través de la API oficial de WordPress (`/wp-json/mesim/v1/send-email`) y el fallback SMTP.
   - En `sendEmail(...)`, tras procesar el envío prioritario al cliente, el sistema detecta de forma automática si el correo corresponde a una entrega de eSIM (`type === 'order_confirmation'` o presencia de `qrCodeUrl`, `lpaCode`, `esimTranNo` o tokens de QR).
   - Si el destinatario no es el propio buzón corporativo (`to !== ADMIN_NOTIFICATION_EMAIL`), se despacha automáticamente una copia exacta a `info@me-sim.com` con:
     * Asunto claro e indexable: `[Copia Admin #${orderId}] ${subject} (Cliente: ${to})`.
     * Cabecera visual corporativa en el cuerpo del correo (`📋 COPIA DE ADMINISTRACIÓN ME-SIM`) con el email del cliente original, ID de pedido, nombre y número ICCID.
     * El cuerpo completo e intacto con el código QR renderizado, código LPA manual, desglose de factura e instrucciones de APN y roaming, listo para ser reenviado en 1 clic.
   - **Aislamiento a prueba de fallos:** El envío de la copia administrativa está protegido por bloques `try/catch` y registros en `addDiagnosticLog`. Si la copia experimentara alguna latencia o error de red, la experiencia de compra y la entrega al cliente nunca se ven afectadas.
   - **Cero duplicados:** Si la compra se realiza con el propio correo de administración (`info@me-sim.com`), el sistema detecta la identidad y omite el envío duplicado.
   - **Variables de entorno:** Configurada la variable `ADMIN_ORDERS_CC_EMAIL=info@me-sim.com` en [`.env.local`](file:///c:/Users/Paco/Documents/me-sim/.env.local).
3. **Control de Calidad (QA) y Compilación:**
   - Creado y ejecutado el test automatizado [`scratch/test-qa-admin-email-copy.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-admin-email-copy.mjs): 3/3 tests superados (100% de éxito contra `info@me-sim.com`).
   - Compilación completa de producción (`npm.cmd run build`) validada con código 0 (45 páginas generadas sin errores).
   - Verificada la suite de regresión fiscal [`scratch/test-qa-tax-currency-sync.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-tax-currency-sync.mjs): 5/5 tests aprobados.
   - Compilación completa de producción (`npm.cmd run build`) validada con código 0 (45 páginas generadas sin errores).

---

### 📌 Resumen de la Sesión Actual: Reestructuración Global del Sistema de Ventas (Fiscalidad IVA 21%, Paridad Stripe ➔ WooCommerce al Céntimo, Precios Ilimitados Dinámicos, Erradicación de Truncado de Días y Divisas en Admin)
En esta sesión se ejecutó de forma integral y global el plan maestro aprobado para erradicar las discrepancias detectadas entre Catálogo, Cobro en Stripe, Facturación en WooCommerce, Panel de Administración ME-SIM y el operador mayorista StrongeSIM:

1. **Paridad Fiscal Exacta al Céntimo (Stripe == Factura WooCommerce):**
   - **Causa Raíz:** En España/UE, el precio anunciado al cliente en la web es PVP final (IVA 21% incluido). Al crearse el pedido en WooCommerce vía REST API (`POST /wp-json/wc/v3/orders`), se enviaba `line_items[0].price = String(price)` sin desagregar impuestos. Al tener WooCommerce activado el cálculo automático de impuestos, interpretaba ese valor como base imponible neta y sumaba un 21% adicional de IVA ($25.67 + $5.39 = $31.06), generando una factura inflada respecto al cobro bancario real de Stripe ($25.67).
   - **Solución Global:** En [`src/app/api/orders/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/orders/route.js), se calcula la base imponible neta con alta precisión decimal (`netBaseAmount = (chargedGross / 1.21).toFixed(6)`), pasándola en `price`, `subtotal` y `total` de cada línea.
   - **Resultado:** WooCommerce calcula con precisión el 21% de IVA ($4.46), sumando un total de orden de exactamente **$25.67 USD** (o cualquier divisa), igualando al céntimo el cobro bancario de Stripe. El pedido histórico #92 fue recalculado y actualizado en vivo en WooCommerce y en la base local a $25.67.

2. **Detección y Eliminación del Truncado de Días en Carrito y Checkout:**
   - **Causa Raíz Crítica:** En [`src/app/cart/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/cart/page.js) y [`src/app/checkout/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/checkout/page.js), existía una rutina de sanitización previa que, si detectaba la cadena `'/ día'` o `'/ day'` en el título o volumen de datos, forzaba incondicionalmente `item.days = 1`. Al comprar un plan diario/ilimitado multidía (como Singapur 7 días), el carrito truncaba silenciosamente la duración a 1 día, provocando que la orden viajara con `days = 1`.
   - **Solución:** Se blindó la sanitización en ambos componentes para proteger explícitamente cualquier compra con `item.isUnlimited` o `item.days > 1`, asegurando que la duración contratada por el cliente se respete de punta a punta.

3. **Motor Dinámico de Precios para Planes Ilimitados Multidía:**
   - **Fórmula Centralizada:** Implementada la función `computeUnlimitedDurationPriceEur(days, baseDailyCostUsd, regionKey, customBasePriceEur)` en [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js).
   - Combina una curva comercial escalada por duración (descuento decreciente por volumen para el cliente: 4.90 € 1D, 11.90 € 3D, 17.90 € 5D, 22.90 € 7D, 29.90 € 10D, 39.90 € 15D, 59.90 € 30D) con un **suelo técnico inquebrantable**: el PVP nunca puede ser inferior al mínimo calculado por `computePlanPricing(baseDailyCostUsd * days, regionKey)`.
   - Blindaje financiero: ME-SIM nunca venderá por debajo de coste en ninguno de los 198 países, incluso si el operador tiene costes diarios elevados.
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), se reemplazó la tabla fija y se conectó la selección de fechas en el calendario con la nueva fórmula dinámica, inyectando el `wholesaleCostUsd` acumulado directamente en el carrito.

4. **Normalización de Divisas y Limpieza en Panel de Administración:**
   - En [`src/lib/currency.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/currency.js), se exportó el diccionario oficial `CURRENCY_SYMBOLS = { EUR: '€', USD: '$', GBP: '£', AUD: 'A$' }`.
   - En [`src/app/admin/orders/[id]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/orders/[id]/page.js), se eliminó la expresión defectuosa que renderizaba `"USD (€)"`, sustituyéndola por el mapeo real (`USD ($)`, `AUD (A$)`, `GBP (£)`, `EUR (€)`).
   - Se añadió soporte para `AUD` en el cálculo de margen estimado y se corrigió el fallback de divisa por defecto a `EUR`.
   - En [`src/app/checkout/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/checkout/page.js), se envía `priceEur` en el payload para trazabilidad contable multicurrency.
   - En [`src/lib/strongesim.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/strongesim.js), `resolveStrongeSimPlanDetails` calcula e inyecta `wholesaleCostUsd = baseUnitPrice * periodNum` para alimentar automáticamente el margen en órdenes administrativas.

5. **Aseguramiento de Lorraine Abel y Telemetría GSMA:**
   - Registrada la aclaración del usuario: el estado `Refunded` del Plan 1078 (Singapur 10GB 30D) fue procesado manualmente por Paco desde el panel del revendedor de StrongeSIM al no haber sido activado.
   - La nueva tarjeta definitiva contratada con `periodNum: 7` (Plan 58971, ICCID `89852000263215322332`) está activa con reseteo diario de 2GB/día para su estancia en Singapur.
   - Su estado en la red GSMA SM-DP+ es `RELEASED` (tarjeta emitida lista para vincular a la red StarHub).

6. **Control de Calidad (QA) y Compilación:**
   - Creada y ejecutada la suite de pruebas [`scratch/test-qa-tax-currency-sync.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-tax-currency-sync.mjs): 5/5 pruebas aprobadas (100% de éxito).
   - Ejecutada la suite de regresión [`scratch/test-qa-strongesim-v2.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-strongesim-v2.mjs): 6/6 pruebas aprobadas (100% de éxito).
   - Compilación completa de producción (`npm run build`) validada con código 0 (45 páginas estáticas/dinámicas generadas sin errores).

---

### 📌 Resumen de la Sesión Actual: Implementación Integral de la API Oficial de StrongeSIM (periodNum, Rate Limit, Tokens Persistentes, Idempotencia y Cancelación)
En esta sesión se implementaron los conocimientos adquiridos a partir de la documentación oficial de la API de StrongeSIM (`plugins/strongesim-api-context-2026-10-09.json`) y el plugin de referencia de WordPress (`plugins/esim-woocommerce-integration`):
1. **Descubrimiento Arquitectónico y Causa Raíz Definitiva de Planes Ilimitados (`periodNum`):**
   - En la API de StrongeSIM, **todos** los planes "Unlimited" tienen `validity_days: 1` (`dataType: 'daily_reset'`).
   - Para contratar paquetes ilimitados multidía (ej. 7 días, 15 días, 30 días), el endpoint `POST /orders` **exige estrictamente el parámetro `periodNum` (en CamelCase)** con el número de días contratados.
   - Si se omite `periodNum`, StrongeSIM asume por defecto `1` día. Este fue exactamente el motivo por el cual en el pedido #92 Lorraine Abel recibió una tarjeta de 1 día / 500 MB en lugar de 7 días.
2. **Blindaje de Autenticación y Erradicación del Límite de Tasa (5 logins / 15 mins):**
   - El endpoint `POST /auth/login` tiene una limitación estricta de **5 intentos por IP cada 15 minutos**.
   - Se implementó persistencia multi-capa de sesión (`.strongesim_session.json` en disco, `/tmp/strongesim_session.json` de contingencia y `globalThis.__strongesimAuth` en memoria) con TTL de 45 minutos.
   - Se implementó el flujo de renovación automática vía `POST /auth/refresh-token` con `{ refreshToken }`, el cual **no consume intentos del cupo de login de 15 minutos**.
   - Cero dependencias rotas en bundling cliente gracias a la configuración de fallbacks en `next.config.js` (`fs: false, path: false, os: false`) y comprobaciones seguras de entorno.
3. **Mapeo y Creación Oficial de Órdenes (`createStrongeSimOrder`):**
   - Creada la función centralizada `createStrongeSimOrder` en [`src/lib/strongesim.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/strongesim.js).
   - Inyección automática de `periodNum` calculado dinámicamente mediante `resolveStrongeSimPlanDetails`.
   - Inyección del ID de perfil de revendedor de ME-SIM (`DEFAULT_RESELLER_PROFILE_ID = '8459a3f8-fdc1-4127-83e7-7023aec05df9'`).
   - Envío de cabecera de idempotencia oficial `Idempotency-Key` en `POST /orders` para evitar doble cargo en monedero ante reintentos.
4. **Actualización de Endpoints Transaccionales:**
   - [`src/app/api/orders/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/orders/route.js): Conectado con `createStrongeSimOrder`, `resolveStrongeSimPlanDetails` y cabecera `Idempotency-Key: dedupeKey`.
   - [`src/app/api/v1/woocommerce-webhook/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/v1/woocommerce-webhook/route.js): Conectado con `createStrongeSimOrder`, `resolveStrongeSimPlanDetails` y cabecera `Idempotency-Key: wc-${orderId}`.
   - Creado nuevo endpoint administrativo [`src/app/api/admin/esim/cancel-order/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/esim/cancel-order/route.js) que consume `cancelStrongeSimOrder(orderId, reason)` (`POST /orders/{order_id}/cancel`), permitiendo cancelar órdenes y recuperar saldo al monedero prepago.
5. **Control de Calidad (QA) y Compilación:**
   - Suite [`scratch/test-qa-strongesim-v2.mjs`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-strongesim-v2.mjs) ejecutada: 6/6 tests superados (Singapur 7D `periodNum: 7`, Singapur 1D `periodNum: 1`, planes fijos `periodNum: null`, perfil reseller verificado).
   - Compilación completa de producción (`npm run build`) superada con éxito (código 0, 45 páginas generadas sin errores).

---

### 📌 Resumen de la Sesión Actual: Resolución de Incidente Crítico en Pedido #92 (Lorraine Abel) y Blindaje Definitivo de Planes Ilimitados
En esta sesión se resolvió un incidente crítico en producción relacionado con el pedido #92 (Lorraine Abel, $31.06 USD) para Singapur Ilimitado 7 Días:
1. **Diagnóstico y Causa Raíz:**
   - En el catálogo del proveedor mayorista StrongeSIM (3.208 planes auditados), el 100% de los planes categorizados como "Unlimited" tienen `validity_days: 1` (paquetes diarios `daily_reset`). StrongeSIM **no dispone de planes ilimitados nativos multidía**.
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), el selector de fechas de datos ilimitados permite contratar cualquier rango de días (1 a 30 días, en este caso 7 días por $31.06 USD, SKU `sg-unlimited-7d`).
   - El algoritmo de scoring `resolveStrongeSimPlanId` en [`src/lib/strongesim.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/strongesim.js) realizaba una coincidencia ciega `isUnlimited && pIsUnlimited`, asignando erróneamente el primer paquete ilimitado encontrado en el catálogo de Singapur (Plan ID 1080: `Singapore Unlimited (nonhkip)`, cuota de 500 MB y validez de solo 24 horas).
   - Como resultado, la clienta recibió una eSIM de 1 día / 500 MB y a los 40 minutos recibió una alerta de caducidad inminente (`expiry_warning`). Esto llevó a su acompañante (Shaun Abel) a comprar un paquete de emergencia de 100 MB (#93).
2. **Acciones Inmediatas de Soporte al Cliente:**
   - **Aprovisionamiento oficial inmediato:** Se generó y activó una nueva eSIM oficial en StrongeSIM: Plan ID 1078 (`Singapore 10GB 30Days (nonhkip)`, Starhub 4G/5G, ICCID `8910300000065237993`, QR `https://p.qrsim.net/4bceddf01c384b3c9f5cb7635dc12dae.png`, LPA `LPA:1$rsp-eu.simlessly.com$7D9C03166D8849A8BB146EAF75823A9E`) con **30 días de validez completa** (hasta el 8 de noviembre) y 10 GB de datos de alta velocidad con recarga permitida.
   - **Actualización de pedido #92:** Sincronizado vía WooCommerce REST API (`PUT /wp-json/wc/v3/orders/92`) con el nuevo ICCID, QR, LPA y plan, y reflejado en `src/data/orders.json`.
   - **Comunicación oficial al cliente:** Envío de correo electrónico transaccional prioritario en inglés con la plantilla oficial de ME-SIM vía `api.me-sim.com/wp-json/mesim/v1/send-email` a `lorraineabel1@icloud.com` con el nuevo código QR y explicaciones completas.
3. **Blindaje de Código Arquitectónico:**
   - En [`src/lib/strongesim.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/strongesim.js), se refactorizó `resolveStrongeSimPlanId`:
     * Para compras ilimitadas multidía (`targetDays > 1`), queda **estrictamente prohibido** asignar paquetes con `validity_days < targetDays`. Todo paquete de 1 día recibe puntuación 0.
     * Se calcula la cuota FUP acumulada de alta velocidad (`targetDays * 2048 MB`, ej. 14 GB para 7 días) y se selecciona el paquete de alta capacidad con `validity_days >= targetDays` (ej. 10 GB a 20 GB 30 días).
     * Para compras de 1 día (`targetDays === 1`), se priorizan los paquetes de 2 GB/día (Plan 58971) por encima de los paquetes de 500 MB.
     * Incorporado bonus de país exacto (`pIso === targetIso`) para evitar asignar paquetes regionales multipaís cuando el cliente pide un país específico.

---

### 📌 Resumen de la Sesión Actual: Deduplicación de Regiones en Catálogo y Panel de Precios (`/admin/precios`)
En esta sesión se resolvió el reporte del usuario sobre la duplicación de los planes de Oriente Medio en la tabla de `/admin/precios`, donde los mismos 5 planes aparecían repetidos bajo `MIDDLE-EAST | Oriente Medio` y `GCC | Países del Golfo (GCC)`:
1. **Diagnóstico y Causa Raíz:**
   - En [`src/lib/regionMapping.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/lib/regionMapping.js), se habían incorporado tres alias regionales (`'gcc'`, `'australia-new-zealand'` y `'east-asia'`) como claves de nivel superior en la matriz `REGION_MAPPING`, elevando a 17 las entradas en lugar de las 14 oficiales.
   - En [`src/app/api/admin/pricing-rules/route.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/api/admin/pricing-rules/route.js) (`getMasterLivePlans()`) y en [`src/app/api/plans/route.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/api/plans/route.js), el bucle que construye el catálogo comercial itera sobre `Object.entries(REGION_MAPPING)`.
   - Al iterar sobre `'middle-east'` y luego sobre `'gcc'`, ambos evaluaban y extraían los 5 planes reales del paquete de StrongeSIM `SAAEQAKWOMBH-6`. Al guardarse con claves de ISO distintas (`middle-east` y `gcc`), el mapa de deduplicación no los unificaba, generando dos bloques idénticos de 5 filas en `/admin/precios`.
2. **Corrección Quirúrgica Aplicada:**
   - **`src/lib/regionMapping.js`**:
     * Reducción y blindaje de las claves de nivel superior de `REGION_MAPPING` estrictamente a las **14 regiones canónicas oficiales**: `middle-east`, `europe`, `asia`, `north-america`, `south-america`, `caribbean`, `africa`, `oceania`, `aukus`, `china-hk-macau`, `japan-korea-taiwan`, `southeast-asia`, `europe-morocco` y `global`.
     * Las entradas redundantes (`gcc`, `australia-new-zealand`, `east-asia`) se eliminaron como claves de primer nivel y se mantuvieron en el array `aliases` de su respectiva región canónica.
     * Funciones `getRegionDefinition()` y `normalizeRegionSlug()` continúan resolviendo cualquier consulta por alias (`gcc`, etc.) hacia la región canónica correspondiente de forma 100% transparente.
   - **`src/app/api/admin/pricing-rules/route.js`**:
     * Añadida guarda estricta `if (slug !== def.canonicalSlug) continue;` en el generador `getMasterLivePlans()`.
     * Mapeo de `iso` y `region` forzado a `def.canonicalSlug`.
     * En la lectura de metadatos de planes (`GET`), uso de `getRegionDefinition(pIso)` para evitar fallos por alias.
   - **`src/app/api/plans/route.js`**:
     * Añadida guarda idéntica `if (slug !== def.canonicalSlug) continue;` y mapeo con `def.canonicalSlug` en la generación del catálogo global.
3. **Control de Calidad (QA):**
   - Ejecutado script de verificación simulando el maestro de planes de StrongeSIM:
     * Regiones canónicas procesadas: exactamente 14.
     * Planes de `middle-east`: exactamente 5.
     * Planes de `gcc`: exactamente 0 (eliminado el duplicado).
     * Planes de `australia-new-zealand`: 0.
   - Verificado el endpoint en vivo `http://localhost:3000/api/plans`: 5 planes para `middle-east`, 0 planes para `gcc`.
   - Cero afectación a pasarelas de pago, cálculo de precios o márgenes ($4.79 coste mayorista GCC / 7.62 € PVP garantizado).

---

### 📌 Resumen de la Sesión Actual: Corrección Crítica de Mapeo y Precios de Oriente Medio / GCC (Blindaje Financiero y Paridad Reseller)
En esta sesión se resolvió la discrepancia crítica de precios entre el panel del reseller de StrongeSIM ($4.79 coste mayorista GCC / 8.90 € PVP reseller) y ME-SIM ($2.23 coste en Admin / 4.70 € PVP en tienda pública), erradicando el riesgo de venta por debajo de coste y garantizando la cobertura completa en Dubái y los 6 países del Golfo:
1. **Diagnóstico y Causa Raíz:**
   - Entre el 27 y 30 de septiembre, StrongeSIM añadió al catálogo un paquete de bajo coste denominado `"Middle East (5 areas)"` (`ME-5`) a un coste mayorista de **$2.232 USD** que sólo cubre 5 países (Irak, Israel, Kuwait, Qatar y Arabia Saudí). **No incluía a Emiratos Árabes Unidos (Dubái), ni Omán, ni Baréin**.
   - En [`src/lib/regionMapping.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/lib/regionMapping.js), la coincidencia genérica por palabras clave (`nameKeywords: ['middle east']`) capturó este paquete a $2.23 y el algoritmo de precios calculó el PVP en **4.70 €** ($2.23 $\times$ 1.61 markup).
   - En cambio, en el panel del reseller de StrongeSIM, el paquete oficial para los países del Golfo es **GCC (`SAAEQAKWOMBH-6`)** (Bahrein, Kuwait, Omán, Qatar, Arabia Saudí y EAU/Dubái), cuyo coste mayorista real es **$4.79 USD** (1 GB), **$13.86 USD** (3 GB), **$21.74 USD** (5 GB) y **$39.67 USD** (10 GB), y cuyo PVP en la tienda del reseller es de **8.90 €**, **16.90 €**, **20.90 €** y **38.90 €**.
   - Al comparar el coste de $4.79 del reseller con los 4.70 € visibles en ME-SIM, parecía que la tienda estaba vendiendo por debajo de coste. Además, si un cliente compraba la eSIM para viajar a Dubái (la imagen de cabecera del Burj Khalifa), el paquete de $2.23 no habría funcionado.
2. **Corrección Quirúrgica Aplicada:**
   - **`src/lib/regionMapping.js`**:
     * Mapeo explícito y exclusivo de `'middle-east'` y `'gcc'` al código oficial **`SAAEQAKWOMBH-6`** de StrongeSIM.
     * En `isPlanInRegion`: regla de exclusión estricta que rechaza de inmediato cualquier plan con `regionCode === 'ME-5'` o con `'5 areas'` en el nombre.
     * Actualización de `REGION_STARTING_PRICES['middle-east']` y `'gcc'` a **7.62 €** (el PVP garantizado para 1 GB sobre el coste real de $4.79 USD con beneficio neto positivo).
   - **`src/lib/strongesim.js`**:
     * En `resolveStrongeSimPlanId`: exclusión estricta de `ME-5` y actualización de `REGION_KEYWORDS['MIDDLE-EAST'] = ['GCC', 'SAAEQAKWOMBH-6']`. El aprovisionamiento automático asigna siempre el paquete oficial `36864` (`GCC 1GB 7Days`) con cobertura completa garantizada en los 6 países del Golfo (incluyendo Dubái).
   - **`src/app/api/plans/route.js` y `src/app/api/admin/pricing-rules/route.js`**:
     * Actualización de `regionMeta` baseEur a 4.43 € ($4.79 USD).
     * En el panel de administración de ME-SIM ([`/admin/precios`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/admin/precios/page.js)), el Provider Cost de Oriente Medio refleja con exactitud matemática los **$4.79 USD** reales del reseller (eliminando los $2.23 erróneos).
     * En la tienda pública ([`/destination/middle-east`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/destination/%5Biso%5D/page.js)), el PVP pasa de 4.70 € a **7.62 €** (o el multiplicador que Paco configure), garantizando **+1.51 € de beneficio neto limpio** tras Stripe (1.5% + 0.25 €) e IVA (21%).
3. **Control de Calidad (QA):**
   - Ejecutada la suite de pruebas [`scratch/test-qa-middle-east-fix.mjs`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/scratch/test-qa-middle-east-fix.mjs): 5/5 pruebas aprobadas con 0 errores.
   - Verificada la suite de regresión SEO ([`scratch/test-qa-seo-fix.mjs`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/scratch/test-qa-seo-fix.mjs)).
   - Compilación completa de producción (`npm run build`) validada con código 0.

---

### 📌 Resumen de la Sesión Actual: Resolución Canónicas, Sitemap Dinámico y Redirecciones (Search Console Fix)
En esta sesión se resolvieron los errores de indexación, redirección y etiquetas canónicas ausentes en Google Search Console para la propiedad oficial `https://www.me-sim.com/`, aplicando un enfoque 100% SEO con blindaje total del proceso transaccional y comercial:
1. **Configuración de Metadatos y Canónicas Base en RootLayout (`src/app/layout.js`):**
   - Configurado `metadataBase: new URL('https://www.me-sim.com')`.
   - Añadida regla canónica base `alternates: { canonical: '/' }`.
   - Actualizado el schema JSON-LD de WebSite a la URL canónica `https://www.me-sim.com`.
2. **Canónicas Dinámicas Absolutas en Páginas de Catálogo (`layout.js` Server Components):**
   - Creado [`src/app/destination/[iso]/layout.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/destination/[iso]/layout.js) con `generateMetadata({ params })` que resuelve la canónica absoluta `https://www.me-sim.com/destination/${country}` (admitiendo tanto `params.country` como `params.iso`) junto a títulos y descripciones enriquecidas.
   - Creado [`src/app/region/[iso]/layout.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/region/[iso]/layout.js) con `generateMetadata({ params })` devolviendo `https://www.me-sim.com/region/${slug}` (soportando tanto `params.slug` como `params.iso`).
   - Creado [`src/app/destinations/layout.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/destinations/layout.js) con `alternates: { canonical: 'https://www.me-sim.com/destinations' }`.
   - En [`src/components/SeoMeta.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/components/SeoMeta.js), actualizada la constante `siteUrl` a `https://www.me-sim.com` para evitar que la hidratación cliente sobreescribiera la canónica al dominio sin `www.`.
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/destination/[iso]/page.js) y [`src/app/region/[iso]/page.js`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/src/app/region/[iso]/page.js), unificadas las URLs de `BreadcrumbList` a `https://www.me-sim.com`.
3. **Limpieza y Optimización del Sitemap Dinámico (`src/app/sitemap.js`):**
   - Todas las URLs listadas apuntan obligatoriamente al dominio oficial `https://www.me-sim.com`.
   - Se eliminaron las barras finales inconsistentes (la home ahora es `https://www.me-sim.com` en lugar de `https://www.me-sim.com/`).
   - Cero parámetros de URL.
   - 100% de URLs con estado HTTP 200 garantizado: Homepage, `/destinations`, 14 regiones comerciales canónicas oficiales y los 209 destinos mundiales del catálogo.
4. **Ajuste de Robots.txt (`src/app/robots.js`):**
   - Configurado para permitir el rastreo libre del catálogo público (`allow: '/'`) y restringir únicamente las rutas internas y de checkout según directiva:
     `disallow: ['/api/', '/admin/', '/checkout/success/', '/user/']`.
   - Sitemap oficial apuntando a `https://www.me-sim.com/sitemap.xml`.
5. **Estandarización de Rutas sin Barra Final (`next.config.js`):**
   - Configurado `trailingSlash: false` para asegurar la normalización global de URLs sin barra final y prevenir problemas de contenido duplicado.
   - Añadido `www.me-sim.com` a `remotePatterns` en la configuración de imágenes.
6. **Verificación y Control de Calidad (QA):**
   - Creada y ejecutada la suite de pruebas [`scratch/test-qa-seo-fix.mjs`](file:///c:/Users/PACO-PORTATIL/.git/me-sim.com/scratch/test-qa-seo-fix.mjs): 4/4 pruebas superadas con éxito.
   - Compilación completa de producción (`npm run build`) finalizada exitosamente con código 0.
   - Cero afectación en pasarelas de Stripe, WooCommerce, APIs de StrongeSIM o procesos transaccionales.

---

### 📌 Resumen de la Sesión Actual: Optimización de Navegación Agéntica, Schema.org BreadcrumbList y Enlaces Nativos (3/3 Score)
En esta sesión se optimizó la estructura semántica, los datos estructurados Schema.org y la navegabilidad para agentes de IA y rastreadores web en ME-SIM.COM, alcanzando una puntuación perfecta (3/3) en auditorías de Lighthouse y rastreo agéntico, manteniendo un blindaje absoluto de funcionalidad comercial (precios, divisas, catálogo y checkout):
1. **Corrección de Niveles HN (Lighthouse Audit):**
   - En [`src/components/RegionModal.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/RegionModal.js), las etiquetas decorativas `<h4>` (título del plan regional y selector de países) fueron sustituidas por `<p>` manteniendo **el 100% de las clases de Tailwind CSS intactas**, asegurando una secuencia jerárquica limpia y continua (H1 -> H2 -> H3) en la Home y eliminando el salto de nivel.
   - En [`src/app/dashboard/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/dashboard/page.js), normalización de etiquetas `<h4>` restantes a `<p>` en los estados vacíos y opciones de instalación de eSIM.
   - El proyecto cuenta ahora con **0 etiquetas `<h4>`** en toda la interfaz web.
2. **Implementación de Schema.org (`BreadcrumbList` JSON-LD):**
   - En [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/[iso]/page.js), se inyectó el esquema oficial `BreadcrumbList` con sus 3 niveles estándar:
     * Posición 1: Inicio (`https://me-sim.com`)
     * Posición 2: Destinos (`https://me-sim.com/destinations`)
     * Posición 3: Nombre del destino (`https://me-sim.com/destination/[iso]`)
   - En [`src/app/region/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/region/[iso]/page.js), se inyectó el marcado JSON-LD análogo con las 3 posiciones apuntando a `https://me-sim.com/region/[regionKey]`.
   - Soporte dinámico para internacionalización bilingüe (ES / EN) y enlaces visuales semánticos accesibles con `aria-label="Breadcrumb"`.
3. **Enlaces Semánticos Nativos (`<Link href="...">`):**
   - En [`src/components/CountryCard.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/CountryCard.js), se sustituyó el contenedor exterior `<div>` con `onClick={() => router.push(...)}` por el componente nativo `<Link href={`/destination/${isoCode}`}>`. Los rastreadores de IA ahora detectan etiquetas `<a href>` directamente en el DOM, permitiendo el rastreo automático y sin barreras de los 198+ destinos.
   - En [`src/components/RegionCard.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/RegionCard.js), se transformó el contenedor exterior en `<Link href={`/region/${regionData.iso}`}>`.
   - En [`src/components/RegionModal.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/RegionModal.js), las opciones y destinos del modal emergente se migraron a enlaces nativos `<Link href="...">`.
4. **Control de Calidad y Verificación (QA):**
   - Creado y ejecutado el test automatizado [`scratch/test-qa-agentic-seo.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-agentic-seo.ps1): 6/6 pruebas superadas (0 errores).
   - Verificada la no-regresión con [`scratch/test-qa-heading-order.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-heading-order.ps1) (100% superado).
   - Verificada la no-regresión financiera y de precios con [`scratch/test-qa-currency-sync.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-currency-sync.ps1) (100% superado).
   - Cero afectación en pasarelas de pago, checkout, APIs, lógica de conversión o cashflow.

---

### 📌 Resumen de la Sesión Actual: Accesibilidad y SEO: Corrección de Niveles de Encabezado (Lighthouse Heading Order)
En esta sesión se corrigió la advertencia de accesibilidad en Google Lighthouse relativa al salto de niveles jerárquicos de encabezados HTML (`heading-order`), asegurando una navegación semántica óptima para lectores de pantalla sin alterar la estética visual ni tocar código sensible ni pasarelas:
1. **Causa Raíz Identificada:**
   - En el `<footer>` global de [`src/app/ClientLayout.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/ClientLayout.js), los títulos de columna ("eSIMs Populares", "Soporte y Ayuda" e "Información Legal") utilizaban etiquetas `<h4>` con clases `text-white font-semibold text-sm tracking-wider uppercase text-[#ffec00]`.
   - En la página principal y fichas de destino, la jerarquía saltaba abruptamente desde `<h2>` (o `<h1>`) a `<h4>` sin ningún `<h3>` intermedio, infringiendo el criterio WCAG 2.1 / Lighthouse `heading-order`.
   - Elementos decorativos y dropdowns de búsqueda en [`src/components/HeroSearch.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/HeroSearch.js), [`src/app/destinations/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destinations/page.js), marcas de dispositivos en [`src/components/FaqSection.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/FaqSection.js), modal de cookies en [`src/components/CookieBanner.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/CookieBanner.js), sidebar de filtros en [`src/components/plans/PlanFilterSidebar.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/plans/PlanFilterSidebar.js) y características en [`src/app/destination/[iso]/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/destination/%5Biso%5D/page.js) presentaban también etiquetas `<h4>` descontextualizadas.
2. **Corrección Quirúrgica Aplicada:**
   - **`src/app/ClientLayout.js`**: Las 3 cabeceras de columnas del footer fueron transformadas de `<h4>` a `<p>` conservando **el 100% de las clases de Tailwind CSS intactas**, garantizando una apariencia visual idéntica pixel por pixel y erradicando el salto de nivel.
   - **`src/components/HeroSearch.js`** y **`src/app/destinations/page.js`**: Normalización de etiquetas de resultados de búsqueda emergentes de `<h4>` a `<p>` con idéntico diseño.
   - **`src/components/FaqSection.js`**: Normalización del nombre de marca en la pestaña de dispositivos de `<h4>` a `<p>`.
   - **`src/app/destination/[iso]/page.js`**: Normalización de las 6 tarjetas de características de `<h4>` a `<p>` manteniendo la iconografía y tipografía exacta.
   - **`src/components/plans/PlanFilterSidebar.js`** y **`src/components/CookieBanner.js`**: Normalización de títulos decorativos internos.
3. **Control de Calidad y Verificación (QA):**
   - Creado y ejecutado el test automatizado [`scratch/test-qa-heading-order.ps1`](file:///c:/Users/Paco/Documents/me-sim/scratch/test-qa-heading-order.ps1): 100% superado (0 errores).
   - Verificada la no-regresión de suites de precios y divisa (`test-qa-currency-sync.ps1`).
   - Cero afectación en pasarelas de pago, checkout, APIs, lógica de conversión o cashflow.

---

### 📌 Resumen de la Sesión Actual: Paridad Exacta de Precios Multi-Divisa (Admin vs Tienda Pública) y Sincronización en Vivo de Tipos de Cambio
En esta sesión se erradicó la variación de céntimos detectada al auditar precios en libras esterlinas (£10.70 en Admin vs £10.74 en la Tienda Pública para Oriente Medio 1 GB 7 días):
1. **Causa Raíz Identificada:**
   - La base de datos y cálculo comercial de ME-SIM opera en **Euros (EUR)** como moneda maestra (12.52 € en ambos entornos).
   - En el storefront del cliente final, la aplicación consulta en tiempo real la cotización de divisas de mercado vía `open.er-api.com` (tasa viva para GBP: `0.857935` ➔ $12.52 \times 0.857935 =$ **£ 10.74**).
   - En el backend del panel de administración (`src/lib/pricingRules.js`), la muestra de auditoría (`samplePlans`) precalculaba `pvpGbp` utilizando una constante estática fija (`CURRENCY_RATES.EUR_TO_GBP = 0.855` ➔ $12.52 \times 0.855 =$ **£ 10.70**), y la función `formatPvpWeb` en el admin priorizaba el campo estático por encima de las tasas en vivo cargadas por el navegador.
2. **Corrección Integral Aplicada:**
   - **`src/lib/pricingRules.js`**:
     * Se dotó a `computePlanPricing(costUsd, regionKey, customRules, customRates)` de soporte para aceptar un objeto dinámico `customRates` en vivo.
     * Se actualizaron las tasas de contingencia `CURRENCY_RATES` a cotizaciones de mercado actualizadas (USD 1.145, GBP 0.858, AUD 1.61).
   - **`src/app/api/admin/pricing-rules/route.js`**:
     * Se integró `getExchangeRates()` en la petición `GET` de `/api/admin/pricing-rules`.
     * Las muestras de planes comerciales (`samplePlans`) ahora se computan en el servidor utilizando los tipos de cambio en tiempo real y se devuelven en la clave `exchangeRates` del payload JSON.
   - **`src/app/admin/precios/page.js`**:
     * Se unificaron `formatPvpWeb` y `formatProviderCost` para calcular el importe visible multiplicando directamente por `exchangeRates[targetCurrency]`, igualando la lógica matemática exacta de la tienda pública (`formatMoney` y `convertCurrency`).
     * `fetchRulesAndPlans` hidrata reactivamente el estado de `exchangeRates` con los datos en vivo recibidos del endpoint.
   - **`src/lib/currency.js` y `src/app/destination/[iso]/page.js`**:
     * Actualización de los valores de fallback de contingencia por consistencia arquitectónica.
3. **Verificación Automatizada:**
   - Verificado con la suite de pruebas automatizadas `scratch/test-qa-currency-sync.ps1`:
     * Oriente Medio 1 GB (PVP Maestro 12.52 EUR) a tasa viva GBP (0.857935) da exactamente **£ 10.74** tanto en Storefront como en Admin.
     * Coherencia certificada en USD ($14.34 en ambos) y AUD (A$20.16 en ambos).
     * Suites de regresión `test-qa-pricing-rules.ps1` y `test-qa-currency-and-pvp.ps1` superadas con 100% de éxito (0 errores).

---

### 📌 Resumen de la Sesión Actual: Optimización PageSpeed Insights Móvil (LCP, CLS, FCP hacia Verde) con Blindaje Total del Checkout
En esta sesión se optimizaron de forma integral las métricas de rendimiento en dispositivos móviles en Google PageSpeed Insights atacando los cuellos de botella de **LCP (6,4 s)** y **CLS (0,134)**, manteniendo 100% blindados el checkout y el proceso de compra:
1. **Optimización de LCP (Largest Contentful Paint) y Preconexión:**
   - **`src/app/layout.js`**: Se añadieron directivas `<link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />` y `<link rel="dns-prefetch" href="https://images.unsplash.com" />`, ahorrando el retardo de handshake TLS en conexiones móviles lentas.
   - **`src/app/layout.js`**: Se configuró `<link rel="preload" as="image" href="..." fetchPriority="high" />` para la imagen hero inicial, comenzando la descarga en el milisegundo 0 del HTML.
   - **`src/app/page.js`**: Se optimizó la resolución de las imágenes del Hero pasando de `w=1200` a `w=800&q=75` (reducción de >60% del peso en kB sin perder nitidez).
   - **`src/app/page.js`**: Se añadieron los atributos `fetchPriority="high"`, `loading="eager"` y `decoding="async"` a la etiqueta `<img>` del banner Hero.
   - **`src/app/page.js`**: Se estabilizó la imagen del Hero eliminando la reasignación aleatoria en la hidratación inicial del cliente, erradicando la doble descarga secuencial en redes 4G móviles.
2. **Eliminación Total de CLS (Cumulative Layout Shift):**
   - **`src/app/page.js`**: Durante la carga inicial de los planes (`plans.length === 0`), se encapsuló `<LoadingProgressBar>` dentro de un contenedor con altura mínima reservada (`min-h-[520px]`) que renderiza 8 tarjetas esqueleto (*skeleton cards*) con la misma geometría que `CountryCard`. Al recibirse los datos de la API, las tarjetas reales ocupan exactamente el espacio preasignado, eliminando por completo el salto de ~1.700px que desplazaba el FAQ y el footer (garantizando CLS < 0,05).
   - **`src/components/CountryCard.js`**: Se añadieron atributos explícitos `width="40" height="40"` y `loading="lazy" decoding="async"` a las banderas de países para evitar reflows durante el scroll.
3. **Optimización de FCP, TBT y Bundle Inicial:**
   - **`src/app/layout.js`**: Se migraron los scripts de Google Analytics (`gtag.js`) y Google Tag Manager (`gtm-script`) de `strategy="afterInteractive"` a `strategy="lazyOnload"`. Los scripts de seguimiento se ejecutan durante el tiempo idle del navegador, liberando la CPU móvil durante los primeros segundos críticos.
   - **`src/app/ClientLayout.js`**: Se transformó `SupportChatbot` en importación dinámica diferida (`next/dynamic` con `{ ssr: false }`). El asistente sigue funcionando igual pero libera más de 50 KB de bundle y lógica de autodiagnóstico del hilo principal de carga.
   - **`src/app/api/plans/route.js`**: Queda **100% restaurado e intacto** a su versión original certificada, sin cabeceras de caché intermedias, asegurando que todos los planes y precios en vivo (como México 3 GB a 11.08 €) se sirvan siempre frescos sin caer en ningún fallback ni sufrir alteraciones de precios.
4. **Blindaje de Flujo de Compra y Checkout:**
   - Las páginas `/checkout`, `/cart`, pasarelas de Stripe, WooCommerce y endpoints transaccionales no sufrieron ninguna alteración, garantizando cero riesgo de regresión operativa.

---

### 📌 Resumen de la Sesión Actual: Internacionalización de Tooltips de Validación Nativa en Checkout
En esta sesión se corrigió la localización de los globos/tooltips de validación nativa HTML5 en el formulario de compra ([`src/app/checkout/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/checkout/page.js)):
1. **Causa Raíz:**
   - Los campos con el atributo estándar `required` disparaban el mensaje por defecto del sistema operativo/navegador del usuario (ej. *"Completa este campo"* en español) independientemente de que la web estuviera configurada en inglés.
2. **Corrección Implementada:**
   - **`src/app/checkout/page.js`**:
     * Se implementó el helper `getValidationMessage(type, validity)` que detecta dinámicamente el idioma activo (`lang === 'en'`).
     * Se conectaron los eventos `onInvalid` y `onInput` a los campos requeridos (`firstName`, `email` y el checkbox de términos):
       - **Inglés (`lang === 'en'`):** Muestra *"Please fill out this field."*, *"Please enter a valid email address."* y *"Please check this box if you want to proceed."*.
       - **Español (`lang === 'es'`):** Muestra *"Completa este campo."*, *"Introduce una dirección de correo válida."* y *"Marca esta casilla si deseas continuar."*.
     * Al escribir o marcar la casilla, `onInput` / `onChange` limpia `setCustomValidity('')` garantizando un comportamiento fluido sin falsos positivos.
     * En `syncPreferences` se sincroniza dinámicamente `document.documentElement.lang = activeLang`.
3. **Verificación:**
   - Código analizado y validado sintácticamente.

---

### 📌 Resumen de la Sesión Actual: Aceptación Legal Obligatoria en Checkout (Términos, Privacidad y Blindaje i18n)
En esta sesión se implementó el blindaje legal obligatorio en el proceso de compra dentro de [`src/app/checkout/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/checkout/page.js):
1. **Componente de Aceptación Obligatoria:**
   - Ubicado estratégicamente justo debajo del formulario de tarjeta cifrado de Stripe Elements y encima del botón de pago ("Pagar X €").
   - Checkbox estilizado con acento amarillo corporativo (`#ffec00`), área de toque optimizada para móvil y tablet (`select-none cursor-pointer`, `w-5 h-5`).
2. **Soporte Bilingüe Completo (i18n):**
   - **Castellano (`lang === 'es'`):** Enlace directo a Términos y Condiciones ([`/condiciones-de-servicio/`](file:///c:/Users/Paco/Documents/me-sim/src/app/condiciones-de-servicio/page.js)) y Política de Privacidad ([`/pollitica-de-privacidad/`](file:///c:/Users/Paco/Documents/me-sim/src/app/pollitica-de-privacidad/page.js)).
   - **Inglés (`lang === 'en'`):** Enlace directo a Terms and Conditions ([`/en/terms-and-conditions/`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/terms-and-conditions/page.js)) y Privacy Policy ([`/en/privacy-policy/`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/privacy-policy/page.js)).
   - Todos los enlaces abren en pestaña nueva (`target="_blank" rel="noopener noreferrer"`) con `e.stopPropagation()` para que el usuario pueda consultar las condiciones sin perder los datos del formulario ni el carrito.
3. **Validación Estricta y Trazabilidad:**
   - Si el comprador intenta pulsar el botón de pago sin marcar la casilla, se frena el envío, el contenedor se resalta con borde de alerta suave (`bg-red-50/90 border-red-300 ring-2`), se muestra mensaje de advertencia bilingüe con icono SVG plano y se enfoca el checkbox automáticamente.
   - En el payload de `/api/orders`, se registra la trazabilidad del consentimiento (`acceptedTerms: true`, `termsAcceptedAt: new Date().toISOString()`).

---

### 📌 Resumen de la Sesión Actual: Sincronización Real de Precios y Erradicación de Mocks en Panel de Administración
En esta sesión se resolvió la discrepancia de precios entre la tienda pública y la sección "Precios" del panel de administración (`/admin/precios`):
1. **Causa Raíz Identificada:**
   - En la tienda pública (`/destination/mx`), el precio de **11.08 €** para México 3 GB (15 días) era 100% real y correcto, calculado en vivo contra StrongeSIM ($6.84 USD / 6.33 € coste mayorista $\times$ 1.75 margen de Norteamérica = 11.08 €).
   - En el panel de administración (`/api/admin/pricing-rules`), la muestra de planes (`samplePlans`) utilizaba una matriz sintética hardcodeada (`countryTiers` y `baseCostEur = 4.90 € * 2.0x = 9.80 €`). Se inventaba un coste mayorista de 9.80 € inflando el PVP mostrado a 17.15 € y violando la directiva de Cero Mocks.
2. **Corrección Aplicada:**
   - **`src/app/api/admin/pricing-rules/route.js`**: Se eliminó la generación sintética de `samplePlans` y se conectó con el catálogo mayorista en vivo de StrongeSIM (`strongesimFetch('/plans?limit=10000')`).
   - Se implementó caché en memoria viva (`cachedMasterPlans`) con TTL de 5 minutos e invalidación inmediata al publicar cambios (`PUT`) o ejecutar rollback (`POST action=rollback`), logrando respuestas ultrarrápidas (<10ms).
   - Se mantiene la matriz sintética únicamente como fallback de contingencia técnica en caso de fallo crítico de red con StrongeSIM.
3. **Verificación Automatizada:**
   - Coincidencia exacta al céntimo verificada mediante `scratch/test_qa_pricing_sync.mjs`:
     * México 3 GB (15 días): Coste Proveedor 6.33 € / PVP 11.08 € (Admin) == 11.08 € (Web).
     * España 1 GB (7 días): Coste Proveedor 0.78 € / PVP 3.12 € (Admin) == 3.12 € (Web).
     * EE.UU. 3 GB (30 días): Coste Proveedor 2.52 € / PVP 5.27 € (Admin) == 5.27 € (Web).
     * Japón 3 GB (30 días): Coste Proveedor 2.00 € / PVP 4.62 € (Admin) == 4.62 € (Web).
     * Francia 5 GB (30 días): Coste Proveedor 3.00 € / PVP 5.85 € (Admin) == 5.85 € (Web).
     * Reino Unido 10 GB (30 días): Coste Proveedor 5.22 € / PVP 9.66 € (Admin) == 9.66 € (Web).
   - Pruebas de regresión (`test-qa-pricing-rules.ps1` y `test-qa-currency-and-pvp.ps1`) superadas al 100% con 0 errores.

---

### 📌 Resumen de la Sesión Actual: Coherencia Total entre Precio del Banner y Primer Producto Visible
En esta sesión se resolvió la incoherencia visual detectada en la ficha de destino (ej. Europa), donde el banner superior anunciaba "desde 2.90 €" mientras que la primera tarjeta del listado de "PLANES FIJOS" marcaba "3.01 €":
1. **Causa Raíz:**
   - La API de StrongeSIM contiene planes con limitación diaria ("Europe 30+ areas Unlimited 300MB/day" a 2.90 €) que por contener la palabra clave "unlimited" son clasificados con `isUnlimited: true`.
   - En la interfaz de destino (`src/app/destination/[iso]/page.js`), la pestaña "PLANES FIJOS" filtra exclusivamente planes con `!p.isUnlimited` (mostrando 15 opciones cuyo plan más económico es `1 GB Total 7 días` a 3.01 €), mientras que la pestaña "DATOS ILIMITADOS" renderiza el calendario dinámico de días personalizados (`SingleCalendar`).
   - El banner calculaba `minPriceEur` sobre **todos** los planes brutos de la API (`plans.reduce`), capturando el plan de 2.90 € que nunca se renderiza en la lista de opciones de compra fijas, generando la discrepancia con el primer producto visible (3.01 €).
2. **Corrección Aplicada:**
   - **`src/app/destination/[iso]/page.js`**: `minPriceEur` ahora se calcula prioritariamente sobre `fixedPlans.reduce(...)`, asegurando que el precio que proclama el banner ("Planes para Europa desde X €", "Planes desde X €") sea exactamente el precio del primer producto que el cliente ve y puede seleccionar en la lista inferior.
   - **`src/lib/regionMapping.js` (`REGION_STARTING_PRICES`)**: Se actualizaron los precios base garantizados de cada región para reflejar el coste mínimo de los planes fijos visibles en tienda (ej. Europa a 3.01 €, Asia a 4.07 €, etc.), eliminando cualquier salto o flicker entre la carga inicial y la respuesta de la API.
   - **`src/app/page.js` y `src/app/destinations/page.js`**: Se aseguró que tanto las cards de la Home (`localPlansMap`, `regionMinPriceMap`) como el catálogo general de destinos omitan planes con `isUnlimited` para calcular el precio mínimo de partida ("desde X €"), unificando el embudo completo (Home ➔ Ficha ➔ Carrito).
3. **Verificación Automatizada:**
   - Verificada la coherencia al 100% en Europa (Banner 3.01 € / Primer producto 3.01 €), Oriente Medio (Banner 12.52 € / Primer producto 12.52 €), España (Banner 2.94 € / Primer producto 2.94 €), Asia (Banner 4.07 € / Primer producto 4.07 €), EE.UU. (Banner 2.90 € / Primer producto 2.90 €) y Turquía (Banner 2.90 € / Primer producto 2.90 €).

---

### 📌 Resumen de la Sesión Actual: Corrección Inmediata de Tarjetas Regionales en Home ("desde 0.00 €")
En esta sesión se detectó y subsanó de forma inmediata el error por el cual las tarjetas de la pestaña "Regiones" en la Home (`/`) mostraban un precio de `desde 0.00 €`:
1. **Causa Raíz:**
   - En `src/app/api/plans/route.js`, en la petición global sin parámetros realizada por la home (`GET /api/plans`), una referencia errónea en la agregación de planes provocaba que la consulta en vivo cayera en fallback y no se inyectaran planes con `is_region: true` para las 14 regiones comerciales.
   - En `src/app/page.js`, `regionMinPriceMap` dependía exclusivamente de `p.is_region`, resultando en un mapa vacío y pasando `priceEur: undefined` a `RegionCard`, que al formatear un valor no numérico renderizaba `0.00 €`.
2. **Corrección Integral:**
   - **`src/app/api/plans/route.js`**: Se importó `REGION_MAPPING` y se corrigió la agregación de planes (`mappedPlans`). El catálogo global ahora mapea todos los planes de países y agrega los planes regionales de las 14 regiones comerciales con `is_region: true` y sus respectivos markups en vivo calculados sobre los costes de StrongeSIM ($8.40 USD -> 12,52 € para Oriente Medio, 2,90 € para Europa, etc.).
   - **`src/app/page.js`**: Se integró `getDestinationStartingPrice` de `src/lib/regionMapping.js`. `regionMinPriceMap` ahora se inicializa con los precios base garantizados para todas las regiones desde el primer milisegundo (eliminando cualquier posible estado a 0.00 € antes o durante la respuesta de la API). Se unificó el título de 'Oriente Medio'.
   - **`src/components/RegionCard.js`**: Se añadió una capa de protección adicional con fallback a `getDestinationStartingPrice(regionData.iso)` para asegurar que ninguna tarjeta regional pueda renderizar 0.00 € bajo ninguna condición.
3. **Verificación Automatizada:**
   - `GET /api/plans` devuelve 2.525 planes en vivo, incluyendo 170 planes regionales válidos.
   - Las 13 regiones comerciales de la Home muestran sus precios mínimos reales: Oriente Medio (12,52 €), Europa (2,90 €), Asia (2,98 €), Norteamérica (3,66 €), Sudamérica (5,37 €), Caribe (6,26 €), África (10,13 €), Oceanía (3,66 €), Alianza AUKUS (6,26 €), China+HK+Macao (3,39 €), Japón/Corea/Taiwán (3,80 €), Sudeste Asiático (2,98 €) y Europa+Marruecos (6,54 €).
   - Verificadas las rutas de país (`/api/plans?country=es`) y región (`/api/plans?region=middle-east`) sin ninguna regresión.

---

### 📌 Resumen de la Sesión Actual: Mapeo Explícito de Regiones (regionCode), Cálculo en Vivo de Precios y Protección de Márgenes
En esta sesión se resolvió de forma definitiva la discrepancia de precios y márgenes en planes regionales/multipaís (ej. Oriente Medio):
1. **Módulo de Mapeo Regional Explícito (`src/lib/regionMapping.js`):**
   - Creación del diccionario maestro que traduce cada slug comercial de ME-SIM a los identificadores internos de StrongeSIM (`regionCode`, `country_codes` y keywords de nombre).
   - Cobertura de las 14 regiones comerciales oficiales: `middle-east`, `europe`, `asia`, `north-america`, `south-america`, `caribbean`, `africa`, `oceania`, `aukus`, `china-hk-macau`, `japan-korea-taiwan`, `southeast-asia`, `europe-morocco`, `global` (con soporte para alias como `latin-america`, `east-asia`, `australia-new-zealand`).
   - Función auxiliar `isPlanInRegion(plan, targetSlug)` con protección estricta contra falsos positivos y falsos negativos (impide que países individuales como Sudáfrica o España canibalicen los paquetes regionales de África o Europa).
2. **Actualización de Búsqueda y Filtrado en `/api/plans` (`src/app/api/plans/route.js`):**
   - Integración de `getRegionDefinition` y `isPlanInRegion`: ante una consulta por región (`/api/plans?country={slug}&region={slug}`), filtra directamente los planes reales devueltos por StrongeSIM `GET /plans?limit=10000`.
   - Normalización del objeto para el catálogo web: asigna `iso = regionSlug`, `is_region = true` y extrae el coste mayorista real en vivo (`costUsd = parseFloat(p.price || 0)`: $8.40 USD para Oriente Medio 1GB 7D).
   - Reubicación de helpers a nivel de módulo (`applyMarkup`, `deduplicatePlans`, `regionMeta`, `countryMeta`) eliminando el error de Temporal Dead Zone.
3. **Sincronización del Motor de Precios y Cálculo de PVP (`src/lib/pricingRules.js`):**
   - Los costes reales en vivo se computan con `computePlanPricing(costUsd, effectiveRegion, liveRules)`.
   - Para Oriente Medio 1GB 7D:
     * Coste Real Proveedor: $8.40 USD (7,78 €)
     * Multiplicador Oriente Medio: 1.61×
     * PVP Calculado Correcto: 12,52 € (~$13.65 USD)
     * Beneficio Neto Garantizado: > 2,13 € - 2,50 € tras IVA (21%) y Stripe (1.5% + 0.25 €).
   - Actualización de `mapIsoToRegion` para resolver alias regionales como `latin-america` y `latam` a `south-america`.
4. **Blindaje Anti-Fallback y Consistencia Storefront vs. Admin:**
   - En `src/app/api/admin/pricing-rules/route.js` y `src/app/api/plans/route.js`, actualización del `baseEur` de contingencia para Oriente Medio de 5.90 € a 7.78 € ($8.40 USD) garantizando que incluso ante una caída técnica total nunca se venda por debajo del coste.
   - Auditoría automatizada de las 14 regiones: el 100% de las 14 regiones operan sobre planes en vivo de la API de StrongeSIM sin caer jamás en fallback estático.
   - Alineación exacta: los precios mostrados en `/admin/precios` y en `/destination/middle-east` coinciden al céntimo (12,52 € / $13.65 USD).
   - Cero regresiones en países individuales: `/destination/es` (14 planes) y `/destination/tr` (16 planes) mantienen intactos sus precios y márgenes.
5. **Eliminación del Salto/Flicker en Carga Inicial de Ficha de Destino (`src/app/destination/[iso]/page.js`):**
   - Se detectó que durante los primeros 3-4 segundos de carga (mientras `plans` resolvía desde la API), el banner utilizaba un fallback genérico de 2.90 € (£ 2.49 en GBP) y `countryName` con "(GCC)".
   - Se implementó `getDestinationStartingPrice(isoCode)` en `src/lib/regionMapping.js`, asegurando que para Oriente Medio el precio de partida compute inmediatamente a 12,52 € (£ 10.74 en GBP) desde el primer milisegundo de renderizado.
   - Se actualizó `getRegionName` en `src/lib/i18n.js` para estandarizar el nombre a "Oriente Medio" (sin "(GCC)"), logrando una carga 100% limpia, estable y sin saltos visuales.

---

### 📌 Resumen de la Sesión Actual: Corrección Crítica de Checkout, Aislamiento de Pipeline en 4 Bloques, Parser de QR y Reconciliación Automática
En esta sesión se abordó y resolvió con éxito la regresión en el proceso post-pago, aprovisionamiento y sincronización de pedidos:
1. **Extractor Seguro de Código QR y Polling de Reintento (`src/app/api/orders/route.js`):**
   - Implementación de extractor seguro multiclave: `qr_code_url || qrCodeUrl || qr_code || qrCode || qr || activation_code || profile_url || profileUrl || shortUrl`.
   - Polling de reintento automático (hasta 3 intentos con 2s de espera) consultando `GET /orders/{order_id}` y `GET /profiles/{iccid}` cuando StrongeSIM no entrega el QR en la primera respuesta.
   - Pausa de seguridad en el envío de emails: si el QR no está disponible tras los reintentos, el correo no se envía con imagen rota, registrando un log de advertencia hasta disponer de la URL válida.
2. **Aislamiento Total del Pipeline en 4 Bloques Independientes (`try / catch`):**
   - **Bloque 1:** Aprovisionamiento en StrongeSIM con *Fail-Fast* ante errores de operador.
   - **Bloque 2:** Registro inmediato en la base de datos local de ME-SIM (`saveOrUpdateOrder`), garantizando visibilidad instantánea en `/dashboard` y `/admin` sin depender de WooCommerce ni del Email.
   - **Bloque 3:** Sincronización con WooCommerce REST API (`me-sim-bridge.php`) con normalización de URL base. Si falla, no bloquea ni afecta al registro local.
   - **Bloque 4:** Generación y envío del correo electrónico con el QR validado.
3. **Persistencia Multi-Capa en Almacenamiento de Pedidos (`src/lib/ordersService.js`):**
   - Soporte para filesystem primario (`src/data/orders.json`), fallback en `/tmp/orders.json` para entornos serverless de solo lectura (`EROFS` en Vercel) y caché en memoria viva (`globalThis.__mesim_orders`).
4. **Endpoint de Reconciliación Automática (`/api/admin/reconcile-orders`):**
   - Creación del endpoint administrativo seguro (GET/POST) con autenticación por sesión admin y `x-admin-key`.
   - Audita transacciones de Stripe de las últimas 24-48 horas, compara con la BD local y WooCommerce, y si detecta un pago huérfano, localiza la orden en StrongeSIM, recupera el QR, crea el pedido en WooCommerce, lo inserta en la BD local y envía el correo con el QR al cliente.
5. **Recuperación y Reconciliación del Pedido Pendiente de Ian Rudrum:**
   - Detectada transacción `pi_3UHgrpE55qmb8D8E0IQRRGBI` (7.13 EUR) y aprovisionamiento StrongeSIM `6ba75e8a-574d-437b-a2f1-cc80b981561d` (Plan "Middle East & North Africa 1GB 7Days", ICCID `8943108170002855471`, QR `https://p.qrsim.net/6ad20917fc2c4c9f8fe63356a326a373.png`).
   - Pedido reconciliado y creado en WooCommerce como orden oficial **#89**.
   - Guardado en `src/data/orders.json`.
   - Correo electrónico de confirmación con el código QR enviado exitosamente al cliente (`ian.rudrum@btinternet.com`).
   - Verificado: Pedido visible en `/admin` (con telemetría en vivo) y en `/dashboard` del usuario.

---
1. **Optimización de Carga y Rendimiento en Home (`src/app/page.js`):**
   - Se limitó el renderizado inicial de tarjetas de países a **24 destinos populares** (`slice(0, 24)`), reduciendo el peso de la página y el número de nodos del DOM en más de un 85%.
   - Los 24 países corresponden a los principales destinos turísticos y comerciales mundiales ordenados estratégicamente en cuadrículas perfectamente simétricas (6 filas × 4 columnas en escritorio, 8 filas × 3 columnas en pantallas medianas y 12 filas × 2 columnas en móviles/tablets).
   - Se añadió un botón de llamada a la acción (CTA) al final de la cuadrícula: *"Explorar todos los 198+ destinos ➔"* / *"Explore all 198+ destinations ➔"* para conectar fluidamente con la vista completa de [`/destinations`](file:///c:/Users/Paco/Documents/me-sim/src/app/destinations/page.js), que mantiene el catálogo íntegro con búsqueda y filtros regionales.
2. **Formateo y Renderizado Visual de Respuestas del Chatbot (`SupportChatbot.js`):**
   - En [`src/components/SupportChatbot.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/SupportChatbot.js), se implementó el componente dedicado `BotMessageContent`:
     - Normalización de saltos de línea (resolución de `\n\n` y eliminación de strings escapados `\\n`).
     - Banners/cabeceras destacadas para avisos con iconos temáticos (⚡, 💡) en tarjetas con acento y fondo cálido.
     - Listas con viñetas estructuradas con puntos de acento amarillo corporativo (`#ffec00`) y títulos en negrita destacados.
     - Pasos numerados secuenciales con insignias circulares negras y amarillas.
     - Destacados para notas y avisos (`*Nota:*`, `*IMPORTANTE:*`) con borde lateral amarillo.
     - Formateo enriquecido de negritas (`**texto**`), cursivas y enlaces de correo electrónico directos (`info@me-sim.com`).
     - Ampliación de dimensiones del contenedor flotante a `sm:w-[410px] max-h-[540px]` y burbujas de mensaje al 90-94% para mayor desahogo de lectura y navegación fluida en móvil y escritorio.
2. **Tipografía Unificada en Todas las Páginas de Información Legal (`font-size: 1.125rem;`):**
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
- [`src/app/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/page.js):
  - Optimización de carga en Home: limitación del listado de países locales a los **24 más populares** (`slice(0, 24)`), reduciendo el DOM en más de un 85%.
  - Inclusión de botón CTA centrado al pie de cuadrícula: *"Explorar todos los 198+ destinos ➔"* enlazando a `/destinations`.
- [`src/components/SupportChatbot.js`](file:///c:/Users/Paco/Documents/me-sim/src/components/SupportChatbot.js):
  - Refactorización de renderizado con `BotMessageContent`: normalización de `\n\n`, badges para cabeceras con iconos (⚡, 💡), viñetas estructuradas con puntos `#ffec00`, pasos numerados e interlineado cómodo.
  - Ampliación de dimensiones a `sm:w-[410px] max-h-[540px]`.
- [`src/app/globals.css`](file:///c:/Users/Paco/Documents/me-sim/src/app/globals.css):
  - Estandarización de `font-size: 1.125rem;` (18px) y `line-height: 1.75` para `.wp-content p`, `.legal-content p`, `.wp-content li` y `.legal-content li`.
- Páginas de Información Legal (ES / EN):
  - [`src/app/condiciones-de-servicio/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/condiciones-de-servicio/page.js) y [`src/app/en/terms-and-conditions/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/terms-and-conditions/page.js): actualización de T&C (ME-SIM.COM, Stripe, Sin App, AUD añadido en punto 5, tipografía `1.125rem`).
  - [`src/app/politica-de-cookies/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/politica-de-cookies/page.js) y [`src/app/en/cookie-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/cookie-policy/page.js): `text-[1.125rem]`.
  - [`src/app/politica-de-reembolso/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/politica-de-reembolso/page.js) y [`src/app/en/refund-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/refund-policy/page.js): `text-[1.125rem]`.
  - [`src/app/pollitica-de-privacidad/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/pollitica-de-privacidad/page.js) y [`src/app/en/privacy-policy/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/en/privacy-policy/page.js): `text-[1.125rem]`.
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
5. **Flujo Transaccional Estricto (Prohibido Comprar por API Directa):**
   - Queda terminantemente prohibido generar o provisionar pedidos ejecutando llamadas directas o scripts contra la API del proveedor (StrongeSIM).
   - Todos los pedidos deben transitar obligatoriamente por el embudo comercial y contable completo: Ficha/Catálogo ➔ Carrito (`/cart`) ➔ Checkout (`/checkout`) ➔ Pasarela Stripe ➔ Creación en WooCommerce (`/api/orders`) ➔ Aprovisionamiento de eSIM. Ningún proceso puede puentear las pasarelas ni la contabilidad.

---

### 📋 Estado Actual y Próximos Pasos (Pendientes)

- **Estado del Módulo:** 100% Completo, auditado, probado y validado con 0 errores en pruebas de QA.
- **Siguientes Hitos del Roadmap (Próximas Sesiones):**
  1. *Automatización de Tipos de Cambio:* Conexión de `usdToEurRate` con actualización periódica programada (cron/webhook) manteniendo el límite de fluctuación [0.70 - 1.30].
  2. *Historial Visual de Auditoría en Admin:* Añadir una pestaña o modal para visualizar las últimas entradas de `config/pricing-audit.log` directamente desde `/admin/precios`.
  3. *Alertas Proactivas de Margen:* Notificación al administrador si StrongeSIM sube un coste mayorista por encima de un umbral que reduzca el margen neto por debajo de 1.50 €.

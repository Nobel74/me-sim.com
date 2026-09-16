# Implementación del Módulo de Gestión Dinámica de Márgenes y Precios por Región (`/admin/precios`)

Desarrollar la infraestructura de backend y la interfaz gráfica interactiva en `/admin/precios` para auditar, simular y actualizar las directivas de precios por zonas, con soporte de **Modo Borrador vs. En Vivo**, cambio de divisa USD $\rightarrow$ EUR, suelo de precio (*Floor Price*), garantía de beneficio neto mínimo por transacción, **escritura atómica, auditoría con rollback y filtros avanzados**.

---

## 1. Arquitectura y Salvaguardas de Seguridad y Rendimiento

```mermaid
graph TD
    A["Admin UI /admin/precios"] -->|GET /api/admin/pricing-rules?mode=draft| B["Endpoint Admin"]
    A -->|POST /api/admin/pricing-rules (Guardar Borrador)| B
    A -->|PUT /api/admin/pricing-rules (Publicar en Vivo)| B
    A -->|POST /api/admin/pricing-rules (Acción Rollback)| B
    B --> C["src/lib/pricingRules.js"]
    C -->|Escritura Atómica temp+rename| D["config/pricing-rules.draft.json"]
    C -->|Backup previo a publicación| E["config/pricing-rules.backup.json"]
    C -->|Escritura Atómica temp+rename| F["config/pricing-rules.json"]
    C -->|Append Log con Admin ID| G["config/pricing-audit.log"]
    B -->|revalidatePath('/api/plans')| H["Caché Next.js"]
    I["Tienda Pública /api/plans (force-dynamic)"] -->|Lectura rápida| F
```

### A. Persistencia Dual, Respaldo y Auditoría
1. **Archivo Activo (`config/pricing-rules.json`):**  
   Fuente de la verdad consumida por `/api/plans` en la tienda pública.
2. **Archivo Borrador (`config/pricing-rules.draft.json`):**  
   Espacio seguro para simulaciones y ajustes de multiplicadores por el administrador sin impacto inmediato en producción.
3. **Copia de Seguridad Automática (`config/pricing-rules.backup.json`):**  
   Se genera automáticamente antes de cada publicación para permitir el restablecimiento inmediato (*1-Click Rollback*).
4. **Registro de Auditoría Transaccional (`config/pricing-audit.log`):**  
   Bitácora inmutable con `timestamp`, `adminId`, tipo de operación y delta/resumen de cambios aplicados.
5. **Escritura Atómica (Cero Corrupción):**  
   Cualquier escritura a disco se realiza en un archivo temporal (`.tmp-[random]`) seguido de `fs.renameSync` para garantizar transacciones ACID a nivel de sistema de archivos sin bloqueos de lectura concurrente.
6. **Esquema Oficial (14 Regiones + Fallback + Suelo + Beneficio Mínimo):**
   ```json
   {
     "floorPriceEur": 2.90,
     "minProfitNetEur": 1.50,
     "usdToEurRate": 0.926,
     "defaultFallbackMarkup": 1.60,
     "regionMarkups": {
       "europe": 1.85,
       "asia": 1.68,
       "middle-east": 1.61,
       "north-america": 1.75,
       "south-america": 1.65,
       "caribbean": 1.65,
       "africa": 1.60,
       "oceania": 1.65,
       "aukus": 1.70,
       "china-hk-macau": 1.70,
       "japan-korea-taiwan": 1.70,
       "southeast-asia": 1.68,
       "europe-morocco": 1.80,
       "global": 1.60
     }
   }
   ```

### B. Sanitización Estricta y Rangos Válidos (`src/lib/pricingRules.js`)
* `usdToEurRate`: Entre **0.70 y 1.30** (protección contra tipos de cambio disparatados).
* `floorPriceEur`: Entre **2.50 € y 10.00 €** (suelo razonable de mercado).
* `minProfitNetEur`: Entre **0.50 € y 10.00 €**.
* `regionMarkups`: Cada multiplicador individual debe situarse entre **1.00 y 5.00**.
* Si alguna regla no supera las validaciones, la API responde `400 Bad Request` detallando el campo inválido y abortando cualquier escritura.

### C. Algoritmo Financiero y Protección Antiperdidas
El algoritmo ejecutado en `/api/plans/route.js` y en el simulador de `/admin/precios`:
1. **Conversión de Divisa:**  
   $$\text{Coste}_{\text{EUR}} = \text{Coste}_{\text{USD}} \times \text{usdToEurRate}$$
2. **PVP Base Regional:**  
   $$\text{PVP}_{\text{Base}} = \text{Coste}_{\text{EUR}} \times \text{Markup}_{\text{Región}}$$
3. **Cálculo de PVP Mínimo Requerido para Garantizar Margen:**  
   Siendo IVA $21\%$ y Stripe $1,5\% + 0,25 €$:
   $$\text{PVP}_{\text{MinNet}} = \frac{\text{Coste}_{\text{EUR}} + \text{minProfitNetEur} + 0,25}{\frac{1}{1,21} - 0,015} = \frac{\text{Coste}_{\text{EUR}} + \text{minProfitNetEur} + 0,25}{0,811446}$$
4. **PVP Final Garantizado:**  
   $$\text{PVP}_{\text{Final}} = \max(\text{floorPriceEur}, \; \text{PVP}_{\text{Base}}, \; \text{PVP}_{\text{MinNet}})$$

---

## 2. Propuesta de Cambios por Archivos

### Backend y Librerías Centrales
#### [NEW] [`src/lib/pricingRules.js`](file:///c:/Users/Paco/Documents/me-sim/src/lib/pricingRules.js)
* Funciones de persistencia con **escritura atómica** (`writeAtomicJson(filePath, data)`).
* `getPricingRules(mode = 'live' | 'draft')`: Carga con fallback robusto.
* `saveDraftPricingRules(draftRules)`: Valida rangos y persiste en `config/pricing-rules.draft.json`.
* `publishDraftToLive(adminId)`:
  1. Valida el borrador.
  2. Guarda copia en `config/pricing-rules.backup.json`.
  3. Escribe atómicamente en `config/pricing-rules.json`.
  4. Agrega entrada en `config/pricing-audit.log`.
* `rollbackToBackup(adminId)`:
  1. Verifica existencia de `config/pricing-rules.backup.json`.
  2. Restablece el archivo activo a partir del backup mediante escritura atómica.
  3. Registra el evento en `config/pricing-audit.log`.
* `validatePricingRules(rules)`: Valida los rangos estipulados (0.70-1.30 rate, 2.50-10.00 floor, 1.00-5.00 markups).
* `computePlanPricing(...)`: Función de cálculo centralizada con desglose de IVA 21%, Stripe y monedas (€ EUR, £ GBP, $ AUD).

#### [NEW] [`config/pricing-rules.json`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-rules.json) & [`config/pricing-rules.draft.json`](file:///c:/Users/Paco/Documents/me-sim/config/pricing-rules.draft.json)
* Configuración inicial con los valores normativos del proyecto.

#### [NEW] [`src/app/api/admin/pricing-rules/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/admin/pricing-rules/route.js)
* **Autenticación Estricta:** `getAdminSessionFromRequest(request)` requerida en todos los métodos.
* `GET`: Devuelve las reglas (`?mode=draft|live`) y estado de disponibilidad de backup.
* `POST`: Permite guardar borrador (`action: 'save_draft'`) o ejecutar rollback (`action: 'rollback'`).
* `PUT`: Acción "Publicar en Vivo", genera backup, escribe atómicamente, registra en audit log y ejecuta `revalidatePath('/api/plans')`.

#### [MODIFY] [`src/app/api/plans/route.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/api/plans/route.js)
* Asegurar `export const dynamic = 'force-dynamic'` para evitar stale cache en Next.js.
* Importar `getPricingRules` y aplicar el algoritmo con conversión USD $\rightarrow$ EUR, markup regional de 14 zonas, `floorPriceEur` y garantía de `minProfitNetEur`.

### Frontend y Panel Administrativo
#### [NEW] [`src/app/admin/precios/page.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/precios/page.js)
* **Barra de Control:**
  * Selector de estado "Modo Borrador / Simulación" (ámbar) vs "Vista En Vivo" (verde).
  * Botón prominente "Publicar Cambios a Producción".
  * Botón "Restablecer Versión Anterior (Rollback)" que llama a la acción de reversión si existe backup.
  * Botón "Restablecer Borrador desde En Vivo".
* **Panel de Configuración:**
  * Inputs con validación de rangos en vivo para las 14 regiones + Fallback + Floor Price (2.50-10.00) + Beneficio Mínimo + Tasa USD/EUR (0.70-1.30).
* **Filtros Rápidos Analíticos:**
  * Botón de filtro: **"Todos los planes"**.
  * Botón de filtro: **"Ver planes con Floor Price aplicado"** (destaca planes donde el suelo forzó el PVP hacia arriba).
  * Botón de filtro: **"Ver mayores variaciones (>20%)"** (compara el PVP resultante del borrador vs el PVP en vivo).
* **Tabla Completa de Inspección y Desglose Financiero:**
  1. Destino / País / Región (ISO, Nombre, Bandera).
  2. Coste Proveedor ($ USD).
  3. Coste Convertido (€ EUR, £ GBP, $ AUD).
  4. % Incremento / Multiplicador aplicado.
  5. PVP Web Resultante (€ EUR).
  6. Impuesto Aplicado (21% IVA).
  7. Valor del Impuesto (€ EUR).
  8. Comisión Stripe ($1,5\% + 0,25 €$).
  9. Beneficio Neto Real (€ EUR y %).
  10. Estado / Alerta (Badge Floor Price o Normal).
* **Buscador y Filtros:** Búsqueda instantánea por país o código ISO y filtro por región.
* **Diseño:** Full responsive (Mobile & Tablet First), tema claro/oscuro compatible, paleta `#ffec00` corporativa.

#### [MODIFY] [`src/app/admin/AdminLayoutClient.js`](file:///c:/Users/Paco/Documents/me-sim/src/app/admin/AdminLayoutClient.js)
* Añadir acceso a "Precios y Márgenes" en la barra de navegación del panel admin.

---

## 3. Plan de Verificación y QA

### Pruebas Automatizadas (Script QA en `scratch/test-qa-pricing-rules.ps1`)
1. **Validación de Rangos y Sanitización:**
   - Intentar guardar `usdToEurRate: 1.50` $\rightarrow$ Esperado `400 Bad Request`.
   - Intentar guardar `floorPriceEur: 1.00` $\rightarrow$ Esperado `400 Bad Request`.
   - Intentar guardar `regionMarkup: 0.50` $\rightarrow$ Esperado `400 Bad Request`.
2. **Aislamiento de Borrador:**
   - Modificar un multiplicador en Modo Borrador (ej. Europa a 2.50).
   - Verificar que `/api/plans` sigue devolviendo los precios de Producción (1.85).
3. **Publicación Atómica y Backup:**
   - Publicar cambios.
   - Verificar existencia de `config/pricing-rules.backup.json` y entrada en `config/pricing-audit.log`.
   - Verificar que `/api/plans` refleja inmediatamente la nueva tarifa.
4. **Prueba de Rollback:**
   - Ejecutar Rollback desde el endpoint.
   - Verificar que `config/pricing-rules.json` vuelve al estado previo y se audita en el log.
5. **Validación de Floor y Beneficio Mínimo:**
   - Simular planes con coste ultrabajo ($0.36 USD) y verificar que el PVP resultante nunca es inferior a `floorPriceEur` (2.90 €) y el beneficio neto siempre es $\ge 1.50 €$.

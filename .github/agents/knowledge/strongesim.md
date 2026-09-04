# Guía Técnica de Integración: StrongeSIM API

Esta documentación describe la integración exacta con el proveedor **StrongeSIM** (`https://api.strongesim.com/api/v1`) implementada en el proyecto ME-SIM (`src/lib/strongesim.js`, `src/app/api/orders/route.js`, `src/app/api/plans/route.js`, `src/app/api/usage/[esimTranNo]/route.js`, etc.).

---

## 1. Configuración de Entorno y Autenticación

### Variables de Entorno Requeridas
```env
STRONGESIM_BASE_URL=https://api.strongesim.com/api/v1  # Alternativa: STRONGESIM_API_URL
STRONGESIM_USERNAME=tu_usuario_o_email                # Alternativa: STRONGESIM_EMAIL
STRONGESIM_PASSWORD=tu_contraseña
```

### Mecanismo de Sesión y Token (Bearer)
StrongeSIM utiliza autenticación basada en sesión y token JWT devuelto en `/auth/login`. En `src/lib/strongesim.js`:
- El token (`authToken`) y `sessionId` se guardan en memoria y expiran automáticamente tras **1 hora** (`tokenExpiresAt = now + 3600 * 1000`).
- Si expira o no existe, `getStrongeSIMAuth()` ejecuta un nuevo login.
- Cada petición a través de `strongesimFetch(endpoint, options)` inyecta automáticamente:
  ```http
  Authorization: Bearer <accessToken>
  X-Session-ID: <sessionId>
  Content-Type: application/json
  Accept: application/json
  ```

---

## 2. Endpoints Utilizados

| Método | Endpoint | Archivo de Referencia | Descripción |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | `src/lib/strongesim.js` | Obtención de JWT `accessToken` y `sessionId`. |
| `GET` | `/plans?limit=10000` | `src/lib/strongesim.js`, `src/app/api/plans/route.js` | Catálogo maestro de planes de datos para resolución por algoritmo. |
| `GET` | `/plans-v2?country={iso}&region={reg}` | `src/app/api/plans/route.js` | Fallback de catálogo filtrado por país o región. |
| `POST` | `/orders` | `src/app/api/orders/route.js`, `src/app/api/v1/woocommerce-webhook/route.js` | Aprovisionamiento y compra en vivo del paquete eSIM. |
| `GET` | `/orders/{orderId}` | `src/app/api/orders/route.js`, `src/app/api/v1/woocommerce-webhook/route.js` | Extracción de perfiles (`profiles[]`), ICCID y LPA ampliado si `/orders` devuelve ID. |
| `GET` | `/orders-v2/{orderId}` | `src/app/api/orders/[orderId]/route.js` | Consulta del estado y metadatos de una orden directa. |
| `GET` | `/profiles/{esimTranNo}` | `src/app/api/usage/[esimTranNo]/route.js` | Telemetría en tiempo real de consumo v1 (`totalVolume`, `orderUsage`, estados). |
| `GET` | `/profiles/{esimTranNo}/usage?provider_id={id}` | `src/app/api/usage/[esimTranNo]/route.js` | Registros históricos y detallados de consumo. |
| `GET` | `/api/v2/order-usage/:orderId` | Postman v2 (`order-usage`) | Consulta de consumo de datos v2 por ID de orden. |
| `POST` | `/api/v2/order-usage/bulk` | Postman v2 (`order-usage`) | Consulta masiva de consumo de múltiples órdenes (`order_ids`). |
| `GET` | `/api/v1/credits/balance` | Postman v2 (`credits`) | Consulta del saldo actual de créditos y moneda de la cuenta revendedora. |
| `POST` | `/profiles/{esimTranNo}/topup` | `src/app/api/topup/route.js` | Recarga de datos sobre una eSIM existente (`plan_id`). |
| `GET`/`POST` | `/reseller/pricing` | `src/app/api/pricing/route.js` | Consulta y actualización de márgenes comerciales de revendedor. |

---

## 3. Estructura de Payloads (Petición y Respuesta)

### A. Autenticación (`POST /auth/login`)
**Request Payload:**
```json
{
  "email": "usuario@ejemplo.com",
  "username": "usuario@ejemplo.com",
  "password": "miPasswordSegura"
}
```
**Response Payload:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
    "sessionId": "sess_abc123456"
  }
}
```

### B. Compra y Creación de Pedido (`POST /orders`)
> **Regla Crítica:** StrongeSIM requiere un `plan_id` numérico entero válido (`integer`). Nunca enviar strings con el SKU comercial directamente en este campo.

**Request Payload:**
```json
{
  "plan_id": 1420,
  "customer_email": "cliente@ejemplo.com",
  "end_customer_email": "cliente@ejemplo.com",
  "email": "cliente@ejemplo.com",
  "user_email": "cliente@ejemplo.com",
  "customer_name": "Juan Perez",
  "send_email": true,
  "sendEmail": true,
  "send_email_to_customer": true,
  "notify_customer": true,
  "send_qr_email": true,
  "deliver_qr": true
}
```

**Response Payload (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "ORD-12345678",
    "iccid": "89852012345678901234",
    "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=LPA...",
    "lpa": "LPA:1$rsp.strongesim.com$89852012345678901234",
    "profiles": [
      {
        "iccid": "89852012345678901234",
        "qr_code_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
        "activation_code": "LPA:1$rsp.strongesim.com$89852012345678901234"
      }
    ]
  }
}
```

### C. Consulta de Telemetría y Consumo (`GET /profiles/{esimTranNo}`)
**Response Parsing (`src/app/api/usage/[esimTranNo]/route.js`):**
```json
{
  "data": {
    "profiles": [
      {
        "totalVolume": 10737418240,
        "orderUsage": 2147483648,
        "esimStatus": "GOT_RESOURCE",
        "smdpStatus": "INSTALLED",
        "activateTime": "2026-09-01T10:00:00Z",
        "installationTime": "2026-09-01T09:30:00Z",
        "expiredTime": "2026-10-01T10:00:00Z",
        "packageList": [
          { "packageName": "Europe 10GB 30Days", "duration": 30 }
        ]
      }
    ]
  }
}
```
*Mapeo a nuestra API:*
- `totalBytes`: `profile.totalVolume` (convertido a `totalMb` y `totalGb`).
- `usedBytes`: `profile.orderUsage` (convertido a `usedMb` y `usedGb`).
- `percentageUsed`: `(usedBytes / totalBytes) * 100`.
- `isExpired`: evaluado si el estado es `USED_EXPIRED`, `EXPIRED`, `COMPLETED`, `CANCELLED`, `expiredTime < Date.now()` o `usedBytes >= totalBytes`.

### D. Consulta de Consumo v2 (`GET /api/v2/order-usage/:orderId` y `POST /api/v2/order-usage/bulk`)
Permite verificar telemetría directamente por ID de orden sin requerir el ICCID previo.
- **Unitario (`GET /api/v2/order-usage/:orderId`)**:
  - Requiere cabeceras `Authorization: Bearer <token>` y `X-Session-ID: <session_id>`.
  - Devuelve consumo acumulado, límites y estado del perfil asociado a la orden.
- **Masivo (`POST /api/v2/order-usage/bulk`)**:
  ```json
  {
    "order_ids": [12345, 12346]
  }
  ```
  Devuelve el listado consolidado de consumo para sincronizaciones periódicas de flota o clientes multi-dispositivo.

### E. Consulta de Saldo de Créditos (`GET /api/v1/credits/balance`)
Permite comprobar los fondos y crédito disponible de la cuenta revendedora para garantizar que hay saldo suficiente antes de aprovisionar nuevas eSIMs.
- **Cabeceras:** `Authorization: Bearer <token>`, `X-Session-ID: <session_id>`.
- **Estructura típica de respuesta (`200 OK`):**
  ```json
  {
    "success": true,
    "data": {
      "balance": 1540.50,
      "currency": "EUR"
    }
  }
  ```

---

## 4. Algoritmo de Resolución de Plan (`resolveStrongeSimPlanId`)

Para evitar incompatibilidades entre los SKUs de ME-SIM/WooCommerce y los IDs numéricos internos de StrongeSIM:
1. Si el SKU entrante ya es numérico, se toma directamente.
2. Si es una cadena (ej. `es-10gb-30d`), extrae:
   - **ISO destino** (o mapa de regiones como `EUROPE`, `ASIA`, `NORTH-AMERICA`, `AUKUS`, etc.).
   - **Volumen de datos objetivo en MB** (diferenciando MB, GB e ilimitados).
   - **Días de validez**.
3. Consulta `/plans?limit=10000` y aplica un sistema de puntuación ponderada:
   - Coincidencia exacta de SKU/ID: **1.000.000 pts**.
   - Coincidencia de volumen (MB) exacta (tolerancia <5%): **50.000 pts** (+ 30.000 pts si coinciden los días).
   - Penalización severa por discrepancia de volumen (evita asignar 100MB si se solicitó 1GB).

---

## 5. Errores Recurrentes Resueltos

1. **Error: Plan ID alfanumérico rechazado por StrongeSIM (`400 Bad Request`)**:
   - *Causa:* Enviar el SKU de WooCommerce (`es-5gb-30d`) en el campo `plan_id`.
   - *Solución:* Usar siempre `resolveStrongeSimPlanId({ sku, iso, dataAmount, days })` para obtener el ID entero real.
2. **Asignación errónea de paquetes (ej. 100MB asignados a compras de 1GB)**:
   - *Causa:* Búsqueda por texto simple (`includes("1")`).
   - *Solución:* Algoritmo de scoring estricto en MB con penalización exponencial en discrepancias relativas superiores al 40%.
3. **Respuesta de `/orders` sin ICCID en primer nivel**:
   - *Causa:* En ciertas respuestas StrongeSIM devuelve un `targetId`/`id` y los perfiles anidados dentro de `profiles[]`.
   - *Solución:* El código verifica `nested.iccid || nested.esimTranNo`. Si no existe de inmediato pero hay un ID, realiza un GET de contingencia a `/orders/{targetId}` para extraer el perfil e ICCID del array `profiles`.
4. **Expiración silenciosa de credenciales**:
   - *Causa:* Peticiones fallando tras horas de ejecución por token caducado.
   - *Solución:* Verificación de timestamp `tokenExpiresAt` en `getStrongeSIMAuth()` con re-login transparente ante expiración (TTL 3600s).

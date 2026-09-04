# Guía Técnica de Integración: WooCommerce REST API y Webhooks

Esta documentación detalla el uso de WooCommerce (`https://api.me-sim.com` / `https://me-sim.com`) dentro del ecosistema ME-SIM para creación de pedidos, sincronización de metadatos de eSIMs y recepción de webhooks firmados (`src/app/api/orders/route.js` y `src/app/api/v1/woocommerce-webhook/route.js`).

---

## 1. Principio Fundamental: Arquitectura Headless sin Catálogo

> **Regla de Oro:** WooCommerce no almacena productos en base de datos (`post_type: product` no interviene).
- **Fuente de Catálogo:** StrongeSIM es el único proveedor de inventario, precios mayoristas, paquetes (MB/GB) y vigencias.
- **Rol de WooCommerce:** Actúa exclusivamente como motor transaccional, libro contable de pedidos, gestor de pasarelas, autenticación de clientes y validación de cupones.
- **Creación dinámica de ítems:** Todas las llamadas a `POST /wp-json/wc/v3/orders` inyectan `line_items` dinámicos bajo demanda **sin `product_id`**, pasando el SKU y metadatos calculados al vuelo desde Next.js. Queda estrictamente prohibido crear dependencias hacia endpoints de productos como `/wp-json/wc/v3/products`.

---

## 2. Autenticación y Configuración de Entorno

### Variables de Entorno Requeridas
```env
WOOCOMMERCE_API_URL=[https://api.me-sim.com](https://api.me-sim.com)          # URL base de WordPress / WooCommerce
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxx     # Alternativa: WC_CONSUMER_KEY
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxx     # Alternativa: WC_CONSUMER_SECRET
ME_SIM_BRIDGE_SECRET=clave_secreta_compartida_hmac  # Secreto para validar firma en webhooks
```

### Cabecera de Autenticación HTTP
Para todas las llamadas a la REST API de WooCommerce (`/wp-json/wc/v3/*`), se utiliza cabecera `Basic Auth`:
```javascript
const authHeader = 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
```

---

## 3. Gestión de Clientes en WooCommerce (`/wp-json/wc/v3/customers`)

Antes de emitir el pedido en `src/app/api/orders/route.js`:
1. **Búsqueda por email:**
   `GET /wp-json/wc/v3/customers?email={encodeURIComponent(customerEmail)}`
2. **Creación si no existe:**
   Si no se encuentra un ID existente, se emite:
   `POST /wp-json/wc/v3/customers`
   ```json
   {
     "email": "cliente@ejemplo.com",
     "first_name": "Juan",
     "last_name": "Perez",
     "username": "cliente@ejemplo.com",
     "password": "MS-XXXXXX"
   }
   ```
   *Nota:* Tras la creación, se dispara el correo con sus credenciales de bienvenida mediante `/api/email/send`.

---

## 4. Gestión de Cupones de Descuento (`/wp-json/wc/v3/coupons`)

Para validar códigos promocionales ingresados por el usuario antes de procesar el cobro:
1. **Consulta de Cupón:**
   `GET /wp-json/wc/v3/coupons?code={encodeURIComponent(code)}`
2. **Validaciones en servidor:**
   - Fecha de vencimiento (`date_expires`).
   - Límite de usos (`usage_limit` vs `usage_count`).
   - Tipo de descuento: `percent` (porcentaje) o `fixed_cart` (importe fijo en divisa base).
3. **Inyección en Pedido:**
   Al crear la orden, el cupón validado se adjunta en el array `coupon_lines`:
   ```json
   {
     "coupon_lines": [
       { "code": "PROMO10" }
     ]
   }
   ```

---

## 5. Mapeo de Campos y Metadatos en `/orders`

### A. Creación de Pedido Dinámico (`POST /wp-json/wc/v3/orders`)
Cuando la compra se procesa desde el frontend tras confirmar el pago en Stripe, se registra la orden en WooCommerce con el estado `completed`, `set_paid: true` y todos los metadatos de la eSIM ya aprovisionada.

**Payload Estructurado:**
```json
{
  "payment_method": "stripe",
  "payment_method_title": "Stripe",
  "set_paid": true,
  "status": "completed",
  "transaction_id": "pi_xxxxxxxxxxxxxxxx",
  "customer_id": 123,
  "currency": "EUR",
  "billing": {
    "first_name": "Juan",
    "last_name": "Perez",
    "email": "cliente@ejemplo.com"
  },
  "line_items": [
    {
      "name": "eSIM España 10 GB (30 Días)",
      "quantity": 1,
      "sku": "es-10gb-30d",
      "price": "14.90",
      "subtotal": "14.90",
      "total": "14.90",
      "meta_data": [
        { "key": "plan_id", "value": "es-10gb-30d" },
        { "key": "_plan_id", "value": "es-10gb-30d" },
        { "key": "sku", "value": "es-10gb-30d" },
        { "key": "_sku", "value": "es-10gb-30d" },
        { "key": "plan_code", "value": "es-10gb-30d" },
        { "key": "iso", "value": "es" },
        { "key": "data_amount", "value": "10 GB" },
        { "key": "days", "value": "30" }
      ]
    }
  ],
  "meta_data": [
    { "key": "_stripe_intent_id", "value": "pi_xxxxxxxxxxxxxxxx" },
    { "key": "_esim_iso", "value": "es" },
    { "key": "_esim_country", "value": "España" },
    { "key": "_esim_data_amount", "value": "10 GB" },
    { "key": "_esim_days", "value": "30" },
    { "key": "_esim_iccid", "value": "89852012345678901234" },
    { "key": "_esim_transaction_no", "value": "89852012345678901234" },
    { "key": "_esim_qr_code", "value": "[https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=](https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=)..." },
    { "key": "_esim_activation_code", "value": "LPA:1$rsp.strongesim.com$89852012345678901234" },
    { "key": "_esim_provisioned", "value": "yes" }
  ]
}
```

### B. Diccionario Estricto de Metadatos de eSIM
Los agentes y funciones deben respetar exactamente estos nombres de metadatos (claves con y sin guion bajo según contexto):

| Clave de Metadato | Tipo | Ejemplo de Valor | Propósito |
| :--- | :--- | :--- | :--- |
| `_esim_iccid` | `string` | `"89852012345678901234"` | Identificador único del perfil SIM. |
| `_esim_transaction_no` | `string` | `"89852012345678901234"` | Número de transacción o referencia técnica en proveedor. |
| `_esim_qr_code` | `string (URL)` | `"https://api.qrserver.com/..."` | URL de la imagen del código QR listo para escanear. |
| `_esim_activation_code`| `string (LPA)` | `"LPA:1$rsp.strongesim.com$..."`| Código de activación manual SM-DP+ para iOS/Android. |
| `_esim_provisioned` | `string ("yes"/"no")` | `"yes"` | Indicador de control para evitar re-aprovisionamiento duplicado. |
| `_stripe_intent_id` | `string` | `"pi_3L...oK"` | ID de transacción de pago en Stripe para trazabilidad e idempotencia. |
| `_esim_iso` | `string` | `"es"`, `"fr"`, `"europe"` | Código de país o región ISO. |
| `_esim_data_amount` | `string` | `"10 GB Total"`, `"1 GB / Día"` | Paquete de datos contratado. |
| `_esim_days` | `string` | `"30"` | Días de vigencia del paquete. |

---

## 6. Webhook de WooCommerce (`POST /api/v1/woocommerce-webhook`)

### Estructura de la Firma HMAC y Verificación
Para garantizar la integridad y procedencia de los pedidos originados en WooCommerce:
1. **Lectura del cuerpo en texto sin procesar:**
   Se debe utilizar `const rawBody = await req.text();`.
   > **Alerta:** Nunca llamar a `req.json()` antes de validar la firma, ya que el orden de serialización de claves alterará el hash resultante.
2. **Cabecera de firma:** Se recibe en `X-ME-SIM-Signature` (en minúsculas `x-me-sim-signature`).
3. **Cálculo de firma:**
   ```javascript
   const calculatedHmac = crypto
     .createHmac('sha256', process.env.ME_SIM_BRIDGE_SECRET)
     .update(rawBody)
     .digest('hex');
   ```
4. **Comparación segura contra ataques de temporización (`Timing Attack`):**
   ```javascript
   const signatureBuffer = Buffer.from(signature, 'hex');
   const calculatedBuffer = Buffer.from(calculatedHmac, 'hex');

   if (
     signatureBuffer.length !== calculatedBuffer.length ||
     !crypto.timingSafeEqual(signatureBuffer, calculatedBuffer)
   ) {
     return new NextResponse(JSON.stringify({ error: 'Unauthorized signature' }), { status: 401 });
   }
   ```

### Idempotencia y Prevención de Doble Compra
Cuando WooCommerce emite el webhook de pedido completado:
1. Se verifica si el payload ya cuenta con `_esim_provisioned === 'yes'` o `_esim_iccid`.
2. Se consulta el cerrojo en memoria `checkOrderProvisioned(orderId)`.
3. Si no está en memoria, se valida contra WooCommerce:
   `GET /wp-json/wc/v3/orders/{orderId}` revisando si ya posee `_esim_iccid` o `_esim_provisioned: "yes"`.
4. Si ya fue aprovisionada por la ruta directa de checkout (`POST /api/orders`), el webhook responde inmediatamente con `200 OK` omitiendo la compra en StrongeSIM.
5. Si no estaba aprovisionada, se adquiere en StrongeSIM y se actualiza el pedido en WooCommerce vía:
   `PUT /wp-json/wc/v3/orders/{orderId}` adjuntando el nuevo array `meta_data`.
import fs from 'fs';
import path from 'path';
import { fetchEsimProfileTelemetry } from './strongesim.js';

const ORDERS_FILE = path.join(process.cwd(), 'src', 'data', 'orders.json');

/**
 * Carga la lista persistente de pedidos desde src/data/orders.json
 */
export function getLocalOrders() {
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading orders.json:', err);
  }
  return [];
}

/**
 * Guarda o actualiza un pedido en el almacenamiento persistente de pedidos
 */
export function saveOrUpdateOrder(orderData) {
  if (!orderData || !orderData.orderId) return null;
  try {
    const orders = getLocalOrders();
    const existingIndex = orders.findIndex(
      (o) => String(o.orderId).toLowerCase() === String(orderData.orderId).toLowerCase()
    );

    const updated = {
      ...(existingIndex >= 0 ? orders[existingIndex] : {}),
      ...orderData,
      updatedAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      orders[existingIndex] = updated;
    } else {
      orders.unshift(updated);
    }

    const dir = path.dirname(ORDERS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error saving order to orders.json:', err);
    return null;
  }
}

/**
 * Intenta obtener un pedido directamente desde la API oficial de WooCommerce
 */
export async function fetchWooCommerceOrder(orderId) {
  try {
    const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
    let wcUrl = rawWcUrl.split('/wp-json')[0].replace(/\/$/, '');

    const ck = process.env.WOOCOMMERCE_CONSUMER_KEY || process.env.WC_CONSUMER_KEY;
    const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET || process.env.WC_CONSUMER_SECRET;

    if (!ck || !cs) return null;

    const authHeader = 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64');
    const res = await fetch(`${wcUrl}/wp-json/wc/v3/orders/${encodeURIComponent(orderId)}`, {
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });

    if (res.ok) {
      const o = await res.json();
      if (o && o.id) {
        const meta = o.meta_data || [];
        const getMeta = (k) => meta.find((m) => m.key === k)?.value || '';
        const line = o.line_items?.[0] || {};
        const price = parseFloat(o.total || line.total || '0') || 0;
        const esimTranNo = getMeta('_esim_transaction_no') || getMeta('_esim_iccid') || ('89852' + String(o.id).padEnd(13, '0'));

        const orderObj = {
          orderId: String(o.id),
          customerName: `${o.billing?.first_name || ''} ${o.billing?.last_name || ''}`.trim() || o.billing?.company || 'Cliente ME-SIM',
          customerEmail: o.billing?.email || '',
          title: line.name || getMeta('_esim_country') || 'eSIM Plan',
          plan: line.name || 'eSIM Data Plan',
          amount: price,
          priceEur: price,
          currency: (o.currency || 'EUR').toUpperCase(),
          status: o.status === 'completed' ? 'Completed' : o.status,
          date: o.date_created ? o.date_created.split('T')[0] : new Date().toISOString().split('T')[0],
          createdAt: o.date_created || new Date().toISOString(),
          paymentMethod: o.payment_method_title || 'Credit Card / Stripe (Paid)',
          esimTranNo: esimTranNo,
          qrCodeUrl: getMeta('_esim_qr_code') || '',
          lpaString: getMeta('_esim_lpa') || '',
          country: getMeta('_esim_country') || o.billing?.country || 'España',
          billing: {
            firstName: o.billing?.first_name || '',
            lastName: o.billing?.last_name || '',
            company: o.billing?.company || '',
            address: `${o.billing?.address_1 || ''} ${o.billing?.address_2 || ''}`.trim(),
            city: o.billing?.city || '',
            postcode: o.billing?.postcode || '',
            country: o.billing?.country || '',
            vatId: getMeta('_billing_vat') || getMeta('_billing_dni') || getMeta('_billing_nif') || getMeta('_vat_number') || '',
          },
        };

        // Guardar en la base de datos local para acceso instantáneo futuro
        saveOrUpdateOrder(orderObj);
        return orderObj;
      }
    }
  } catch (err) {
    console.warn(`Could not fetch order #${orderId} from WooCommerce:`, err.message);
  }
  return null;
}

/**
 * Resuelve cualquier pedido (actual o futuro) por su identificador único
 */
export async function getOrderById(orderId) {
  if (!orderId) return null;
  const cleanId = String(orderId).trim().replace(/^#/, '');

  // 1. Buscar en almacenamiento persistente de pedidos
  const localOrders = getLocalOrders();
  let found = localOrders.find((o) => String(o.orderId).toLowerCase() === cleanId.toLowerCase());

  // 2. Si no se encuentra localmente, buscar en vivo en WooCommerce
  if (!found) {
    found = await fetchWooCommerceOrder(cleanId);
  }

  // 3. Si aún no se encuentra, buscar por coincidencias parciales o campos secundarios
  if (!found) {
    found = localOrders.find(
      (o) => (o.esimTranNo && o.esimTranNo.includes(cleanId)) ||
             (o.stripePaymentIntent && o.stripePaymentIntent.includes(cleanId))
    );
  }

  if (found) {
    // Si tiene ICCID, enriquecer con telemetría viva de StrongeSIM si no la tenía
    if (found.esimTranNo && !found.telemetry) {
      try {
        const live = await fetchEsimProfileTelemetry(found.esimTranNo, found.orderId);
        if (live) {
          found.telemetry = live;
        }
      } catch {
        // Silencioso
      }
    }
    return found;
  }

  return null;
}

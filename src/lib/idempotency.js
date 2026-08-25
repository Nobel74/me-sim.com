/**
 * In-memory idempotency lock and registry to prevent duplicate eSIM provisioning across
 * direct checkout (POST /api/orders) and WooCommerce Webhooks (POST /api/v1/woocommerce-webhook).
 */

const globalRef = global;
if (!globalRef._mesim_provisioned_orders) {
  globalRef._mesim_provisioned_orders = new Map();
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Checks if an order or transaction has already been provisioned or is currently in-flight.
 * @param {string|number} key - Order ID, Payment Intent ID, or compound key (e.g. email+plan)
 * @returns {object|null} existing entry if provisioned, null otherwise
 */
export function checkOrderProvisioned(key) {
  if (!key) return null;
  const strKey = String(key).trim();
  const entry = globalRef._mesim_provisioned_orders.get(strKey);
  if (!entry) return null;

  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    globalRef._mesim_provisioned_orders.delete(strKey);
    return null;
  }

  return entry;
}

/**
 * Marks an order as provisioned or locks it to prevent race conditions.
 * @param {string|number} key - Key to lock
 * @param {object} data - Metadata such as iccid, orderId, email
 */
export function markOrderProvisioned(key, data = {}) {
  if (!key) return;
  const strKey = String(key).trim();
  globalRef._mesim_provisioned_orders.set(strKey, {
    timestamp: Date.now(),
    ...data,
  });
}

import { NextResponse } from 'next/server';

// Mock/WooCommerce Store API Coupon Validation
const VALID_COUPONS = {
  MESIM10: { code: 'MESIM10', discountPercent: 10, type: 'percent', label: '10% de Descuento Especial' },
  BIENVENIDA: { code: 'BIENVENIDA', discountPercent: 15, type: 'percent', label: '15% Descuento de Bienvenida' },
  SUMMER20: { code: 'SUMMER20', discountPercent: 20, type: 'percent', label: '20% Descuento Promo Verano' },
  VIP25: { code: 'VIP25', discountPercent: 25, type: 'percent', label: '25% Descuento Cliente VIP' },
};

export async function POST(request) {
  try {
    const { couponCode } = await request.json();

    if (!couponCode || typeof couponCode !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Por favor, introduce un código de cupón válido.' },
        { status: 400 }
      );
    }

    const cleanCode = couponCode.trim().toUpperCase();

    // 1. Check local valid coupons list or connect to WooCommerce API
    if (VALID_COUPONS[cleanCode]) {
      const coupon = VALID_COUPONS[cleanCode];
      return NextResponse.json({
        success: true,
        coupon,
        message: `¡Cupón "${cleanCode}" aplicado con éxito! (${coupon.label})`,
      });
    }

    // Attempting WooCommerce REST API coupon lookup
    try {
      const wcUrl = process.env.WOOCOMMERCE_API_URL || 'https://me-sim.com';
      const ck = process.env.WOOCOMMERCE_CONSUMER_KEY;
      const cs = process.env.WOOCOMMERCE_CONSUMER_SECRET;

      if (ck && cs) {
        const res = await fetch(`${wcUrl}/wp-json/wc/v3/coupons?code=${cleanCode}`, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${ck}:${cs}`).toString('base64'),
          },
        });
        const wcCoupons = await res.json();
        if (Array.isArray(wcCoupons) && wcCoupons.length > 0) {
          const wcCup = wcCoupons[0];
          const pct = parseFloat(wcCup.amount) || 10;
          return NextResponse.json({
            success: true,
            coupon: {
              code: wcCup.code.toUpperCase(),
              discountPercent: pct,
              type: wcCup.discount_type === 'percent' ? 'percent' : 'fixed',
              label: `${pct}% Descuento WooCommerce`,
            },
            message: `¡Cupón "${wcCup.code.toUpperCase()}" aplicado correctamente desde WooCommerce!`,
          });
        }
      }
    } catch {
      // Fallback if WC API call fails
    }

    return NextResponse.json(
      { success: false, message: `El código de cupón "${cleanCode}" no es válido o ha caducado.` },
      { status: 404 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Error al verificar el cupón de descuento.', error: error.message },
      { status: 500 }
    );
  }
}

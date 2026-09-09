import { addDiagnosticLog } from './logger.js';
import { calculateInvoiceFinancials } from './invoices.js';

export async function sendEmail({ to, subject, htmlText, type = 'magic_code', data = {} }) {
  console.log(`[EMAIL SERVICE] Preparing ${type} email for: ${to}`);
  addDiagnosticLog('EMAIL_SERVICE', 'PREPARING_SEND', { to, subject, type });

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // 1. Envío a través del servidor de correo de WordPress (api.me-sim.com)
  const rawWcUrl = process.env.WOOCOMMERCE_API_URL || process.env.NEXT_PUBLIC_WC_API_URL || 'https://api.me-sim.com';
  let wpUrl = rawWcUrl;
  if (wpUrl.includes('/wp-json')) {
    wpUrl = wpUrl.split('/wp-json')[0];
  }
  if (wpUrl.endsWith('/')) {
    wpUrl = wpUrl.slice(0, -1);
  }
  try {
    const res = await fetch(`${wpUrl}/wp-json/mesim/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ME-SIM-KEY': process.env.ME_SIM_BRIDGE_SECRET || process.env.EMAIL_API_KEY || 'Este_2026_Clem_y_yo_nos_vamos_a_forrar!',
      },
      body: JSON.stringify({
        to,
        subject,
        html: htmlText,
        type,
        data,
      }),
    });

    if (res.ok) {
      const responseData = await res.json();
      if (responseData && responseData.success) {
        addDiagnosticLog('EMAIL_SERVICE', 'WP_MAIL_SUCCESS', { to, type, responseData });
        console.log(`[EMAIL SERVICE] Sent via WordPress WP-Mail API (api.me-sim.com) to ${to}`);
        return { success: true, message: 'Email enviado a través de WordPress API', responseData, provider: 'WordPress WP-Mail' };
      }
    }
    const errTxt = await res.text();
    addDiagnosticLog('EMAIL_SERVICE', 'WP_MAIL_ERROR', { status: res.status, errTxt });
  } catch (err) {
    addDiagnosticLog('EMAIL_SERVICE', 'WP_MAIL_EXCEPTION', { error: err.message });
    console.warn('[EMAIL SERVICE] WordPress WP-Mail attempt error:', err.message);
  }

  // 2. Fallback a SMTP Directo con credenciales de mail.me-sim.com
  if (smtpUser && smtpHost && smtpPassword) {
    try {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      const info = await transporter.sendMail({
        from: `"ME-SIM Connectivity" <${smtpUser}>`,
        to: to,
        subject: subject,
        html: htmlText,
      });

      addDiagnosticLog('EMAIL_SERVICE', 'SMTP_SUCCESS', { to, type, messageId: info.messageId });
      console.log(`[EMAIL SERVICE] Sent via SMTP (${smtpHost}:${smtpPort}) - Message ID:`, info.messageId);
      return { success: true, messageId: info.messageId, provider: 'SMTP' };
    } catch (err) {
      addDiagnosticLog('EMAIL_SERVICE', 'SMTP_ERROR', { error: err.message, to, type });
      console.warn('[EMAIL SERVICE] Direct SMTP attempt error:', err.message);
    }
  }

  // Error real sin datos falsos o simulaciones ficticias
  addDiagnosticLog('EMAIL_SERVICE', 'SEND_FAILED', { to, subject, type });
  return {
    success: false,
    message: `No se pudo enviar el correo a ${to}. Compruebe la configuración del servidor de correo.`,
  };
}

// ----------------------------------------------------
// BRANDED HTML EMAIL TEMPLATES FOR ME-SIM
// ----------------------------------------------------

export function generateMagicCodeHtml(code, lang = 'es') {
  const isEn = lang === 'en';
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 520px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <img src="https://me-sim.com/logos/Logo-me-sim-mail.png" alt="ME-SIM" style="height: 45px; display: inline-block; margin-bottom: 24px;" />
        <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-bottom: 16px;">${isEn ? 'Your Login Code' : 'Tu Código de Acceso a tu Cuenta'}</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 28px;">
          ${isEn ? 'Use the following 6-digit verification code to sign into your ME-SIM account:' : 'Utiliza el siguiente código de verificación de 6 dígitos para acceder a tu panel de cliente en ME-SIM:'}
        </p>
        <div style="background: #ffec00; color: #000000; font-size: 38px; font-weight: 900; letter-spacing: 8px; padding: 18px 32px; border-radius: 16px; margin: 0 auto 28px; display: inline-block; border: 1px solid rgba(0,0,0,0.1);">
          ${code}
        </div>
        <p style="font-size: 13px; color: #71717a; line-height: 1.5; margin-bottom: 0;">
          ${isEn ? 'This code expires in 15 minutes. If you did not request this, please ignore this message.' : 'Este código caduca en 15 minutos. Si no has solicitado este código, puedes ignorar este correo.'}
        </p>
      </div>
    </body>
    </html>
  `;
}

export function generateOrderConfirmationHtml(orderData, lang = 'es') {
  const isEn = lang === 'en';
  
  // Cálculo fiscal unificado con el motor de facturas (Base Imponible, IVA 21% y Descuentos)
  const fin = calculateInvoiceFinancials(orderData);
  
  const rawCurrency = orderData.currency || (orderData.totalPrice ? String(orderData.totalPrice).replace(/[0-9.,\s]/g, '') : 'EUR') || 'EUR';
  const currency = rawCurrency.toUpperCase().trim() || 'EUR';

  const formatEmailAmount = (numStr, isNegative = false) => {
    const val = parseFloat(numStr || 0).toFixed(2);
    return `${isNegative ? '- ' : ''}${val} ${currency}`;
  };

  const netBaseFormatted = formatEmailAmount(fin.netBase);
  const netVatFormatted = formatEmailAmount(fin.netVat);
  const totalPaidFormatted = formatEmailAmount(fin.totalPaid);
  const originalTotalFormatted = formatEmailAmount(fin.originalTotal);
  const discountTotalFormatted = formatEmailAmount(fin.discountTotal, true);

  // Format order date & time
  const orderDateString = new Date().toLocaleString(isEn ? 'en-US' : 'es-ES', { 
    timeZone: 'Europe/Madrid',
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        
        <!-- Logo -->
        <img src="https://me-sim.com/logos/Logo-me-sim-mail.png" alt="ME-SIM" style="height: 45px; display: inline-block; margin-bottom: 24px;" />
        
        <!-- Greeting -->
        <div style="text-align: left; margin-bottom: 24px;">
          <h2 style="color: #000000; font-size: 20px; font-weight: 700; margin: 0 0 8px;">
            ${isEn ? `Hello ${orderData.customerName || 'Traveler'},` : `Hola ${orderData.customerName || 'Viajero'},`}
          </h2>
          <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin: 0;">
            ${isEn 
              ? 'Thank you for your purchase! Your eSIM order has been successfully completed. Below you will find the details of your purchase and your line details.' 
              : '¡Gracias por tu compra! Tu pedido de eSIM ha sido completado con éxito. A continuación encontrarás los detalles de tu adquisición y de tu línea.'}
          </p>
        </div>

        <!-- Order Information Table -->
        <div style="text-align: left; margin-bottom: 28px;">
          <h3 style="font-size: 16px; font-weight: 700; color: #000000; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${isEn ? 'Order Summary' : 'Resumen del Pedido'}
          </h3>
          
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="border-bottom: 2px solid #e4e4e7; text-align: left; color: #71717a;">
                <th style="padding: 10px 0; font-weight: 600;">${isEn ? 'eSIM Plan' : 'Plan eSIM'}</th>
                <th style="padding: 10px 0; font-weight: 600; text-align: right;">${isEn ? 'Price' : 'Precio'}</th>
              </tr>
            </thead>
            <tbody>
              ${fin.hasDiscount ? `
              <!-- Fila del producto con precio original web -->
              <tr style="border-bottom: 1px solid #f4f4f5; color: #18181b;">
                <td style="padding: 14px 0;">
                  <strong style="display: block; font-size: 15px;">${orderData.title}</strong>
                  ${orderData.esimTranNo ? `<span style="font-size: 12px; color: #71717a;">ICCID: ${orderData.esimTranNo}</span>` : ''}
                </td>
                <td style="padding: 14px 0; text-align: right; font-weight: 600; font-size: 15px; vertical-align: top;">
                  ${originalTotalFormatted}
                </td>
              </tr>
              <!-- Fila de cupón de descuento promocional -->
              <tr style="border-bottom: 1px solid #e4e4e7; background-color: #f8fafc;">
                <td style="padding: 10px 8px; color: #15803d; border-radius: 6px 0 0 6px;">
                  <strong style="display: block; font-size: 13px;">${isEn ? 'Coupon Discount' : 'Descuento Cupón'}: ${fin.coupon}${fin.couponPercent ? ` (-${fin.couponPercent}%)` : ''}</strong>
                  <span style="font-size: 11px; color: #71717a;">${isEn ? 'Promotional discount applied online' : 'Descuento promocional aplicado en web'}</span>
                </td>
                <td style="padding: 10px 8px; text-align: right; font-weight: 700; font-size: 14px; color: #15803d; border-radius: 0 6px 6px 0; vertical-align: top;">
                  ${discountTotalFormatted}
                </td>
              </tr>
              <!-- Desglose fiscal completo con cupón -->
              <tr>
                <td style="padding: 10px 0 4px; color: #71717a;">${isEn ? 'Original Web Price:' : 'Precio Web Original:'}</td>
                <td style="padding: 10px 0 4px; text-align: right; color: #71717a;">${originalTotalFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #15803d;">${isEn ? `Discount (${fin.coupon}${fin.couponPercent ? ` -${fin.couponPercent}%` : ''}):` : `Descuento (${fin.coupon}${fin.couponPercent ? ` -${fin.couponPercent}%` : ''}):`}</td>
                <td style="padding: 4px 0; text-align: right; color: #15803d; font-weight: 600;">${discountTotalFormatted}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #71717a;">${isEn ? 'Tax Base (excl. VAT):' : 'Base Imponible (sin IVA):'}</td>
                <td style="padding: 4px 0; text-align: right; color: #71717a;">${netBaseFormatted}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 4px 0 10px; color: #71717a;">${isEn ? 'VAT / Taxes (21%):' : 'IVA / Impuestos (21%):'}</td>
                <td style="padding: 4px 0 10px; text-align: right; color: #71717a;">${netVatFormatted}</td>
              </tr>
              <tr style="font-size: 16px; font-weight: 700; color: #000000;">
                <td style="padding: 14px 0;">Total:</td>
                <td style="padding: 14px 0; text-align: right; color: #000000;">${totalPaidFormatted}</td>
              </tr>
              ` : `
              <!-- Fila única pedido estándar sin descuento -->
              <tr style="border-bottom: 1px solid #e4e4e7; color: #18181b;">
                <td style="padding: 14px 0;">
                  <strong style="display: block; font-size: 15px;">${orderData.title}</strong>
                  ${orderData.esimTranNo ? `<span style="font-size: 12px; color: #71717a;">ICCID: ${orderData.esimTranNo}</span>` : ''}
                </td>
                <td style="padding: 14px 0; text-align: right; font-weight: 600; font-size: 15px; vertical-align: top;">
                  ${totalPaidFormatted}
                </td>
              </tr>
              <!-- Desglose fiscal estándar -->
              <tr>
                <td style="padding: 10px 0 4px; color: #71717a;">${isEn ? 'Tax Base (excl. VAT):' : 'Base Imponible (sin IVA):'}</td>
                <td style="padding: 10px 0 4px; text-align: right; color: #71717a;">${netBaseFormatted}</td>
              </tr>
              <tr style="border-bottom: 1px solid #e4e4e7;">
                <td style="padding: 4px 0 10px; color: #71717a;">${isEn ? 'VAT / Taxes (21%):' : 'IVA / Impuestos (21%):'}</td>
                <td style="padding: 4px 0 10px; text-align: right; color: #71717a;">${netVatFormatted}</td>
              </tr>
              <tr style="font-size: 16px; font-weight: 700; color: #000000;">
                <td style="padding: 14px 0;">Total:</td>
                <td style="padding: 14px 0; text-align: right; color: #000000;">${totalPaidFormatted}</td>
              </tr>
              `}
            </tbody>
          </table>
        </div>

        ${orderData.qrCodeUrl ? `
        <!-- QR Code Activation Section -->
        <div style="background: #fafafa; border: 2px dashed #ffec00; border-radius: 16px; padding: 24px; margin-bottom: 24px; text-align: center;">
          <h3 style="font-size: 16px; font-weight: 800; color: #000000; margin: 0 0 12px; text-transform: uppercase;">
            ${isEn ? 'Your eSIM QR Code' : 'Tu Código QR de Activación eSIM'}
          </h3>
          <img src="${orderData.qrCodeUrl}" alt="eSIM QR Code" style="width: 220px; height: 220px; display: inline-block; margin-bottom: 12px; border-radius: 12px; border: 1px solid #e4e4e7; background: #ffffff; padding: 8px;" />
          <p style="font-size: 13px; color: #3f3f46; font-weight: 500; margin: 0 0 6px;">
            ${isEn ? 'Scan this QR code from your phone settings (Cellular / Mobile Data) to install your eSIM.' : 'Escanea este código QR desde los ajustes de tu móvil (Datos móviles / Red celular) para instalar tu eSIM.'}
          </p>
          <p style="font-size: 11px; color: #71717a; font-family: monospace; margin: 0 0 10px;">ICCID: ${orderData.esimTranNo}</p>
          
          ${orderData.lpaCode ? `
          <div style="background: #ffffff; border: 1px solid #e4e4e7; border-radius: 10px; padding: 10px; word-break: break-all; text-align: left;">
            <p style="font-size: 10px; font-weight: 700; color: #71717a; text-transform: uppercase; margin: 0 0 4px;">
              ${isEn ? 'Manual Activation Code (LPA):' : 'Código de Instalación Manual (LPA):'}
            </p>
            <code style="font-family: monospace; font-size: 11px; color: #000000; font-weight: 600;">${orderData.lpaCode}</code>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <!-- APN & Network Support Section with link to /soporte -->
        <div style="background: #ffffff; border: 1px solid #e4e4e7; border-left: 4px solid #ffec00; border-radius: 14px; padding: 22px; margin-bottom: 28px; text-align: left;">
          <h4 style="font-size: 15px; font-weight: 800; color: #18181b; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.3px;">
            ${isEn ? '💡 Connection Tip: APN & Manual Carrier Selection' : '💡 Consejo de Conexión: APN y Selección Manual de Carrier'}
          </h4>
          <p style="font-size: 13px; color: #3f3f46; line-height: 1.6; margin: 0 0 10px;">
            ${isEn
              ? 'By default, the <strong>APN</strong> and mobile network configure automatically. However, in some destinations the automatic mode might not register with the local network right away. If you do not have data upon arrival:'
              : 'Por defecto, el <strong>APN</strong> y la red de tu eSIM se configuran de forma <strong>automática</strong>. Sin embargo, a veces el enlace automático no conecta de inmediato con la antena local. Si al aterrizar no tienes datos:'}
          </p>
          <ol style="font-size: 12px; color: #52525b; line-height: 1.6; margin: 0 0 16px; padding-left: 18px;">
            <li style="margin-bottom: 4px;">
              ${isEn
                ? 'Make sure <strong>Data Roaming</strong> is turned ON in your ME-SIM profile.'
                : 'Comprueba que la <strong>Itinerancia de datos (Data Roaming)</strong> esté ACTIVADA en tu línea ME-SIM.'}
            </li>
            <li style="margin-bottom: 4px;">
              ${isEn
                ? 'Go to <em>Settings &gt; Cellular / Mobile Data &gt; Network Selection</em> and <strong>turn OFF "Automatic"</strong>.'
                : 'Ve a <em>Ajustes &gt; Datos móviles &gt; Selección de red</em> y <strong>desactiva "Automático"</strong>.'}
            </li>
            <li style="margin-bottom: 4px;">
              ${isEn
                ? 'Your device will scan available local operators (carriers). <strong>Select a carrier manually</strong> and wait 30–60 seconds. If it does not connect, <strong>test the next available carrier</strong> until finding a valid one with active data.'
                : 'Tu teléfono buscará los operadores locales disponibles (carriers). <strong>Selecciona un carrier manualmente</strong> y espera 30-60 segundos. Si no conecta, <strong>prueba con el siguiente carrier</strong> de la lista hasta encontrar uno válido con conexión de datos.'}
            </li>
          </ol>
          <div style="text-align: center; margin-top: 10px;">
            <a href="https://www.me-sim.com/soporte" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #ffec00; color: #000000; font-weight: 800; font-size: 13px; text-decoration: none; padding: 11px 24px; border-radius: 12px; border: 1px solid rgba(0,0,0,0.15); text-transform: uppercase; letter-spacing: 0.5px;">
              ${isEn ? 'Open Support Center & Guides: www.me-sim.com/soporte ➔' : 'Centro de Ayuda y Guías: www.me-sim.com/soporte ➔'}
            </a>
          </div>
        </div>

        <!-- Meta info (ID and Date) -->
        <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; color: #52525b; margin-bottom: 32px; line-height: 1.6;">
          <p style="margin: 0;"><strong>${isEn ? 'Order ID:' : 'ID del Pedido:'}</strong> #${orderData.orderId}</p>
          <p style="margin: 0;"><strong>${isEn ? 'Date & Time:' : 'Fecha y Hora:'}</strong> ${orderDateString}</p>
        </div>

        <!-- Footer greeting -->
        <div style="border-top: 1px solid #e4e4e7; padding-top: 24px; text-align: center; font-size: 13px; color: #71717a; line-height: 1.6;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #18181b;">
            ${isEn ? 'Thank you for choosing me-sim.com!' : '¡Gracias por elegir me-sim.com!'}
          </p>
          <p style="margin: 0 0 6px;">
            ${isEn 
              ? 'Need help or setup instructions? Visit our <a href="https://www.me-sim.com/soporte" style="color: #000000; font-weight: 700; text-decoration: underline;">Support Center (www.me-sim.com/soporte)</a> or email us at' 
              : '¿Tienes dudas o necesitas ayuda? Visita nuestro <a href="https://www.me-sim.com/soporte" style="color: #000000; font-weight: 700; text-decoration: underline;">Centro de Soporte (www.me-sim.com/soporte)</a> o contáctanos en'} 
            <a href="mailto:info@me-sim.com" style="color: #000000; font-weight: 600; text-decoration: underline;">info@me-sim.com</a>.
          </p>
          <p style="margin: 16px 0 0; font-size: 12px; color: #a1a1aa;">
            © ${new Date().getFullYear()} ME-SIM Connectivity. ${isEn ? 'All rights reserved.' : 'Todos los derechos reservados.'}
          </p>
        </div>

      </div>
    </body>
    </html>
  `;
}

export function generatePaymentFailedHtml(orderData, lang = 'es') {
  const isEn = lang === 'en';
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #fee2e2; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <img src="https://me-sim.com/logos/Logo-me-sim-mail.png" alt="ME-SIM" style="height: 45px; display: inline-block; margin-bottom: 24px;" />
        <h2 style="color: #991b1b; font-size: 20px; font-weight: 800; margin-bottom: 16px;">${isEn ? 'Payment Action Required' : 'Hubo un problema con tu pago'}</h2>
        
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
          ${isEn 
            ? 'We were unable to process the payment for your order. No charges were made. You can try again using a different card or payment method.' 
            : 'No hemos podido completar el pago de tu pedido de eSIM. No se ha realizado ningún cobro en tu tarjeta. Puedes volver a intentarlo con otra tarjeta.'}
        </p>

        <a href="https://me-sim.com/checkout" style="background: #ffec00; color: #000000; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; border: 1px solid rgba(0,0,0,0.1);">
          ${isEn ? 'Retry Checkout ➔' : 'Reintentar Pago de eSIM ➔'}
        </a>
      </div>
    </body>
    </html>
  `;
}

export function generateWelcomeCredentialsHtml(email, password, lang = 'es') {
  const isEn = lang === 'en';
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <img src="https://me-sim.com/logos/Logo-me-sim-mail.png" alt="ME-SIM" style="height: 45px; display: inline-block; margin-bottom: 24px;" />
        <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-bottom: 16px;">
          ${isEn ? 'Your Account Has Been Created!' : '¡Tu cuenta ha sido creada con éxito!'}
        </h2>
        
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: left;">
          ${isEn 
            ? 'Thank you for your purchase. We have automatically created a customer account for you. Use the credentials below to log in, view your active eSIMs, and track your data usage.' 
            : 'Gracias por tu compra. Hemos registrado una cuenta de cliente para ti automáticamente. Utiliza las siguientes credenciales para acceder a tu panel, ver tus eSIMs activas y consultar tus consumos:'}
        </p>

        <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; text-align: left; margin-bottom: 28px; font-size: 14px; color: #27272a;">
          <p style="margin: 0 0 10px;"><strong>${isEn ? 'Username / Email:' : 'Usuario / Email:'}</strong> ${email}</p>
          <p style="margin: 0;"><strong>${isEn ? 'Temporary Password:' : 'Contraseña Temporal:'}</strong> <code style="background: #e4e4e7; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>

        <a href="https://me-sim.com/login" style="background: #ffec00; color: #000000; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 20px;">
          ${isEn ? 'Access My Account ➔' : 'Acceder a Mi Cuenta ➔'}
        </a>

        <p style="color: #71717a; font-size: 12px; margin-top: 20px;">
          ${isEn 
            ? 'For security reasons, we recommend changing this password from your account profile settings after logging in.' 
            : 'Por razones de seguridad, te recomendamos cambiar esta contraseña temporal desde la configuración de tu cuenta después de iniciar sesión.'}
        </p>
      </div>
    </body>
    </html>
  `;
}

export function generatePasswordResetHtml(email, password, lang = 'es') {
  const isEn = lang === 'en';
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <img src="https://me-sim.com/logos/Logo-me-sim-mail.png" alt="ME-SIM" style="height: 45px; display: inline-block; margin-bottom: 24px;" />
        <h2 style="color: #18181b; font-size: 20px; font-weight: 700; margin-bottom: 16px;">
          ${isEn ? 'Your Password Has Been Reset' : '¡Tu contraseña ha sido restablecida!'}
        </h2>
        
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; margin-bottom: 24px; text-align: left;">
          ${isEn 
            ? 'We have generated a new temporary password for your account. Use the credentials below to log in:' 
            : 'Hemos generado una nueva contraseña temporal para tu cuenta. Utiliza las siguientes credenciales para acceder:'}
        </p>

        <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; text-align: left; margin-bottom: 28px; font-size: 14px; color: #27272a;">
          <p style="margin: 0 0 10px;"><strong>${isEn ? 'Username / Email:' : 'Usuario / Email:'}</strong> ${email}</p>
          <p style="margin: 0;"><strong>${isEn ? 'New Temporary Password:' : 'Nueva Contraseña Temporal:'}</strong> <code style="background: #e4e4e7; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${password}</code></p>
        </div>

        <a href="https://me-sim.com/login" style="background: #ffec00; color: #000000; font-weight: 800; font-size: 15px; padding: 14px 28px; border-radius: 12px; text-decoration: none; display: inline-block; border: 1px solid rgba(0,0,0,0.1); margin-bottom: 20px;">
          ${isEn ? 'Access My Account ➔' : 'Acceder a Mi Cuenta ➔'}
        </a>

        <p style="color: #71717a; font-size: 12px; margin-top: 20px;">
          ${isEn 
            ? 'For security reasons, we recommend changing this password from your account profile settings after logging in.' 
            : 'Por razones de seguridad, te recomendamos cambiar esta contraseña temporal desde la configuración de tu cuenta después de iniciar sesión.'}
        </p>
      </div>
    </body>
    </html>
  `;
}

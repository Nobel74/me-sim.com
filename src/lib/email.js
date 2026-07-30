/**
 * Transactional Email Mailer for ME-SIM
 * Configured for mail.me-sim.com SMTP (Port 465 SSL/TLS) & WooCommerce API
 */

export async function sendEmail({ to, subject, htmlText, type = 'magic_code', data = {} }) {
  console.log(`[EMAIL SERVICE] Preparing ${type} email for: ${to}`);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT || '465';
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  // 1. Try sending via Nodemailer if credentials configured in environment
  if (smtpPassword && smtpUser && smtpHost) {
    try {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465, // true for 465, false for 587
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

      console.log(`[EMAIL SERVICE] Sent via SMTP (${smtpHost}:${smtpPort}) - Message ID:`, info.messageId);
      return { success: true, messageId: info.messageId, provider: 'SMTP' };
    } catch (err) {
      console.warn('[EMAIL SERVICE] Direct SMTP attempt error:', err.message);
    }
  }

  // 2. Try sending via WooCommerce WP-Mail API endpoint
  const wpUrl = process.env.WOOCOMMERCE_API_URL || 'https://me-sim.com';
  try {
    const res = await fetch(`${wpUrl}/wp-json/mesim/v1/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-ME-SIM-KEY': process.env.EMAIL_API_KEY || 'mesim-secure-mail-2026',
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
      return { success: true, message: 'Email enviado a través de WooCommerce API', responseData, provider: 'WooCommerce API' };
    }
  } catch (err) {
    console.warn('[EMAIL SERVICE] WooCommerce API call fallback:', err.message);
  }

  // 3. Fallback for Local Dev Mode
  return {
    success: true,
    message: `[MODO MOCK/DEV] Correo "${subject}" simulado para ${to}`,
    simulated: true,
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
        <h1 style="color: #000000; font-size: 28px; font-weight: 800; margin-bottom: 8px;">⚡ ME-SIM</h1>
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
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; color: #0f0f0f; margin: 0; padding: 40px 20px;">
      <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 24px; padding: 40px; text-align: center; box-shadow: 0 10px 25px rgba(0,0,0,0.05);">
        <h1 style="color: #000000; font-size: 28px; font-weight: 800; margin-bottom: 4px;">⚡ ME-SIM</h1>
        <h2 style="color: #166534; font-size: 22px; font-weight: 800; margin-bottom: 24px;">🎉 ${isEn ? 'eSIM Order Confirmed!' : '¡Pedido de eSIM Confirmado!'}</h2>
        
        <div style="background: #ffffff; border: 2px solid #000000; padding: 20px; border-radius: 20px; display: inline-block; margin-bottom: 24px;">
          <img src="${orderData.qrCodeUrl}" alt="eSIM QR Code" style="width: 220px; height: 220px; display: block;" />
        </div>
        
        <div style="background: #ffec00; color: #000000; font-weight: 800; font-size: 14px; padding: 12px; border-radius: 12px; margin-bottom: 24px; text-transform: uppercase;">
          📲 ${isEn ? 'Scan QR Code in phone Settings > Cellular to install' : 'Escanea este código QR desde Ajustes > Datos Móviles en tu móvil'}
        </div>

        <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; text-align: left; margin-bottom: 24px; font-size: 14px; color: #27272a;">
          <p style="margin: 0 0 10px;"><strong>${isEn ? 'Plan:' : 'Plan Adquirido:'}</strong> ${orderData.title}</p>
          <p style="margin: 0 0 10px;"><strong>${isEn ? 'Order ID:' : 'ID de Pedido WooCommerce:'}</strong> ${orderData.orderId}</p>
          <p style="margin: 0 0 10px;"><strong>${isEn ? 'ICCID / Line:' : 'ICCID de la Línea:'}</strong> <code style="background: #e4e4e7; padding: 2px 6px; border-radius: 4px;">${orderData.esimTranNo}</code></p>
          <p style="margin: 0;"><strong>${isEn ? 'Total Paid:' : 'Total Pagado:'}</strong> ${orderData.totalPrice}</p>
        </div>

        <p style="color: #71717a; font-size: 12px; margin: 0;">© ${new Date().getFullYear()} ME-SIM Connectivity. Todos los derechos reservados.</p>
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
        <h1 style="color: #000000; font-size: 28px; font-weight: 800; margin-bottom: 4px;">⚡ ME-SIM</h1>
        <h2 style="color: #991b1b; font-size: 20px; font-weight: 800; margin-bottom: 16px;">⚠️ ${isEn ? 'Payment Action Required' : 'Hubo un problema con tu pago'}</h2>
        
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
        <h1 style="color: #000000; font-size: 28px; font-weight: 800; margin-bottom: 4px;">⚡ ME-SIM</h1>
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

import Link from 'next/link';

export const SUPPORT_CATEGORIES = {
  about: {
    slug: 'about',
    title: { es: 'Sobre ME-SIM', en: 'About ME-SIM' },
    desc: { es: 'Conoce cómo funciona nuestra eSIM internacional y sus ventajas para viajeros', en: 'Learn how our international eSIM works and its key travel benefits' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
      </svg>
    ),
    content: {
      es: `
        <h2>¿Qué es ME-SIM.COM?</h2>
        <p>ME-SIM.COM es un servicio de datos móviles internacionales prepagados que te permite conectarte a internet en más de 198 países sin pagar cargos de roaming ni tener que cambiar tu tarjeta SIM física.</p>
        
        <h2>Principales Ventajas</h2>
        <ul>
          <li><strong>Entrega Instantánea:</strong> Recibe tu código QR de activación por email e instalalo en segundos.</li>
          <li><strong>Conserva tu WhatsApp:</strong> Mantén tu número habitual para llamadas y chats mientras usas la eSIM para datos móviles.</li>
          <li><strong>Sin Sorpresas:</strong> Pagas un precio fijo de antemano sin facturas misteriosas al volver a casa.</li>
          <li><strong>Gestión desde Tu Cuenta:</strong> Puedes recargar datos y monitorizar tu consumo en tiempo real desde la sección "Mi Cuenta" sin necesidad de instalar ninguna app.</li>
        </ul>
      `,
      en: `
        <h2>What is ME-SIM.COM?</h2>
        <p>ME-SIM.COM is a global prepaid mobile data service allowing travelers to connect to high-speed internet across 198+ countries without roaming fees or physical SIM swapping.</p>
        
        <h2>Key Benefits</h2>
        <ul>
          <li><strong>Instant Delivery:</strong> Get your activation QR code delivered immediately via email and client area.</li>
          <li><strong>Keep your WhatsApp number:</strong> Retain your standard phone number for messaging while using eSIM for high-speed data.</li>
          <li><strong>Zero Roaming Fees:</strong> Upfront flat pricing with no surprise bills arriving after your trip.</li>
          <li><strong>Web Account Management:</strong> Top-up data and track live usage via "My Account" without installing any app.</li>
        </ul>
      `
    }
  },

  'getting-started': {
    slug: 'getting-started',
    title: { es: 'Primeros Pasos', en: 'Getting Started' },
    desc: { es: 'Guía rápida para comprar, recibir y preparar tu eSIM antes de volar', en: 'Quick guide to purchase, receive, and prepare your eSIM before flying' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M13.5 2c-5.25 0-9.5 4.25-9.5 9.5 0 3.23 1.62 6.09 4.1 7.8L7 22l4.8-1.6c.4.07.8.1 1.2.1 5.25 0 9.5-4.25 9.5-9.5S18.75 2 13.5 2zm-1 14h-2v-2h2v2zm0-4h-2V7h2v5z"/>
      </svg>
    ),
    content: {
      es: `
        <h2>Cómo Empezar con ME-SIM en 3 Pasos</h2>
        <ol>
          <li><strong>Elige tu Destino:</strong> Selecciona el país o región al que vas a viajar y elige tu plan de datos fijos o días ilimitados.</li>
          <li><strong>Recibe tu Código QR:</strong> Al completar el pago, recibirás el QR al instante en tu email y en el apartado <em>Mi Cuenta</em>.</li>
          <li><strong>Escanea e Instala:</strong> Escanea el QR conectando tu móvil a Wi-Fi antes de despegar o al llegar a tu destino.</li>
        </ol>

        <h2>¿Cuándo debo instalar mi eSIM?</h2>
        <p>Te recomendamos escanear el QR desde los ajustes de tu teléfono el día de tu viaje conectándote a Wi-Fi. La validez de tu plan sólo comenzará a contar en cuanto la eSIM se conecte por primera vez a la red local del país de destino.</p>
      `,
      en: `
        <h2>Getting Started with ME-SIM in 3 Steps</h2>
        <ol>
          <li><strong>Select your Destination:</strong> Choose your destination country or region and pick your fixed or unlimited data plan.</li>
          <li><strong>Receive your QR Code:</strong> Upon checkout, your activation QR code arrives instantly in your inbox and <em>My Account</em> dashboard.</li>
          <li><strong>Scan and Install:</strong> Connect to Wi-Fi and scan the QR code under cellular settings before boarding or upon arrival.</li>
        </ol>

        <h2>When should I install my eSIM?</h2>
        <p>We recommend scanning the QR code on your departure date while connected to Wi-Fi. Your validity countdown only triggers when connecting to a supported local carrier network upon arrival.</p>
      `
    }
  },

  installation: {
    slug: 'installation',
    title: { es: 'Instalación', en: 'Installation' },
    desc: { es: 'Paso a paso para escanear y configurar la eSIM en iOS y Android', en: 'Step-by-step instructions to scan and configure eSIM on iOS & Android' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
      </svg>
    ),
    content: {
      es: `
        <h2>Instalación en iPhone (iOS)</h2>
        <ol>
          <li>Ve a <strong>Ajustes &gt; Datos móviles &gt; Añadir plan de datos / eSIM</strong>.</li>
          <li>Escanea el código QR enviado a tu correo o disponible en <em>Mi Cuenta</em>.</li>
          <li>Asigna una etiqueta a tu línea (ej. <em>ME-SIM Datos</em>).</li>
          <li>Activa la opción <strong>Itinerancia de datos (Data Roaming)</strong> en la línea de ME-SIM.</li>
        </ol>

        <h2>Instalación en Android (Samsung, Google Pixel, Xiaomi, etc.)</h2>
        <ol>
          <li>Ve a <strong>Ajustes &gt; Conexiones / Redes e Internet &gt; Administrador de tarjetas SIM</strong>.</li>
          <li>Toca en <strong>Añadir plan móvil / Añadir eSIM</strong> y escanea el código QR.</li>
          <li>Al aterrizar en tu destino, activa la SIM de ME-SIM para Datos Móviles y habilita la <strong>Itinerancia de datos</strong>.</li>
        </ol>
      `,
      en: `
        <h2>Installation on iPhone (iOS)</h2>
        <ol>
          <li>Go to <strong>Settings &gt; Cellular / Mobile Data &gt; Add eSIM / Data Plan</strong>.</li>
          <li>Scan the QR code received via email or from <em>My Account</em>.</li>
          <li>Label your new eSIM profile (e.g., <em>ME-SIM Travel</em>).</li>
          <li>Ensure <strong>Data Roaming</strong> is turned ON for the ME-SIM line.</li>
        </ol>

        <h2>Installation on Android (Samsung, Google Pixel, etc.)</h2>
        <ol>
          <li>Go to <strong>Settings &gt; Connections &gt; SIM Manager &gt; Add Mobile Plan / eSIM</strong>.</li>
          <li>Scan your QR code using Wi-Fi.</li>
          <li>Upon landing, switch Mobile Data to the ME-SIM line and turn ON <strong>Data Roaming</strong>.</li>
        </ol>
      `
    }
  },

  troubleshooting: {
    slug: 'troubleshooting',
    title: { es: 'Solución de Problemas', en: 'Troubleshooting' },
    desc: { es: 'Soluciona problemas frecuentes de conexión, APN e Itinerancia', en: 'Fix common connectivity issues, APN settings, and Roaming setup' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M22.7 19l-9.1-16c-.5-.8-1.4-1.3-2.4-1.3s-1.9.5-2.4 1.3L.3 19c-.5.8-.5 1.9 0 2.7.5.8 1.4 1.3 2.4 1.3h18.2c1 0 1.9-.5 2.4-1.3.5-.8.5-1.9 0-2.7zM12 18c-.6 0-1-.4-1-1s.4-1 1-1 1 .4 1 1-.4 1-1 1zm1-4h-2V9h2v5z"/>
      </svg>
    ),
    content: {
      es: `
        <h2>¿No tienes internet al aterrizar?</h2>
        <p>Sigue esta lista de comprobaciones rápidas:</p>
        <ul>
          <li><strong>1. Revisa la Itinerancia de Datos:</strong> Asegúrate de que la "Itinerancia de datos" está ACTIVADA en los ajustes de la eSIM de ME-SIM.</li>
          <li><strong>2. Línea Seleccionada para Datos:</strong> Comprueba que tu teléfono está utilizando la línea ME-SIM como la SIM primaria de Datos Móviles.</li>
          <li><strong>3. Reinicia el Dispositivo:</strong> Reiniciar el smartphone fuerza a la eSIM a registrarse en la antena local preferente.</li>
          <li><strong>4. Modo Avión:</strong> Activa el Modo Avión durante 10 segundos y vuelve a desactivarlo.</li>
        </ul>
      `,
      en: `
        <h2>No Mobile Data After Landing?</h2>
        <p>Check these quick troubleshooting steps:</p>
        <ul>
          <li><strong>1. Check Data Roaming:</strong> Verify that "Data Roaming" is turned ON specifically for your ME-SIM line.</li>
          <li><strong>2. Active Mobile Data Line:</strong> Ensure ME-SIM is selected as the primary SIM for Mobile Data.</li>
          <li><strong>3. Restart Phone:</strong> Restarting your device forces the profile to negotiate connection with local carriers.</li>
          <li><strong>4. Toggle Airplane Mode:</strong> Turn Airplane Mode ON for 10 seconds, then turn it back OFF.</li>
        </ul>
      `
    }
  },

  'plans-payments': {
    slug: 'plans-payments',
    title: { es: 'Planes y Pagos', en: 'Plans & Payments' },
    desc: { es: 'Información sobre recargas desde Tu Cuenta, divisas y facturación', en: 'Details about web account top-ups, currencies, and billing' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
      </svg>
    ),
    content: {
      es: `
        <h2>Compra de planes y eSIMs desde tu cuenta (Sin App)</h2>
        <p>En ME-SIM.COM no necesitas descargar ninguna aplicación adicional para gestionar tu línea. Puedes consultar tu consumo de megabytes en tiempo real y comprar nuevos planes de datos haciendo clic en el botón destacado <strong>+ Comprar nueva eSIM</strong> en tu panel de la sección <strong>Mi Cuenta / Cuenta</strong>.</p>

        <h2>Métodos de Pago Aceptados</h2>
        <p>Aceptamos tarjetas de crédito y débito principales (Visa, Mastercard, American Express) procesadas de forma 100% segura mediante Stripe.</p>

        <h2>Facturas</h2>
        <p>Puedes solicitar tu factura de compra tras realizar el pedido desde tu panel de usuario o escribiendo a nuestro soporte.</p>
      `,
      en: `
        <h2>Purchasing plans & eSIMs via Web Account (No App Needed)</h2>
        <p>At ME-SIM.COM you do not need to download an extra mobile application. You can monitor your real-time data consumption and purchase new data plans by clicking the prominent <strong>+ Buy New eSIM</strong> button inside your <strong>My Account</strong> section at any time.</p>

        <h2>Accepted Payment Methods</h2>
        <p>We accept major credit and debit cards (Visa, Mastercard, American Express) securely processed via Stripe encryption.</p>

        <h2>Invoices</h2>
        <p>Tax invoices are generated upon order completion and available in your customer area or upon request to support.</p>
      `
    }
  },

  compatibility: {
    slug: 'compatibility',
    title: { es: 'Comprobar Compatibilidad', en: 'Check Device Compatibility' },
    desc: { es: 'Verifica si tu modelo de móvil (iPhone, Samsung, Xiaomi, Pixel...) es compatible con eSIM', en: 'Verify if your smartphone model (iPhone, Samsung, Xiaomi, Pixel...) supports eSIM' },
    icon: (
      <svg className="w-6 h-6 text-black fill-current" viewBox="0 0 24 24">
        <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
      </svg>
    ),
    isCompatibilityTrigger: true,
    content: {
      es: `
        <h2>¿Cómo saber si tu móvil soporta eSIM?</h2>
        <p>La mayoría de smartphones fabricados a partir de 2019 de gama media y alta (iPhone XR en adelante, Samsung Galaxy S20+, Google Pixel 3+, Xiaomi 12T Pro, etc.) incluyen tecnología eSIM integrada.</p>
        
        <h2>Método EID rápido (*#06#)</h2>
        <p>Abre la aplicación de llamadas de tu móvil y marca <strong>*#06#</strong>. Si aparece un código llamado <strong>EID de 32 dígitos</strong> en tu pantalla, tu teléfono es 100% compatible con la eSIM de ME-SIM.COM.</p>

        <h2>Comprobación de bloqueo de operador</h2>
        <p>Para usar una eSIM de viaje, tu teléfono debe estar <strong>liberado de fábrica / sin bloqueo de operador</strong>. Si tienes dudas, puedes consultar el botón interactivo de verificación en nuestra web.</p>
      `,
      en: `
        <h2>How to check if your phone supports eSIM?</h2>
        <p>Most mid-range and flagship smartphones released from 2019 onwards (iPhone XR and newer, Samsung Galaxy S20+, Google Pixel 3+, Xiaomi 12T Pro, etc.) feature built-in eSIM technology.</p>
        
        <h2>Quick EID Check (*#06#)</h2>
        <p>Open your phone dialer app and dial <strong>*#06#</strong>. If a <strong>32-digit EID code</strong> appears on your screen, your device is 100% eSIM ready for ME-SIM.COM.</p>

        <h2>Carrier Unlocked Requirement</h2>
        <p>Your smartphone must be <strong>carrier unlocked</strong> to install travel eSIM profiles. You can verify your exact model using our interactive checker tool on the site.</p>
      `
    }
  }
};

export const SUPPORT_ARTICLES = [
  {
    slug: 'no-internet-after-landing',
    title: { es: '¿Sin internet al aterrizar en tu destino?', en: 'No internet connection after landing?' },
    desc: { es: 'Guía rápida para solucionar la falta de conexión al llegar a tu país de viaje', en: 'Quick fix guide for connectivity issues upon landing' },
    content: {
      es: `
        <h2>Pasos para solucionar la falta de internet al aterrizar</h2>
        <p>Si has aterrizado en tu destino y tu eSIM de ME-SIM no conecta a internet de inmediato, no te preocupes. Sigue estos 4 pasos comprobados:</p>
        
        <h3>1. Activa la Itinerancia de Datos (Data Roaming)</h3>
        <p>Es el motivo más frecuente. Ve a <strong>Ajustes &gt; Datos Móviles &gt; Selecciona la eSIM de ME-SIM</strong> y asegúrate de que la casilla <strong>Itinerancia de datos / Data Roaming</strong> está ACTIVADA.</p>

        <h3>2. Selecciona ME-SIM como SIM de Datos Primarios</h3>
        <p>Comprueba que en Ajustes de Datos Móviles la línea activa para conectarse a internet es tu perfil de ME-SIM y no tu tarjeta SIM física personal.</p>

        <h3>3. Reinicia tu teléfono</h3>
        <p>Reiniciar el dispositivo fuerza a la eSIM a realizar la autenticación inicial con las antenas del operador local asociado.</p>

        <h3>4. Selección Manual de Red</h3>
        <p>Si continúas sin señal, desactiva la "Selección automática de red" en los ajustes de la eSIM y prueba a seleccionar manualmente los operadores principales del país (ej. AT&T en EE.UU., Vodafone/Movistar en España, etc.).</p>
      `,
      en: `
        <h2>How to fix connection issues after landing</h2>
        <p>If you just landed and your ME-SIM profile is not connecting immediately, follow these 4 steps:</p>
        
        <h3>1. Turn ON Data Roaming</h3>
        <p>This is the most common reason. Go to <strong>Settings &gt; Cellular / Mobile Data &gt; Select ME-SIM eSIM</strong> and turn <strong>Data Roaming ON</strong>.</p>

        <h3>2. Set ME-SIM as Primary Data Line</h3>
        <p>In Cellular settings, ensure ME-SIM is selected as the default line for Mobile Data consumption.</p>

        <h3>3. Restart your smartphone</h3>
        <p>Restarting forces the eSIM profile to register on the preferred local partner network towers.</p>

        <h3>4. Manual Network Selection</h3>
        <p>If automatic connection fails, turn off "Automatic Network Selection" and manually select one of the major local networks.</p>
      `
    }
  },
  {
    slug: 'install-esim-qr',
    title: { es: 'Cómo instalar la eSIM mediante código QR', en: 'How to install your eSIM using a QR code' },
    desc: { es: 'Instrucciones sencillas para escanear el QR recibido en tu correo o panel', en: 'Simple guide to scan the QR code received via email or account area' },
    content: {
      es: `
        <h2>Instalación mediante Código QR</h2>
        <p>Al comprar tu plan en ME-SIM.COM, recibirás tu código QR por correo electrónico y en el apartado <strong>Mi Cuenta</strong>.</p>
        
        <h3>En iPhone:</h3>
        <ol>
          <li>Asegúrate de estar conectado a Wi-Fi.</li>
          <li>Ve a <strong>Ajustes &gt; Datos móviles &gt; Añadir plan de datos / eSIM</strong>.</li>
          <li>Escanea el código QR que se muestra en la pantalla de otro dispositivo o impreso.</li>
        </ol>

        <h3>En Android:</h3>
        <ol>
          <li>Conéctate a una red Wi-Fi estable.</li>
          <li>Ve a <strong>Ajustes &gt; Conexiones &gt; Administrador de tarjetas SIM &gt; Añadir eSIM</strong>.</li>
          <li>Selecciona <em>Escanear código QR de proveedor</em> y enfoca la cámara.</li>
        </ol>
      `,
      en: `
        <h2>Installing via QR Code</h2>
        <p>After completing your order at ME-SIM.COM, your QR code is delivered via email and accessible in <strong>My Account</strong>.</p>
        
        <h3>On iPhone:</h3>
        <ol>
          <li>Ensure device is connected to Wi-Fi.</li>
          <li>Go to <strong>Settings &gt; Cellular &gt; Add eSIM / Data Plan</strong>.</li>
          <li>Scan the QR code displayed on another screen or printed page.</li>
        </ol>

        <h3>On Android:</h3>
        <ol>
          <li>Connect to a Wi-Fi network.</li>
          <li>Go to <strong>Settings &gt; Connections &gt; SIM Manager &gt; Add Mobile Plan</strong>.</li>
          <li>Select <em>Scan QR code</em> and align with camera.</li>
        </ol>
      `
    }
  },
  {
    slug: 'qr-not-scanning',
    title: { es: '¿El código QR no se escanea o da error?', en: 'QR code not scanning or giving error?' },
    desc: { es: 'Soluciones si la cámara no reconoce el QR o indica que ya ha sido usado', en: 'Troubleshooting steps if camera does not recognize QR or shows error' },
    content: {
      es: `
        <h2>¿Problemas al escanear el código QR?</h2>
        <p>Si la cámara de tu teléfono no detecta el código QR o aparece un mensaje de error, revisa las siguientes causas habituales:</p>

        <h3>1. Escanear desde el menú correcto</h3>
        <p>El código QR de una eSIM no debe escanearse directamente desde la cámara estándar de fotos, sino desde el menú específico de los ajustes de tu teléfono: <strong>Ajustes &gt; Datos móviles &gt; Añadir eSIM / Plan de datos</strong>.</p>

        <h3>2. El perfil ya se encuentra instalado</h3>
        <p>Si ves un aviso indicando que el código ya no es válido, comprueba en tu lista de SIMs si la línea de ME-SIM ya está añadida en tu dispositivo.</p>

        <h3>3. Conexión a Internet inestable</h3>
        <p>Es indispensable contar con conexión Wi-Fi activa durante el escaneo para descargar el perfil seguro desde el servidor de telecomunicaciones.</p>
      `,
      en: `
        <h2>Issues scanning your QR Code?</h2>
        <p>If your device camera fails to read the QR code or displays an error message, check these common causes:</p>

        <h3>1. Scan from Cellular Settings Menu</h3>
        <p>Do not scan the QR from the general camera app. Always navigate to: <strong>Settings &gt; Cellular / Connections &gt; Add eSIM</strong> and scan from within that prompt.</p>

        <h3>2. Profile Already Installed</h3>
        <p>If you see "Code no longer valid", check your SIM list to verify if the ME-SIM profile has already been downloaded.</p>

        <h3>3. Wi-Fi Connection Required</h3>
        <p>An active Wi-Fi internet connection is required during activation to download the encrypted SIM credentials.</p>
      `
    }
  },
  {
    slug: 'slow-data-fix',
    title: { es: '¿Cómo solucionar una conexión de datos lenta?', en: 'How to fix slow mobile data speed?' },
    desc: { es: 'Ajustes para mejorar la velocidad 4G/5G en tu país de destino', en: 'Optimizing 4G/5G data speeds in your destination country' },
    content: {
      es: `
        <h2>Optimizando la velocidad de tus datos móviles</h2>
        <p>Si notas que la navegación es lenta en tu destino, sigue estos pasos para forzar la máxima velocidad 4G/5G disponible:</p>

        <h3>1. Selecciona 5G/4G Automático</h3>
        <p>Ve a Ajustes de la eSIM &gt; Voz y Datos y asegúrate de tener seleccionada la opción <strong>5G / 4G (LTE) Automático</strong>.</p>

        <h3>2. Reinicia las conexiones con el Modo Avión</h3>
        <p>Activa el Modo Avión durante 15 segundos y desactívalo. Tu teléfono volverá a negociar la banda con la antena más cercana y descongestionada.</p>

        <h3>3. Desactiva el "Modo de Poca Cobertura / Modo Ahorro de Datos"</h3>
        <p>Comprueba que tu teléfono no tenga activado ningún modo de ahorro de datos de la batería que limite las conexiones en segundo plano.</p>
      `,
      en: `
        <h2>Improving slow data speeds</h2>
        <p>If internet speeds feel sluggish in your destination, follow these steps to maximize 4G/5G performance:</p>

        <h3>1. Set Voice & Data to 5G/LTE Auto</h3>
        <p>Navigate to eSIM Settings &gt; Voice & Data and select <strong>5G Auto / LTE</strong>.</p>

        <h3>2. Reset Tower Connection via Airplane Mode</h3>
        <p>Enable Airplane Mode for 15 seconds, then disable it to connect to the strongest available local cell tower.</p>

        <h3>3. Turn Off Low Data Mode</h3>
        <p>Check that Low Data Mode or battery data saver is disabled in cellular settings.</p>
      `
    }
  },
  {
    slug: 'whatsapp-home-number',
    title: { es: '¿Mantengo mi número de WhatsApp al usar ME-SIM?', en: 'Do I keep my WhatsApp number with ME-SIM?' },
    desc: { es: 'Aprende cómo conservar tus chats y número habitual sin cambios', en: 'Learn how to keep your contacts, chats, and number intact' },
    content: {
      es: `
        <h2>Conserva tu WhatsApp intacto</h2>
        <p>¡Sí! Al instalar una eSIM de datos móviles de ME-SIM.COM, <strong>conservarás tu número de teléfono habitual en WhatsApp</strong>, Telegram, iMessage y todas tus aplicaciones de mensajería sin cambiar absolutamente nada.</p>

        <h3>¿Cómo funciona?</h3>
        <p>Al abrir WhatsApp tras activar la eSIM en el extranjero, la aplicación detectará una nueva conexión de datos y podría preguntarte: <em>"¿Deseas cambiar tu número de WhatsApp al nuevo perfil de datos?"</em>.</p>
        <p><strong>IMPORTANTE:</strong> Haz clic en <strong>MANTENER MI NÚMERO ACTUAL / NO CAMBIAR</strong>. De este modo, seguirás enviando y recibiendo mensajes con tu número de siempre mientras usas los datos de alta velocidad de ME-SIM.</p>
      `,
      en: `
        <h2>Keep your WhatsApp number intact</h2>
        <p>Yes! When using a ME-SIM data eSIM, <strong>you retain your original phone number on WhatsApp</strong>, Telegram, iMessage, and all messaging apps with zero changes.</p>

        <h3>How it works:</h3>
        <p>When opening WhatsApp abroad after enabling eSIM data, WhatsApp may ask: <em>"Do you want to switch your WhatsApp number?"</em>.</p>
        <p><strong>IMPORTANT:</strong> Select <strong>KEEP CURRENT NUMBER / DO NOT CHANGE</strong>. This allows you to chat using your standard number over ME-SIM high-speed data.</p>
      `
    }
  },
  {
    slug: 'top-up-data',
    title: { es: '¿Cómo comprar una nueva eSIM o añadir planes desde tu cuenta?', en: 'How to buy a new eSIM or add plans via your web account?' },
    desc: { es: 'Adquiere nuevos datos desde el botón "+ Comprar nueva eSIM" en tu panel de cliente', en: 'Purchase new data plans via the "+ Buy New eSIM" button in your dashboard' },
    content: {
      es: `
        <h2>Gestión de Planes desde Tu Cuenta (Sin necesidad de App)</h2>
        <p>En ME-SIM.COM no requieres instalar aplicaciones pesadas en tu teléfono. Toda la compra y gestión de tus líneas eSIM se realiza directamente desde la web de forma rápida y adaptada a móvil.</p>

        <h3>Pasos para comprar una nueva eSIM o plan:</h3>
        <ol>
          <li>Accede a <strong>ME-SIM.COM</strong> e inicia sesión en la sección <strong>Mi Cuenta / Cuenta</strong>.</li>
          <li>En la parte superior de tu panel de cliente verás el botón destacado <strong>+ Comprar nueva eSIM</strong>.</li>
          <li>Haz clic en <strong>+ Comprar nueva eSIM</strong> para explorar el catálogo global y seleccionar tu nuevo destino o paquete de datos.</li>
          <li>Completa el pago seguro y recibirás tu nuevo perfil eSIM y código QR al instante tanto en tu correo como en tu panel.</li>
        </ol>
      `,
      en: `
        <h2>Plan Management via Web Account (No App Needed)</h2>
        <p>At ME-SIM.COM you do not need to download heavy mobile apps. Purchasing and managing all your eSIM lines is handled directly via our mobile-optimized website.</p>

        <h3>Steps to buy a new eSIM or plan:</h3>
        <ol>
          <li>Visit <strong>ME-SIM.COM</strong> and sign in to <strong>My Account</strong>.</li>
          <li>At the top of your customer dashboard, locate the prominent <strong>+ Buy New eSIM</strong> button.</li>
          <li>Click <strong>+ Buy New eSIM</strong> to browse our global destination directory and pick your data plan.</li>
          <li>Complete checkout. Your new eSIM profile and QR code arrive instantly in your inbox and account dashboard.</li>
        </ol>
      `
    }
  },
  {
    slug: 'dispositivos-compatibles',
    title: { es: 'Lista Oficial de Dispositivos Compatibles con eSIM', en: 'Official eSIM Compatible Devices List' },
    desc: { es: 'Comprueba si tu teléfono móvil (Apple, Samsung, Xiaomi, Pixel...) admite eSIM', en: 'Verify if your smartphone (Apple, Samsung, Xiaomi, Pixel...) supports eSIM' },
    content: {
      es: `
        <h2>Dispositivos Compatibles con eSIM</h2>
        <p>Puedes consultar el listado completo y actualizado de teléfonos móviles y tablets compatibles en nuestra página especializada <a href="/soporte/dispositivos-compatibles">Dispositivos Compatibles</a>.</p>
      `,
      en: `
        <h2>eSIM Compatible Devices</h2>
        <p>You can check the full updated list of supported smartphones and tablets in our dedicated <a href="/soporte/dispositivos-compatibles">Compatible Devices</a> page.</p>
      `
    }
  }
];

'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

// Base de Conocimiento Inteligente de Autodiagnóstico basada en la sección de Soporte
const CHAT_DATABASE = {
  es: {
    welcome: "¡Hola! Soy tu asistente de soporte de ME-SIM. ¿En qué puedo ayudarte hoy?",
    placeholder: "Escribe tu consulta aquí...",
    submitting: "Analizando...",
    suggestedTitle: "Consultas populares:",
    noAnswer: "Lo siento, no he comprendido del todo tu consulta. ¿Te refieres a alguno de los siguientes temas?",
    
    // Temas principales para diagnóstico guiado paso a paso
    steps: {
      intro: {
        text: "Para guiarte paso a paso, dime qué problema estás experimentando:",
        options: [
          { text: "No tengo conexión a Internet", next: "no_data" },
          { text: "Conexión lenta o sin cobertura", next: "slow_connection" },
          { text: "Instalación y código QR", next: "installation" },
          { text: "Comprobar compatibilidad", next: "compatibility" },
          { text: "WhatsApp / Mantener mi número", next: "whatsapp_info" },
          { text: "Métodos de pago / Facturas", next: "payments_info" },
          { text: "Ver mis eSIMs / Consumo", next: "my_account" }
        ]
      },
      whatsapp_info: {
        text: "¡Sí! Al instalar la eSIM de datos móviles de ME-SIM, **conservarás tu número de teléfono habitual en WhatsApp**, Telegram y iMessage sin cambiar nada.\n\n*IMPORTANTE:* Si WhatsApp te pregunta si deseas cambiar tu número al detectar los nuevos datos, selecciona siempre **MANTENER MI NÚMERO ACTUAL / NO CAMBIAR**.\n\n¿Resolvió esto tu duda sobre WhatsApp?",
        options: [
          { text: "Sí, todo claro", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      payments_info: {
        text: "Aceptamos tarjetas de crédito y débito principales (Visa, Mastercard, American Express) procesadas de forma segura a través de **Stripe**.\n\n*Facturación:* Puedes descargar tu factura directamente desde tu panel de usuario en **Mi Cuenta** una vez completada la compra.\n\n¿Resolvió esto tu duda de pago?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      slow_connection: {
        text: "Si tu conexión es lenta o tienes poca señal/cobertura, sigue estas recomendaciones:\n\n*Nota: Los problemas de cobertura están vinculados a tu ubicación geográfica actual y a la saturación de las antenas del operador local con el que estés operando en ese momento. No es un problema adherido a nuestro servicio, pero puedes forzar mejoras con estos pasos:*\n\n1. **Forzar cambio de operador local**: Ve a *Ajustes > Datos móviles / Red celular > Selección de red*, desactiva 'Automático' y elige otra de las redes disponibles manualmente. Tras 30 segundos, vuelve a marcar 'Automático'.\n2. **Cambiar tipo de red**: Si la red 5G o LTE está saturada, intenta forzar temporalmente la conexión a **4G / LTE** o incluso **3G** en los ajustes de datos.\n3. **Uso de VPN**: Las eSIM son totalmente compatibles con VPN, pero estas herramientas pueden reducir la velocidad de datos móviles. Como la conexión celular de tu eSIM es 100% segura por defecto, te recomendamos **desactivar la VPN** al usar datos móviles y reservarla únicamente cuando te conectes a redes Wi-Fi públicas de hoteles, aeropuertos o restaurantes.\n\n¿Ha mejorado tu velocidad con esto?",
        options: [
          { text: "Sí, ya navego rápido", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      
      // Rama: Sin Internet
      no_data: {
        text: "La falta de internet suele deberse a configuraciones sencillas en tu móvil. Vamos a comprobarlo paso a paso:\n\n**¿Has activado la Itinerancia de Datos (Data Roaming) en la línea eSIM?**",
        options: [
          { text: "Sí, ya está activada", next: "no_data_step2" },
          { text: "No, ¿cómo lo hago?", next: "how_roaming" }
        ]
      },
      how_roaming: {
        text: "Es obligatorio activar la itinerancia para que tu eSIM funcione:\n\n• **iPhone**: Ajustes > Datos móviles > Selecciona tu eSIM > Activa 'Itinerancia de datos'.\n• **Android**: Ajustes > Conexiones > Administrador de SIM > Activa 'Itinerancia' en tu eSIM.",
        options: [
          { text: "Ya lo activé, comprobar siguiente paso", next: "no_data_step2" },
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      no_data_step2: {
        text: "**Siguiente comprobación:** ¿Tienes la **selección de red en 'Automático'** en los ajustes de la eSIM?",
        options: [
          { text: "Sí, está en automático", next: "no_data_step3" },
          { text: "No, lo tenía en manual", next: "how_network_auto" }
        ]
      },
      how_network_auto: {
        text: "Configurar la red en manual puede impedir que la eSIM se conecte al operador local preferente. Asegúrate de ir a:\n\n*Ajustes > Red móvil > Selección de red > Activar **Automático**.*",
        options: [
          { text: "Hecho, comprobar siguiente paso", next: "no_data_step3" },
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      no_data_step3: {
        text: "**Tercera comprobación:** ¿Es tu eSIM la línea asignada de forma activa para **Datos Móviles** en tu dispositivo?",
        options: [
          { text: "Sí, está seleccionada para datos", next: "no_data_final" },
          { text: "No lo sé / No", next: "how_assign_data" }
        ]
      },
      how_assign_data: {
        text: "Debes indicarle a tu smartphone que acceda a internet a través del plan ME-SIM:\n\n• **En iPhone**: Ajustes > Datos móviles > Datos móviles > Selecciona tu plan ME-SIM.\n• **En Android**: Ajustes > Conexiones > Administrador de SIM > Datos móviles > Selecciona ME-SIM.",
        options: [
          { text: "Ya está seleccionado, ¿sigue sin funcionar?", next: "no_data_final" },
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      no_data_final: {
        text: "Si has completado estos 3 pasos (Itinerancia ON, Red automática y Datos asignados a la eSIM) y sigues sin conexión:\n\n1. **Reinicia tu teléfono**: Esto fuerza a que se conecte a las antenas locales.\n2. **Activa/Desactiva el modo avión** por 10 segundos.\n\n¿Resolvió esto tu problema?",
        options: [
          { text: "Sí, ¡ya tengo conexión!", next: "solved_success" },
          { text: "No, sigo sin internet", next: "contact_human" }
        ]
      },
      solved_success: {
        text: "¡Excelente noticia! Me alegra haberte ayudado a resolver la incidencia. ¡Te deseo un excelente viaje y que disfrutes de tu conexión! ✈️🌍",
        options: [
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      contact_human: {
        text: "Lamento que sigas con problemas. Escribe un correo a nuestro equipo de soporte técnico humano en **info@me-sim.com** y te ayudaremos personalmente en pocos minutos.",
        options: [
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      
      installation: {
        text: "La instalación de la eSIM es digital:\n\n1. Recibes un **código QR** instantáneamente por email y en tu panel de usuario al comprar.\n2. Conéctate a una red Wi-Fi estable **antes de viajar** y escanea el código QR para instalarla.\n3. **Déjala desactivada** en los ajustes de tu móvil hasta que aterrices en tu país de destino; momento en el que debes activarla para que empiece a funcionar.\n\n¿Resolvió esto tus dudas de instalación?",
        options: [
          { text: "Sí, está claro", next: "solved_success" },
          { text: "No, ver guía detallada", next: "how_install_detail" }
        ]
      },
      how_install_detail: {
        text: "• **iPhone**: Ajustes > Datos móviles > Añadir eSIM > Escanear código QR.\n• **Android**: Ajustes > Conexiones > Administrador de SIM > Añadir eSIM > Escanear código QR.\n\n*Nota: No elimines la eSIM de tu móvil si tienes problemas, ya que los códigos QR son de un solo uso por seguridad.*\n\n¿Ha quedado resuelto ahora?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },

      // Rama: Compatibilidad
      compatibility: {
        text: "Para que la eSIM funcione, tu teléfono debe ser **libre de operador** y **compatible con la tecnología eSIM**.\n\nElige tu marca de teléfono para comprobar la lista de dispositivos:",
        options: [
          { text: "Apple (iPhone/iPad)", next: "compat_apple" },
          { text: "Samsung Galaxy", next: "compat_samsung" },
          { text: "Google Pixel", next: "compat_pixel" },
          { text: "Xiaomi / Otras marcas", next: "compat_others" },
          { text: "Volver al inicio", next: "intro" }
        ]
      },
      compat_apple: {
        text: "Todos los iPhones desde el **iPhone XR y XS (2018)** en adelante son compatibles. \n\n*Atención: Los modelos fabricados para China continental, Hong Kong o Macao suelen llevar doble ranura física nano-SIM y no admiten eSIM.*\n\n¿Resolvió esto tu duda de compatibilidad?",
        options: [
          { text: "Sí, es compatible", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      compat_samsung: {
        text: "Son compatibles las series Galaxy S20, S21, S22, S23, S24, S25, S26 (excepto versiones FE de China/HK o S20 FE), Z Fold y Z Flip.\n\n*Marca *#06# en el teclado de tu móvil; si te aparece un código EID de 32 dígitos, tu móvil admite eSIM.*\n\n¿Resolvió esto tu duda?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      compat_pixel: {
        text: "Todos los modelos de Google Pixel desde el **Pixel 3 y 3 XL (2018)** en adelante son totalmente compatibles con la tecnología eSIM (excepto algunas variantes locales específicas compradas en Verizon).\n\n¿Quedó resuelta tu duda?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      compat_others: {
        text: "Modelos compatibles de otras marcas populares:\n\n• **Xiaomi**: 13T Pro, 14, 14 Ultra, 14T, 14T Pro, etc.\n• **Motorola**: Razr 2019, Razr 40, Razr 50, Edge 40 Neo, Edge 50 Ultra, etc.\n• **OnePlus**: 11, 12, 13, Open.\n• **Honor**: Magic4 Pro, Magic5 Pro, Magic6 Pro, Magic V2.\n\n*Marca *#06# en tu teclado para verificar la existencia del código EID de 32 dígitos.*\n\n¿Resolvió esto tu duda?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },

      my_account: {
        text: "Desde tu panel **Mi Cuenta** puedes monitorizar tu consumo de datos en tiempo real y recargar o renovar planes.\n\nSi tu plan fijo de GB se agota, puedes comprar otro plan. Si es de datos ilimitados, puedes ampliar los días.\n\n*Nota: Si no sabes tu contraseña al iniciar sesión, introduce el correo con el que compraste tu tarjeta eSIM y pulsa en 'Recuperar contraseña'. Te enviaremos una clave para entrar y podrás cambiarla por una nueva.*\n\n¿Te sirve esta información?",
        options: [
          { text: "Sí, gracias", next: "solved_success" },
          { text: "No, necesito ayuda humana", next: "contact_human" }
        ]
      },
      go_dashboard: {
        text: "Puedes acceder de forma segura a través del botón 'Mi Cuenta' del menú o directamente en la URL `/dashboard` para revisar tus consumos de datos en vivo.",
        options: [
          { text: "Volver al inicio", next: "intro" }
        ]
      }
    },
    
    // Emparejamiento por palabras clave
    keywords: [
      { keys: ["whatsapp", "mensajeria", "mensaje", "chats", "chat", "mantener numero", "numero habitual"], dest: "whatsapp_info" },
      { keys: ["pagar", "pago", "tarjeta", "stripe", "visa", "mastercard", "factura", "facturar", "divisa", "euro", "dolar"], dest: "payments_info" },
      { keys: ["lento", "lenta", "lentitud", "cobertura", "velocidad", "senal", "señal", "3g", "hplus"], dest: "slow_connection" },
      { keys: ["conexion", "internet", "datos", "funciona", "red", "conectar", "roaming", "itinerancia"], dest: "no_data" },
      { keys: ["instalar", "instalacion", "activar", "activacion", "qr", "codigo", "escanear", "correo", "email"], dest: "installation" },
      { keys: ["iphone", "apple", "ipad"], dest: "compat_apple" },
      { keys: ["samsung", "galaxy"], dest: "compat_samsung" },
      { keys: ["pixel", "google pixel"], dest: "compat_pixel" },
      { keys: ["xiaomi", "motorola", "moto", "oneplus", "honor", "compatibilidad", "compatible", "modelo", "celular", "telefono", "teléfono", "dispositivo"], dest: "compatibility" },
      { keys: ["cuenta", "dashboard", "consumo", "gigas", "gb", "recargar", "renovar", "saldo", "consumido"], dest: "my_account" }
    ]
  },
  en: {
    welcome: "Hello! I am your ME-SIM virtual helper. How can I assist you today?",
    placeholder: "Type your query here...",
    submitting: "Analyzing...",
    suggestedTitle: "Popular topics:",
    noAnswer: "Sorry, I didn't quite get that. Do you mean one of the following topics?",
    
    steps: {
      intro: {
        text: "To guide you step by step, what issue are you facing?",
        options: [
          { text: "No Internet Connection", next: "no_data" },
          { text: "Slow connection or bad coverage", next: "slow_connection" },
          { text: "Installation & QR Code", next: "installation" },
          { text: "Check Device Compatibility", next: "compatibility" },
          { text: "WhatsApp / Keep my number", next: "whatsapp_info" },
          { text: "Payment methods / Invoices", next: "payments_info" },
          { text: "My Account & Data Usage", next: "my_account" }
        ]
      },
      whatsapp_info: {
        text: "Yes! When using a ME-SIM data eSIM, **you retain your original phone number on WhatsApp**, Telegram, and iMessage with zero changes.\n\n*IMPORTANT:* When opening WhatsApp abroad, if it asks you to switch your number, always select **KEEP CURRENT NUMBER / DO NOT CHANGE**.\n\nDid this resolve your question?",
        options: [
          { text: "Yes, all clear", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      payments_info: {
        text: "We accept major credit and debit cards (Visa, Mastercard, American Express) securely processed via **Stripe** encryption.\n\n*Invoices:* Tax invoices are generated upon order completion and available in your customer area under **My Account**.\n\nDid this answer your query?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      slow_connection: {
        text: "If your connection is slow or you have poor network coverage, please try these steps:\n\n*Note: Coverage issues are tied to your current physical location and the traffic load on local base stations of the operating carrier. This is not an issue caused by our service, but you can try forcing improvements with these steps:*\n\n1. **Force local carrier switch**: Go to *Settings > Cellular / Mobile Data > Network Selection*, disable 'Automatic', and select one of the available networks manually. Wait 30 seconds, then toggle 'Automatic' back ON.\n2. **Change network type**: If 5G or LTE is saturated, force your settings temporarily to **4G / LTE** or **3G** under cellular options.\n3. **VPN Usage**: eSIMs are fully compatible with VPNs, but these tools can slow down your cellular speed. Since your eSIM cellular data connection is already 100% secure by default, we recommend **disabling your VPN** while using cellular data, reserving it only when connecting to public Wi-Fi networks in hotels, airports, or restaurants.\n\nDid this improve your speed?",
        options: [
          { text: "Yes, works fast now!", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      no_data: {
        text: "No internet is usually caused by simple phone settings. Let's diagnose it step by step:\n\n**Have you turned ON Data Roaming for your eSIM line?**",
        options: [
          { text: "Yes, it is turned ON", next: "no_data_step2" },
          { text: "No, how do I do it?", next: "how_roaming" }
        ]
      },
      how_roaming: {
        text: "Data Roaming must be active for international travel:\n\n• **iPhone**: Settings > Cellular > Select eSIM > Turn 'Data Roaming' ON.\n• **Android**: Settings > Connections > SIM Manager > Turn 'Data Roaming' ON for the eSIM.",
        options: [
          { text: "Done, check next step", next: "no_data_step2" },
          { text: "Back to menu", next: "intro" }
        ]
      },
      no_data_step2: {
        text: "**Next check:** Is your network selection set to **'Automatic'** for the eSIM?",
        options: [
          { text: "Yes, it is set to Automatic", next: "no_data_step3" },
          { text: "No, it was on manual", next: "how_network_auto" }
        ]
      },
      how_network_auto: {
        text: "Selecting network manually can prevent connecting to the optimal local carrier. Go to:\n\n*Settings > Cellular > Network Selection > Turn 'Automatic' ON.*",
        options: [
          { text: "Done, check next step", next: "no_data_step3" },
          { text: "Back to menu", next: "intro" }
        ]
      },
      no_data_step3: {
        text: "**Third check:** Is the ME-SIM eSIM selected as your active line for **Mobile Data**?",
        options: [
          { text: "Yes, it is active for data", next: "no_data_final" },
          { text: "No / Not sure", next: "how_assign_data" }
        ]
      },
      how_assign_data: {
        text: "You must instruct your device to routing internet through the ME-SIM profile:\n\n• **iPhone**: Settings > Cellular > Cellular Data > Select ME-SIM.\n• **Android**: Settings > Connections > SIM Manager > Mobile Data > Select ME-SIM.",
        options: [
          { text: "Done, still no connection?", next: "no_data_final" },
          { text: "Back to menu", next: "intro" }
        ]
      },
      no_data_final: {
        text: "If you verified all 3 steps (Roaming ON, Automatic Network, and Data assigned to eSIM) and still have no connection:\n\n1. **Restart your phone**: This forces a fresh antenna registration.\n2. **Toggle Airplane Mode** ON and OFF for 10 seconds.\n\nDid this resolve your issue?",
        options: [
          { text: "Yes, I am connected!", next: "solved_success" },
          { text: "No, still offline", next: "contact_human" }
        ]
      },
      solved_success: {
        text: "Great news! I am glad I could help you resolve the issue. Have an amazing trip and enjoy your connection! ✈️🌍",
        options: [
          { text: "Back to menu", next: "intro" }
        ]
      },
      contact_human: {
        text: "I am sorry you are still having issues. Please send an email to our human support team at **info@me-sim.com** and we will assist you personally in a few minutes.",
        options: [
          { text: "Back to menu", next: "intro" }
        ]
      },
      installation: {
        text: "eSIM installation is completely digital:\n\n1. You receive a **QR code** instantly via email and user dashboard upon purchase.\n2. Connect to a stable Wi-Fi network **before traveling** and scan the QR code to install it.\n3. **Keep it turned OFF** in your cellular settings until you land in your destination country; then turn it ON to begin using it.\n\nDid this resolve your installation questions?",
        options: [
          { text: "Yes, it is clear", next: "solved_success" },
          { text: "No, show detailed guide", next: "how_install_detail" }
        ]
      },
      how_install_detail: {
        text: "• **iPhone**: Settings > Cellular > Add eSIM > Scan QR code.\n• **Android**: Settings > Connections > SIM Manager > Add eSIM > Scan QR code.\n\n*Note: Do not delete your eSIM profile if you face issues; QR codes are single-use for security reasons.*\n\nIs it resolved now?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      compatibility: {
        text: "To use an eSIM, your smartphone must be **carrier unlocked** and **eSIM compatible**.\n\nChoose your phone brand to check the device list:",
        options: [
          { text: "Apple (iPhone/iPad)", next: "compat_apple" },
          { text: "Samsung Galaxy", next: "compat_samsung" },
          { text: "Google Pixel", next: "compat_pixel" },
          { text: "Xiaomi / Other brands", next: "compat_others" },
          { text: "Back to menu", next: "intro" }
        ]
      },
      compat_apple: {
        text: "All iPhones from **iPhone XR & XS (2018)** and newer support eSIM. \n\n*Note: iPhones manufactured for China mainland, Hong Kong, or Macau typically feature dual-physical SIM slots and do not support eSIM.*\n\nDid this answer your compatibility question?",
        options: [
          { text: "Yes, it is compatible", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      compat_samsung: {
        text: "Compatible models include Galaxy S20, S21, S22, S23, S24, S25, S26 series (excluding FE versions from China/HK or S20 FE), Z Fold, and Z Flip.\n\n*Dial *#06# on your device keypad. If you see a 32-digit EID code, your device supports eSIM.*\n\nDid this answer your question?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      compat_pixel: {
        text: "All Google Pixel models from **Pixel 3 & 3 XL (2018)** and newer are fully eSIM compatible (except for specific local carrier variations bought from Verizon).\n\nDid this answer your question?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      compat_others: {
        text: "Compatible models from other popular manufacturers:\n\n• **Xiaomi**: 13T Pro, 14, 14 Ultra, 14T, 14T Pro, etc.\n• **Motorola**: Razr 2019, Razr 40, Razr 50, Edge 40 Neo, Edge 50 Ultra, etc.\n• **OnePlus**: 11, 12, 13, Open.\n• **Honor**: Magic4 Pro, Magic5 Pro, Magic6 Pro, Magic V2.\n\n*Dial *#06# on your device keypad to check for the presence of the 32-digit EID code.*\n\nDid this resolve your question?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      my_account: {
        text: "From **My Account**, you can track your data consumption in real time and purchase top-ups.\n\nIf your fixed GB pack runs low, you can buy a new pack. For unlimited plans, you can extend the days.\n\n*Note: If you do not know your password when signing in, enter the email address you used to purchase your eSIM and click on 'Recover password'. We will send you a temporary key to log in, and you can set a new one.*\n\nDid this help?",
        options: [
          { text: "Yes, thanks", next: "solved_success" },
          { text: "No, I need human support", next: "contact_human" }
        ]
      },
      go_dashboard: {
        text: "Access securely using the 'My Account' header link or directly via `/dashboard` to inspect your live consumption data.",
        options: [
          { text: "Back to menu", next: "intro" }
        ]
      }
    },
    keywords: [
      { keys: ["whatsapp", "messaging", "message", "chats", "chat", "keep number", "home number"], dest: "whatsapp_info" },
      { keys: ["pay", "payment", "card", "stripe", "visa", "mastercard", "invoice", "currency", "euro", "dollar"], dest: "payments_info" },
      { keys: ["slow", "slowness", "speed", "coverage", "signal", "3g", "hplus", "bad network"], dest: "slow_connection" },
      { keys: ["connection", "internet", "data", "works", "network", "connect", "roaming"], dest: "no_data" },
      { keys: ["install", "installation", "activate", "activation", "qr", "code", "scan", "email"], dest: "installation" },
      { keys: ["iphone", "apple", "ipad"], dest: "compat_apple" },
      { keys: ["samsung", "galaxy"], dest: "compat_samsung" },
      { keys: ["pixel", "google pixel"], dest: "compat_pixel" },
      { keys: ["xiaomi", "motorola", "oneplus", "honor", "compatibility", "compatible", "model", "phone", "device"], dest: "compatibility" },
      { keys: ["account", "dashboard", "usage", "giga", "gb", "topup", "top-up", "renew", "limit"], dest: "my_account" }
    ]
  }
};

export default function SupportChatbot() {
  const [lang, setLang] = useState('es');
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Sincronizar idioma de la interfaz del usuario
  useEffect(() => {
    const savedLang = localStorage.getItem('mesim_lang') || 'es';
    setLang(savedLang);

    const handleLangChange = () => {
      setLang(localStorage.getItem('mesim_lang') || 'es');
    };
    window.addEventListener('mesim_lang_changed', handleLangChange);
    return () => window.removeEventListener('mesim_lang_changed', handleLangChange);
  }, []);

  const db = CHAT_DATABASE[lang] || CHAT_DATABASE.es;

  // Iniciar la conversación con el saludo y las opciones sugeridas básicas
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          sender: 'bot',
          text: db.welcome,
          options: db.steps.intro.options
        }
      ]);
    }
  }, [lang, messages.length, db]);

  // Hacer scroll automático al recibir nuevos mensajes
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSendMessage = (text) => {
    if (!text.trim()) return;

    // Mensaje del usuario
    const userMsg = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simular retraso natural de escritura
    setTimeout(() => {
      setIsTyping(false);
      const query = text.toLowerCase().trim();
      
      // Buscar coincidencia en base a palabras clave
      let matchedDest = null;
      for (const kwGroup of db.keywords) {
        if (kwGroup.keys.some(k => query.includes(k))) {
          matchedDest = kwGroup.dest;
          break;
        }
      }

      if (matchedDest && db.steps[matchedDest]) {
        const nextStep = db.steps[matchedDest];
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: nextStep.text,
            options: nextStep.options
          }
        ]);
      } else {
        // Respuesta fallback si no entiende la consulta directa, sugiriendo volver al menú
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-fallback-${Date.now()}`,
            sender: 'bot',
            text: db.noAnswer,
            options: db.steps.intro.options
          }
        ]);
      }
    }, 900);
  };

  const handleOptionClick = (option) => {
    // Registra el clic del usuario como un mensaje enviado
    const userChoiceMsg = {
      id: `user-choice-${Date.now()}`,
      sender: 'user',
      text: option.text
    };

    setMessages((prev) => [...prev, userChoiceMsg]);
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const nextStepKey = option.next;
      const nextStep = db.steps[nextStepKey];

      if (nextStep) {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: nextStep.text,
            options: nextStep.options
          }
        ]);
      } else {
        // En caso de fin del flujo, volver al menú de inicio
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-reset-${Date.now()}`,
            sender: 'bot',
            text: db.steps.intro.text,
            options: db.steps.intro.options
          }
        ]);
      }
    }, 700);
  };

  return (
    <>
      {/* Botón flotante del Chatbot */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-14 h-14 bg-black text-[#ffec00] rounded-full flex items-center justify-center shadow-2xl z-50 border border-zinc-800 hover:scale-105 transition-all hover:bg-zinc-900 group"
        aria-label="Abrir asistente"
      >
        <div className="relative w-full h-full flex items-center justify-center">
          <img
            src="/favicon/favicon.png"
            alt="Asistente ME-SIM"
            className="w-10 h-10 object-contain rounded-full border border-[#ffec00]/30 group-hover:rotate-6 transition-transform"
            onError={(e) => {
              e.target.onerror = null;
              e.target.style.display = 'none';
            }}
          />
          {/* Globito de notificación */}
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-black animate-pulse"></span>
        </div>
      </button>

      {/* Ventana de Conversación del Asistente */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 w-[calc(100vw-32px)] sm:w-96 max-h-[500px] h-[500px] bg-white rounded-3xl border border-zinc-200 shadow-2xl flex flex-col z-50 overflow-hidden animate-scale-in font-sans">
          
          {/* Header del Chatbot */}
          <div className="bg-black text-white px-5 py-4 flex items-center justify-between border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <img
                src="/favicon/favicon.png"
                alt="Avatar"
                className="w-8 h-8 object-contain rounded-full bg-white/10 p-0.5 border border-[#ffec00]"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div>
                <strong className="text-sm font-bold block text-white">ME-SIM Support Bot</strong>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Área de mensajes con scroll */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-3xs ${
                      msg.sender === 'user'
                        ? 'bg-black text-white rounded-br-none font-medium'
                        : 'bg-white text-zinc-800 border border-zinc-200/90 rounded-bl-none font-sans whitespace-pre-line'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>

                {/* Mostrar opciones de botón sugeridas */}
                {msg.sender === 'bot' && msg.options && msg.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 pl-1">
                    {msg.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => handleOptionClick(opt)}
                        className="bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 hover:border-black font-bold py-1.5 px-3 rounded-xl text-xs transition-all shadow-3xs text-left"
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Animación de escribiendo del Bot */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-zinc-200/90 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Formulario de envío inferior */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="p-3 bg-white border-t border-zinc-200 flex gap-2 items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={db.placeholder}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-300 focus:border-black text-xs sm:text-sm text-black outline-none font-medium placeholder-zinc-400 bg-zinc-50"
            />
            <button
              type="submit"
              className="bg-black hover:bg-zinc-800 text-[#ffec00] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md flex-shrink-0"
            >
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}

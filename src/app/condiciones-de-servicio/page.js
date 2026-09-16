'use client';

import Link from 'next/link';

export default function CondicionesDeServicioPage() {
  return (
    <div className="container-naked max-w-4xl font-sans pb-16">
      {/* Breadcrumbs */}
      <nav className="text-xs font-semibold text-zinc-500 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-black transition-colors">Home</Link>
        <span>/</span>
        <span className="text-black font-semibold">Condiciones de Servicio</span>
      </nav>

      {/* Main Container */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-10 md:p-12 shadow-xl">
        <div className="border-b border-zinc-100 pb-6 mb-8">
          <span className="bg-[#ffec00] text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-3 inline-block">
            Legal
          </span>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black tracking-tight mb-2">
            Condiciones de Servicio
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500">
            Última actualización: 11 de julio de 2026 · ME-SIM.COM
          </p>
        </div>

        <div className="space-y-8 text-zinc-700 text-[1.125rem] leading-relaxed legal-content">
          {/* 1. Quiénes somos */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              1. Quiénes somos
            </h2>
            <p>
              Estas condiciones rigen el uso del sitio web de <strong>ME-SIM.COM</strong> y la compra de nuestros planes de datos digitales eSIM. El servicio es operado por <strong>ME-SIM.COM</strong> (en adelante, «ME-SIM.COM», «nosotros», «nuestro»). Al crear una cuenta o completar una compra, usted acepta estas condiciones.
            </p>
          </section>

          {/* 2. Qué vendemos */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              2. Qué vendemos
            </h2>
            <p>
              <strong>ME-SIM.COM</strong> comercializa eSIMs de viaje prepagadas y exclusivas para datos móviles para su uso en los países y regiones indicados en cada plan. Nuestras eSIMs proporcionan únicamente datos móviles: no incluyen número telefónico, llamadas de voz ni mensajes SMS tradicionales. La cobertura, la velocidad y la disponibilidad de la red dependen de los operadores asociados locales en su destino y no están garantizadas en todas las ubicaciones o en todo momento.
            </p>
          </section>

          {/* 3. Compatibilidad del dispositivo */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              3. Compatibilidad del dispositivo
            </h2>
            <p>
              Las eSIMs solo funcionan en dispositivos compatibles con eSIM y liberados (desbloqueados para cualquier operador). Es su responsabilidad confirmar que su dispositivo es compatible y está liberado antes de realizar la compra. Un plan que no pueda utilizarse porque un dispositivo está bloqueado o es incompatible no constituye un defecto del servicio.
            </p>
          </section>

          {/* 4. Cuentas */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              4. Cuentas
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Debe proporcionar una dirección de correo electrónico válida; su eSIM se entregará en su cuenta y por correo electrónico.</li>
              <li>Mantenga la confidencialidad de su contraseña. Cualquier actividad realizada con su cuenta es su responsabilidad.</li>
              <li>Debe tener al menos 18 años (o la mayoría de edad legal en su lugar de residencia) para comprar.</li>
              <li>Podemos suspender cuentas involucradas en fraude, abuso o infracción de estas condiciones.</li>
            </ul>
          </section>

          {/* 5. Pedidos, precios y pagos */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              5. Pedidos, precios y pagos
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Todos los precios se muestran antes de realizar la compra. Los precios en EUR, USD, GBP y AUD se convierten según nuestras tarifas fijas publicadas y se redondean, de modo que el importe visible al pagar es el importe exacto que abona.</li>
              <li>Los pagos se procesan de forma 100% segura a través de <strong>Stripe</strong> (tarjetas de crédito y débito Visa, Mastercard, American Express). En ME-SIM.COM no necesita instalar ninguna aplicación móvil para comprar o gestionar sus eSIMs, ya que toda la operativa se realiza directamente desde su cuenta web. Nunca almacenamos los datos de su tarjeta.</li>
              <li>Un pedido se considera completado cuando se confirma el pago y la eSIM se asigna a su cuenta.</li>
              <li>Los códigos promocionales solo se aplican en el momento de la compra y no pueden aplicarse con carácter retroactivo.</li>
            </ul>
          </section>

          {/* 6. Entrega, activación y validez */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              6. Entrega, activación y validez
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>La entrega es digital e inmediata: su código QR y los detalles de instalación manual aparecen en su cuenta web (y por correo electrónico) inmediatamente después de la compra.</li>
              <li>Dispone de hasta 180 días tras la compra para instalar la eSIM; tras escanearla, la activación generalmente debe iniciarse dentro de los 30 días siguientes.</li>
              <li>El período de validez comienza cuando la eSIM se conecta por primera vez a una red asociada compatible en el destino, no en el momento del pago, salvo que el plan especifique lo contrario.</li>
              <li>Los datos no consumidos caducan al finalizar la validez del plan. Los períodos de validez no se pausan ni se prorrogan.</li>
            </ul>
          </section>

          {/* 7. Recargas */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              7. Recargas
            </h2>
            <p>
              Donde esté disponible, las recargas añaden datos o días adicionales a una eSIM existente. Las recargas se vinculan al mismo perfil eSIM y siguen las mismas reglas que el plan original, gestionándose cómodamente desde su cuenta web sin requerir ninguna app externa.
            </p>
          </section>

          {/* 8. Uso aceptable */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              8. Uso aceptable
            </h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>Nuestros planes son para uso personal y razonable durante los viajes. No se permite la reventa comercial de planes minoristas individuales (los distribuidores deben utilizar nuestro programa oficial de revendedores).</li>
              <li>No puede utilizar el servicio para actividades ilícitas, spam, abuso de red o para interferir con el servicio o con otros usuarios.</li>
              <li>Las redes asociadas locales pueden aplicar sus propias políticas de uso justo (FUP), incluida la gestión de velocidad ante consumos extraordinariamente elevados.</li>
            </ul>
          </section>

          {/* 9. Reembolsos */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              9. Reembolsos
            </h2>
            <p>
              Los reembolsos se gestionan conforme a nuestra{' '}
              <Link href="/politica-de-reembolso" className="text-black font-bold underline hover:text-amber-600 transition-colors">
                Política de Reembolso
              </Link>
              . En resumen: si su eSIM realmente no puede conectarse por causas técnicas atribuibles a nuestra red y nuestro equipo de soporte no puede resolverlo, le devolvemos su dinero.
            </p>
          </section>

          {/* 10. Afiliados y revendedores */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              10. Afiliados y revendedores
            </h2>
            <p>
              La participación en nuestros programas de afiliados o distribuidores está sujeta a los términos presentados durante el registro. Las comisiones se generan únicamente sobre compras legítimas y no fraudulentas, y pueden anularse si el pago subyacente es reembolsado o devuelto.
            </p>
          </section>

          {/* 11. Limitación de responsabilidad */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              11. Limitación de responsabilidad
            </h2>
            <p>
              En la máxima medida permitida por la ley, nuestra responsabilidad total por cualquier reclamación derivada de una compra se limita al importe que usted abonó por dicha compra. No somos responsables por pérdidas indirectas o consecuentes, ni por interrupciones de servicio, lagunas de cobertura o limitaciones de velocidad de las redes asociadas locales. Nada en estas condiciones limita responsabilidades que no puedan limitarse por ley, ni afecta a los derechos irrenunciables del consumidor en su país de residencia.
            </p>
          </section>

          {/* 12. Modificaciones y legislación aplicable */}
          <section>
            <h2 className="text-lg sm:text-xl font-bold text-black mb-3">
              12. Modificaciones y legislación aplicable
            </h2>
            <p>
              Podemos actualizar estas condiciones periódicamente; la versión publicada en esta página en el momento de su compra se aplicará a dicho pedido.
            </p>
          </section>

          {/* 13. Contacto */}
          <section className="bg-zinc-50 border border-zinc-200 rounded-2xl p-5">
            <h2 className="text-lg sm:text-xl font-bold text-black mb-2">
              13. Contacto
            </h2>
            <p className="text-zinc-600">
              <strong>ME-SIM.COM</strong>
              <br />
              Correo electrónico:{' '}
              <a href="mailto:info@me-sim.com" className="text-black font-bold underline hover:text-amber-600">
                info@me-sim.com
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

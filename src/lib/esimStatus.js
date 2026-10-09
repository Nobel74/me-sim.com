/**
 * Helper para interpretar y formatear el estado de la eSIM en tiempo real
 * según los estándares de StrongeSIM y el servidor SM-DP+ de GSMA.
 * 
 * Reglas de negocio solicitadas:
 * - Rojo: "Finalizado" (expirada, consumida al 100%, ciclo cerrado o DELETED en SM-DP+)
 * - Naranja: "Instalada (Sin Activar)" (escaneada e instalada en el dispositivo pero sin tráfico/activar)
 * - Verde: "Activa" (en uso y transmitiendo datos activamente)
 */

export function getEsimStatusInfo(telemetry, order = null, isEn = false) {
  const smdp = String(telemetry?.smdpStatus || '').toUpperCase().trim();
  const esim = String(telemetry?.esimStatus || '').toUpperCase().trim();
  const usedBytes = Number(telemetry?.usedBytes || 0);
  const usedMb = Number(telemetry?.usedMb || 0);
  const percentageUsed = Number(telemetry?.percentageUsed || 0);

  // 1. Evaluación precisa de expiración real de ciclo de vida
  let isExpiredByDate = false;

  // A) Si el operador StrongeSIM reporta fecha oficial de expiración
  if (telemetry?.expiredTime) {
    try {
      const expTime = new Date(telemetry.expiredTime).getTime();
      if (!isNaN(expTime) && Date.now() > expTime) {
        isExpiredByDate = true;
      }
    } catch {}
  }

  // B) Si la eSIM ya fue activada en la red móvil (activateTime), calcular fin del período de validez en días
  if (!isExpiredByDate && telemetry?.activateTime) {
    try {
      const actTime = new Date(telemetry.activateTime).getTime();
      const days = parseInt(order?.days || order?.plan?.match(/(\d+)\s*Days?/i)?.[1] || '0', 10);
      if (!isNaN(actTime) && days > 0) {
        const calculatedExpiry = actTime + days * 24 * 60 * 60 * 1000;
        if (Date.now() > calculatedExpiry) {
          isExpiredByDate = true;
        }
      }
    } catch {}
  }

  const isCancelled = order?.status?.toLowerCase() === 'cancelled' || order?.status?.toLowerCase() === 'refunded' || esim.includes('CANCEL');

  // 1. GRIS: "Reembolsada" (CANCEL en StrongeSIM o reembolsada en tienda)
  if (isCancelled || esim.includes('CANCEL')) {
    const rawParts = [esim || 'CANCEL', smdp || 'RELEASED'].filter(Boolean);
    return {
      statusKey: 'refunded',
      label: isEn ? 'Refunded' : 'Reembolsada',
      colorName: 'zinc',
      dotClass: 'bg-zinc-400',
      textClass: 'text-zinc-400',
      badgeClass: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
      rawTechnical: rawParts.join(' / '),
    };
  }

  // 2. ROJO: "Expirada" (Fin de ciclo de validez o fecha expirada)
  const isExpired = isExpiredByDate || smdp.includes('EXPIRED') || esim.includes('EXPIRED') || smdp.includes('DELETED') || smdp.includes('TERMINATED') || percentageUsed >= 100;
  if (isExpired) {
    const rawParts = [esim || 'EXPIRED', smdp || 'EXPIRED'].filter(Boolean);
    return {
      statusKey: 'expired',
      label: isEn ? 'Expired' : 'Expirada',
      colorName: 'red',
      dotClass: 'bg-red-500',
      textClass: 'text-red-500 dark:text-red-400',
      badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30',
      rawTechnical: rawParts.length > 0 ? rawParts.join(' / ') : 'EXPIRED',
    };
  }

  // 3. VERDE: "Activa"
  // Si la tarjeta está consumiendo datos en la red (> 0 MB) o está ENABLED / IN_USE en la red
  const hasTraffic = usedBytes > 0 || usedMb > 0 || percentageUsed > 0;
  const isOperatorActive = esim.includes('IN_USE') || smdp.includes('ENABLED') || esim.includes('ACTIVATED') || esim.includes('ACTIVE');

  if (hasTraffic || isOperatorActive) {
    const rawParts = [esim || 'ACTIVE', smdp || 'IN_USE'].filter(Boolean);
    return {
      statusKey: 'active',
      label: isEn ? 'Active' : 'Activa',
      colorName: 'emerald',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30',
      rawTechnical: rawParts.join(' / '),
    };
  }

  // 3. NARANJA: "Instalada (Sin Activar)"
  // eSIM generada o instalada en el dispositivo del cliente pero sin tráfico/consumo todavía.
  const hasEsim = !!(order?.realIccid || order?.esimTranNo || order?.iccid || telemetry?.esimStatus || smdp);

  if (hasEsim) {
    const rawParts = [esim || 'GOT_RESOURCE', smdp || 'INSTALLED'].filter(Boolean);
    return {
      statusKey: 'installed_inactive',
      label: isEn ? 'Installed (Not Activated)' : 'Instalada (Sin Activar)',
      colorName: 'amber',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30',
      rawTechnical: rawParts.join(' / '),
    };
  }

  // 4. Por defecto / Pendiente de asignación de eSIM
  return {
    statusKey: 'pending',
    label: isEn ? 'Pending Installation' : 'Pendiente de Instalación',
    colorName: 'zinc',
    dotClass: 'bg-zinc-400',
    textClass: 'text-zinc-600 dark:text-zinc-400',
    badgeClass: 'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border border-zinc-400/30',
    rawTechnical: [esim, smdp].filter(Boolean).join(' / ') || 'AVAILABLE',
  };
}

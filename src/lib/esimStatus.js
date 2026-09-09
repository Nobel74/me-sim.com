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

  // 1. ROJO: "Finalizado"
  // Si el SM-DP+ indica DELETED/EXPIRED, o la red indica TERMINATED/FINISHED, o alcanzó el 100% de datos, o expiró por días de validez
  let isExpiredByDate = false;
  if (order?.createdAt || order?.date) {
    try {
      const created = new Date(order.createdAt || order.date);
      const days = parseInt(order.days || order.plan?.match(/(\d+)\s*Days?/i)?.[1] || '0', 10);
      if (!isNaN(created.getTime()) && days > 0) {
        const expiry = created.getTime() + days * 24 * 60 * 60 * 1000;
        if (Date.now() > expiry) {
          isExpiredByDate = true;
        }
      }
    } catch {}
  }

  const isCancelled = order?.status?.toLowerCase() === 'cancelled' || order?.status?.toLowerCase() === 'refunded';

  const isFinished =
    isCancelled ||
    smdp.includes('DELETED') ||
    smdp.includes('EXPIRED') ||
    smdp.includes('TERMINATED') ||
    esim.includes('DELETED') ||
    esim.includes('EXPIRED') ||
    esim.includes('FINISHED') ||
    esim.includes('CANCEL') ||
    percentageUsed >= 100 ||
    isExpiredByDate;

  if (isFinished) {
    return {
      statusKey: 'finished',
      label: isEn ? 'Finished' : 'Finalizado',
      colorName: 'red',
      dotClass: 'bg-red-500',
      textClass: 'text-red-600 dark:text-red-400',
      badgeClass: 'bg-red-500/15 text-red-700 dark:text-red-400 border border-red-500/30',
      rawTechnical: smdp || esim ? `${esim || 'GOT_RESOURCE'} (${smdp || 'DELETED'})` : 'DELETED',
    };
  }

  // 2. VERDE: "Activa"
  // REGLA ESTRICTA: Hasta que no haya consumo de datos (> 0 MB), NUNCA pasa a estado "Activa".
  const hasTraffic = usedBytes > 0 || usedMb > 0 || percentageUsed > 0;

  if (hasTraffic) {
    return {
      statusKey: 'active',
      label: isEn ? 'Active' : 'Activa',
      colorName: 'emerald',
      dotClass: 'bg-emerald-500',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      badgeClass: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30',
      rawTechnical: smdp || esim ? `${esim || 'ACTIVE'} (${smdp || 'IN_USE'})` : 'ACTIVE',
    };
  }

  // 3. NARANJA: "Instalada (Sin Activar)"
  // eSIM generada o instalada en el dispositivo del cliente pero sin tráfico/consumo todavía.
  const hasEsim = !!(order?.esimTranNo || order?.iccid || telemetry?.esimStatus || smdp);

  if (hasEsim) {
    return {
      statusKey: 'installed_inactive',
      label: isEn ? 'Installed (Not Activated)' : 'Instalada (Sin Activar)',
      colorName: 'amber',
      dotClass: 'bg-amber-500',
      textClass: 'text-amber-600 dark:text-amber-400',
      badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-500/30',
      rawTechnical: smdp || esim ? `${esim || 'INSTALLED'} (${smdp || 'INSTALLED'})` : 'INSTALLED',
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
    rawTechnical: smdp || esim ? `${esim} (${smdp})` : 'AVAILABLE',
  };
}

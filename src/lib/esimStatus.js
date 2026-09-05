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

  const isFinished =
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

  // 2. NARANJA: "Instalada (Sin Activar)"
  // Si se ha escaneado e instalado en el dispositivo pero el tráfico consumido es 0
  const isInstalled =
    smdp.includes('INSTALLED') ||
    smdp.includes('DOWNLOADED') ||
    esim.includes('INSTALLED') ||
    esim.includes('DOWNLOADED') ||
    esim.includes('GOT_RESOURCE');

  const hasNoTraffic = usedBytes === 0 && usedMb === 0 && percentageUsed === 0;

  if (isInstalled && hasNoTraffic) {
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

  // 3. VERDE: "Activa"
  // Tiene consumo en curso o está activa en la red de telecomunicaciones
  const isTrafficActive = usedBytes > 0 || usedMb > 0 || percentageUsed > 0;
  const isStatusActive = esim.includes('ACTIVE') || smdp.includes('ENABLED') || smdp.includes('IN_USE');

  if (isTrafficActive || isStatusActive) {
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

  // 4. Por defecto / Nueva compra pendiente de instalación
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

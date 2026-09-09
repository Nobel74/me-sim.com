# PROTOCOLO GENERAL DE SEGURIDAD (APLICA A TODOS LOS AGENTES)
* POLÍTICA DE NO REGRESIÓN: Prohibido refactorizar, mover o sobrescribir código, componentes o configuraciones existentes sin auditar previamente sus dependencias.
* CONTROL DE VERSIONES Y BACKUPS: Antes de aplicar cualquier cambio, verifica estar en una rama de trabajo aislada (ej. `feature/...`) o solicita confirmación previa al usuario.
* ARCHIVOS PROTEGIDOS: No modificar bajo ningún concepto `.env.local`, `next.config.js`, `tailwind.config.js`, `postcss.config.js`, `package.json` ni `jsconfig.json` a menos que sea el objetivo explícito del requerimiento.
* CAMBIOS ATÓMICOS: Modifica únicamente los archivos estrictamente necesarios para la tarea asignada dentro de `src/`.
* DATOS REALES EN /ADMIN (CERO MOCKS/FALLBACKS/CACHÉ): En toda la sección `/admin` y sus endpoints asociados (`src/app/admin`, `src/app/api/admin`), las soluciones deben basarse obligatoriamente en datos en vivo obtenidos de la API de StrongeSIM. Queda estrictamente prohibido introducir mockups, fallbacks artificiales o datos estáticos en caché. Cualquier modificación debe preservar íntegramente la estabilidad y funcionalidades ya operativas.

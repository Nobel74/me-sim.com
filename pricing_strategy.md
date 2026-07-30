# Estrategia de Precios y Márgenes por Región - ME-SIM

Este fichero sirve como referencia para los multiplicadores y márgenes aplicados sobre el precio de coste del proveedor (StrongeSIM) en el frontend de Next.js.

| Región en la Web | Código Técnico | Multiplicador Recomendado | Margen Neto Estimado (Sin IVA) | Estrategia Comercial |
| :--- | :---: | :---: | :---: | :--- |
| **Europa** | `europe` | **2.10** *(+110%)* | **45%** | **Máxima rentabilidad.** El coste del proveedor es el más bajo del catálogo. Un recargo del 110% mantiene los precios de venta muy baratos pero te da el mayor margen neto. |
| **Europa & Marruecos** | `europe-morocco` | **2.05** *(+105%)* | **43%** | **Valor añadido.** Al añadir Marruecos el coste sube ligeramente, pero sigue teniendo un margen excelente y muy competitivo. |
| **Norteamérica** | `north-america` | **1.95** *(+95%)* | **38%** | **Destino de alto volumen.** EEUU, Canadá y México tienen costes bajos y un flujo enorme de turistas. Mantiene precios atractivos con gran margen. |
| **Alianza AUKUS** | `aukus` | **1.95** *(+95%)* | **38%** | **Plan corporativo/viajero.** Cubre Australia, Reino Unido y EEUU. Un multiplicador del 1.95 es ideal para este perfil de viajero de negocios. |
| **China + Hong Kong + Macao** | `china-hk-macau` | **1.90** *(+90%)* | **36%** | **Cuadre de Emiratos.** Mantiene la proporción idónea de coste/venta que cuadra el precio exacto de las £6.76. |
| **Japón, Corea & Taiwán** | `east-asia` | **1.85** *(+85%)* | **35%** | **Asia tecnológica.** Destinos muy populares. El coste de la red en estos tres países es medio, por lo que un 1.85 da un precio de venta equilibrado. |
| **Sudeste Asiático** | `southeast-asia` | **1.85** *(+85%)* | **35%** | **Destino vacacional estrella.** Tailandia, Vietnam, etc. Requieren precios competitivos frente a alternativas locales; el 1.85 es el punto óptimo. |
| **Asia** | `asia` | **1.80** *(+80%)* | **33%** | **Plan multpaís amplio.** Cubre 18 países. Un coste de red un poco mayor exige bajar a 1.80 para no inflar el precio final de cara al público. |
| **Oriente Medio** | `middle-east` | **1.80** *(+80%)* | **33%** | **Destinos de negocios.** Al igual que el plan general de Asia, el coste de red requiere un recargo controlado del 80%. |
| **Australia & Nueva Zelanda** | `australia-new-zealand` | **1.80** *(+80%)* | **33%** | **Larga distancia.** Destino típico de vacaciones largas donde el coste de red es moderado. |
| **África** | `africa` | **1.65** *(+65%)* | **26%** | **Destino de coste alto.** El coste mayorista de los operadores africanos es elevado. Un factor de 1.65 evita que los planes de 5GB o 10GB parezcan prohibitivos. |
| **Sudamérica** | `south-america` | **1.60** *(+60%)* | **24%** | **Coste elevado.** Los acuerdos con operadoras en Sudamérica tienen tarifas altas. Margen ajustado al 60% para priorizar volumen de venta. |
| **Caribe** | `caribbean` | **1.50** *(+50%)* | **19%** | **Protección de conversión.** Es la región con el coste de proveedor más caro del catálogo. Margen mínimo del 50% para no ahuyentar al cliente final. |

# Estrategia de Precios y Márgenes por Región - ME-SIM

Este fichero sirve como referencia para los multiplicadores y márgenes aplicados sobre el precio de coste del proveedor (StrongeSIM) en el frontend de Next.js.

| Región en la Web | Código Técnico | Multiplicador Recomendado | Margen Neto Estimado (Sin IVA) | Estrategia Comercial |
| :--- | :---: | :---: | :---: | :--- |
| **Europa** | `europe` | **1.81** *(+81%)* | **32%** | **Máxima rentabilidad.** El coste del proveedor es el más bajo del catálogo. Un recargo del 81% mantiene los precios de venta muy baratos pero te da el mayor margen neto. |
| **Europa & Marruecos** | `europe-morocco` | **1.76** *(+76%)* | **30%** | **Valor añadido.** Al añadir Marruecos el coste sube ligeramente, pero sigue teniendo un margen excelente y muy competitivo. |
| **Norteamérica** | `north-america` | **1.66** *(+66%)* | **27%** | **Destino de alto volumen.** EEUU, Canadá y México tienen costes bajos y un flujo enorme de turistas. Mantiene precios atractivos con gran margen. |
| **Alianza AUKUS** | `aukus` | **1.66** *(+66%)* | **27%** | **Plan corporativo/viajero.** Cubre Australia, Reino Unido y EEUU. Un multiplicador del 1.66 es ideal para este perfil de viajero de negocios. |
| **China + Hong Kong + Macao** | `china-hk-macau` | **1.62** *(+62%)* | **25%** | **Cuadre de China.** Ajustado proporcionalmente. |
| **Japón, Corea & Taiwán** | `east-asia` | **1.60** *(+60%)* | **24%** | **Asia tecnológica.** Destinos muy populares. El coste de la red en estos tres países es medio, por lo que un 1.60 da un precio de venta equilibrado. |
| **Sudeste Asiático** | `southeast-asia` | **1.60** *(+60%)* | **24%** | **Destino vacacional estrella.** Tailandia, Vietnam, etc. Requieren precios competitivos frente a alternativas locales; el 1.60 es el punto óptimo. |
| **Oriente Medio** | `middle-east` | **1.61** *(+61%)* | **25%** | **Ajustado a UAE.** Especialmente diseñado para clavar la eSIM de Emiratos a £6.76 basado en el coste real devuelto por la API. |
| **Asia** | `asia` | **1.54** *(+54%)* | **21%** | **Plan multpaís amplio.** Cubre 18 países. Un coste de red un poco mayor exige bajar a 1.54 para no inflar el precio final de cara al público. |
| **Australia & Nueva Zelanda** | `australia-new-zealand` | **1.54** *(+54%)* | **21%** | **Larga distancia.** Destino típico de vacaciones largas donde el coste de red es moderado. |
| **África** | `africa` | **1.41** *(+41%)* | **14%** | **Destino de coste alto.** El coste mayorista de los operadores africanos es elevado. Un factor de 1.41 evita que los planes de 5GB o 10GB parezcan prohibitivos. |
| **Sudamérica** | `south-america` | **1.37** *(+37%)* | **11%** | **Coste elevado.** Los acuerdos con operadoras en Sudamérica tienen tarifas altas. Margen ajustado al 37% para priorizar volumen de venta. |
| **Caribe** | `caribbean` | **1.28** *(+28%)* | **5%** | **Protección de conversión.** Es la región con el coste de proveedor más caro del catálogo. Margen mínimo del 28% para no ahuyentar al cliente final. |

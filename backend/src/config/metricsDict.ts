export const METRICS_DICTIONARY = `
## Diccionario de Métricas Operacionales de Rappi

Las métricas se reportan semanalmente con 9 semanas de historia (L8W_ROLL = más antigua, L0W_ROLL = más reciente).

1. **% PRO Users Who Breakeven**: Porcentaje de usuarios con suscripción Rappi Pro que han recuperado el costo de su suscripción mediante descuentos acumulados. Indica la salud del programa Pro.

2. **% Restaurants Sessions With Optimal Assortment**: Porcentaje de sesiones en restaurantes donde el usuario encontró el surtido óptimo disponible (menú completo, sin items agotados). Refleja la disponibilidad del catálogo.

3. **Gross Profit UE**: Ganancia bruta por unidad económica (pedido) en la zona. Métrica financiera clave que indica la rentabilidad por transacción.

4. **Lead Penetration**: Porcentaje de usuarios que realizaron su primer pedido en zonas o categorías nuevas. Mide la expansión del comportamiento de compra.

5. **MLTV Top Verticals Adoption**: Adopción de las verticales con mayor valor de vida del cliente (restaurantes premium, mercado, etc.). Indica la diversificación del uso de la plataforma.

6. **Non-Pro PTC > OP**: Porcentaje de usuarios no-Pro cuyo Precio Total de Compra supera el precio objetivo (OP). Identifica usuarios candidatos a conversión Pro.

7. **Perfect Orders**: Porcentaje de pedidos completados sin incidencias (sin cancelaciones, sin demoras mayores a 30 minutos, sin reclamos). Principal métrica de calidad operacional.

8. **Pro Adoption**: Porcentaje de usuarios activos que tienen suscripción Rappi Pro activa. Mide la penetración del programa de fidelidad.

9. **Restaurants Markdowns / GMV**: Ratio de descuentos en restaurantes sobre el Gross Merchandise Value. Mide el costo de los incentivos comerciales.

10. **Restaurants SS > ATC CVR**: Tasa de conversión de Search Sessions a Add To Cart en restaurantes. Mide la efectividad del descubrimiento de productos.

11. **Restaurants SST > SS CVR**: Tasa de conversión de Search Session Touches a Search Sessions en restaurantes. Mide el engagement en búsqueda.

12. **Retail SST > SS CVR**: Tasa de conversión de Search Session Touches a Search Sessions en retail/mercado. Igual que la anterior pero para verticales de retail.

13. **Turbo Adoption**: Porcentaje de pedidos realizados a través de Turbo (servicio de entrega ultra-rápida < 20 minutos). Mide la adopción del servicio premium de velocidad.
`.trim();

export const BUSINESS_RULES = `
## Contexto de Negocio — Rappi Operations

### Países de operación
AR (Argentina), BR (Brasil), CL (Chile), CO (Colombia), CR (Costa Rica), EC (Ecuador), MX (México), PE (Perú), UY (Uruguay).

### Tipos de zona
- **Wealthy**: Zonas de alto poder adquisitivo. Benchmark de referencia para métricas como Pro Adoption y Gross Profit UE.
- **Non Wealthy**: Zonas de nivel socioeconómico medio-bajo. Mayor sensibilidad al precio; métricas como Turbo Adoption suelen ser más bajas.

### Priorización de zonas
- **High Priority**: Zonas estratégicas con mayor inversión y atención operacional.
- **Prioritized**: Zonas con relevancia operacional media.
- **Not Prioritized**: Zonas con menor foco operacional actual.

### Estructura de datos
- Cada fila representa una combinación única de (COUNTRY, CITY, ZONE, METRIC).
- Las semanas van de L8W_ROLL (8 semanas atrás) a L0W_ROLL (semana más reciente).
- Para órdenes, las columnas son L8W a L0W (sin sufijo _ROLL).

### Reglas de análisis
- Una anomalía es un cambio > 10% entre L0W_ROLL y L1W_ROLL.
- Una tendencia preocupante son 3 o más semanas consecutivas de caída.
- El benchmarking compara zonas del mismo ZONE_TYPE dentro del mismo país.
- Al comparar semanas, siempre usa L0W_ROLL como la semana más reciente.
`.trim();

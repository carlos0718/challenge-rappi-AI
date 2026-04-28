import type Anthropic from "@anthropic-ai/sdk";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "filter_zones",
    description:
      "Filtra zonas según una métrica, operador de comparación y umbral para una semana específica. Útil para queries como 'top N zonas con mayor X'.",
    input_schema: {
      type: "object",
      properties: {
        metric:    { type: "string", description: "Nombre exacto de la métrica (ej: 'Lead Penetration', 'Perfect Orders')" },
        operator:  { type: "string", enum: [">", "<", ">=", "<=", "=="], description: "Operador de comparación" },
        threshold: { type: "number", description: "Valor umbral para filtrar" },
        week:      { type: "string", enum: ["L0W_ROLL","L1W_ROLL","L2W_ROLL","L3W_ROLL","L4W_ROLL","L5W_ROLL","L6W_ROLL","L7W_ROLL","L8W_ROLL"], description: "Semana de referencia (L0W_ROLL = más reciente)" },
        top_n:     { type: "number", description: "Si se especifica, retorna solo los N primeros resultados ordenados por valor desc" },
        country:   { type: "string", description: "Filtrar por país (ej: 'CO', 'MX'). Opcional." },
      },
      required: ["metric", "operator", "threshold", "week"],
    },
  },
  {
    name: "compare_segments",
    description:
      "Compara el valor promedio de una métrica entre zonas Wealthy y Non-Wealthy, opcionalmente filtrado por país.",
    input_schema: {
      type: "object",
      properties: {
        metric:  { type: "string", description: "Nombre de la métrica" },
        week:    { type: "string", enum: ["L0W_ROLL","L1W_ROLL","L2W_ROLL","L3W_ROLL","L4W_ROLL","L5W_ROLL","L6W_ROLL","L7W_ROLL","L8W_ROLL"] },
        country: { type: "string", description: "Código de país (ej: 'MX'). Si se omite, agrega todos los países." },
      },
      required: ["metric", "week"],
    },
  },
  {
    name: "get_trend",
    description:
      "Retorna la evolución semanal de una métrica para una zona específica durante N semanas.",
    input_schema: {
      type: "object",
      properties: {
        zone:    { type: "string", description: "Nombre de la zona (ej: 'Chapinero')" },
        metric:  { type: "string", description: "Nombre de la métrica" },
        n_weeks: { type: "number", description: "Semanas de historia a mostrar (1-8). Con n_weeks=8 retorna desde L8W_ROLL hasta L0W_ROLL inclusive.", minimum: 1, maximum: 8 },
        country: { type: "string", description: "Código de país para desambiguar zonas con el mismo nombre. Opcional." },
      },
      required: ["zone", "metric", "n_weeks"],
    },
  },
  {
    name: "aggregate_by",
    description:
      "Agrega (promedia) una métrica agrupando por país o por tipo de zona (Wealthy/Non-Wealthy).",
    input_schema: {
      type: "object",
      properties: {
        dimension: { type: "string", enum: ["country", "zone_type"], description: "Dimensión de agrupación" },
        metric:    { type: "string", description: "Nombre de la métrica" },
        week:      { type: "string", enum: ["L0W_ROLL","L1W_ROLL","L2W_ROLL","L3W_ROLL","L4W_ROLL","L5W_ROLL","L6W_ROLL","L7W_ROLL","L8W_ROLL"] },
      },
      required: ["dimension", "metric", "week"],
    },
  },
  {
    name: "multivariate_analysis",
    description:
      "Encuentra zonas que tienen simultáneamente un valor alto en una métrica y bajo en otra. Útil para análisis de oportunidades.",
    input_schema: {
      type: "object",
      properties: {
        metric_high:     { type: "string", description: "Métrica que debe ser alta" },
        metric_low:      { type: "string", description: "Métrica que debe ser baja" },
        threshold_high:  { type: "number", description: "Percentil mínimo para considerar 'alto' (0-100, default 90). Usar 90 o más para encontrar zonas realmente destacadas." },
        threshold_low:   { type: "number", description: "Percentil máximo para considerar 'bajo' (0-100, default 10). Usar 10 o menos para encontrar zonas realmente rezagadas." },
        week:            { type: "string", enum: ["L0W_ROLL","L1W_ROLL","L2W_ROLL","L3W_ROLL","L4W_ROLL","L5W_ROLL","L6W_ROLL","L7W_ROLL","L8W_ROLL"] },
      },
      required: ["metric_high", "metric_low", "week"],
    },
  },
  {
    name: "get_growth_zones",
    description:
      "Retorna las zonas con mayor crecimiento en órdenes durante las últimas N semanas.",
    input_schema: {
      type: "object",
      properties: {
        n_weeks: { type: "number", description: "Ventana de semanas para calcular crecimiento (1-8)", minimum: 1, maximum: 8 },
        top_n:   { type: "number", description: "Número de zonas a retornar (default 10)" },
        country: { type: "string", description: "Filtrar por país. Opcional." },
      },
      required: ["n_weeks"],
    },
  },
];

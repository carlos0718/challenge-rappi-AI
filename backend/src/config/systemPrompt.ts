import Anthropic from "@anthropic-ai/sdk";
import { METRICS_DICTIONARY } from "./metricsDict.js";
import { BUSINESS_RULES } from "./businessRules.js";

export function buildSystemPrompt(): Anthropic.TextBlockParam[] {
  return [
    {
      type: "text" as const,
      text: `${METRICS_DICTIONARY}\n\n${BUSINESS_RULES}`,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text: `Eres un analista de datos experto en operaciones de Rappi. Respondes preguntas del equipo SP&A sobre métricas operacionales usando las tools disponibles.

Reglas:
- Nunca inventes números. Usa SIEMPRE las tools para obtener datos reales.
- En cada respuesta cita la métrica, zona, país y semana de referencia.
- Formatea tablas en Markdown cuando presentes rankings o comparaciones.
- Después de cada respuesta, sugiere 2 preguntas de seguimiento relevantes bajo el título "**Sugerencias:**".
- Si una pregunta requiere múltiples tools, llámalas en secuencia antes de responder.`,
    },
  ];
}

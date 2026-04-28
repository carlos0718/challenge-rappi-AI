# EXPLAIN — Conceptos Técnicos de Anthropic

Glosario de los conceptos de la API de Anthropic que se usan en este proyecto. Se actualiza durante la implementación.

---

## 1. Tool Use (Function Calling)

**¿Qué es?**
Permite que Claude "llame" funciones externas cuando necesita información que no tiene. Claude decide cuándo y qué tool usar basándose en la pregunta del usuario.

**Cómo funciona el ciclo:**
```
1. Envías a Claude: { messages, tools: [...definiciones] }
2. Claude responde con stop_reason: "tool_use" y un bloque:
   { type: "tool_use", id: "toolu_xxx", name: "filter_zones", input: { metric: "...", ... } }
3. Tu código ejecuta la función real con ese input
4. Envías el resultado a Claude:
   { type: "tool_result", tool_use_id: "toolu_xxx", content: "{ zones: [...] }" }
5. Claude procesa el resultado y responde al usuario (stop_reason: "end_turn")
```

**Estructura de una tool definition:**
```typescript
{
  name: "filter_zones",
  description: "Filtra zonas por métrica, operador y umbral",
  input_schema: {
    type: "object",
    properties: {
      metric:    { type: "string" },
      operator:  { type: "string", enum: [">", "<", ">=", "<="] },
      threshold: { type: "number" },
      week:      { type: "string" }
    },
    required: ["metric", "operator", "threshold", "week"]
  }
}
```

**Documentación oficial**: https://docs.anthropic.com/en/docs/build-with-claude/tool-use

---

## 2. Prompt Caching

**¿Qué es?**
Permite "marcar" partes del prompt que no cambian entre llamadas para que Anthropic las almacene temporalmente. Las llamadas siguientes que reutilizan ese bloque se cobran al 10% del precio normal.

**Cuándo usar:**
- System prompts largos (diccionarios, reglas de negocio, documentación)
- Contexto que se repite en múltiples conversaciones
- Cualquier bloque de texto >1,024 tokens que no cambia

**Cómo habilitarlo:**
```typescript
system: [
  {
    type: "text",
    text: "...diccionario de 13 métricas + reglas de negocio...",
    cache_control: { type: "ephemeral" }  // ← marca este bloque como cacheable
  },
  {
    type: "text",
    text: "Instrucción dinámica que cambia por request"
    // Sin cache_control → no se cachea
  }
]
```

**TTL del cache:**
- `ephemeral`: 5 minutos de vida
- Para el diccionario de métricas de Rappi (bloque fijo), es suficiente si hay actividad frecuente

**Cómo verificar que funciona:**
```typescript
// En el response de la API, revisar:
console.log(response.usage);
// {
//   input_tokens: 150,             ← tokens NO cacheados (se cobran normal)
//   cache_creation_input_tokens: 1800,  ← tokens que se cachearon (se cobran 1.25×)
//   cache_read_input_tokens: 1800,      ← tokens leídos del cache (se cobran 0.10×)
//   output_tokens: 350
// }
```

**Ahorro en este proyecto:**
- Diccionario de métricas + contexto Rappi ≈ 1,800 tokens por llamada
- Sin cache: 1,800 × $3/1M = $0.0054 por llamada
- Con cache hit: 1,800 × $0.30/1M = $0.00054 por llamada
- **10× más barato** en sesiones multi-pregunta

**Documentación oficial**: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching

---

## 3. System Prompts

**¿Qué es?**
El campo `system` de la API define el rol y contexto base de Claude antes de la conversación. Se envía fuera del array `messages[]`.

**Estructura en este proyecto:**
```typescript
// Puede ser string simple o array de bloques (necesario para caching)
const systemPrompt: TextBlockParam[] = [
  {
    type: "text",
    text: METRICS_DICTIONARY,          // ← contexto fijo, cacheable
    cache_control: { type: "ephemeral" }
  },
  {
    type: "text",
    text: "Eres un analista de datos de Rappi. Usa las tools disponibles..."
  }
];
```

**Buenas prácticas:**
- Separar el contexto fijo (cacheable) de la instrucción dinámica
- Definir claramente el rol, formato de respuesta esperado y restricciones
- Incluir ejemplos de buenas respuestas (few-shot) en el bloque cacheado

---

## 4. Conversation History (messages[])

**¿Qué es?**
La API de Anthropic es stateless — no recuerda conversaciones previas. Para mantener contexto, debes enviar el historial completo en cada llamada dentro del array `messages`.

**Estructura del historial:**
```typescript
const messages: MessageParam[] = [
  { role: "user", content: "Top 5 zonas con mayor Lead Penetration" },
  {
    role: "assistant",
    content: [
      { type: "tool_use", id: "toolu_001", name: "filter_zones", input: {...} }
    ]
  },
  {
    role: "user",
    content: [
      { type: "tool_result", tool_use_id: "toolu_001", content: '{"zones": [...]}' }
    ]
  },
  {
    role: "assistant",
    content: [{ type: "text", text: "Las top 5 zonas son: Chapinero, Polanco..." }]
  },
  { role: "user", content: "¿Y cuál es la tendencia de Chapinero?" }  // ← siguiente pregunta
];
```

**En este proyecto:**
- Se almacena en `ConversationStore` (Map en memoria) indexado por `sessionId`
- Cada nueva pregunta del usuario se añade al array antes de llamar a la API
- La respuesta de Claude (incluyendo `tool_use` blocks) también se guarda

**Nota importante:**
Los `tool_result` blocks deben enviarse con `role: "user"`, no con `role: "assistant"`.

---

## 5. Stop Reasons

**¿Qué es?**
`response.stop_reason` indica por qué Claude dejó de generar texto. Es la señal clave para controlar el agentic loop.

| `stop_reason` | Significado | Acción en el agentic loop |
|---------------|-------------|--------------------------|
| `"end_turn"` | Claude terminó de responder | Devolver respuesta al usuario |
| `"tool_use"` | Claude quiere llamar una tool | Ejecutar tool(s) y continuar el loop |
| `"max_tokens"` | Se alcanzó el límite de tokens | Manejar error o pedir continuación |
| `"stop_sequence"` | Se encontró una secuencia de parada | Poco común, manejar como end_turn |

**Agentic loop basado en stop_reason:**
```typescript
while (true) {
  const response = await anthropic.messages.create({ ... });
  messages.push({ role: "assistant", content: response.content });

  if (response.stop_reason === "end_turn") {
    return getTextFromContent(response.content);  // ← salir del loop
  }

  if (response.stop_reason === "tool_use") {
    const results = await executeAllTools(response.content);
    messages.push({ role: "user", content: results });
    // continuar el loop
  }
}
```

---

## 6. Streaming

**¿Qué es?**
Permite recibir la respuesta de Claude token a token en lugar de esperar la respuesta completa. Mejora la experiencia en el chat del frontend.

**Cuándo usar:**
- Respuestas largas (análisis de tendencias, reportes ejecutivos)
- Cuando el usuario espera más de 2-3 segundos por la respuesta

**Cómo activarlo:**
```typescript
const stream = anthropic.messages.stream({
  model: "claude-sonnet-4-6",
  max_tokens: 4096,
  system: systemPrompt,
  messages
});

// Enviar tokens al frontend via Server-Sent Events (SSE)
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    res.write(`data: ${event.delta.text}\n\n`);
  }
}

const finalMessage = await stream.finalMessage();
```

**Nota:** Cuando se usa streaming con tools, el agentic loop se complica. Recomendado activarlo solo para la respuesta final (después del último `end_turn`).

---

## 7. Extended Thinking (Bonus)

**¿Qué es?**
Permite que Claude "piense" antes de responder, explorando múltiples enfoques internamente. Útil para análisis complejos como correlaciones entre múltiples métricas.

**Cuándo usar en este proyecto:**
- Análisis inferencial complejo: "¿Qué explica el crecimiento de estas zonas?"
- Detección de patrones no obvios en correlaciones entre 13 métricas
- Recomendaciones estratégicas del reporte ejecutivo

**Cómo activarlo:**
```typescript
const response = await anthropic.messages.create({
  model: "claude-sonnet-4-6",
  max_tokens: 16000,
  thinking: {
    type: "enabled",
    budget_tokens: 8000  // ← tokens que Claude puede usar para "pensar"
  },
  messages: [...]
});

// La respuesta incluye bloques de tipo "thinking" (internos, no se muestran al usuario)
// y bloques de tipo "text" (la respuesta final)
```

**Costo adicional:** Los thinking tokens se cobran igual que los output tokens. Activar solo cuando la complejidad lo justifica.

**Documentación oficial**: https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking

---

## 8. Modelos disponibles (referencia)

| Modelo | ID | Uso recomendado |
|--------|----|-----------------|
| Claude Sonnet 4.6 | `claude-sonnet-4-6` | **Este proyecto** — balance costo/calidad |
| Claude Opus 4.7 | `claude-opus-4-7` | Análisis más complejos (mayor costo) |
| Claude Haiku 4.5 | `claude-haiku-4-5-20251001` | Clasificaciones simples (menor costo) |

Precio de Sonnet 4.6 (referencia):
- Input: $3.00 / 1M tokens
- Output: $15.00 / 1M tokens
- Cache write: $3.75 / 1M tokens (1.25×)
- Cache read: $0.30 / 1M tokens (0.10×)

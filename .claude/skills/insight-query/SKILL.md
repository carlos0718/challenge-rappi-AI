# /insight-query

Invoca el bot conversacional de análisis operacional de Rappi.

## Uso
```
/insight-query <pregunta en lenguaje natural>
```

## Ejemplos
- `/insight-query Top 5 zonas con mayor Lead Penetration esta semana`
- `/insight-query Compara Perfect Orders entre Wealthy y Non-Wealthy en México`
- `/insight-query Evolución de Gross Profit UE en Chapinero últimas 8 semanas`
- `/insight-query Promedio de Lead Penetration por país`
- `/insight-query Zonas con alta Lead Penetration pero bajo Perfect Order`

## Comportamiento
Llama a `POST http://localhost:3001/api/v1/insight-query` con la pregunta y un sessionId de sesión. Mantiene el historial de la conversación. Tras cada respuesta muestra sugerencias de preguntas de seguimiento.

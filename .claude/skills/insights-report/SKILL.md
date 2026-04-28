# /insights-report

Genera el reporte ejecutivo automático de insights operacionales para la semana más reciente.

## Uso
```
/insights-report
```

## Comportamiento
Llama a `POST http://localhost:3001/api/v1/insights-report`. Ejecuta el pipeline completo: detección de anomalías (>10% WoW), tendencias preocupantes (3+ semanas de caída), benchmarking entre peers, y correlaciones entre métricas. Devuelve los top 5 hallazgos con recomendaciones accionables.

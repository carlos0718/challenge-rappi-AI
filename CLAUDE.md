# Sistema de Análisis Inteligente para Operaciones Rappi

## Descripción del proyecto

Sistema de análisis conversacional para democratizar el acceso a insights operacionales de Rappi. Permite a equipos SP&A consultar métricas en lenguaje natural y recibir reportes ejecutivos automáticos semanales.

- **9 países**: AR, BR, CL, CO, CR, EC, MX, PE, UY
- **13 métricas operacionales** (ver diccionario en `src/config/metricsDict.ts`)
- **Zonas**: Wealthy / Non-Wealthy
- **Datos**: 3 sheets del Excel exportados a CSV en `data/`:
  - `raw_input_metrics.csv` — 12,574 filas, columnas `L8W_ROLL … L0W_ROLL`, formato largo (una fila por zona+métrica)
  - `raw_orders.csv` — 1,243 filas, columnas `L8W … L0W`, sin sufijo `_ROLL`
  - `ZONE_PRIORITIZATION`: `Not Prioritized` / `Prioritized` / `High Priority`

## Stack técnico

| Capa | Tecnología |
|------|------------|
| LLM | Claude Sonnet 4.6 (`claude-sonnet-4-6`) |
| Backend | Node.js 20 + Express + TypeScript |
| Frontend | React 19 + Vite 5 |
| Data processing | Danfo.js + mathjs + simple-statistics |
| Visualización | Recharts / Plotly.js |
| Tablas | TanStack Table |
| Scheduler | node-cron |
| SDK | @anthropic-ai/sdk |

## Variables de entorno

```
ANTHROPIC_API_KEY=sk-ant-...
PORT=3001
METRICS_CSV_PATH=./data/raw_input_metrics.csv
ORDERS_CSV_PATH=./data/raw_orders.csv
```

Copiar `.env.example` a `.env` y completar con credenciales reales.

## Comandos

```bash
npm run setup        # instala dependencias + genera .claude/settings.local.json con rutas absolutas
npm run dev          # servidor de desarrollo (backend + frontend)
npm run build        # build de producción
npm test             # ejecutar tests
npm run lint         # linting TypeScript
```

`npm run setup` ejecuta `scripts/init-claude.js`, que reemplaza los `$PWD` de `.claude/settings.example.json` con la ruta absoluta real del proyecto y genera `.claude/settings.local.json`. Este archivo es ignorado por git — nunca se commitea.

## Arquitectura

### Patrón: Monorepo + Feature-based

El proyecto vive en un único repositorio con dos paquetes (`backend/` y `frontend/`) coordinados por **npm workspaces**. Dentro del backend, el código se organiza por **features** (capacidades del sistema), no por capas técnicas.

**¿Por qué no MVC?** MVC encaja cuando hay modelos de base de datos y vistas server-side. Aquí no hay DB ni vistas — el backend es pura API REST + lógica de LLM. El patrón Controller/Model/View no aporta claridad en este contexto.

**¿Por qué no Clean Architecture?** Clean Architecture (entities → use cases → adapters → frameworks) genera mucho boilerplate (interfaces, mappers, puertos) innecesario para un MVP de esta escala y plazo de entrega.

**¿Por qué Feature-based?** Cada carpeta es una capacidad independiente del sistema. Quien navega el código entiende de inmediato qué hace cada parte. Escala naturalmente si se agregan más skills o tools.

### Convención de Claude Code: `.claude/`

Siguiendo la documentación oficial de Anthropic, los **skills** y **hooks** del proyecto viven en la carpeta `.claude/` del root, no dentro de `src/`:

- **Skills** → `.claude/skills/<nombre>/SKILL.md` — cada skill tiene su propia carpeta con un archivo `SKILL.md` que contiene el prompt de instrucción. Ej: `.claude/skills/insight-query/SKILL.md`.
- **Hooks** → `.claude/settings.json` declara el hook (qué evento lo dispara y qué comando ejecuta). Las funciones que implementan la lógica del hook viven en `backend/src/hooks/`.

La implementación real (TypeScript, Express, Danfo.js) sigue viviendo en `backend/src/`. El `.claude/` es la capa de **orquestación e interfaz** con Claude Code; el `backend/src/` es la capa de **lógica de negocio**.

### Estructura de carpetas

```
challenge-rappi-AI/              ← raíz del monorepo
├── package.json                 ← npm workspaces: ["backend", "frontend"]
├── CLAUDE.md                    ← instrucciones del proyecto para Claude Code
│
├── scripts/
│   └── init-claude.js           ← reemplaza $PWD en settings.example.json → settings.local.json
│
├── .claude/                     ← configuración de Claude Code (Anthropic convention)
│   ├── skills/                  ← cada skill: una carpeta con SKILL.md
│   │   ├── insight-query/
│   │   │   └── SKILL.md         ← /insight-query → bot conversacional
│   │   └── insights-report/
│   │       └── SKILL.md         ← /insights-report → reporte automático
│   ├── agents/                  ← agentes especializados por dominio
│   │   ├── backend-expert.md    ← experto en Node.js, Express, Danfo.js, Anthropic SDK
│   │   └── frontend-expert.md  ← experto en Next.js, React, TanStack, Recharts
│   ├── settings.example.json   ← plantilla commiteada (usa $PWD como placeholder)
│   └── settings.local.json     ← generado por init-claude.js, gitignored (rutas absolutas reales)
│
├── data/
│   ├── raw_input_metrics.csv    ← 12,574 filas (zona+métrica × semana)
│   └── raw_orders.csv           ← 1,243 filas (zona × semana)
│
├── backend/                     ← Node.js 20 + Express + TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── config/              ← system prompt + prompt caching
│       │   ├── systemPrompt.ts
│       │   ├── metricsDict.ts
│       │   └── businessRules.ts
│       ├── tools/               ← 6 herramientas de análisis para Claude
│       │   ├── definitions.ts
│       │   ├── dataLoader.ts
│       │   ├── toolExecutor.ts
│       │   └── implementations/
│       │       ├── filterZones.ts
│       │       ├── compareSegments.ts
│       │       ├── getTrend.ts
│       │       ├── aggregateBy.ts
│       │       ├── multivariateAnalysis.ts
│       │       └── getGrowthZones.ts
│       ├── insightQuery/        ← lógica del bot conversacional (70% del score)
│       │   ├── handler.ts
│       │   ├── conversationStore.ts
│       │   └── proactiveSuggestions.ts
│       ├── insightsReport/      ← lógica de reportes automáticos (30% del score)
│       │   ├── handler.ts
│       │   ├── anomalyDetector.ts
│       │   ├── trendAnalyzer.ts
│       │   ├── benchmarker.ts
│       │   ├── correlationFinder.ts
│       │   └── reportFormatter.ts
│       ├── hooks/               ← funciones invocadas por los hooks de .claude/settings.local.json
│       │   └── weeklyReport.ts  ← lógica del reporte semanal automático
│       └── server.ts            ← Express app + registro de rutas
│
└── frontend/                    ← React 19 + Vite 5 (SPA)
    ├── index.html               ← entry point de Vite
    ├── vite.config.ts           ← proxy /api → localhost:3001
    ├── package.json
    └── src/
        ├── main.tsx             ← monta <App />
        ├── App.tsx              ← tabs Chat / Reportes
        ├── types/api.ts         ← contratos con el backend
        └── components/
            ├── ChatInterface.tsx  ← chat con historial y markdown
            ├── ReportsPanel.tsx   ← panel de reportes automáticos
            └── FindingCard.tsx    ← tarjeta de un finding
```

### Flujo de datos

```
Usuario (pregunta en lenguaje natural)
        ↓
Next.js frontend  →  POST /api/v1/insight-query
        ↓
Express handler (backend/src/skills/insightQuery/handler.ts)
        ↓
Agentic Loop con Claude Sonnet 4.6
  ├─ Claude decide qué tool llamar
  ├─ toolExecutor.ts ejecuta la función sobre los DataFrames Danfo.js
  ├─ resultado → Claude interpreta y responde
  └─ loop hasta stop_reason: "end_turn"
        ↓
Respuesta en lenguaje natural → frontend
```

### Skills principales

#### `/insight-query` — Bot Conversacional (70% del score)
- Endpoint: `POST /api/v1/insight-query`
- Recibe pregunta en lenguaje natural + historial de conversación
- Usa agentic loop con las 6 tools de análisis
- Mantiene contexto entre preguntas de la misma sesión

#### `/insights-report` — Reportes Automáticos (30% del score)
- Endpoint: `POST /api/v1/insights-report`
- Genera resumen ejecutivo con top 5 findings
- Se ejecuta automáticamente cada lunes a las 9am vía `node-cron`
- Detecta anomalías, tendencias, benchmarks y correlaciones

## Convenciones de código

- TypeScript strict mode activado
- Nombres de variables y funciones: `camelCase`
- Nombres de archivos: `camelCase.ts`
- Rutas de API: `/api/v1/...`
- No usar `any` en TypeScript — definir interfaces explícitas
- Todas las llamadas a la API de Anthropic deben incluir prompt caching en el system prompt

## Prompt Caching

El diccionario de métricas y las reglas de negocio deben marcarse como cacheables para reducir costos ~90%:

```typescript
system: [
  {
    type: "text",
    text: METRICS_DICTIONARY + BUSINESS_RULES,
    cache_control: { type: "ephemeral" }
  },
  {
    type: "text",
    text: dynamicInstruction
  }
]
```

## Modelo

Usar siempre `claude-sonnet-4-6`. No cambiar a otro modelo sin actualizar este archivo.

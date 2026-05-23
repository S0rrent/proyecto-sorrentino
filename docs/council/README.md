# Council Decisions — Yatasto

Carpeta para persistir transcripts de decisiones tomadas con el skill
`llm-council` (`.claude/skills/llm-council/`).

> No es un dump de todos los council. Solo entran las decisiones que querés
> poder volver a leer en 6 meses para entender por qué se hizo X o Y.

## Convención de nombres

```
docs/council/
├── YYYY-MM-DD--slug-corto.md
└── README.md
```

Ejemplos:
- `2026-05-25--bottom-bar-4-vs-5-tabs.md`
- `2026-06-02--login-pin-vs-biometrico.md`
- `2026-06-10--migracion-historicos-batch-vs-stream.md`

Slug: minúsculas, guiones, máximo 6 palabras. Que se entienda la decisión sin
abrir el archivo.

## Qué guardar

Cuando el skill termina, genera dos artifacts en el cwd:
- `council-report-[timestamp].html` — visual, efímero (ya en `.gitignore`)
- `council-transcript-[timestamp].md` — texto completo con todos los advisors

Si la decisión vale la pena conservar:
1. Renombrá el `.md` con la convención de arriba
2. Movelo a `docs/council/`
3. Commitealo en el PR de la decisión que tomaste

El `.html` puede borrarse — el `.md` ya contiene todo.

## Estructura recomendada del transcript guardado

Si editás el transcript antes de guardarlo, agregá al header:

```markdown
# [Título de la decisión]

**Fecha**: 2026-05-25
**Contexto**: UX-V2 Fase 1
**Pregunta**: ¿4 tabs o 5 tabs en bottom bar mobile del operario?
**Decisión tomada**: 4 tabs (HOME / OPER / PROD / MÁS)
**PR de implementación**: #25
**Vinculado con**: UX-V2.md §3.1

---

[transcript original del council acá]
```

Eso permite a Claude (o a vos en 6 meses) entender de un vistazo qué se
decidió y dónde se implementó.

## Cuándo NO guardar acá

- Bugs obvios sin tradeoff (no se councilea)
- Decisiones triviales (no se councilea)
- Council sessions exploratorias sin decisión final (descartar)
- Validaciones que terminaron en "no hacer nada" (mencionar en PR, no archivar)

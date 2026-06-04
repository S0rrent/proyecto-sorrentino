# docs/sistema — Documentación ejecutiva del sistema

Dos documentos profesionales del sistema ReciboApp / Yatasto:

| Documento | Para qué | Archivos |
|---|---|---|
| **Estado actual del sistema** | Documento integral para mostrar qué es el sistema, cómo funciona, módulos, roles, permisos, operación, riesgos, guardrails, validación y estado del proyecto. | `estado-actual-sistema.md` · `.html` · `.docx` |
| **Guía visual de uso** | Explicar la app pantalla por pantalla (operario, supervisor, oficina, jefe), con slots para screenshots reales, qué hace cada pantalla, qué NO tocar y errores comunes. | `guia-visual-uso.md` · `.html` · `.docx` |

## Formatos

- **`.md`** — **fuente editable** (la verdad de cada documento). Editá acá.
- **`.html`** — render con estilo, para ver/imprimir en el navegador.
- **`.docx`** — versión final para compartir/editar en Word.
- **`.pdf`** — se generan en disco pero **NO se versionan** (son regenerables; ver `.gitignore`).

## Cómo regenerar

1. Editá el `.md` correspondiente.
2. Regenerá `.html` y `.docx` con [`marked`](https://www.npmjs.com/package/marked) + [`html-to-docx`](https://www.npmjs.com/package/html-to-docx):
   `npm i marked html-to-docx` y un script corto que haga `marked(md)` → HTML y `HTMLtoDOCX(html)` → DOCX.
3. Para el `.pdf`: abrí el `.html` en el navegador → **Ctrl/Cmd+P → Guardar como PDF** (A4 vertical).

## Guía visual — completar las imágenes

La guía visual es una **plantilla**. Cada pantalla tiene un bloque **📷** con la instrucción de qué capturar y qué recuadrar/flechar. Las screenshots reales se sacan del **dispositivo en uso, con datos reales** (la app necesita login y datos para verse representativa), se anotan y se insertan reemplazando el bloque 📷. Lo más práctico para esto es trabajar sobre el `.docx` y pegar las imágenes directamente en Word.

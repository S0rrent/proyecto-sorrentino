# Product

## Register

product

## Users

Operadores de turno, supervisores y jefe de planta en Lacteos Yatasto SA (planta lechera, Argentina). Edad y agudeza visual variable (jóvenes hasta operarios mayores con vista cansada). Trabajan en planta sin guantes. Uso mixto: celular en piso de planta (registro de ingresos, movimientos, controles de turno) y escritorio en oficina (revisión, carga, supervisión). Dos perfiles con permisos distintos: `supervisor` y `jefe` de planta.

## Product Purpose

Sistema único de registro operativo diario que reemplaza planillas en papel. Captura ingresos de leche cruda con parámetros de calidad (pH, acidez, grasa butirosa, SNG, densidad, proteína), movimientos entre silos, cargas despachadas, lotes fortificados, registros CIP de limpieza, y stock por turno. Éxito: que cualquier operario, en piso de planta y con baja luz, pueda registrar una operación en menos de 30 segundos sin error y sin entrenamiento previo.

## Brand Personality

Moderno, minimalista, eficiente. Voz: directa, sin jerga corporativa, en español rioplatense neutro. La interfaz transmite confianza industrial — precisa como un instrumento de medición, no decorativa. Cero "delight" ornamental: cada elemento existe para servir una decisión operativa.

## Anti-references

Sin restricciones explícitas del usuario. Por inferencia (cubierto por las leyes compartidas de impeccable): evitar AI slop genérico, gradient text, glassmorphism decorativo, hero-metric templates SaaS, cards repetidas idénticas.

## Design Principles

1. **Lectura primero, decoración después** — Números y horarios deben leerse a 60cm de un monitor de escritorio o a 30cm de un celular en condiciones de luz industrial variable. Tamaño y peso priman sobre estética.
2. **Una decisión por pantalla** — Cada sección expone la acción dominante del turno. Acciones secundarias se esconden hasta que se las pide.
3. **Responsive de verdad, no mobile estirado** — Escritorio aprovecha el ancho con paneles paralelos (lista + detalle, formulario + preview). Mobile colapsa a stack vertical; ambas vistas son distintas, no la misma escalada.
4. **Consistencia de unidades y tiempos** — Litros, horas (HH:MM), parámetros químicos siempre en el mismo formato monoespaciado, alineados a la derecha en tablas.
5. **Errores tempranos, no al guardar** — Validación inline mientras se escribe. Reservar `alert()` solo para violaciones de integridad cruzada (silo destino con producto distinto, stock negativo).

## Accessibility & Inclusion

WCAG AA como mínimo. Contraste alto sobre fondo oscuro (texto principal ≥7:1 para vista cansada). Tipografía base ≥16px en mobile, ≥15px en escritorio. Áreas táctiles ≥44×44px. Foco visible en todos los inputs. Soporte total de teclado (operarios mayores tipean rápido en escritorio). Respeta `prefers-reduced-motion` para animaciones del SVG de silo. Idioma: español. No depender de color como único portador de información (estado de silo: color + ícono + texto).

# Auditoría de Open Devil

Revisión del 4 de noviembre de 2026. Alcance: código completo de simulación y entrada,
renderizador e interfaz, HTML, herramientas, balance reproducible y pruebas Chromium.
La emulación móvil no sustituye pruebas en iPhone/Safari o Android físicos.

## Correcciones incluidas

| Prioridad | Problema | Corrección |
| --- | --- | --- |
| Alta | Enlaces del mapa podían apuntar a `nodes.length`, fuera del arreglo | Módulo sobre los nodos disponibles después del nodo central |
| Alta | Un arrastre lento acumulado se interpretaba como clic; cancelar un toque seleccionaba países | Umbral desde el inicio, cancelación sin selección y continuidad tras un pinch |
| Alta | Canvas medido mientras la pantalla estaba oculta y desajustado al cambiar las barras | Medición visible y ResizeObserver sobre el contenedor |
| Alta | Menú mostraba Normal al reiniciar pero conservaba dificultad anterior | Restablecer opciones y selección visual juntas; limpiar paneles y contadores |
| Media | Se podían repetir origen y mutaciones después del final | Guardas en la API de simulación |
| Media | Delta inválido contaminaba números de simulación | Rechazar deltas no finitos/no positivos y ticks anteriores al inicio |
| Media | Victoria usaba totales anteriores a las defensas del mismo tick | Recalcular después de los cambios defensivos |
| Media | Paneles reconstruidos hasta 60 veces por segundo | Actualizaciones acotadas por tiempo/datos; reutilizar totales del tick en HUD |
| Media | Pruebas de navegador dependían de rutas personales y solo imprimían resultados | Suite Playwright con aserciones, escritorio/móvil, servidor local y CI |
| Media | Zoom de página deshabilitado | Retirar restricciones del viewport |

## Verificación

- Cuatro pruebas Node: origen único, tiempo inválido, final inmutable y simulación
  determinista durante 1.500 ticks con invariantes de población.
- Dos pruebas Chromium (1280×800 y 390×844): inicio, dimensiones del mapa,
  arrastre/cancelación, pausa, evolución y reinicio; sin errores JavaScript.
- Siete escenarios de balance con semilla 42: Normal automático gana 3/3
  (Shadow y Overt), Normal inactivo pierde; Brutal automático pierde. Casual
  inactivo desde Brasil gana. Resultados completos: scripts/balance-results.json.
- No se ha desplegado ni modificado la rama principal remota.

## Segunda entrega: experiencia de juego

- Menú rediseñado: identidad propia roja/azul, mapa mundial, selección de IA y
  dificultad con explicación visible, acción principal y continuación.
- Centro de mando con mapa más legible, contraste de fronteras, zoom, leyenda,
  paneles flotantes, estados de pausa y detección. Adaptación de escritorio/móvil.
- Guía modal accesible y atajos; selección de origen/inspección con select nativo;
  focos visibles, aria-pressed y cierre de paneles. Preferencia de movimiento reducido
  aplicada a CSS e introducción; los efectos del Canvas aún se animan.
- Guardado local versionado cada diez segundos, al salir al menú y al ocultar la
  pestaña. Continuación pausada, validaciones de carga y manejo de almacenamiento
  no disponible. Los logs de noticias se reinician al cargar para evitar reintroducir
  HTML desde almacenamiento. No se garantiza recuperación de los últimos diez segundos
  si el proceso se cierra abruptamente.
- Acumulador fijo de 1/30 segundo en el navegador; pausa al ocultar la pestaña.
  La velocidad seleccionada sigue multiplicando el tiempo de la simulación.
- Rendimientos decrecientes en ingresos por población y sectores. Matriz de 27
  campañas con tres semillas, tres arquetipos y tres dificultades: Casual 9/9,
  Normal 9/9 y Brutal 2/9 victorias automáticas. Ambas rutas aparecen. Data promedio
  al terminar: 180, 91 y 42 respectivamente. Ver scripts/balance-matrix.json.
  Todos esos ensayos empiezan en USA y usan 0,05 días por tick; no representan tasas
  de victoria humanas ni equivalencia con el paso del navegador.
- Botones de evolución y poderes reutilizados: conservar foco mientras cambian
  recursos. Noticias temporizadas canceladas al reiniciar; eventos consumidos.
- Service worker y manifest con icono propio para carga offline después de una
  primera visita completa por HTTPS/localhost. El modo file:// no instala el worker.
- El Kill Switch al 100% tiene precedencia sobre una victoria en el mismo tick.

## Validación final y límites

Siete pruebas Node y seis escenarios de navegador (tres en escritorio y tres con
viewport/touch móvil). Cubren simulación, persistencia, corrupción, fin de partida,
entrada, guía, selector, recarga, menú, evolución y carga offline. Capturas reales
revisadas para menú, mapa y evolución. La prueba de reinicio fuerza el final; no
sustituye una campaña completa por interfaz. CI reproduce las suites automatizadas.

Quedan como validaciones de plataforma pruebas manuales en Safari/iPhone y Android
físicos, y sesiones con jugadores para calibrar dificultad. La licencia del código
requiere una elección del propietario. No se ha realizado despliegue de producción.

## Seguridad

No hay backend, autenticación, peticiones de ejecución ni dependencias de producción.
No se identificó una vulnerabilidad explotable en esta revisión. Hay `innerHTML`
para datos embebidos; si se incorporan partidas importadas o contenido externo,
reemplazarlo por nodos/textContent o sanitización antes de aceptar esos datos.
Esto no equivale a una certificación de seguridad.

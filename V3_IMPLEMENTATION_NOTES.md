# Cauce V3.0.0t

Hotfix de estabilidad sobre V3.0.0s.

- Elimina la nueva dependencia de importación `getNominalOccurrenceDate` entre `app.js` y `scheduledCalculations.js`.
- Evita que una mezcla temporal de módulos por caché pueda impedir completamente el arranque de la app.
- Mantiene el modal de alcance de recurrencias y la edición/eliminación por ocurrencia introducida en V3.0.0s.
- Para la rama “esta y futuras” se usa provisionalmente la fecha efectiva como inicio de la nueva serie. La resolución nominal específica de nómina se retomará después de verificar estabilidad.
- No modifica cálculos financieros, créditos, pendientes ni IndexedDB.
- Service worker: cauce-v42.


## V3.0.0v - hotfix de arranque y feedback
- Corregido error de sintaxis crítico: el handler de edición de movimientos programados utilizaba `await` sin estar declarado `async`, impidiendo cargar `app.js`.
- El botón Feedback ahora abre el Google Forms externo: https://forms.gle/eXruLBU318wW25NE6
- Se mantiene el modal antiguo en el HTML por compatibilidad temporal, pero ya no se utiliza.
- Service worker: cauce-v43.

## V3.0.0v
- Feedback abre Google Forms una sola vez mediante enlace real target=_blank.
- Un movimiento futuro marcado como realizado no afecta el saldo actual antes de su fecha.
- Ese movimiento sí permanece en los cálculos proyectados y en el saldo del día futuro.
- La ocurrencia recurrente original sigue considerándose resuelta para evitar duplicados.

## V3.0.0w
- Las acciones de Pendientes ya no usan `window.confirm()` ni `window.prompt()`.
- Posponer usa un modal propio de Cauce con selector de fecha.
- Omitir y eliminar usan el modal de confirmación de la app.
- Cancelar una recurrencia desde Pendientes requiere doble confirmación dentro de Cauce.
- Al eliminar una recurrencia desde el modal de movimiento, elegir “Esta y futuras” exige una confirmación final adicional.
- Las eliminaciones de nómina y movimientos fijos desde Configuración también usan confirmaciones internas de Cauce.
- Nuevo modal genérico de selección de fecha (`showDatePromptDialog`).
- Service worker: caché v45.

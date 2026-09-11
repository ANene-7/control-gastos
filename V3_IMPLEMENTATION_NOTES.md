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


## V3.0.1a
- Recurrentes configurables con TDC y selector de crédito.
- Proyección de compras recurrentes TDC hacia FLP.
- Instancias pospuestas fuera del listado de reglas recurrentes.
- Movimientos del mes agrupa series recurrentes e indica realizadas/pendientes.
- Contraste reforzado en Gestión de créditos en modo oscuro.
- Cache v46.

## V3.0.1b
- Hotfix de restauración: acepta respaldos Cauce v3 exportados por la propia app y mantiene compatibilidad con Control de Gastos v1/v2.
- Hotfix de proyección TDC recurrente: las ocurrencias generadas por getScheduledMovementsForDate ya no se descartan por no conservar el objeto recurrence en la copia virtual.
- Cache v47.

## V3.0.1c
- Corrige el orden de capas de modales encadenados.
- El selector de alcance de recurrencia queda por encima del modal de movimiento.
- La confirmación final y el selector de fecha quedan todavía por encima.
- Se enfoca la primera acción del modal de alcance para mejorar teclado/accesibilidad.
- Cache v48.

## V3.0.1d
- Movimientos del mes incluye proyecciones V3 de crédito (obligaciones, cuotas de planes, cargos de periodo y compras TDC programadas).
- Compras con crédito se identifican explícitamente como "Compra con crédito - <crédito>" en Tabla, Movimientos del mes y modal de movimiento programado.
- Compras con crédito usan énfasis azul sin alterar su impacto financiero (siguen sin reducir saldo disponible al momento de compra).
- Sistema visual del calendario ampliado a 12 colores, 5 formas (círculo, cuadrado, rombo, triángulo, estrella) y relleno/contorno.
- Movimiento nuevo y edición permiten configurar color, forma y estilo.
- Movimientos fijos desde Configuración permiten elegir color, forma y estilo; nómina usa rombo verde por defecto.
- Compatibilidad hacia atrás: movimientos existentes sin forma/estilo siguen como círculo relleno.
- Cache v49.

## V3.0.1e
- Vista previa en vivo del símbolo del calendario al registrar y editar movimientos.
- Vista previa también en movimientos fijos desde Configuración.
- La previsualización responde a color, forma y relleno/contorno.
- Cache v50.

## V3.0.1f
- Corrige la cascada CSS de la vista previa del símbolo.
- El color seleccionado ahora se refleja inmediatamente junto con forma y estilo.
- Cache v51.

## V3.0.1g
- El calendario agrupa en una sola etiqueta los pagos/proyecciones del mismo crédito que vencen el mismo día.
- La etiqueta muestra el total combinado (p. ej. plan $500 + cargos del periodo $200 = BBVA $700).
- Los componentes financieros siguen separados internamente; sólo se compacta la vista.
- Al abrir la etiqueta agrupada, "Registrar abono" se precarga con el total y el motor distribuye el pago entre obligaciones/plan.
- Cache v52.

## V3.0.2a
- Exportar respaldo usa Web Share API con archivos cuando el navegador lo permite.
- En móvil puede compartirse directamente a Drive, mensajería o Archivos sin descargar/buscar manualmente.
- Si compartir archivos no está disponible, se conserva la descarga JSON tradicional.
- Importar respaldo muestra primero fecha de exportación y conteos de movimientos, créditos, operaciones, obligaciones y planes.
- No requiere servidor, cuenta ni servicio de pago.
- Cache v53.

## V3.0.2b
- Primera sincronización manual con Google Drive, sin servidor propio.
- OAuth 2.0 en navegador mediante Google Identity Services.
- Scope mínimo `https://www.googleapis.com/auth/drive.appdata`.
- El respaldo remoto se guarda como `cauce-sync.json` dentro de `appDataFolder`.
- Subir: crea o reemplaza el respaldo remoto después de mostrar la fecha existente.
- Descargar: valida el respaldo, muestra resumen y pide doble confirmación antes de reemplazar IndexedDB.
- Client ID configurable desde Cauce y guardado sólo en localStorage del dispositivo.
- Muestra el origen exacto que debe añadirse a "Authorized JavaScript origins".
- El token OAuth permanece sólo en memoria y se pierde al cerrar/recargar la app.
- Cache v54.

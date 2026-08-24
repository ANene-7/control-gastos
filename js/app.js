import { initializeApp } from "./state.js";

import {
    initializeDatabase,
    getRecord,
    saveRecord,
    getAllRecords,
    deleteRecord
} from "./database.js";

import {
    initializeUI,
    showNotification,
    showConfirmDialog,
    updateCurrentBalance
} from "./ui.js";

import {
    initializeCalendar,
    renderCalendar
} from "./calendar.js";

import {
    calculateDailyBalance
} from "./calculations.js";

import {
    calculateCreditObligations
} from "./creditCalculations.js";


import {
    getScheduledMovementsForDate
} from "./scheduledCalculations.js";

function generateMovementId() {

    return (
        "mov-" +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 9)
    );

}


function initializeMovementForm() {

    const movementModal =
        document.getElementById(
            "movementModal"
        );


    const movementForm =
        document.getElementById(
            "movementForm"
        );


    const closeButton =
        document.getElementById(
            "closeMovementModalButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelMovementButton"
        );


    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        );


    const creditSelectorContainer =
        document.getElementById(
            "creditSelectorContainer"
        );


    const recurrenceContainer =
        document.getElementById(
            "recurrenceContainer"
        );

    
    const isIncome =
    document.getElementById(
        "movementIsIncome"
    );


    const isCreditPayment =
        document.getElementById(
            "movementIsCreditPayment"
        );


    const isScheduled =
        document.getElementById(
            "movementIsScheduled"
        );


    const isRecurring =
        document.getElementById(
            "movementIsRecurring"
        );


    const creditPaymentSelectorContainer =
        document.getElementById(
            "creditPaymentSelectorContainer"
        );


    const movementDate =
        document.getElementById(
            "movementDate"
        );


    const movementDateLabel =
        document.querySelector(
            'label[for="movementDate"]'
        );


    /*
        Abrir modal
    */

    const openButton =
        document.getElementById(
            "addMovementButton"
        );


    if (openButton) {

        openButton.addEventListener(
            "click",
            () => {

                movementModal
                    .classList
                    .remove("hidden");


                setDefaultMovementDate();

            }
        );

    }


    /*
        Cerrar modal
    */

    function closeModal() {

        movementModal
            .classList
            .add("hidden");

    }


    closeButton.addEventListener(
        "click",
        closeModal
    );


    cancelButton.addEventListener(
        "click",
        closeModal
    );


    /*
        Mostrar / ocultar selector de crédito
    */

    paymentMethod.addEventListener(
        "change",
        () => {

            /*
                Un pago / abono a crédito
                solamente puede salir de
                débito o efectivo.
            */

            if (
                isCreditPayment.checked
            ) {

                if (
                    paymentMethod.value ===
                    "credit"
                ) {

                    paymentMethod.value =
                        "debit";


                    isIncome.disabled =
                        false;


                    showNotification(
                        "Un pago a crédito debe salir de débito o efectivo.",
                        "error"
                    );

                }


                creditSelectorContainer
                    .classList
                    .add("hidden");


                return;

            }


            /*
                Movimiento normal.
            */

            if (
                paymentMethod.value ===
                    "credit"
            ) {

                creditSelectorContainer
                    .classList
                    .remove("hidden");

            } else {

                creditSelectorContainer
                    .classList
                    .add("hidden");

            }

        }
    );


    /*
        Mostrar / ocultar configuración
        de recurrencia.
    */

    isRecurring.addEventListener(
        "change",
        () => {

            if (
                isRecurring.checked
            ) {

                recurrenceContainer
                    .classList
                    .remove("hidden");

            } else {

                recurrenceContainer
                    .classList
                    .add("hidden");

            }

        }
    );


    /*
        Cambiar etiqueta de fecha según
        el estado del movimiento.
    */

    isScheduled.addEventListener(
        "change",
        () => {

            movementDateLabel.textContent =
                isScheduled.checked
                    ? "Fecha programada"
                    : "Fecha realizada";

        }
    );


    isCreditPayment.addEventListener(
        "change",
        () => {

            if (
                isCreditPayment.checked
            ) {

                /*
                    Un abono a crédito
                    siempre es un egreso.
                */

                isIncome.checked =
                    false;


                isIncome.disabled =
                    true;


                /*
                    No podemos pagar un crédito
                    utilizando el mismo método
                    "crédito".
                */

                if (
                    paymentMethod.value ===
                        "credit"
                ) {

                    paymentMethod.value =
                        "debit";

                }


                creditSelectorContainer
                    .classList
                    .add("hidden");


                creditPaymentSelectorContainer
                    .classList
                    .remove("hidden");

            } else {

                isIncome.disabled =
                    false;


                creditPaymentSelectorContainer
                    .classList
                    .add("hidden");


                if (
                    paymentMethod.value ===
                        "credit"
                ) {

                    creditSelectorContainer
                        .classList
                        .remove("hidden");

                }

            }

        }
    );


    isIncome.addEventListener(
        "change",
        () => {

            if (
                isIncome.checked &&
                isCreditPayment.checked
            ) {

                isCreditPayment.checked =
                    false;


                creditPaymentSelectorContainer
                    .classList
                    .add("hidden");

            }

        }
    );


    /*
        Guardar movimiento.
    */

    movementForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                await saveMovement();


                /*
                    Limpiar formulario.
                */

                movementForm.reset();


                /*
                    Restaurar valores iniciales.
                */

                isIncome.disabled =
                    false;


                paymentMethod.value =
                    "debit";


                creditSelectorContainer
                    .classList
                    .add(
                        "hidden"
                    );


                document
                    .getElementById(
                        "creditPaymentSelectorContainer"
                    )
                    .classList
                    .add(
                        "hidden"
                    );


                recurrenceContainer
                    .classList
                    .add(
                        "hidden"
                    );


                movementDateLabel.textContent =
                    "Fecha realizada";


                /*
                    Cerrar modal.
                */

                closeModal();


                /*
                    Confirmación.
                */

                showNotification(
                    "Movimiento guardado correctamente."
                );


                /*
                    Actualizar calendario
                    una sola vez.
                */

                await renderCalendar();

                await updateCurrentBalance();


            } catch (error) {

                console.error(
                    "No se pudo guardar el movimiento:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo guardar el movimiento.",
                    "error"
                );

            }

        }
    );

}


function setDefaultMovementDate() {

    const movementDate =
        document.getElementById(
            "movementDate"
        );


    if (
        !movementDate.value
    ) {

        const today =
            new Date();


        const year =
            today.getFullYear();


        const month =
            String(
                today.getMonth() + 1
            ).padStart(
                2,
                "0"
            );


        const day =
            String(
                today.getDate()
            ).padStart(
                2,
                "0"
            );


        movementDate.value =
            `${year}-${month}-${day}`;

    }

}


async function saveMovement() {

    const type =
        document.getElementById(
            "movementIsIncome"
        ).checked
            ? "income"
            : "expense";


    const purpose =
        document.getElementById(
            "movementIsCreditPayment"
        ).checked
            ? "creditPayment"
            : "regular";


    const description =
        document.getElementById(
            "movementDescription"
        ).value.trim();


    const amount =
        Number(
            document.getElementById(
                "movementAmount"
            ).value
        );


    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        ).value;


    const movementDate =
        document.getElementById(
            "movementDate"
        ).value;


    const notes =
        document.getElementById(
            "movementNotes"
        ).value.trim();


    const status =
        document.getElementById(
            "movementIsScheduled"
        ).checked
            ? "scheduled"
            : "completed";


    const recurrence =
        document.getElementById(
            "movementIsRecurring"
        ).checked
            ? "recurring"
            : "once";


    const labelColor =
        document.querySelector(
            'input[name="movementLabelColor"]:checked'
        ).value;


    /*
        Validaciones básicas.
    */

    if (!description) {

        throw new Error(
            "La descripción es obligatoria."
        );

    }


    if (
        !amount ||
        amount <= 0
    ) {

        throw new Error(
            "El monto debe ser mayor que cero."
        );

    }


    if (!movementDate) {

        throw new Error(
            "Debes seleccionar una fecha."
        );

    }


    /*
        Crédito relacionado.

        Puede significar:

        1. Crédito utilizado para una compra.
        2. Crédito al que estamos realizando
           un pago o abono.
    */

    let creditId = null;


    /*
        Compra normal hecha con crédito.
    */

    if (
        purpose === "regular" &&
        paymentMethod === "credit"
    ) {

        creditId =
            document.getElementById(
                "creditSelector"
            ).value;


        if (!creditId) {

            throw new Error(
                "Debes seleccionar el crédito utilizado."
            );

        }

    }


    /*
        Pago o abono a un crédito.
    */

    if (
        purpose ===
        "creditPayment"
    ) {

        if (
            type !== "expense"
        ) {

            throw new Error(
                "Un pago a crédito debe registrarse como egreso."
            );

        }


        if (
            paymentMethod ===
            "credit"
        ) {

            throw new Error(
                "El pago de un crédito debe salir de débito o efectivo."
            );

        }


        creditId =
            document.getElementById(
                "creditPaymentSelector"
            ).value;


        if (!creditId) {

            throw new Error(
                "Debes seleccionar el crédito que estás pagando."
            );

        }

    }


    /*
        Construir objeto de recurrencia.
    */

    let recurrenceData =
        null;


    if (
        recurrence ===
        "recurring"
    ) {

        recurrenceData = {

            type:
                document.getElementById(
                    "recurrenceType"
                ).value

        };

    }


    /*
        Construir movimiento.
    */

    const movement = {

        id:
            generateMovementId(),


        type,


        purpose,


        description,


        amount,


        paymentMethod,


        creditId,


        status,


        scheduledDate:
            status === "scheduled"
                ? movementDate
                : null,


        completedDate:
            status === "completed"
                ? movementDate
                : null,


        recurrence:
            recurrenceData,


        labelColor,


        notes,


        createdAt:
            new Date().toISOString()

    };


    /*
        Guardar en IndexedDB.
    */

    await saveRecord(
        "movements",
        movement
    );


    console.log(
        "Movimiento guardado:",
        movement
    );


    return movement;

}


function initializeScheduledMovementModal() {

    const modal =
        document.getElementById(
            "scheduledMovementModal"
        );


    const closeButton =
        document.getElementById(
            "closeScheduledMovementModalButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelScheduledMovementButton"
        );


    const deleteButton =
        document.getElementById(
            "deleteScheduledMovementButton"
        );


    const completeButton =
        document.getElementById(
            "completeScheduledMovementButton"
        );


    const descriptionElement =
        document.getElementById(
            "scheduledMovementDescription"
        );


    const amountElement =
        document.getElementById(
            "scheduledMovementAmount"
        );


    const scheduledDateElement =
        document.getElementById(
            "scheduledMovementDate"
        );


    const completedDateInput =
        document.getElementById(
            "scheduledMovementCompletedDate"
        );


    /*
        Movimiento y ocurrencia
        actualmente seleccionados.
    */

    let selectedMovement =
        null;


    let selectedOccurrenceDate =
        null;


    function closeModal() {

        modal.classList.add(
            "hidden"
        );


        selectedMovement =
            null;


        selectedOccurrenceDate =
            null;

    }


    closeButton.addEventListener(
        "click",
        closeModal
    );


    cancelButton.addEventListener(
        "click",
        closeModal
    );


    /*
        Eliminar movimiento programado.
    */

    deleteButton.addEventListener(
        "click",
        async () => {

            try {

                if (!selectedMovement) {

                    throw new Error(
                        "No hay un movimiento seleccionado."
                    );

                }


                /*
                    Determinar si se trata
                    de una programación recurrente.
                */

                const isRecurring =
                    selectedMovement.recurrence !==
                    null;


                const confirmed =
                    await showConfirmDialog({

                        title:
                            isRecurring
                                ? "Eliminar programación"
                                : "Eliminar movimiento programado",

                        message:
                            isRecurring
                                ? `¿Deseas eliminar la programación recurrente "${selectedMovement.description}"? ` +
                                `Se eliminarán sus ocurrencias pendientes futuras. ` +
                                `Los movimientos que ya hayas marcado como realizados se conservarán.`
                                : `¿Deseas eliminar "${selectedMovement.description}"? ` +
                                `Esta acción no se puede deshacer.`,

                        confirmText:
                            "Eliminar",

                        cancelText:
                            "Cancelar"

                    });


                if (!confirmed) {

                    return;

                }


                /*
                    Eliminamos la regla programada.

                    Los movimientos realizados
                    anteriormente son registros
                    independientes, por lo que
                    permanecen en la base de datos.
                */

                await deleteRecord(
                    "movements",
                    selectedMovement.id
                );


                closeModal();


                showNotification(
                    isRecurring
                        ? "Programación eliminada correctamente."
                        : "Movimiento programado eliminado correctamente."
                );


                /*
                    Actualizar interfaz.
                */

                await renderCalendar();


                await updateCurrentBalance();


            } catch (error) {

                console.error(
                    "No se pudo eliminar el movimiento programado:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo eliminar el movimiento programado.",
                    "error"
                );

            }

        }
    );


    /*
        Escuchar solicitudes provenientes
        del calendario.
    */

    window.addEventListener(
        "openScheduledMovement",
        async event => {

            try {

                const {
                    movementId,
                    occurrenceDate
                } =
                    event.detail;


                selectedMovement =
                    await getRecord(
                        "movements",
                        movementId
                    );


                if (!selectedMovement) {

                    throw new Error(
                        "No se encontró el movimiento programado."
                    );

                }


                selectedOccurrenceDate =
                    occurrenceDate;


                descriptionElement.textContent =
                    selectedMovement.description;


                amountElement.textContent =
                    new Intl.NumberFormat(
                        "es-MX",
                        {
                            style:
                                "currency",

                            currency:
                                "MXN"
                        }
                    ).format(
                        selectedMovement.amount
                    );


                scheduledDateElement.textContent =
                    occurrenceDate;


                /*
                    De forma predeterminada,
                    la fecha realizada será
                    la fecha programada.

                    El usuario puede cambiarla.
                */

                completedDateInput.value =
                    occurrenceDate;


                modal.classList.remove(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    "No se pudo abrir el movimiento programado:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo abrir el movimiento programado.",
                    "error"
                );

            }

        }
    );


    /*
        Convertir ocurrencia programada
        en movimiento realizado.
    */

    completeButton.addEventListener(
        "click",
        async () => {

            try {

                if (
                    !selectedMovement ||
                    !selectedOccurrenceDate
                ) {

                    throw new Error(
                        "No hay un movimiento seleccionado."
                    );

                }


                const completedDate =
                    completedDateInput.value;


                if (!completedDate) {

                    throw new Error(
                        "Debes indicar la fecha realizada."
                    );

                }


                /*
                    Crear una COPIA realizada.

                    No modificamos la regla
                    programada original.
                */

                const completedMovement = {

                    ...selectedMovement,


                    id:
                        generateMovementId(),


                    status:
                        "completed",


                    scheduledDate:
                        null,


                    completedDate,


                    /*
                        La copia realizada
                        no debe generar nuevas
                        recurrencias.
                    */

                    recurrence:
                        null,


                    /*
                        Relación con la regla
                        programada original.
                    */

                    sourceScheduledMovementId:
                        selectedMovement.id,


                    sourceScheduledDate:
                        selectedOccurrenceDate,


                    createdAt:
                        new Date()
                            .toISOString()

                };


                await saveRecord(
                    "movements",
                    completedMovement
                );


                closeModal();


                showNotification(
                    "Movimiento marcado como realizado."
                );


                await renderCalendar();


                await updateCurrentBalance();


            } catch (error) {

                console.error(
                    "No se pudo completar el movimiento:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo completar el movimiento.",
                    "error"
                );

            }

        }
    );

}


function initializeDayDetailModal() {

    const modal =
        document.getElementById(
            "dayDetailModal"
        );


    const title =
        document.getElementById(
            "dayDetailTitle"
        );


    const content =
        document.getElementById(
            "dayDetailContent"
        );


    const closeHeaderButton =
        document.getElementById(
            "closeDayDetailModalButton"
        );


    const closeButton =
        document.getElementById(
            "closeDayDetailButton"
        );


    /*
        Cerrar modal.
    */

    function closeModal() {

        modal.classList.add(
            "hidden"
        );

    }


    closeHeaderButton.addEventListener(
        "click",
        closeModal
    );


    closeButton.addEventListener(
        "click",
        closeModal
    );


    /*
        Formato monetario local
        para este modal.
    */

    function formatCurrency(
        amount
    ) {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style:
                    "currency",

                currency:
                    "MXN"
            }
        ).format(
            amount
        );

    }


    /*
        Formatear YYYY-MM-DD
        sin utilizar UTC.
    */

    function formatDate(
        dateString
    ) {

        const [
            year,
            month,
            day
        ] =
            dateString
                .split("-")
                .map(Number);


        const date =
            new Date(
                year,
                month - 1,
                day
            );


        return new Intl.DateTimeFormat(
            "es-MX",
            {
                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric"
            }
        ).format(
            date
        );

    }


    /*
        Crear una sección dentro
        del detalle del día.
    */

    function createSection(
        sectionTitle
    ) {

        const section =
            document.createElement(
                "div"
            );


        section.classList.add(
            "day-detail-section"
        );


        const heading =
            document.createElement(
                "h3"
            );


        heading.textContent =
            sectionTitle;


        section.appendChild(
            heading
        );


        return section;

    }


    /*
        Crear una fila:

        Descripción        $100.00
    */

    function createItem(
        description,
        amount,
        type = null
    ) {

        const item =
            document.createElement(
                "div"
            );


        item.classList.add(
            "day-detail-item"
        );


        const descriptionElement =
            document.createElement(
                "span"
            );


        descriptionElement.textContent =
            description;


        const amountElement =
            document.createElement(
                "strong"
            );


        /*
            Para movimientos realizados
            mostramos signo según ingreso
            o egreso.

            Para obligaciones programadas
            puede omitirse el tipo.
        */

        if (
            type === "income"
        ) {

            amountElement.textContent =
                `+${formatCurrency(
                    amount
                )}`;

        } else if (
            type === "expense"
        ) {

            amountElement.textContent =
                `-${formatCurrency(
                    amount
                )}`;

        } else {

            amountElement.textContent =
                formatCurrency(
                    amount
                );

        }


        item.appendChild(
            descriptionElement
        );


        item.appendChild(
            amountElement
        );


        return item;

    }


    /*
        Abrir detalle del día cuando
        calendar.js emita el evento.
    */

    window.addEventListener(
        "openDayDetail",
        async event => {

            try {

                const {
                    date
                } =
                    event.detail;


                /*
                    Obtener información
                    actualizada de IndexedDB.
                */

                const movements =
                    await getAllRecords(
                        "movements"
                    );


                const credits =
                    await getAllRecords(
                        "credits"
                    );


                /*
                    Limpiar contenido anterior.
                */

                content.innerHTML =
                    "";


                /*
                    Título.
                */

                title.textContent =
                    formatDate(
                        date
                    );


                /*
                    =================================
                    MOVIMIENTOS REALIZADOS
                    =================================
                */

                const completedMovements =
                    movements.filter(
                        movement =>

                            movement.status ===
                                "completed"

                            &&

                            movement.completedDate ===
                                date
                    );


                if (
                    completedMovements.length > 0
                ) {

                    const completedSection =
                        createSection(
                            "Movimientos realizados"
                        );


                    completedMovements.forEach(
                        movement => {

                            const item =
                                createItem(
                                    movement.description,
                                    movement.amount,
                                    movement.type
                                );


                            item.classList.add(
                                "completed-movement-clickable"
                            );


                            item.addEventListener(
                                "click",
                                () => {

                                    closeModal();


                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "openCompletedMovement",
                                            {
                                                detail: {

                                                    movementId:
                                                        movement.id

                                                }
                                            }
                                        )
                                    );

                                }
                            );


                            completedSection
                                .appendChild(
                                    item
                                );

                        }
                    );


                    content.appendChild(
                        completedSection
                    );

                }


                /*
                    =================================
                    MOVIMIENTOS PROGRAMADOS
                    =================================
                */

                const scheduledMovements =
                    getScheduledMovementsForDate(
                        date,
                        movements
                    );


                const scheduledExpenses =
                    scheduledMovements.filter(
                        movement =>
                            movement.type ===
                            "expense"
                    );


                const scheduledIncome =
                    scheduledMovements.filter(
                        movement =>
                            movement.type ===
                            "income"
                    );


                /*
                    Pagos programados.
                */

                if (
                    scheduledExpenses.length > 0
                ) {

                    const expensesSection =
                        createSection(
                            "Pagos programados"
                        );


                    scheduledExpenses.forEach(
                        movement => {

                            const item =
                                createItem(
                                    movement.description,
                                    movement.amount
                                );


                            /*
                                Permitimos abrir el
                                movimiento programado
                                desde este modal.
                            */

                            item.classList.add(
                                "scheduled-movement-clickable"
                            );


                            item.addEventListener(
                                "click",
                                () => {

                                    closeModal();


                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "openScheduledMovement",
                                            {
                                                detail: {

                                                    movementId:
                                                        movement.id,

                                                    occurrenceDate:
                                                        date

                                                }
                                            }
                                        )
                                    );

                                }
                            );


                            expensesSection
                                .appendChild(
                                    item
                                );

                        }
                    );


                    content.appendChild(
                        expensesSection
                    );

                }


                /*
                    Ingresos programados.
                */

                if (
                    scheduledIncome.length > 0
                ) {

                    const incomeSection =
                        createSection(
                            "Ingresos programados"
                        );


                    scheduledIncome.forEach(
                        movement => {

                            const item =
                                createItem(
                                    movement.description,
                                    movement.amount
                                );


                            item.classList.add(
                                "scheduled-movement-clickable"
                            );


                            item.addEventListener(
                                "click",
                                () => {

                                    closeModal();


                                    window.dispatchEvent(
                                        new CustomEvent(
                                            "openScheduledMovement",
                                            {
                                                detail: {

                                                    movementId:
                                                        movement.id,

                                                    occurrenceDate:
                                                        date

                                                }
                                            }
                                        )
                                    );

                                }
                            );


                            incomeSection
                                .appendChild(
                                    item
                                );

                        }
                    );


                    content.appendChild(
                        incomeSection
                    );

                }


                /*
                    =================================
                    OBLIGACIONES DE CRÉDITO
                    =================================
                */

                const creditObligations =
                    calculateCreditObligations(
                        movements,
                        credits
                    );


                const dayCreditObligations =
                    creditObligations.filter(
                        obligation =>

                            obligation.dueDate ===
                                date

                            &&

                            obligation.pendingAmount >
                                0
                    );


                if (
                    dayCreditObligations.length > 0
                ) {

                    const creditSection =
                        createSection(
                            "Créditos por pagar"
                        );


                    dayCreditObligations.forEach(
                        obligation => {

                            const item =
                                createItem(
                                    obligation.creditName,
                                    obligation.pendingAmount
                                );


                            creditSection
                                .appendChild(
                                    item
                                );

                        }
                    );


                    content.appendChild(
                        creditSection
                    );

                }


                /*
                    =================================
                    SALDOS
                    =================================
                */

                const balance =
                    calculateDailyBalance(
                        date,
                        movements
                    );


                const summary =
                    document.createElement(
                        "div"
                    );


                summary.classList.add(
                    "day-detail-summary"
                );


                /*
                    Saldo del día.
                */

                const dailyRow =
                    document.createElement(
                        "div"
                    );


                dailyRow.classList.add(
                    "day-detail-summary-row"
                );


                const dailyLabel =
                    document.createElement(
                        "span"
                    );


                dailyLabel.textContent =
                    "Saldo del día";


                const dailyValue =
                    document.createElement(
                        "strong"
                    );


                if (
                    balance.dailyBalance ===
                    null
                ) {

                    dailyValue.textContent =
                        "Sin cálculo";

                } else {

                    dailyValue.textContent =
                        formatCurrency(
                            balance.dailyBalance
                        );

                }


                dailyRow.appendChild(
                    dailyLabel
                );


                dailyRow.appendChild(
                    dailyValue
                );


                summary.appendChild(
                    dailyRow
                );


                /*
                    Saldo acumulado.
                */

                const accumulatedRow =
                    document.createElement(
                        "div"
                    );


                accumulatedRow.classList.add(
                    "day-detail-summary-row"
                );


                const accumulatedLabel =
                    document.createElement(
                        "span"
                    );


                accumulatedLabel.textContent =
                    "Saldo acumulado";


                const accumulatedValue =
                    document.createElement(
                        "strong"
                    );


                if (
                    balance.accumulatedBalance ===
                    null
                ) {

                    accumulatedValue.textContent =
                        "Sin cálculo";

                } else {

                    accumulatedValue.textContent =
                        formatCurrency(
                            balance.accumulatedBalance
                        );

                }


                accumulatedRow.appendChild(
                    accumulatedLabel
                );


                accumulatedRow.appendChild(
                    accumulatedValue
                );


                summary.appendChild(
                    accumulatedRow
                );


                content.appendChild(
                    summary
                );


                /*
                    Si el día está completamente
                    vacío, mostrar mensaje.
                */

                if (
                    completedMovements.length === 0
                    &&
                    scheduledMovements.length === 0
                    &&
                    dayCreditObligations.length === 0
                ) {

                    const emptyMessage =
                        document.createElement(
                            "p"
                        );


                    emptyMessage.textContent =
                        "No hay movimientos registrados para este día.";


                    /*
                        Lo insertamos antes
                        del resumen.
                    */

                    content.insertBefore(
                        emptyMessage,
                        summary
                    );

                }


                /*
                    Mostrar modal.
                */

                modal.classList.remove(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    "No se pudo abrir el detalle del día:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo abrir el detalle del día.",
                    "error"
                );

            }

        }
    );

}


function initializeEditMovementModal() {

    const modal =
        document.getElementById(
            "editMovementModal"
        );


    const form =
        document.getElementById(
            "editMovementForm"
        );


    const closeButton =
        document.getElementById(
            "closeEditMovementModalButton"
        );

    const deleteButton =
        document.getElementById(
            "deleteMovementButton"
        );


    const cancelButton =
        document.getElementById(
            "cancelEditMovementButton"
        );


    const descriptionInput =
        document.getElementById(
            "editMovementDescription"
        );


    const amountInput =
        document.getElementById(
            "editMovementAmount"
        );


    const isIncome =
        document.getElementById(
            "editMovementIsIncome"
        );


    const isCreditPayment =
        document.getElementById(
            "editMovementIsCreditPayment"
        );


    const paymentMethod =
        document.getElementById(
            "editMovementPaymentMethod"
        );


    const creditSelectorContainer =
        document.getElementById(
            "editCreditSelectorContainer"
        );


    const creditSelector =
        document.getElementById(
            "editCreditSelector"
        );


    const creditPaymentSelectorContainer =
        document.getElementById(
            "editCreditPaymentSelectorContainer"
        );


    const creditPaymentSelector =
        document.getElementById(
            "editCreditPaymentSelector"
        );


    const dateInput =
        document.getElementById(
            "editMovementDate"
        );


    const notesInput =
        document.getElementById(
            "editMovementNotes"
        );


    /*
        Movimiento que estamos editando.
    */

    let selectedMovement =
        null;


    function closeModal() {

        modal.classList.add(
            "hidden"
        );


        selectedMovement =
            null;

    }


    closeButton.addEventListener(
        "click",
        closeModal
    );


    cancelButton.addEventListener(
        "click",
        closeModal
    );


    deleteButton.addEventListener(
        "click",
        async () => {

            try {

                if (!selectedMovement) {

                    throw new Error(
                        "No hay un movimiento seleccionado."
                    );

                }


                const confirmed =
                    await showConfirmDialog({
                        title:
                            "Eliminar movimiento",

                        message:
                            `¿Deseas eliminar "${selectedMovement.description}"? ` +
                            `Esta acción no se puede deshacer.`,

                        confirmText:
                            "Eliminar",

                        cancelText:
                            "Cancelar"
                    });


                if (!confirmed) {

                    return;

                }


                await deleteRecord(
                    "movements",
                    selectedMovement.id
                );


                closeModal();


                showNotification(
                    "Movimiento eliminado correctamente."
                );


                await renderCalendar();


                await updateCurrentBalance();


            } catch (error) {

                console.error(
                    "No se pudo eliminar el movimiento:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo eliminar el movimiento.",
                    "error"
                );

            }

        }
    );


    /*
        Cargar créditos en los dos
        selectores del formulario.
    */

    async function loadCreditOptions() {

        const credits =
            await getAllRecords(
                "credits"
            );


        const activeCredits =
            credits.filter(
                credit =>
                    credit.active ===
                    true
            );


        creditSelector.innerHTML =
            "";


        creditPaymentSelector.innerHTML =
            "";


        const purchasePlaceholder =
            document.createElement(
                "option"
            );


        purchasePlaceholder.value =
            "";


        purchasePlaceholder.textContent =
            "Selecciona un crédito";


        creditSelector.appendChild(
            purchasePlaceholder
        );


        const paymentPlaceholder =
            document.createElement(
                "option"
            );


        paymentPlaceholder.value =
            "";


        paymentPlaceholder.textContent =
            "Selecciona un crédito";


        creditPaymentSelector.appendChild(
            paymentPlaceholder
        );


        activeCredits.forEach(
            credit => {

                const purchaseOption =
                    document.createElement(
                        "option"
                    );


                purchaseOption.value =
                    credit.id;


                purchaseOption.textContent =
                    credit.name;


                creditSelector.appendChild(
                    purchaseOption
                );


                const paymentOption =
                    document.createElement(
                        "option"
                    );


                paymentOption.value =
                    credit.id;


                paymentOption.textContent =
                    credit.name;


                creditPaymentSelector
                    .appendChild(
                        paymentOption
                    );

            }
        );

    }


    /*
        Actualizar los campos condicionales
        según el movimiento.
    */

    function updateConditionalFields() {

        /*
            Pago / abono a crédito.
        */

        if (
            isCreditPayment.checked
        ) {

            isIncome.checked =
                false;


            isIncome.disabled =
                true;


            if (
                paymentMethod.value ===
                    "credit"
            ) {

                paymentMethod.value =
                    "debit";

            }


            creditSelectorContainer
                .classList
                .add("hidden");


            creditPaymentSelectorContainer
                .classList
                .remove("hidden");


            return;

        }


        /*
            Movimiento normal.
        */

        isIncome.disabled =
            false;


        creditPaymentSelectorContainer
            .classList
            .add("hidden");


        if (
            paymentMethod.value ===
                "credit"
        ) {

            creditSelectorContainer
                .classList
                .remove("hidden");

        } else {

            creditSelectorContainer
                .classList
                .add("hidden");

        }

    }


    isCreditPayment.addEventListener(
        "change",
        updateConditionalFields
    );


    paymentMethod.addEventListener(
        "change",
        () => {

            if (
                isCreditPayment.checked &&
                paymentMethod.value ===
                    "credit"
            ) {

                paymentMethod.value =
                    "debit";


                showNotification(
                    "Un pago a crédito debe salir de débito o efectivo.",
                    "error"
                );

            }


            updateConditionalFields();

        }
    );


    isIncome.addEventListener(
        "change",
        () => {

            if (
                isIncome.checked &&
                isCreditPayment.checked
            ) {

                isCreditPayment.checked =
                    false;

            }


            updateConditionalFields();

        }
    );


    /*
        Abrir movimiento realizado.
    */

    window.addEventListener(
        "openCompletedMovement",
        async event => {

            try {

                const {
                    movementId
                } =
                    event.detail;


                selectedMovement =
                    await getRecord(
                        "movements",
                        movementId
                    );


                if (!selectedMovement) {

                    throw new Error(
                        "No se encontró el movimiento."
                    );

                }


                if (
                    selectedMovement.status !==
                        "completed"
                ) {

                    throw new Error(
                        "El movimiento seleccionado no está realizado."
                    );

                }


                await loadCreditOptions();


                descriptionInput.value =
                    selectedMovement.description;


                amountInput.value =
                    selectedMovement.amount;


                isIncome.checked =
                    selectedMovement.type ===
                    "income";


                isCreditPayment.checked =
                    selectedMovement.purpose ===
                    "creditPayment";


                paymentMethod.value =
                    selectedMovement.paymentMethod;


                dateInput.value =
                    selectedMovement.completedDate;


                notesInput.value =
                    selectedMovement.notes ||
                    "";


                /*
                    Seleccionar crédito actual,
                    cuando exista.
                */

                creditSelector.value =
                    selectedMovement.creditId ||
                    "";


                creditPaymentSelector.value =
                    selectedMovement.creditId ||
                    "";


                updateConditionalFields();


                modal.classList.remove(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    "No se pudo abrir el movimiento:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo abrir el movimiento.",
                    "error"
                );

            }

        }
    );


    /*
        Guardar edición.
    */

    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                if (!selectedMovement) {

                    throw new Error(
                        "No hay un movimiento seleccionado."
                    );

                }


                const description =
                    descriptionInput
                        .value
                        .trim();


                const amount =
                    Number(
                        amountInput.value
                    );


                const completedDate =
                    dateInput.value;


                const type =
                    isIncome.checked
                        ? "income"
                        : "expense";


                const purpose =
                    isCreditPayment.checked
                        ? "creditPayment"
                        : "regular";


                const method =
                    paymentMethod.value;


                if (!description) {

                    throw new Error(
                        "La descripción es obligatoria."
                    );

                }


                if (
                    !Number.isFinite(amount) ||
                    amount <= 0
                ) {

                    throw new Error(
                        "El monto debe ser mayor que cero."
                    );

                }


                if (!completedDate) {

                    throw new Error(
                        "Debes seleccionar una fecha."
                    );

                }


                let creditId =
                    null;


                /*
                    Compra con crédito.
                */

                if (
                    purpose === "regular" &&
                    method === "credit"
                ) {

                    creditId =
                        creditSelector.value;


                    if (!creditId) {

                        throw new Error(
                            "Debes seleccionar el crédito utilizado."
                        );

                    }

                }


                /*
                    Pago / abono a crédito.
                */

                if (
                    purpose ===
                        "creditPayment"
                ) {

                    if (
                        method === "credit"
                    ) {

                        throw new Error(
                            "Un pago a crédito debe salir de débito o efectivo."
                        );

                    }


                    creditId =
                        creditPaymentSelector
                            .value;


                    if (!creditId) {

                        throw new Error(
                            "Debes seleccionar el crédito que estás pagando."
                        );

                    }

                }


                /*
                    Conservamos propiedades que
                    no pertenecen a la edición.

                    Esto es especialmente importante
                    para movimientos realizados desde
                    una ocurrencia programada.
                */

                const updatedMovement = {

                    ...selectedMovement,


                    type,


                    purpose,


                    description,


                    amount,


                    paymentMethod:
                        method,


                    creditId,


                    completedDate,


                    notes:
                        notesInput
                            .value
                            .trim(),


                    updatedAt:
                        new Date()
                            .toISOString()

                };


                await saveRecord(
                    "movements",
                    updatedMovement
                );


                closeModal();


                showNotification(
                    "Movimiento actualizado correctamente."
                );


                await renderCalendar();


                await updateCurrentBalance();


            } catch (error) {

                console.error(
                    "No se pudo actualizar el movimiento:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo actualizar el movimiento.",
                    "error"
                );

            }

        }
    );

}


function initializeCreditObligationModal() {

    const modal =
        document.getElementById(
            "creditObligationModal"
        );


    const title =
        document.getElementById(
            "creditObligationTitle"
        );


    const content =
        document.getElementById(
            "creditObligationContent"
        );


    const closeHeaderButton =
        document.getElementById(
            "closeCreditObligationModalButton"
        );


    const closeButton =
        document.getElementById(
            "closeCreditObligationButton"
        );


    function closeModal() {

        modal.classList.add(
            "hidden"
        );

    }


    closeHeaderButton.addEventListener(
        "click",
        closeModal
    );


    closeButton.addEventListener(
        "click",
        closeModal
    );


    function formatCurrency(
        amount
    ) {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style:
                    "currency",

                currency:
                    "MXN"
            }
        ).format(
            amount
        );

    }


    function formatDate(
        dateString
    ) {

        const [
            year,
            month,
            day
        ] =
            dateString
                .split("-")
                .map(Number);


        return new Intl.DateTimeFormat(
            "es-MX",
            {
                day:
                    "2-digit",

                month:
                    "2-digit",

                year:
                    "numeric"
            }
        ).format(
            new Date(
                year,
                month - 1,
                day
            )
        );

    }


    function createSummaryRow(
        label,
        value
    ) {

        const row =
            document.createElement(
                "div"
            );


        row.classList.add(
            "credit-obligation-summary-row"
        );


        const labelElement =
            document.createElement(
                "span"
            );


        labelElement.textContent =
            label;


        const valueElement =
            document.createElement(
                "strong"
            );


        valueElement.textContent =
            value;


        row.appendChild(
            labelElement
        );


        row.appendChild(
            valueElement
        );


        return row;

    }


    window.addEventListener(
        "openCreditObligation",
        async event => {

            try {

                const {
                    creditId,
                    dueDate
                } =
                    event.detail;


                const movements =
                    await getAllRecords(
                        "movements"
                    );


                const credits =
                    await getAllRecords(
                        "credits"
                    );


                /*
                    Recalculamos siempre.

                    No confiamos en el objeto
                    que tenía el calendario
                    antes de abrir el modal.
                */

                const obligations =
                    calculateCreditObligations(
                        movements,
                        credits
                    );


                const obligation =
                    obligations.find(
                        item =>

                            item.creditId ===
                                creditId

                            &&

                            item.dueDate ===
                                dueDate
                    );


                if (!obligation) {

                    throw new Error(
                        "No se encontró la obligación de crédito."
                    );

                }


                content.innerHTML =
                    "";


                title.textContent =
                    obligation.creditName;


                /*
                    Fecha límite.
                */

                const dueDateElement =
                    document.createElement(
                        "p"
                    );


                dueDateElement.textContent =
                    `Fecha límite de pago: ` +
                    `${formatDate(
                        obligation.dueDate
                    )}`;


                content.appendChild(
                    dueDateElement
                );


                /*
                    Compras correspondientes
                    a este periodo.
                */

                const purchasesContainer =
                    document.createElement(
                        "div"
                    );


                purchasesContainer.classList.add(
                    "credit-obligation-purchases"
                );


                const purchasesTitle =
                    document.createElement(
                        "h3"
                    );


                purchasesTitle.textContent =
                    "Compras del periodo";


                purchasesContainer.appendChild(
                    purchasesTitle
                );


                const sortedPurchases =
                    [
                        ...obligation.movements
                    ].sort(
                        (a, b) =>

                            a.completedDate
                                .localeCompare(
                                    b.completedDate
                                )
                    );


                sortedPurchases.forEach(
                    movement => {

                        const item =
                            document.createElement(
                                "div"
                            );


                        item.classList.add(
                            "credit-obligation-purchase"
                        );


                        const dateElement =
                            document.createElement(
                                "span"
                            );


                        dateElement.classList.add(
                            "credit-obligation-date"
                        );


                        dateElement.textContent =
                            formatDate(
                                movement.completedDate
                            );


                        const descriptionElement =
                            document.createElement(
                                "span"
                            );


                        descriptionElement.textContent =
                            movement.description;


                        const amountElement =
                            document.createElement(
                                "strong"
                            );


                        amountElement.textContent =
                            formatCurrency(
                                movement.amount
                            );


                        item.appendChild(
                            dateElement
                        );


                        item.appendChild(
                            descriptionElement
                        );


                        item.appendChild(
                            amountElement
                        );


                        /*
                            Reutilizamos el modal
                            de edición existente.
                        */

                        item.addEventListener(
                            "click",
                            () => {

                                closeModal();


                                window.dispatchEvent(
                                    new CustomEvent(
                                        "openCompletedMovement",
                                        {
                                            detail: {

                                                movementId:
                                                    movement.id

                                            }
                                        }
                                    )
                                );

                            }
                        );


                        purchasesContainer.appendChild(
                            item
                        );

                    }
                );


                content.appendChild(
                    purchasesContainer
                );


                /*
                    Resumen financiero.
                */

                const summary =
                    document.createElement(
                        "div"
                    );


                summary.classList.add(
                    "credit-obligation-summary"
                );


                summary.appendChild(
                    createSummaryRow(
                        "Total original",
                        formatCurrency(
                            obligation.originalAmount
                        )
                    )
                );


                summary.appendChild(
                    createSummaryRow(
                        "Abonado",
                        formatCurrency(
                            obligation.paidAmount
                        )
                    )
                );


                summary.appendChild(
                    createSummaryRow(
                        "Pendiente",
                        formatCurrency(
                            obligation.pendingAmount
                        )
                    )
                );


                content.appendChild(
                    summary
                );


                modal.classList.remove(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    "No se pudo abrir el detalle del crédito:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo abrir el detalle del crédito.",
                    "error"
                );

            }

        }
    );

}


function initializeCreditPurchasesDayModal() {

    const modal =
        document.getElementById(
            "creditPurchasesDayModal"
        );


    const title =
        document.getElementById(
            "creditPurchasesDayTitle"
        );


    const content =
        document.getElementById(
            "creditPurchasesDayContent"
        );


    const closeHeaderButton =
        document.getElementById(
            "closeCreditPurchasesDayModalButton"
        );


    const closeButton =
        document.getElementById(
            "closeCreditPurchasesDayButton"
        );


    function closeModal() {

        modal.classList.add(
            "hidden"
        );

    }


    closeHeaderButton.addEventListener(
        "click",
        closeModal
    );


    closeButton.addEventListener(
        "click",
        closeModal
    );


    function formatCurrency(
        amount
    ) {

        return new Intl.NumberFormat(
            "es-MX",
            {
                style:
                    "currency",

                currency:
                    "MXN"
            }
        ).format(
            amount
        );

    }


    function formatDate(
        dateString
    ) {

        const [
            year,
            month,
            day
        ] =
            dateString
                .split("-")
                .map(Number);


        return new Intl.DateTimeFormat(
            "es-MX",
            {
                day:
                    "numeric",

                month:
                    "long",

                year:
                    "numeric"
            }
        ).format(
            new Date(
                year,
                month - 1,
                day
            )
        );

    }


    window.addEventListener(
        "openCreditPurchasesDay",
        async event => {

            try {

                const {
                    date
                } =
                    event.detail;


                const movements =
                    await getAllRecords(
                        "movements"
                    );


                const credits =
                    await getAllRecords(
                        "credits"
                    );


                const purchases =
                    movements.filter(
                        movement =>

                            movement.status ===
                                "completed"

                            &&

                            movement.type ===
                                "expense"

                            &&

                            movement.paymentMethod ===
                                "credit"

                            &&

                            movement.completedDate ===
                                date
                    );


                content.innerHTML =
                    "";


                title.textContent =
                    `Compras con crédito · ${formatDate(
                        date
                    )}`;


                let total = 0;


                purchases.forEach(
                    movement => {

                        const credit =
                            credits.find(
                                item =>
                                    item.id ===
                                    movement.creditId
                            );


                        const item =
                            document.createElement(
                                "div"
                            );


                        item.classList.add(
                            "day-detail-item",
                            "completed-movement-clickable"
                        );


                        const descriptionContainer =
                            document.createElement(
                                "div"
                            );


                        const description =
                            document.createElement(
                                "strong"
                            );


                        description.textContent =
                            movement.description;


                        const creditName =
                            document.createElement(
                                "small"
                            );


                        creditName.textContent =
                            credit?.name ||
                            "Crédito";


                        descriptionContainer.appendChild(
                            description
                        );


                        descriptionContainer.appendChild(
                            document.createElement(
                                "br"
                            )
                        );


                        descriptionContainer.appendChild(
                            creditName
                        );


                        const amount =
                            document.createElement(
                                "strong"
                            );


                        amount.textContent =
                            formatCurrency(
                                movement.amount
                            );


                        item.appendChild(
                            descriptionContainer
                        );


                        item.appendChild(
                            amount
                        );


                        item.addEventListener(
                            "click",
                            () => {

                                closeModal();


                                window.dispatchEvent(
                                    new CustomEvent(
                                        "openCompletedMovement",
                                        {
                                            detail: {

                                                movementId:
                                                    movement.id

                                            }
                                        }
                                    )
                                );

                            }
                        );


                        content.appendChild(
                            item
                        );


                        total +=
                            movement.amount;

                    }
                );


                const summary =
                    document.createElement(
                        "div"
                    );


                summary.classList.add(
                    "day-detail-summary"
                );


                const row =
                    document.createElement(
                        "div"
                    );


                row.classList.add(
                    "day-detail-summary-row"
                );


                const label =
                    document.createElement(
                        "span"
                    );


                label.textContent =
                    "Total con crédito";


                const value =
                    document.createElement(
                        "strong"
                    );


                value.textContent =
                    formatCurrency(
                        total
                    );


                row.appendChild(
                    label
                );


                row.appendChild(
                    value
                );


                summary.appendChild(
                    row
                );


                content.appendChild(
                    summary
                );


                modal.classList.remove(
                    "hidden"
                );


            } catch (error) {

                console.error(
                    "No se pudieron abrir las compras con crédito:",
                    error
                );


                showNotification(
                    "No se pudieron mostrar las compras con crédito.",
                    "error"
                );

            }

        }
    );

}


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            /*
                1. Inicializar IndexedDB
            */

            const database =
                await initializeDatabase();


            /*
                2. Buscar configuración existente
            */

            const settings =
                await getRecord(
                    "settings",
                    "main"
                );


            /*
                3. Inicializar estado
            */

            initializeApp(
                database,
                settings
            );


            /*
                4. Inicializar interfaz
            */

            await initializeUI(settings);

            /*
                Inicializar formulario de movimientos
            */

            initializeMovementForm();


            /*
                Inicializar modal de
                movimientos programados.
            */

            initializeScheduledMovementModal();


            initializeDayDetailModal();

            initializeEditMovementModal();

            initializeCreditObligationModal();

            initializeCreditPurchasesDayModal();


            /*
                5. Inicializar calendario
            */

            initializeCalendar();


            /*
                6. Si no existe configuración,
                   mostrar formulario inicial.
            */

            if (!settings) {

                document
                    .getElementById("settingsModal")
                    .classList
                    .remove("hidden");

            }


        } catch (error) {

            console.error(
                "No se pudo iniciar la aplicación:",
                error
            );

        }

    }
);

/*
    =================================
    SERVICE WORKER
    =================================

    Permite que la aplicación pueda
    funcionar como PWA y utilizar
    archivos almacenados en caché.
*/

if (
    "serviceWorker" in navigator
) {

    window.addEventListener(
        "load",
        async () => {

            try {

                const registration =
                    await navigator
                        .serviceWorker
                        .register(
                            "./service-worker.js"
                        );


                console.log(
                    "Service Worker registrado:",
                    registration.scope
                );


            } catch (error) {

                console.error(
                    "No se pudo registrar el Service Worker:",
                    error
                );

            }

        }
    );

}
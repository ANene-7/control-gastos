import {
    calculateCreditObligations
} from "./creditCalculations.js";

import {
    calculateCalendarBalance
} from "./calculations.js";

import {
    getAllRecords
} from "./database.js";

import {
    getScheduledMovementsForDate
} from "./scheduledCalculations.js";


/*
    Estado actual del calendario.

    Guardamos el año y mes que estamos viendo
    para poder navegar independientemente de
    la fecha actual.
*/

let currentYear =
    new Date().getFullYear();

let currentMonth =
    new Date().getMonth();

let currentView =
    "calendar";


/*
    Permite que otras partes de la app
    sepan qué periodo está mostrando
    actualmente el calendario.
*/

export function getCurrentCalendarPeriod() {

    return {

        year:
            currentYear,

        month:
            currentMonth

    };

}


/*
    Inicializar calendario.
*/

export function initializeCalendar() {

    /*
        Botón mes anterior
    */

    const previousMonthButton =
        document.getElementById(
            "previousMonthButton"
        );


    /*
        Botón mes siguiente
    */

    const nextMonthButton =
        document.getElementById(
            "nextMonthButton"
        );


    /*
        Botón Hoy
    */

    const todayButton =
        document.getElementById(
            "todayButton"
        );


    const calendarViewButton =
        document.getElementById(
            "calendarViewButton"
        );

    const tableViewButton =
        document.getElementById(
            "tableViewButton"
        );


    /*
        Navegar al mes anterior
    */

    previousMonthButton.addEventListener(
        "click",
        () => {

            currentMonth--;

            if (
                currentMonth < 0
            ) {

                currentMonth = 11;

                currentYear--;

            }


            renderCalendar();

        }
    );


    /*
        Navegar al mes siguiente
    */

    nextMonthButton.addEventListener(
        "click",
        () => {

            currentMonth++;

            if (
                currentMonth > 11
            ) {

                currentMonth = 0;

                currentYear++;

            }


            renderCalendar();

        }
    );


    /*
        Volver al mes actual
    */

    todayButton.addEventListener(
        "click",
        () => {

            const today =
                new Date();


            currentYear =
                today.getFullYear();


            currentMonth =
                today.getMonth();


            renderCalendar();

        }
    );


    /*
        Cambiar representación mensual.
        El periodo no cambia: sólo decidimos
        si se muestra como calendario o tabla.
    */

    calendarViewButton?.addEventListener(
        "click",
        () => {
            currentView = "calendar";
            renderCalendar();
        }
    );

    tableViewButton?.addEventListener(
        "click",
        () => {
            currentView = "table";
            renderCalendar();
        }
    );


    /*
        Primera renderización
    */

    renderCalendar();

}


/*
    Renderizar calendario.
*/

export async function renderCalendar() {

    const calendarDays =
        document.getElementById(
            "calendarDays"
        );


    /*
        Si no encontramos el contenedor,
        detenemos la función.
    */

    if (!calendarDays) {

        return;

    }


    /*
    Obtener todos los movimientos
    guardados en IndexedDB.
*/

const movements =
    await getAllRecords(
        "movements"
    );

const credits =
    await getAllRecords(
        "credits"
    );


const creditObligations =
    calculateCreditObligations(
        movements,
        credits
    );


    updateCalendarTitle();
    updateTodayButtonVisibility();
    updateViewSwitch();

    const calendar =
        document.getElementById(
            "calendar"
        );

    const monthlyTable =
        document.getElementById(
            "monthlyTable"
        );

    const showingTable =
        currentView === "table";

    calendar?.classList.toggle(
        "hidden",
        showingTable
    );

    monthlyTable?.classList.toggle(
        "hidden",
        !showingTable
    );

    monthlyTable?.setAttribute(
        "aria-hidden",
        showingTable ? "false" : "true"
    );

    if (showingTable) {

        await renderMonthlyTable(
            movements,
            credits,
            creditObligations
        );

        dispatchPeriodChanged();
        return;

    }


    /*
        Limpiar calendario anterior.
    */

    calendarDays.innerHTML = "";


    /*
        Primer día del mes.
    */

    const firstDay =
        new Date(
            currentYear,
            currentMonth,
            1
        );


    /*
        Último día del mes.
    */

    const lastDay =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        );


    /*
        Día de la semana en que comienza
        el mes.

        JavaScript:
        0 = domingo
        1 = lunes
        ...
        6 = sábado

        Nuestro calendario comienza
        en lunes.
    */

    let startingDay =
        firstDay.getDay();


    if (
        startingDay === 0
    ) {

        startingDay = 6;

    } else {

        startingDay--;

    }


    /*
        Celdas vacías antes del
        primer día del mes.
    */

    for (
        let i = 0;
        i < startingDay;
        i++
    ) {

        const emptyCell =
            document.createElement(
                "div"
            );


        emptyCell.classList.add(
            "calendar-day",
            "empty"
        );


        calendarDays.appendChild(
            emptyCell
        );

    }


    /*
        Número de días del mes.
    */

    const daysInMonth =
        lastDay.getDate();


    /*
        Crear cada día.
    */

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const cell =
            document.createElement(
                "div"
            );


        cell.classList.add(
            "calendar-day"
        );


        /*
            Crear fecha YYYY-MM-DD.
        */

        const date =
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        /*
            Marcar el día actual.
        */

        const today =
            new Date();


        const todayString =
            `${today.getFullYear()}-` +
            `${String(
                today.getMonth() + 1
            ).padStart(2, "0")}-` +
            `${String(
                today.getDate()
            ).padStart(2, "0")}`;


        if (
            date ===
            todayString
        ) {

            cell.classList.add(
                "calendar-day-today"
            );

        }

        const scheduledMovements =
            getScheduledMovementsForDate(
                date,
                movements
            );


        const scheduledExpensesForDay =
            scheduledMovements.filter(
                movement =>
                    movement.type ===
                    "expense"
            );


        const scheduledIncomeForDay =
            scheduledMovements.filter(
                movement =>
                    movement.type ===
                    "income"
            );


        /*
            Calcular saldo del día.
        */

        const balance =
            calculateCalendarBalance(
                date,
                movements,
                credits
            );


        const creditPurchasesForDay =
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


        /*
            Número del día.
        */

        const dayNumber =
            document.createElement(
                "div"
            );


        dayNumber.classList.add(
            "calendar-day-number"
        );


        dayNumber.textContent =
            day;


        cell.appendChild(
            dayNumber
        );


        /*
            Contenedor de saldos.
        */

        const balancesContainer =
            document.createElement(
                "div"
            );

        balancesContainer.classList.add(
            "calendar-balances"
        );


        /*
            Título "Saldos"
        */

        const balancesTitle =
            document.createElement(
                "div"
            );

        balancesTitle.classList.add(
            "calendar-section-label"
        );

        balancesTitle.textContent =
            "Saldos:";

        balancesContainer.appendChild(
            balancesTitle
        );


        /*
            Saldo del día.
        */

        const dailyBalanceRow =
            document.createElement(
                "div"
            );

        dailyBalanceRow.classList.add(
            "calendar-balance-row"
        );


        const dailyBalanceLabel =
            document.createElement(
                "span"
            );

        dailyBalanceLabel.classList.add(
            "calendar-balance-label"
        );

        dailyBalanceLabel.textContent =
            "Día:";


        const dailyBalanceValue =
            document.createElement(
                "span"
            );

        dailyBalanceValue.classList.add(
            "calendar-balance-value"
        );


        if (
            balance.dailyBalance !== null &&
            balance.dailyBalance !== 0
        ) {

            dailyBalanceValue.textContent =
                formatCurrency(
                    balance.dailyBalance
                );


            if (
                balance.dailyBalance >
                0
            ) {

                dailyBalanceValue.classList.add(
                    "balance-positive"
                );

            }


            if (
                balance.dailyBalance <
                0
            ) {

                dailyBalanceValue.classList.add(
                    "balance-negative"
                );

            }


            dailyBalanceRow.appendChild(
                dailyBalanceLabel
            );


            dailyBalanceRow.appendChild(
                dailyBalanceValue
            );


            balancesContainer.appendChild(
                dailyBalanceRow
            );

        }


        /*
            Saldo acumulado.
        */

        const accumulatedBalanceRow =
            document.createElement(
                "div"
            );

        accumulatedBalanceRow.classList.add(
            "calendar-balance-row"
        );


        const accumulatedBalanceLabel =
            document.createElement(
                "span"
            );

        accumulatedBalanceLabel.classList.add(
            "calendar-balance-label"
        );

        accumulatedBalanceLabel.textContent =
            balance.projected
                ? "Proyectado:"
                : "Acumulado:";


        const accumulatedBalanceValue =
            document.createElement(
                "span"
            );

        accumulatedBalanceValue.classList.add(
            "calendar-balance-value"
        );


        if (
            balance.accumulatedBalance === null
        ) {

            accumulatedBalanceValue.textContent =
                "";

        } else {

            accumulatedBalanceValue.textContent =
                formatCurrency(
                    balance.accumulatedBalance
                );

                if (
                    balance.accumulatedBalance <
                    0
                ) {

                    accumulatedBalanceValue.classList.add(
                        "balance-negative"
                    );

                }

        }


        accumulatedBalanceRow.appendChild(
            accumulatedBalanceLabel
        );

        accumulatedBalanceRow.appendChild(
            accumulatedBalanceValue
        );


        balancesContainer.appendChild(
            accumulatedBalanceRow
        );


        cell.appendChild(
            balancesContainer
        );


        if (
            creditPurchasesForDay.length > 0
        ) {

            const totalCreditPurchases =
                creditPurchasesForDay.reduce(
                    (
                        total,
                        movement
                    ) =>
                        total +
                        movement.amount,
                    0
                );


            const creditSummary =
                document.createElement(
                    "div"
                );


            creditSummary.classList.add(
                "calendar-credit-summary",
                "credit-purchases-summary-clickable"
            );


            const label =
                document.createElement(
                    "span"
                );


            label.classList.add(
                "calendar-balance-label"
            );


            label.textContent =
                "Crédito:";


            const value =
                document.createElement(
                    "span"
                );


            value.classList.add(
                "calendar-balance-value"
            );


            value.textContent =
                formatCurrency(
                    totalCreditPurchases
                );


            creditSummary.appendChild(
                label
            );


            creditSummary.appendChild(
                value
            );


            creditSummary.addEventListener(
                "click",
                () => {

                    window.dispatchEvent(
                        new CustomEvent(
                            "openCreditPurchasesDay",
                            {
                                detail: {
                                    date
                                }
                            }
                        )
                    );

                }
            );


            cell.appendChild(
                creditSummary
            );

        }


        /*
            Contenedor para movimientos
            y obligaciones programadas.
        */

        const programmedEvents =
            document.createElement(
                "div"
            );

        programmedEvents.classList.add(
            "calendar-programmed-events"
        );


        /*
            Pagos programados.
        */

        const scheduledExpenses =
            document.createElement(
                "div"
            );

        scheduledExpenses.classList.add(
            "calendar-programmed-section",
            "scheduled-expenses"
        );

        scheduledExpenses.innerHTML = `
            <div class="calendar-programmed-list">
            </div>
        `;

        /*
            Buscar pagos de crédito
            correspondientes a este día.
        */

        const dayCreditObligations =
            creditObligations.filter(
                obligation =>

                    obligation.dueDate ===
                        date

                    &&

                    obligation.pendingAmount > 0

            );


        const scheduledExpensesList =
            scheduledExpenses.querySelector(
                ".calendar-programmed-list"
            );

        scheduledExpensesForDay.forEach(
            movement => {

                const dot =
                    createMovementColorDot(
                        movement
                    );


                dot.title =
                    movement.description;


                scheduledExpensesList
                    .appendChild(
                        dot
                    );

            }
        );

        if (
            scheduledExpensesForDay.length === 0
            &&
            dayCreditObligations.length === 0
        ) {

            scheduledExpenses
                .classList
                .add(
                    "hidden"
                );

        }


            dayCreditObligations.forEach(
            obligation => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.classList.add(
                    "calendar-programmed-item",
                    "credit-obligation-clickable",
                    "credit-obligation-calendar-item"
                );


                const creditName =
                    document.createElement(
                        "span"
                    );


                creditName.classList.add(
                    "credit-obligation-name"
                );


                creditName.textContent =
                    obligation.creditName;


                const creditAmount =
                    document.createElement(
                        "span"
                    );


                creditAmount.classList.add(
                    "credit-obligation-amount"
                );


                creditAmount.textContent =
                    `: ${formatCurrency(
                        obligation.pendingAmount
                    )}`;


                item.appendChild(
                    creditName
                );


                item.appendChild(
                    creditAmount
                );


                item.addEventListener(
                    "click",
                    () => {

                        window.dispatchEvent(
                            new CustomEvent(
                                "openCreditObligation",
                                {
                                    detail: {

                                        creditId:
                                            obligation.creditId,

                                        dueDate:
                                            obligation.dueDate

                                    }
                                }
                            )
                        );

                    }
                );


                scheduledExpensesList.appendChild(
                    item
                );

            }
        );

        programmedEvents.appendChild(
            scheduledExpenses
        );


        /*
            Ingresos programados.
        */

        const scheduledIncome =
            document.createElement(
                "div"
            );

        scheduledIncome.classList.add(
            "calendar-programmed-section",
            "scheduled-income"
        );

        scheduledIncome.innerHTML = `
            <div class="calendar-programmed-list">
            </div>
        `;


        /*
            Lista de ingresos programados.
        */

        const scheduledIncomeList =
            scheduledIncome.querySelector(
                ".calendar-programmed-list"
            );


        scheduledIncomeForDay.forEach(
            movement => {

                const dot =
                    createMovementColorDot(
                        movement
                    );


                dot.title =
                    movement.description;


                scheduledIncomeList
                    .appendChild(
                        dot
                    );

            }
        );


        /*
            Ocultar sección si no hay
            ingresos programados.
        */

        if (
            scheduledIncomeForDay.length === 0
        ) {

            scheduledIncome
                .classList
                .add(
                    "hidden"
                );

        }


        programmedEvents.appendChild(
            scheduledIncome
        );


        cell.appendChild(
            programmedEvents
        );


        cell.addEventListener(
            "click",
            event => {

                /*
                    Si se hizo clic sobre un
                    movimiento programado,
                    dejamos que se abra su
                    propio modal.
                */

                if (
                    event.target.closest(
                        ".scheduled-movement-clickable, " +
                        ".credit-obligation-clickable, " +
                        ".credit-purchases-summary-clickable"
                    )
                ) {

                    return;

                }


                window.dispatchEvent(
                    new CustomEvent(
                        "openDayDetail",
                        {
                            detail: {
                                date
                            }
                        }
                    )
                );

            }
        );


        /*
            Agregar día al calendario.
        */

        calendarDays.appendChild(
            cell
        );

    }


    /*
        Informar al dashboard qué mes
        está actualmente visible.
    */

    dispatchPeriodChanged();

}



/*
    Mantiene el selector Calendario / Tabla
    sincronizado con la vista actual.
*/
function updateViewSwitch() {

    const calendarViewButton =
        document.getElementById(
            "calendarViewButton"
        );

    const tableViewButton =
        document.getElementById(
            "tableViewButton"
        );

    const isCalendar =
        currentView === "calendar";

    calendarViewButton?.classList.toggle(
        "active",
        isCalendar
    );

    tableViewButton?.classList.toggle(
        "active",
        !isCalendar
    );

    calendarViewButton?.setAttribute(
        "aria-pressed",
        isCalendar ? "true" : "false"
    );

    tableViewButton?.setAttribute(
        "aria-pressed",
        isCalendar ? "false" : "true"
    );

}


function updateTodayButtonVisibility() {

    const todayButton =
        document.getElementById(
            "todayButton"
        );

    if (!todayButton) {
        return;
    }

    const today =
        new Date();

    const isCurrentMonth =
        currentYear === today.getFullYear()
        &&
        currentMonth === today.getMonth();

    todayButton.classList.toggle(
        "hidden",
        isCurrentMonth
    );

}


function dispatchPeriodChanged() {

    window.dispatchEvent(
        new CustomEvent(
            "calendarPeriodChanged",
            {
                detail: {
                    year: currentYear,
                    month: currentMonth
                }
            }
        )
    );

}


/*
    Construye la vista tabular del mes usando
    exactamente el mismo periodo y los mismos
    cálculos que utiliza el calendario.
*/
async function renderMonthlyTable(
    movements,
    credits,
    creditObligations
) {

    const body =
        document.getElementById(
            "monthlyTableBody"
        );

    if (!body) {
        return;
    }

    body.innerHTML = "";

    const daysInMonth =
        new Date(
            currentYear,
            currentMonth + 1,
            0
        ).getDate();

    const weekdayNames = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado"
    ];

    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        const dateObject =
            new Date(
                currentYear,
                currentMonth,
                day
            );

        const weekday =
            weekdayNames[
                dateObject.getDay()
            ];

        const balance =
            calculateCalendarBalance(
                date,
                movements,
                credits
            );

        const completedMovements =
            movements.filter(
                movement =>
                    movement.status === "completed"
                    &&
                    movement.completedDate === date
            );

        const scheduledMovements =
            getScheduledMovementsForDate(
                date,
                movements
            );

        const obligations =
            creditObligations.filter(
                obligation =>
                    obligation.dueDate === date
                    &&
                    obligation.pendingAmount > 0
            );

        const events = [];

        completedMovements.forEach(
            movement => {

                let kind =
                    movement.type === "income"
                        ? "Ingreso"
                        : "Egreso";

                if (
                    movement.purpose === "creditPayment"
                ) {
                    kind = "Pago a crédito";
                } else if (
                    movement.paymentMethod === "credit"
                    &&
                    movement.type === "expense"
                ) {
                    kind = "Compra a crédito";
                }

                events.push({
                    description: movement.description,
                    amount: movement.amount,
                    kind,
                    category: movement.category || "",
                    color: movement.labelColor || "gray",
                    status: "completed",
                    impact: getTableMovementImpact(movement)
                });

            }
        );

        scheduledMovements.forEach(
            movement => {

                events.push({
                    description: movement.description,
                    amount: movement.amount,
                    kind:
                        movement.type === "income"
                            ? "Ingreso programado"
                            : "Egreso programado",
                    category: movement.category || "",
                    color: movement.labelColor || "gray",
                    status: "scheduled",
                    impact:
                        movement.type === "income"
                            ? movement.amount
                            : -movement.amount
                });

            }
        );

        obligations.forEach(
            obligation => {
                events.push({
                    description: obligation.creditName,
                    amount: obligation.pendingAmount,
                    kind: "Pago de crédito previsto",
                    category: "Deudas / créditos",
                    color: "gray",
                    status: "scheduled",
                    impact: -obligation.pendingAmount
                });
            }
        );

        const row =
            document.createElement(
                "div"
            );

        row.classList.add(
            "monthly-table-row"
        );

        if (
            dateObject.getDay() === 0
            ||
            dateObject.getDay() === 6
        ) {
            row.classList.add(
                "weekend"
            );
        }

        if (events.length > 1) {
            row.classList.add(
                "multiple-movements"
            );
        }

        row.dataset.date = date;

        const dayCell =
            document.createElement("div");
        dayCell.className = "monthly-table-day";
        dayCell.textContent = day;

        const weekdayCell =
            document.createElement("div");
        weekdayCell.className = "monthly-table-weekday";
        weekdayCell.textContent = weekday;

        const movementCell =
            document.createElement("div");
        movementCell.className = "monthly-table-movement";

        const dailyCell =
            document.createElement("div");
        dailyCell.className = "monthly-table-money monthly-table-daily";

        const accumulatedCell =
            document.createElement("div");
        accumulatedCell.className = "monthly-table-money monthly-table-accumulated";

        if (
            balance.dailyBalance !== null
            &&
            balance.dailyBalance !== 0
        ) {
            dailyCell.textContent =
                formatSignedCurrency(
                    balance.dailyBalance
                );

            dailyCell.classList.add(
                balance.dailyBalance < 0
                    ? "balance-negative"
                    : "balance-positive"
            );
        }

        if (
            balance.accumulatedBalance !== null
        ) {
            accumulatedCell.textContent =
                formatCurrency(
                    balance.accumulatedBalance
                );

            if (
                balance.accumulatedBalance < 0
            ) {
                accumulatedCell.classList.add(
                    "balance-negative"
                );
            }

            if (
                balance.projected
            ) {
                accumulatedCell.classList.add(
                    "projected-balance"
                );
                accumulatedCell.title =
                    "Saldo proyectado";
            }
        }

        events.forEach(
            eventData => {

                const movementLine =
                    document.createElement("div");
                movementLine.className =
                    "monthly-table-movement-line";

                const dot =
                    document.createElement("span");
                dot.classList.add(
                    "movement-color-dot",
                    `movement-color-${eventData.color}`
                );

                const movementText =
                    document.createElement("span");
                movementText.className =
                    "monthly-table-movement-text";

                const description =
                    document.createElement("span");
                description.className =
                    "monthly-table-description";
                description.textContent =
                    eventData.description;

                const meta =
                    document.createElement("span");
                meta.className =
                    "monthly-table-movement-meta";
                meta.textContent =
                    `${eventData.category ? eventData.category + " · " : ""}${eventData.kind} · ${formatSignedCurrency(eventData.impact, eventData.amount)}`;

                if (
                    eventData.status === "scheduled"
                ) {
                    movementLine.classList.add(
                        "scheduled"
                    );
                }

                movementText.appendChild(
                    description
                );
                movementText.appendChild(
                    meta
                );
                movementLine.appendChild(dot);
                movementLine.appendChild(
                    movementText
                );
                movementCell.appendChild(
                    movementLine
                );

            }
        );

        row.appendChild(dayCell);
        row.appendChild(weekdayCell);
        row.appendChild(movementCell);
        row.appendChild(dailyCell);
        row.appendChild(accumulatedCell);

        row.addEventListener(
            "click",
            () => {
                window.dispatchEvent(
                    new CustomEvent(
                        "openDayDetail",
                        {
                            detail: { date }
                        }
                    )
                );
            }
        );

        body.appendChild(row);

    }

}


function getTableMovementImpact(
    movement
) {

    if (
        movement.paymentMethod === "credit"
        &&
        movement.type === "expense"
    ) {
        return 0;
    }

    return movement.type === "income"
        ? movement.amount
        : -movement.amount;

}


function formatSignedCurrency(
    amount,
    referenceAmount = null
) {

    if (
        amount === 0
        &&
        referenceAmount !== null
    ) {
        return `${formatCurrency(referenceAmount)} crédito`;
    }

    if (amount > 0) {
        return `+${formatCurrency(amount)}`;
    }

    if (amount < 0) {
        return `-${formatCurrency(Math.abs(amount))}`;
    }

    return formatCurrency(0);

}


/*
    Actualizar título del calendario.
*/

function updateCalendarTitle() {

    const calendarTitle =
        document.getElementById(
            "calendarTitle"
        );


    if (!calendarTitle) {

        return;

    }


    const monthNames = [

        "Enero",
        "Febrero",
        "Marzo",
        "Abril",
        "Mayo",
        "Junio",
        "Julio",
        "Agosto",
        "Septiembre",
        "Octubre",
        "Noviembre",
        "Diciembre"

    ];


    calendarTitle.textContent =
        `${monthNames[currentMonth]} ${currentYear}`;

}


/*
    Crea un indicador visual
    basado en la etiqueta de color
    del movimiento.
*/

function createMovementColorDot(
    movement
) {

    const dot =
        document.createElement(
            "span"
        );


    dot.classList.add(
        "movement-color-dot"
    );


    const color =
        movement.labelColor ||
        "gray";


    dot.classList.add(
        `movement-color-${color}`
    );


    return dot;

}


/*
    Formato monetario.
*/

function formatCurrency(
    amount
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(amount);

}
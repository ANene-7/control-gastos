import {
    calculateCreditObligations
} from "./creditCalculations.js";

import {
    calculateDailyBalance
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


    /*
        Limpiar calendario anterior.
    */

    calendarDays.innerHTML = "";


    /*
        Actualizar título.
    */

    updateCalendarTitle();


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
            calculateDailyBalance(
                date,
                movements
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
            "Acumulado:";


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


                item.textContent =
                    `${obligation.creditName}: ` +
                    `${formatCurrency(
                        obligation.pendingAmount
                    )}`;


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

    window.dispatchEvent(
        new CustomEvent(
            "calendarPeriodChanged",
            {
                detail: {

                    year:
                        currentYear,

                    month:
                        currentMonth

                }
            }
        )
    );

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
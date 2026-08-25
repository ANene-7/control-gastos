import {
    getSettings
} from "./state.js";


import {
    getScheduledMovementsForDate
} from "./scheduledCalculations.js";


import {
    calculateCreditObligations
} from "./creditCalculations.js";


/*
    Determina si un movimiento afecta
    el saldo real.

    Los movimientos programados todavía
    no han ocurrido, por lo tanto no
    modifican el saldo.
*/
function affectsRealBalance(
    movement
) {

    return (
        movement.status ===
        "completed"
    );

}


/*
    Determina el impacto financiero
    de un movimiento.

    Ingreso:
        +monto

    Egreso:
        -monto

    Compra con crédito:
        0

    Esto último es importante:
    una compra con TDC no reduce
    nuestro dinero disponible.
*/
function getMovementImpact(
    movement
) {

    if (
        !affectsRealBalance(
            movement
        )
    ) {

        return 0;

    }


    /*
        Una compra con crédito no
        afecta el saldo disponible.
    */

    if (
        movement.paymentMethod ===
            "credit"
        &&
        movement.type ===
            "expense"
    ) {

        return 0;

    }


    /*
        Ingresos aumentan el saldo.
    */

    if (
        movement.type ===
        "income"
    ) {

        return movement.amount;

    }


    /*
        Egresos reducen el saldo.
    */

    if (
        movement.type ===
        "expense"
    ) {

        return -movement.amount;

    }


    return 0;

}


/*
    Calcula el saldo de un día específico.

    Parámetros:

    date
        Fecha en formato YYYY-MM-DD.

    movements
        Array con los movimientos
        registrados en IndexedDB.
*/
export function calculateDailyBalance(
    date,
    movements = []
) {

    const settings =
        getSettings();


    /*
        Si todavía no existe configuración,
        no podemos calcular ningún saldo.
    */

    if (!settings) {

        return {

            dailyBalance: null,

            accumulatedBalance: null

        };

    }


    /*
        Si la fecha solicitada es anterior
        al saldo inicial, no mostramos saldo.
    */

    if (
        date <
        settings.initialBalanceDate
    ) {

        return {

            dailyBalance: null,

            accumulatedBalance: null

        };

    }


    /*
        --------------------------------
        SALDO DEL DÍA
        --------------------------------
    */


    let dailyBalance = 0;


    movements.forEach(
        movement => {

            /*
                Un movimiento realizado
                utiliza completedDate.
            */

            if (
                movement.status !==
                "completed"
            ) {

                return;

            }


            if (
                movement.completedDate !==
                date
            ) {

                return;

            }


            dailyBalance +=
                getMovementImpact(
                    movement
                );

        }
    );


    /*
        --------------------------------
        SALDO ACUMULADO
        --------------------------------

        Partimos del saldo inicial
        y sumamos todos los movimientos
        realizados desde esa fecha
        hasta el día consultado.
    */


    let accumulatedBalance =
        settings.initialBalance;


    movements.forEach(
        movement => {

            if (
                movement.status !==
                "completed"
            ) {

                return;

            }


            const movementDate =
                movement.completedDate;


            if (!movementDate) {

                return;

            }


            if (
                movementDate <
                settings.initialBalanceDate
            ) {

                return;

            }


            if (
                movementDate >
                date
            ) {

                return;

            }


            accumulatedBalance +=
                getMovementImpact(
                    movement
                );

        }
    );


    return {

        dailyBalance,

        accumulatedBalance

    };

}


/*
    Calcula el saldo que debe mostrarse
    en el calendario.

    Pasado y hoy:
        utiliza movimientos reales.

    Futuro:
        utiliza movimientos programados
        y obligaciones pendientes de crédito.
*/

export function calculateCalendarBalance(
    date,
    movements = [],
    credits = []
) {

    const settings =
        getSettings();


    if (
        !settings ||
        date <
            settings.initialBalanceDate
    ) {

        return {

            dailyBalance:
                null,

            accumulatedBalance:
                null,

            projected:
                false

        };

    }


    const today =
        getTodayString();


    /*
        =================================
        PASADO Y HOY
        =================================
    */

    if (
        date <= today
    ) {

        const realBalance =
            calculateDailyBalance(
                date,
                movements
            );


        return {

            ...realBalance,

            projected:
                false

        };

    }


    /*
        =================================
        FUTURO
        =================================

        Calcular el movimiento previsto
        específicamente para este día.
    */

    let dailyBalance =
        0;


    const scheduledMovements =
        getScheduledMovementsForDate(
            date,
            movements
        );


    scheduledMovements.forEach(
        movement => {

            /*
                Una compra programada mediante
                TDC no reduce el dinero disponible
                el día de la compra.
            */

            if (
                movement.paymentMethod ===
                    "credit"
                &&
                movement.type ===
                    "expense"
            ) {

                return;

            }


            if (
                movement.type ===
                    "income"
            ) {

                dailyBalance +=
                    movement.amount;

            }


            if (
                movement.type ===
                    "expense"
            ) {

                dailyBalance -=
                    movement.amount;

            }

        }
    );


    /*
        Agregar obligaciones de crédito
        cuya FLP cae exactamente este día.
    */

    const creditObligations =
        calculateCreditObligations(
            movements,
            credits
        );


    creditObligations
        .filter(
            obligation =>

                obligation.dueDate ===
                    date

                &&

                obligation.pendingAmount >
                    0
        )
        .forEach(
            obligation => {

                dailyBalance -=
                    obligation.pendingAmount;

            }
        );


    /*
        El acumulado futuro ya lo calcula
        calculateProjectedBalance().
    */

    const accumulatedBalance =
        calculateProjectedBalance(
            date,
            movements,
            credits
        );


    return {

        dailyBalance,

        accumulatedBalance,

        projected:
            true

    };

}


/*
    Calcula el resumen financiero
    completo de un mes.

    Separamos:

    - movimientos realizados
    - movimientos programados
    - obligaciones futuras de crédito
*/

export function calculateMonthlySummary(
    year,
    month,
    movements = [],
    credits = []
) {

    const monthPrefix =
        `${year}-${String(
            month + 1
        ).padStart(
            2,
            "0"
        )}-`;


    /*
        =================================
        MOVIMIENTOS REALIZADOS
        =================================
    */

    let realIncome = 0;

    let realExpenses = 0;


    movements.forEach(
        movement => {

            if (
                movement.status !==
                    "completed"
                ||
                !movement.completedDate
                ||
                !movement.completedDate
                    .startsWith(
                        monthPrefix
                    )
            ) {

                return;

            }


            /*
                Ingreso realizado.
            */

            if (
                movement.type ===
                "income"
            ) {

                realIncome +=
                    movement.amount;

                return;

            }


            /*
                Compra con TDC.

                La compra ocurrió,
                pero todavía no salió
                dinero disponible.
            */

            if (
                movement.type ===
                    "expense"
                &&
                movement.paymentMethod ===
                    "credit"
            ) {

                return;

            }


            /*
                Egreso real.

                Incluye pagos / abonos
                realizados a créditos.
            */

            if (
                movement.type ===
                "expense"
            ) {

                realExpenses +=
                    movement.amount;

            }

        }
    );


    /*
        =================================
        MOVIMIENTOS PROGRAMADOS
        =================================
    */

    let scheduledIncome = 0;

    let scheduledExpenses = 0;


    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            buildDateString(
                year,
                month,
                day
            );


        const scheduledMovements =
            getScheduledMovementsForDate(
                date,
                movements
            );


        scheduledMovements.forEach(
            movement => {

                /*
                    Ingreso programado.
                */

                if (
                    movement.type ===
                    "income"
                ) {

                    scheduledIncome +=
                        movement.amount;

                    return;

                }


                /*
                    Una compra futura mediante
                    TDC tampoco representa salida
                    inmediata de efectivo.
                */

                if (
                    movement.type ===
                        "expense"
                    &&
                    movement.paymentMethod ===
                        "credit"
                ) {

                    return;

                }


                /*
                    Egreso programado.
                */

                if (
                    movement.type ===
                    "expense"
                ) {

                    scheduledExpenses +=
                        movement.amount;

                }

            }
        );

    }


    /*
        =================================
        OBLIGACIONES DE CRÉDITO
        =================================

        Las FLP pendientes representan
        egresos futuros de efectivo.
    */

    const creditObligations =
        calculateCreditObligations(
            movements,
            credits
        );


    creditObligations.forEach(
        obligation => {

            if (
                !obligation.dueDate
                    .startsWith(
                        monthPrefix
                    )
                ||
                obligation.pendingAmount <= 0
            ) {

                return;

            }


            scheduledExpenses +=
                obligation.pendingAmount;

        }
    );


    /*
        =================================
        RESULTADOS
        =================================
    */

    const realBalance =
        realIncome -
        realExpenses;


    const scheduledBalance =
        scheduledIncome -
        scheduledExpenses;


    /*
        Representa el resultado del mes
        considerando lo ya realizado
        y lo que todavía esperamos.
    */

    const projectedBalance =
        realBalance +
        scheduledBalance;


    return {

        realIncome,

        realExpenses,

        realBalance,

        scheduledIncome,

        scheduledExpenses,

        scheduledBalance,

        projectedBalance

    };

}


/*
    Construye una fecha YYYY-MM-DD.
*/

function buildDateString(
    year,
    month,
    day
) {

    return (
        `${year}-` +
        `${String(
            month + 1
        ).padStart(2, "0")}-` +
        `${String(day).padStart(2, "0")}`
    );

}


/*
    Devuelve la fecha local actual
    en YYYY-MM-DD.
*/

function getTodayString() {

    const today =
        new Date();


    return buildDateString(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

}


/*
    Calcula el saldo proyectado
    hasta una fecha determinada.

    Usa:

    - saldo real existente
    - movimientos realizados
    - movimientos programados
    - pagos futuros de TDC
*/

export function calculateProjectedBalance(
    date,
    movements = [],
    credits = []
) {

    const settings =
        getSettings();


    if (
        !settings ||
        date <
            settings.initialBalanceDate
    ) {

        return null;

    }


    const today =
        getTodayString();


    /*
        Si consultamos una fecha pasada
        o el día actual, usamos únicamente
        el saldo real.
    */

    if (
        date <= today
    ) {

        return calculateDailyBalance(
            date,
            movements
        ).accumulatedBalance;

    }


    /*
        Partimos del saldo REAL
        disponible hoy.
    */

    const currentRealBalance =
        calculateDailyBalance(
            today,
            movements
        ).accumulatedBalance;


    if (
        currentRealBalance === null
    ) {

        return null;

    }


    let projectedBalance =
        currentRealBalance;


    /*
        Obligaciones actuales de TDC.
    */

    const creditObligations =
        calculateCreditObligations(
            movements,
            credits
        );


    /*
        Recorremos todos los días
        posteriores a hoy hasta
        la fecha objetivo.
    */

    const [
        targetYear,
        targetMonth,
        targetDay
    ] =
        date
            .split("-")
            .map(Number);


    const cursor =
        new Date();


    cursor.setHours(
        0,
        0,
        0,
        0
    );


    cursor.setDate(
        cursor.getDate() + 1
    );


    const target =
        new Date(
            targetYear,
            targetMonth - 1,
            targetDay
        );


    while (
        cursor <= target
    ) {

        const cursorDate =
            buildDateString(
                cursor.getFullYear(),
                cursor.getMonth(),
                cursor.getDate()
            );


        /*
            Movimientos programados
            correspondientes al día.
        */

        const scheduledMovements =
            getScheduledMovementsForDate(
                cursorDate,
                movements
            );


        scheduledMovements.forEach(
            movement => {

                /*
                    Por ahora una compra
                    programada mediante TDC
                    tampoco reduce efectivo
                    inmediatamente.
                */

                if (
                    movement.paymentMethod ===
                        "credit"
                    &&
                    movement.type ===
                        "expense"
                ) {

                    return;

                }


                if (
                    movement.type ===
                    "income"
                ) {

                    projectedBalance +=
                        movement.amount;

                }


                if (
                    movement.type ===
                    "expense"
                ) {

                    projectedBalance -=
                        movement.amount;

                }

            }
        );


        /*
            FLP automáticas de TDC.
        */

        creditObligations
            .filter(
                obligation =>

                    obligation.dueDate ===
                        cursorDate

                    &&

                    obligation.pendingAmount >
                        0
            )
            .forEach(
                obligation => {

                    projectedBalance -=
                        obligation.pendingAmount;

                }
            );


        cursor.setDate(
            cursor.getDate() + 1
        );

    }


    return projectedBalance;

}


/*
    Busca el saldo acumulado/proyectado
    más bajo de un mes.
*/

export function calculateMonthlyMinimumBalance(
    year,
    month,
    movements = [],
    credits = []
) {

    const daysInMonth =
        new Date(
            year,
            month + 1,
            0
        ).getDate();


    let minimumBalance =
        null;


    let minimumDate =
        null;


    for (
        let day = 1;
        day <= daysInMonth;
        day++
    ) {

        const date =
            buildDateString(
                year,
                month,
                day
            );


        const projectedBalance =
            calculateProjectedBalance(
                date,
                movements,
                credits
            );


        if (
            projectedBalance === null
        ) {

            continue;

        }


        if (
            minimumBalance === null
            ||
            projectedBalance <
                minimumBalance
        ) {

            minimumBalance =
                projectedBalance;


            minimumDate =
                date;

        }

    }


    return {

        balance:
            minimumBalance,

        date:
            minimumDate

    };

}
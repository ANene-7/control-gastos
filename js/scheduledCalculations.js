/*
    Convierte YYYY-MM-DD en una fecha local
    sin problemas de UTC.
*/

function parseDate(
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


    return new Date(
        year,
        month - 1,
        day
    );

}


/*
    Diferencia en días entre dos fechas.
*/

function getDaysDifference(
    startDate,
    targetDate
) {

    const millisecondsPerDay =
        1000 * 60 * 60 * 24;


    const start =
        parseDate(
            startDate
        );


    const target =
        parseDate(
            targetDate
        );


    return Math.round(
        (
            target - start
        )
        /
        millisecondsPerDay
    );

}


/*
    Diferencia de meses.
*/

function getMonthsDifference(
    startDate,
    targetDate
) {

    const start =
        parseDate(
            startDate
        );


    const target =
        parseDate(
            targetDate
        );


    return (
        (
            target.getFullYear() -
            start.getFullYear()
        )
        * 12
        +
        (
            target.getMonth() -
            start.getMonth()
        )
    );

}


/*
    Obtiene el último día de un mes.
*/

function getLastDayOfMonth(
    year,
    month
) {

    return new Date(
        year,
        month + 1,
        0
    ).getDate();

}


/*
    Verifica si una recurrencia mensual
    corresponde a determinada fecha.

    Esto permite que algo programado
    originalmente para el día 31
    ocurra el último día de febrero.
*/

function matchesMonthlyRecurrence(
    startDate,
    targetDate,
    intervalMonths
) {

    const start =
        parseDate(
            startDate
        );


    const target =
        parseDate(
            targetDate
        );


    const monthsDifference =
        getMonthsDifference(
            startDate,
            targetDate
        );


    if (
        monthsDifference < 0 ||
        monthsDifference %
            intervalMonths !== 0
    ) {

        return false;

    }


    const originalDay =
        start.getDate();


    const lastTargetDay =
        getLastDayOfMonth(
            target.getFullYear(),
            target.getMonth()
        );


    const expectedDay =
        Math.min(
            originalDay,
            lastTargetDay
        );


    return (
        target.getDate() ===
        expectedDay
    );

}


/*
    Verifica una recurrencia quincenal
    basada en calendario:

    - día 15
    - último día del mes

    A diferencia de "biweekly",
    esto NO significa cada 14 días.
*/

function matchesSemimonthlyRecurrence(
    startDate,
    targetDate
) {

    const start =
        parseDate(
            startDate
        );


    const target =
        parseDate(
            targetDate
        );


    /*
        Nunca generar fechas anteriores
        al inicio de la programación.
    */

    if (
        target < start
    ) {

        return false;

    }


    const targetDay =
        target.getDate();


    const lastDay =
        getLastDayOfMonth(
            target.getFullYear(),
            target.getMonth()
        );


    /*
        La ocurrencia corresponde
        al día 15 o al último día
        real del mes.
    */

    return (
        targetDay === 15
        ||
        targetDay === lastDay
    );

}


/*
    Convierte una fecha local a YYYY-MM-DD.
*/

function formatDate(
    date
) {

    const year =
        date.getFullYear();

    const month =
        String(date.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(date.getDate())
            .padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function addDays(
    dateString,
    days
) {

    const date =
        parseDate(dateString);

    date.setDate(
        date.getDate() + days
    );

    return formatDate(date);

}


function applyDateAdjustment(
    nominalDate,
    adjustment
) {

    if (!adjustment) {
        return nominalDate;
    }

    let result =
        parseDate(
            addDays(
                nominalDate,
                Number(adjustment.offsetDays || 0)
            )
        );

    const direction =
        adjustment.weekendDirection === "next"
            ? 1
            : -1;

    for (let guard = 0; guard < 7; guard += 1) {

        const weekday =
            result.getDay();

        const shouldMove =
            (weekday === 6 && adjustment.adjustSaturday)
            ||
            (weekday === 0 && adjustment.adjustSunday);

        if (!shouldMove) {
            break;
        }

        result.setDate(
            result.getDate() + direction
        );

    }

    return formatDate(result);

}


function matchesNominalRecurrence(
    movement,
    date
) {

    if (date < movement.scheduledDate) {
        return false;
    }

    const recurrenceType =
        movement.recurrence?.type;

    const daysDifference =
        getDaysDifference(
            movement.scheduledDate,
            date
        );

    switch (recurrenceType) {

        case "daily":
            return true;

        case "weekly":
            return daysDifference % 7 === 0;

        case "biweekly":
            return daysDifference % 14 === 0;

        case "semimonthly":
            return matchesSemimonthlyRecurrence(
                movement.scheduledDate,
                date
            );

        case "monthly":
            return matchesMonthlyRecurrence(
                movement.scheduledDate,
                date,
                1
            );

        case "bimonthly":
            return matchesMonthlyRecurrence(
                movement.scheduledDate,
                date,
                2
            );

        case "quarterly":
            return matchesMonthlyRecurrence(
                movement.scheduledDate,
                date,
                3
            );

        case "biannual":
            return matchesMonthlyRecurrence(
                movement.scheduledDate,
                date,
                6
            );

        case "yearly":
            return matchesMonthlyRecurrence(
                movement.scheduledDate,
                date,
                12
            );

        case "custom":
            return movement.scheduledDate === date;

        default:
            return false;

    }

}


/*
    Determina si un movimiento programado
    debe aparecer en una fecha concreta.
*/

export function occursOnDate(
    movement,
    date
) {

    if (
        movement.status !== "scheduled"
        ||
        !movement.scheduledDate
    ) {
        return false;
    }

    if (!movement.recurrence) {
        return movement.scheduledDate === date;
    }

    /*
        Una recurrencia puede cerrarse sin borrar su regla histórica.
        endDate representa la última fecha efectiva permitida.
    */
    if (
        movement.recurrence.endDate &&
        date > movement.recurrence.endDate
    ) {
        return false;
    }

    const adjustment =
        movement.recurrence.dateAdjustment;

    if (!adjustment) {
        return matchesNominalRecurrence(
            movement,
            date
        );
    }

    /*
        Una fecha efectiva puede quedar antes o después
        de la fecha nominal. Probamos un margen corto
        alrededor del día consultado y comparamos el
        resultado del ajuste.
    */

    for (let delta = -7; delta <= 7; delta += 1) {

        const nominalDate =
            addDays(
                date,
                delta
            );

        if (
            !matchesNominalRecurrence(
                movement,
                nominalDate
            )
        ) {
            continue;
        }

        const effectiveDate =
            applyDateAdjustment(
                nominalDate,
                adjustment
            );

        if (effectiveDate === date) {
            return true;
        }

    }

    return false;

}


/*
    Devuelve los movimientos programados
    que corresponden a una fecha.
*/

export function getScheduledMovementsForDate(
    date,
    movements
) {

    return movements.filter(
        movement => {

            /*
                Primero comprobar si esta regla
                genera una ocurrencia en la fecha.
            */

            if (
                !occursOnDate(
                    movement,
                    date
                )
            ) {

                return false;

            }


            /*
                Después comprobar que esa
                ocurrencia todavía no haya
                sido realizada.
            */

            if (
                isOccurrenceResolved(
                    movement,
                    date,
                    movements
                )
            ) {

                return false;

            }


            return true;

        }
    );

}

/*
    Determina si una ocurrencia concreta
    de un movimiento programado ya fue
    registrada como realizada.
*/

function isOccurrenceResolved(
    scheduledMovement,
    occurrenceDate,
    movements
) {

    return movements.some(
        movement =>

            ["completed", "skipped", "cancelled"].includes(
                movement.status
            )

            &&

            movement.sourceScheduledMovementId ===
                scheduledMovement.id

            &&

            movement.sourceScheduledDate ===
                occurrenceDate
    );

}

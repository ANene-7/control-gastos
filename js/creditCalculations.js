/*
    Devuelve la cantidad real de días
    que tiene un mes.
*/

function getDaysInMonth(
    year,
    month
) {

    return new Date(
        year,
        month,
        0
    ).getDate();

}


/*
    Construye una fecha YYYY-MM-DD.

    Si el día solicitado no existe
    en ese mes, utiliza el último día.

    Ejemplo:
    día 31 en febrero
    → 28 o 29.
*/

function buildDate(
    year,
    month,
    day
) {

    const lastDay =
        getDaysInMonth(
            year,
            month
        );


    const validDay =
        Math.min(
            day,
            lastDay
        );


    return (
        `${year}-` +
        `${String(month).padStart(2, "0")}-` +
        `${String(validDay).padStart(2, "0")}`
    );

}


/*
    Calcula la fecha de corte
    correspondiente a una compra.
*/

export function calculateClosingDate(
    purchaseDate,
    credit
) {

    const [
        year,
        month,
        day
    ] =
        purchaseDate
            .split("-")
            .map(Number);


    /*
        Si la compra ocurre antes
        o el mismo día del corte,
        pertenece al corte de ese mes.
    */

    if (
        day <= credit.closingDay
    ) {

        return buildDate(
            year,
            month,
            credit.closingDay
        );

    }


    /*
        Si ocurre después del corte,
        pertenece al corte siguiente.
    */

    let nextYear =
        year;

    let nextMonth =
        month + 1;


    if (
        nextMonth > 12
    ) {

        nextMonth = 1;

        nextYear++;

    }


    return buildDate(
        nextYear,
        nextMonth,
        credit.closingDay
    );

}


/*
    Calcula la FLP correspondiente
    a una fecha de corte.
*/

export function calculateDueDate(
    closingDate,
    credit
) {

    const [
        year,
        month
    ] =
        closingDate
            .split("-")
            .map(Number);


    /*
        Si la FLP ocurre después
        del día de corte,
        queda en el mismo mes.
    */

    if (
        credit.paymentDueDay >
        credit.closingDay
    ) {

        return buildDate(
            year,
            month,
            credit.paymentDueDay
        );

    }


    /*
        Si el número del día de FLP
        es menor o igual al corte,
        la FLP pertenece al mes siguiente.

        Ejemplo:

        Corte 25
        FLP 15

        Corte 25/08
        → FLP 15/09
    */

    let dueYear =
        year;

    let dueMonth =
        month + 1;


    if (
        dueMonth > 12
    ) {

        dueMonth = 1;

        dueYear++;

    }


    return buildDate(
        dueYear,
        dueMonth,
        credit.paymentDueDay
    );

}


/*
    Calcula directamente la FLP
    de una compra.
*/

export function calculatePurchaseDueDate(
    purchaseDate,
    credit
) {

    const closingDate =
        calculateClosingDate(
            purchaseDate,
            credit
        );


    return calculateDueDate(
        closingDate,
        credit
    );

}


/*
    Genera las obligaciones de pago
    de todos los créditos.

    Por ahora solamente considera:

    - compras realizadas
    - egresos
    - método crédito

    Todavía NO descontamos:
    - pagos realizados a la TDC
    - devoluciones
    - bonificaciones
*/

export function calculateCreditObligations(
    movements,
    credits
) {

    const obligations =
        new Map();


    /*
        =====================================
        1. CREAR OBLIGACIONES DESDE COMPRAS
        =====================================
    */

    movements.forEach(
        movement => {

            /*
                Solamente compras realizadas
                mediante crédito.
            */

            if (
                movement.status !==
                "completed"
                ||
                movement.type !==
                "expense"
                ||
                movement.paymentMethod !==
                "credit"
                ||
                !movement.completedDate
                ||
                !movement.creditId
            ) {

                return;

            }


            const credit =
                credits.find(
                    item =>
                        item.id ===
                        movement.creditId
                );


            if (!credit) {

                return;

            }


            const dueDate =
                calculatePurchaseDueDate(
                    movement.completedDate,
                    credit
                );


            const key =
                `${credit.id}-${dueDate}`;


            if (
                !obligations.has(
                    key
                )
            ) {

                obligations.set(
                    key,
                    {

                        creditId:
                            credit.id,

                        creditName:
                            credit.name,

                        dueDate,

                        originalAmount:
                            0,

                        paidAmount:
                            0,

                        pendingAmount:
                            0,

                        movements:
                            []

                    }
                );

            }


            const obligation =
                obligations.get(
                    key
                );


            obligation.originalAmount +=
                movement.amount;


            obligation.pendingAmount +=
                movement.amount;


            obligation.movements.push(
                movement
            );

        }
    );


    /*
        Convertir Map a arreglo.
    */

    const obligationList =
        Array.from(
            obligations.values()
        );


    /*
        Ordenar por:

        1. Crédito.
        2. FLP más antigua primero.
    */

    obligationList.sort(
        (a, b) => {

            if (
                a.creditId !==
                b.creditId
            ) {

                return a.creditId
                    .localeCompare(
                        b.creditId
                    );

            }


            return a.dueDate
                .localeCompare(
                    b.dueDate
                );

        }
    );


    /*
        =====================================
        2. OBTENER PAGOS REALIZADOS
        =====================================
    */

    const creditPayments =
        movements
            .filter(
                movement =>

                    movement.status ===
                        "completed"

                    &&

                    movement.type ===
                        "expense"

                    &&

                    movement.purpose ===
                        "creditPayment"

                    &&

                    movement.creditId

                    &&

                    movement.completedDate

            )
            .sort(
                (a, b) =>

                    a.completedDate
                        .localeCompare(
                            b.completedDate
                        )

            );


    /*
        =====================================
        3. APLICAR PAGOS A OBLIGACIONES
        =====================================
    */

    creditPayments.forEach(
        payment => {

            let remainingPayment =
                payment.amount;


            /*
                Buscar solamente obligaciones
                del mismo crédito.

                Se recorren de la más antigua
                a la más reciente.
            */

            const creditObligations =
                obligationList.filter(
                    obligation =>
                        obligation.creditId ===
                        payment.creditId
                );


            for (
                const obligation
                of creditObligations
            ) {

                if (
                    remainingPayment <= 0
                ) {

                    break;

                }


                if (
                    obligation.pendingAmount <= 0
                ) {

                    continue;

                }


                const amountApplied =
                    Math.min(
                        remainingPayment,
                        obligation.pendingAmount
                    );


                obligation.paidAmount +=
                    amountApplied;


                obligation.pendingAmount -=
                    amountApplied;


                remainingPayment -=
                    amountApplied;

            }

        }
    );


    return obligationList;

}
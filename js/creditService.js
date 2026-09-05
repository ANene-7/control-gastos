import {
    STORES,
    createEntity,
    updateEntity,
    getById,
    getAll,
    save,
    commit
} from "./repository.js";

import {
    ensurePeriodForDate
} from "./creditPeriods.js";

import {
    calculateObligationRemaining,
    getPaymentAllocationAmount,
    buildPlanInstallmentSchedule
} from "./creditModelCalculations.js";


const CREDIT_TYPES = new Set([
    "credit_card",
    "loan",
    "other"
]);

const OPERATION_TYPES = new Set([
    "purchase",
    "payment",
    "interest",
    "fee",
    "refund",
    "adjustment"
]);


function asMoney(
    value,
    fieldName
) {

    const amount =
        Number(value);

    if (
        !Number.isFinite(amount) ||
        amount < 0
    ) {
        throw new Error(
            `${fieldName} no es válido.`
        );
    }

    return amount;

}


export async function createCredit(
    input
) {

    if (!input?.name?.trim()) {
        throw new Error(
            "El crédito necesita un nombre."
        );
    }

    if (
        !CREDIT_TYPES.has(
            input.type
        )
    ) {
        throw new Error(
            "El tipo de crédito no es válido."
        );
    }

    const credit =
        createEntity({
            name:
                input.name.trim(),
            type:
                input.type,
            limit:
                input.limit === null ||
                input.limit === undefined ||
                input.limit === ""
                    ? null
                    : asMoney(
                        input.limit,
                        "El límite"
                    ),
            cutDay:
                input.cutDay ?? null,
            dueDay:
                input.dueDay ?? null,
            initialDebt:
                asMoney(
                    input.initialDebt ?? 0,
                    "La deuda inicial"
                ),
            initialDebtDate:
                input.initialDebtDate ||
                null,
            notes:
                input.notes?.trim() ||
                "",
            active:
                input.active !== false
        });

    await save(
        STORES.credits,
        credit
    );

    return credit;

}


export async function updateCredit(
    creditId,
    changes
) {

    const current =
        await getById(
            STORES.credits,
            creditId
        );

    if (!current) {
        throw new Error(
            "El crédito no existe."
        );
    }

    const updated =
        updateEntity(
            current,
            changes
        );

    await save(
        STORES.credits,
        updated
    );

    return updated;

}


export async function registerCreditOperation(
    input
) {

    if (
        !OPERATION_TYPES.has(
            input?.type
        )
    ) {
        throw new Error(
            "El tipo de operación de crédito no es válido."
        );
    }

    if (!input.creditId) {
        throw new Error(
            "La operación necesita un crédito."
        );
    }

    if (!input.date) {
        throw new Error(
            "La operación necesita una fecha."
        );
    }

    const operation =
        createEntity({
            creditId:
                input.creditId,
            type:
                input.type,
            amount:
                asMoney(
                    input.amount,
                    "El importe"
                ),
            date:
                input.date,
            description:
                input.description?.trim() ||
                "",
            categoryId:
                input.categoryId ||
                null,
            periodId:
                input.periodId ||
                null,
            planId:
                input.planId ||
                null,
            obligationId:
                input.obligationId ||
                null,
            movementId:
                input.movementId ||
                null,
            direction:
                input.type === "adjustment"
                    ? input.direction || null
                    : null
        });

    await save(
        STORES.creditOperations,
        operation
    );

    return operation;

}


export async function registerPurchase(
    input
) {
    const credit = await getById(
        STORES.credits,
        input.creditId
    );

    if (!credit) {
        throw new Error("El crédito de la compra no existe.");
    }

    const period = await ensurePeriodForDate(
        credit,
        input.date
    );

    return registerCreditOperation({
        ...input,
        periodId: input.periodId || period?.id || null,
        type: "purchase"
    });
}


export async function registerPurchaseWithMovement({
    creditId,
    amount,
    date,
    description = "Compra con crédito",
    categoryId = null,
    movement
}) {

    if (!movement?.id) {
        throw new Error("La compra necesita el movimiento asociado.");
    }

    const credit = await getById(STORES.credits, creditId);
    if (!credit) {
        throw new Error("El crédito de la compra no existe.");
    }

    const period = await ensurePeriodForDate(credit, date);
    const operation = createEntity({
        creditId,
        type: "purchase",
        amount: asMoney(amount, "El importe"),
        date,
        description,
        categoryId: categoryId || movement.categoryId || movement.category || null,
        periodId: period?.id || null,
        planId: null,
        obligationId: null,
        movementId: movement.id,
        direction: null
    });

    const movementRecord = {
        ...movement,
        creditOperationId: operation.id
    };

    await commit([
        { type: "put", storeName: STORES.movements, record: movementRecord },
        { type: "put", storeName: STORES.creditOperations, record: operation }
    ]);

    return { movement: movementRecord, operation };
}


async function registerPeriodAwareOperation(
    input,
    type
) {
    const credit = await getById(
        STORES.credits,
        input.creditId
    );

    if (!credit) {
        throw new Error("El crédito de la operación no existe.");
    }

    const period = await ensurePeriodForDate(
        credit,
        input.date
    );

    return registerCreditOperation({
        ...input,
        periodId: input.periodId || period?.id || null,
        type
    });
}


export function registerInterest(
    input
) {
    return registerPeriodAwareOperation(
        input,
        "interest"
    );
}


export function registerFee(
    input
) {
    return registerPeriodAwareOperation(
        input,
        "fee"
    );
}


export function registerRefund(
    input
) {
    return registerPeriodAwareOperation(
        input,
        "refund"
    );
}


function addOneMonth(dateValue, preferredDay = null) {
    const [year, month, day] = String(dateValue || "").split("-").map(Number);
    if (!year || !month || !day) return dateValue || null;
    const targetMonthIndex = month;
    const targetYear = year + Math.floor(targetMonthIndex / 12);
    const normalizedMonthIndex = targetMonthIndex % 12;
    const lastDay = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
    const desiredDay = Number(preferredDay) || day;
    return `${targetYear}-${String(normalizedMonthIndex + 1).padStart(2, "0")}-${String(Math.min(desiredDay, lastDay)).padStart(2, "0")}`;
}

function getNextPaymentDueDate(credit, currentDueDate) {
    if (credit?.type === "credit_card" && Number(credit?.dueDay)) {
        return addOneMonth(currentDueDate, Number(credit.dueDay));
    }
    return addOneMonth(currentDueDate);
}


function getPlanAllocationMode(credit, paymentDate) {
    if (credit?.type !== "credit_card" || !credit?.cutDay) {
        return "front";
    }

    const day = Number(String(paymentDate || "").split("-")[2]);
    if (!Number.isInteger(day)) {
        return "front";
    }

    // Hasta el propio día de corte, un excedente se considera abono
    // extraordinario a capital: conserva las cuotas próximas y reduce
    // el final del plan. Desde el día siguiente al corte comienza el
    // nuevo periodo y los pagos al plan consumen la cuota más próxima.
    return day <= Number(credit.cutDay) ? "tail" : "front";
}


export async function registerPayment({
    creditId,
    amount,
    date,
    description = "Pago de crédito",
    obligationId = null,
    planId = null,
    movement,
    partialResolution = "keep",
    partialDueDate = null
}) {

    if (!movement?.id) {
        throw new Error(
            "El pago necesita el movimiento de salida asociado."
        );
    }

    const paymentAmount =
        asMoney(
            amount,
            "El importe"
        );

    const [credit, operations, obligations, plans] = await Promise.all([
        getById(STORES.credits, creditId),
        getAll(STORES.creditOperations),
        getAll(STORES.creditObligations),
        getAll(STORES.creditPlans)
    ]);

    if (!credit) {
        throw new Error("El crédito del pago no existe.");
    }

    let amountToAllocate = paymentAmount;
    const allocations = [];
    const obligationUpdates = [];

    const allPendingObligations = obligations
        .filter(item =>
            String(item.creditId) === String(creditId) &&
            !["paid", "cancelled", "closed_partial"].includes(item.status)
        )
        .map(item => ({
            ...item,
            __remaining: calculateObligationRemaining(item, operations)
        }))
        .filter(item => item.__remaining > 0.005)
        .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")));

    // Un pago puede cubrir todas las obligaciones realmente vencidas y, como
    // máximo, la obligación vigente/próxima. El excedente NO debe empezar a
    // liquidar meses futuros uno tras otro: pasa al plan según la regla front/tail.
    const overdueObligations = allPendingObligations.filter(item => String(item.dueDate || "9999-12-31") < String(date));
    const explicit = obligationId
        ? allPendingObligations.find(item => String(item.id) === String(obligationId))
        : null;
    const nextCurrent = explicit || allPendingObligations.find(item => String(item.dueDate || "9999-12-31") >= String(date)) || null;
    const creditObligations = [...overdueObligations];
    if (nextCurrent && !creditObligations.some(item => String(item.id) === String(nextCurrent.id))) {
        creditObligations.push(nextCurrent);
    }

    for (const obligation of creditObligations) {
        if (amountToAllocate <= 0.005) break;
        const pending = Number(obligation.__remaining) || calculateObligationRemaining(obligation, operations);
        if (pending <= 0.005) continue;
        const allocationAmount = Math.min(amountToAllocate, pending);
        allocations.push({ type: "obligation", id: obligation.id, amount: allocationAmount });
        amountToAllocate = Math.max(0, amountToAllocate - allocationAmount);

        if (allocationAmount >= pending - 0.005) {
            obligationUpdates.push(updateEntity(obligation, {
                status: "paid",
                remainingResolution: "scheduled"
            }));
        } else if (amountToAllocate <= 0.005) {
            const changes = {
                status: partialResolution === "unassigned" ? "closed_partial" : "partial",
                remainingResolution: partialResolution || "keep"
            };

            if (partialResolution === "postpone" && partialDueDate) {
                changes.originalDueDate = obligation.originalDueDate || obligation.dueDate || null;
                changes.dueDate = partialDueDate;
            } else if (partialResolution === "next_period") {
                changes.originalDueDate = obligation.originalDueDate || obligation.dueDate || null;
                changes.dueDate = getNextPaymentDueDate(credit, obligation.dueDate);
            }

            obligationUpdates.push(updateEntity(obligation, changes));
        }
    }

    const creditPlans = plans
        .filter(item => String(item.creditId) === String(creditId) && item.status === "active")
        .sort((a, b) => String(a.firstDueDate || "9999-12-31").localeCompare(String(b.firstDueDate || "9999-12-31")));

    if (planId) {
        creditPlans.sort((a, b) =>
            String(a.id) === String(planId) ? -1 :
            String(b.id) === String(planId) ? 1 : 0
        );
    }

    for (const plan of creditPlans) {
        if (amountToAllocate <= 0.005) break;
        const paidToPlan = operations.reduce(
            (sum, operation) => sum + getPaymentAllocationAmount(operation, "plan", plan.id),
            0
        );
        let pending = Math.max(0, (Number(plan.originalAmount) || 0) - paidToPlan);
        if (pending <= 0.005) continue;

        // Primero ponemos al corriente las cuotas del plan cuya fecha ya llegó.
        // Esto tiene prioridad incluso si el pago ocurre antes del corte.
        const schedule = buildPlanInstallmentSchedule(plan, operations);
        const dueNow = schedule
            .filter(installment => installment.date && installment.date <= date)
            .reduce((sum, installment) => sum + (Number(installment.amount) || 0), 0);

        if (dueNow > 0.005 && amountToAllocate > 0.005) {
            const frontAmount = Math.min(amountToAllocate, dueNow, pending);
            allocations.push({
                type: "plan",
                id: plan.id,
                amount: frontAmount,
                mode: "front"
            });
            amountToAllocate = Math.max(0, amountToAllocate - frontAmount);
            pending = Math.max(0, pending - frontAmount);
        }

        if (amountToAllocate > 0.005 && pending > 0.005) {
            const extraAmount = Math.min(amountToAllocate, pending);
            allocations.push({
                type: "plan",
                id: plan.id,
                amount: extraAmount,
                mode: getPlanAllocationMode(credit, date)
            });
            amountToAllocate = Math.max(0, amountToAllocate - extraAmount);
        }
    }

    if (amountToAllocate > 0.005) {
        allocations.push({ type: "unassigned", id: null, amount: amountToAllocate });
    }

    const singleObligation = allocations.length === 1 && allocations[0].type === "obligation"
        ? allocations[0].id
        : null;
    const singlePlan = allocations.length === 1 && allocations[0].type === "plan"
        ? allocations[0].id
        : null;

    const operation =
        createEntity({
            creditId,
            type: "payment",
            amount: paymentAmount,
            date,
            description,
            categoryId:
                movement.categoryId ||
                movement.category ||
                null,
            periodId: null,
            planId: singlePlan,
            obligationId: singleObligation,
            allocations,
            paymentResolution: partialResolution || "keep",
            paymentResolutionDate: partialDueDate || null,
            movementId: movement.id,
            direction: null
        });

    const movementRecord = {
        ...movement,
        creditOperationId: operation.id
    };

    await commit([
        {
            type: "put",
            storeName: STORES.movements,
            record: movementRecord
        },
        {
            type: "put",
            storeName: STORES.creditOperations,
            record: operation
        },
        ...obligationUpdates.map(record => ({
            type: "put",
            storeName: STORES.creditObligations,
            record
        }))
    ]);

    return {
        movement: movementRecord,
        operation
    };

}


async function reconcileCreditObligations(creditId) {
    const [operations, obligations] = await Promise.all([
        getAll(STORES.creditOperations),
        getAll(STORES.creditObligations)
    ]);

    const writes = [];
    for (const obligation of obligations.filter(item => String(item.creditId) === String(creditId))) {
        if (obligation.status === "cancelled") continue;
        const paid = operations.reduce(
            (sum, operation) => sum + getPaymentAllocationAmount(operation, "obligation", obligation.id),
            0
        );
        const original = Number(obligation.originalAmount) || 0;
        const remaining = Math.max(0, original - paid);
        let status = obligation.status;
        let remainingResolution = obligation.remainingResolution || "scheduled";
        let dueDate = obligation.dueDate;

        if (remaining <= 0.005) {
            status = "paid";
        } else if (paid <= 0.005) {
            // Si desaparece el pago que había resuelto/reprogramado esta obligación,
            // recuperamos la programación original.
            status = "pending";
            remainingResolution = "scheduled";
            dueDate = obligation.originalDueDate || obligation.dueDate;
        } else if (remainingResolution === "unassigned") {
            status = "closed_partial";
        } else {
            status = "partial";
        }

        if (status !== obligation.status || remainingResolution !== obligation.remainingResolution || dueDate !== obligation.dueDate) {
            writes.push({
                type: "put",
                storeName: STORES.creditObligations,
                record: updateEntity(obligation, { status, remainingResolution, dueDate })
            });
        }
    }

    if (writes.length) await commit(writes);
}

export async function deleteCreditLinkedMovement(movementId) {
    const movement = await getById(STORES.movements, movementId);
    if (!movement) return false;

    const operationId = movement.creditOperationId || null;
    const operation = operationId
        ? await getById(STORES.creditOperations, operationId)
        : null;

    const writes = [
        { type: "delete", storeName: STORES.movements, id: movementId }
    ];
    if (operation) {
        writes.push({ type: "delete", storeName: STORES.creditOperations, id: operation.id });
    }

    await commit(writes);

    if (operation?.creditId) {
        await reconcileCreditObligations(operation.creditId);
    }

    return true;
}

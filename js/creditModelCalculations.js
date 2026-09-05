const INCREASE_DEBT_TYPES = new Set([
    "purchase",
    "interest",
    "fee"
]);

const DECREASE_DEBT_TYPES = new Set([
    "payment",
    "refund"
]);


export function getOperationDebtEffect(
    operation
) {

    const amount =
        Number(
            operation?.amount
        ) || 0;

    if (amount <= 0) {
        return 0;
    }

    if (
        INCREASE_DEBT_TYPES.has(
            operation.type
        )
    ) {
        return amount;
    }

    if (
        DECREASE_DEBT_TYPES.has(
            operation.type
        )
    ) {
        return -amount;
    }

    if (
        operation.type === "adjustment"
    ) {

        if (
            operation.direction ===
            "increase"
        ) {
            return amount;
        }

        if (
            operation.direction ===
            "decrease"
        ) {
            return -amount;
        }

    }

    return 0;

}


export function calculateCurrentDebt(
    credit,
    operations = []
) {

    const initialDebt =
        Number(
            credit?.initialDebt
        ) || 0;

    const operationBalance =
        operations
            .filter(
                operation =>
                    String(
                        operation.creditId
                    ) ===
                    String(
                        credit?.id
                    )
            )
            .reduce(
                (total, operation) =>
                    total +
                    getOperationDebtEffect(
                        operation
                    ),
                0
            );

    return Math.max(
        0,
        initialDebt +
        operationBalance
    );

}


export function calculateAvailableCredit(
    credit,
    operations = []
) {

    if (
        credit?.limit === null ||
        credit?.limit === undefined ||
        credit?.limit === ""
    ) {
        return null;
    }

    const limit =
        Number(
            credit.limit
        ) || 0;

    return Math.max(
        0,
        limit -
        calculateCurrentDebt(
            credit,
            operations
        )
    );

}


export function getPaymentAllocationAmount(
    operation,
    targetType,
    targetId
) {

    if (operation?.type !== "payment" || targetId === null || targetId === undefined) {
        return 0;
    }

    const allocations = Array.isArray(operation.allocations)
        ? operation.allocations
        : [];

    if (allocations.length) {
        return allocations
            .filter(allocation =>
                allocation?.type === targetType &&
                String(allocation?.id) === String(targetId)
            )
            .reduce((sum, allocation) => sum + (Number(allocation.amount) || 0), 0);
    }

    const legacyId = targetType === "obligation"
        ? operation.obligationId
        : targetType === "plan"
            ? operation.planId
            : null;

    return String(legacyId || "") === String(targetId)
        ? (Number(operation.amount) || 0)
        : 0;
}


export function getPlanPaymentAllocationBreakdown(
    operations = [],
    planId
) {

    const breakdown = {
        front: 0,
        tail: 0,
        total: 0
    };

    for (const operation of operations) {
        if (operation?.type !== "payment") continue;

        const allocations = Array.isArray(operation.allocations)
            ? operation.allocations
            : [];

        if (allocations.length) {
            for (const allocation of allocations) {
                if (allocation?.type !== "plan" || String(allocation?.id) !== String(planId)) continue;
                const amount = Number(allocation.amount) || 0;
                if (amount <= 0) continue;
                const mode = allocation.mode === "tail" ? "tail" : "front";
                breakdown[mode] += amount;
                breakdown.total += amount;
            }
            continue;
        }

        // Compatibilidad con pagos V3 anteriores que sólo guardaban planId.
        if (String(operation.planId || "") === String(planId)) {
            const amount = Number(operation.amount) || 0;
            if (amount > 0) {
                breakdown.front += amount;
                breakdown.total += amount;
            }
        }
    }

    return breakdown;
}


export function calculateObligationPaid(
    obligation,
    operations = []
) {

    return operations
        .reduce(
            (total, operation) =>
                total + getPaymentAllocationAmount(
                    operation,
                    "obligation",
                    obligation?.id
                ),
            0
        );

}



export function calculateObligationRemaining(
    obligation,
    operations = []
) {

    const originalAmount =
        Number(
            obligation?.originalAmount
        ) || 0;

    return Math.max(
        0,
        originalAmount -
        calculateObligationPaid(
            obligation,
            operations
        )
    );

}


export function isObligationOverdue(
    obligation,
    referenceDate
) {

    if (
        !obligation?.dueDate ||
        !referenceDate
    ) {
        return false;
    }

    if (
        [
            "paid",
            "cancelled",
            "closed_partial"
        ].includes(
            obligation.status
        )
    ) {
        return false;
    }

    return (
        obligation.dueDate <
        referenceDate
    );

}


function planDateParts(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return { year, month, day };
}

function formatPlanDate(year, month, day) {
    const last = new Date(year, month, 0).getDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}

export function addPlanFrequency(date, frequency, steps) {
    const parts = planDateParts(date);
    if (!parts) return null;

    if (frequency === "weekly" || frequency === "biweekly") {
        const d = new Date(parts.year, parts.month - 1, parts.day);
        d.setDate(d.getDate() + steps * (frequency === "weekly" ? 7 : 14));
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    }

    const total = (parts.month - 1) + steps;
    const year = parts.year + Math.floor(total / 12);
    const month = ((total % 12) + 12) % 12 + 1;
    return formatPlanDate(year, month, parts.day);
}

export function buildPlanInstallmentSchedule(plan, operations = []) {
    if (!plan || plan.status !== "active" || !plan.firstDueDate) return [];

    const total = Number(plan.originalAmount) || 0;
    const nominal = Number(plan.installmentAmount) || 0;
    const count = Number(plan.installmentCount) || (nominal > 0 ? Math.ceil(total / nominal) : 0);

    if (total <= 0 || nominal <= 0 || count <= 0) return [];

    let scheduledCursor = total;
    const installments = [];

    for (let index = 0; index < count && scheduledCursor > 0.005; index++) {
        const date = addPlanFrequency(plan.firstDueDate, plan.frequency || "monthly", index);
        if (!date) break;

        const scheduledAmount = Math.min(nominal, scheduledCursor);
        scheduledCursor = Math.max(0, scheduledCursor - scheduledAmount);
        installments.push({
            index,
            date,
            originalAmount: scheduledAmount,
            amount: scheduledAmount
        });
    }

    const allocationBreakdown = getPlanPaymentAllocationBreakdown(operations, plan.id);

    let frontCursor = Math.max(0, allocationBreakdown.front);
    for (const installment of installments) {
        if (frontCursor <= 0.005) break;
        const consumed = Math.min(frontCursor, installment.amount);
        installment.amount = Math.max(0, installment.amount - consumed);
        frontCursor = Math.max(0, frontCursor - consumed);
    }

    let tailCursor = Math.max(0, allocationBreakdown.tail);
    for (let index = installments.length - 1; index >= 0 && tailCursor > 0.005; index--) {
        const installment = installments[index];
        const consumed = Math.min(tailCursor, installment.amount);
        installment.amount = Math.max(0, installment.amount - consumed);
        tailCursor = Math.max(0, tailCursor - consumed);
    }

    return installments;
}

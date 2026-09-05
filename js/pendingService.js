import { getAllRecords } from "./database.js";
import { occursOnDate } from "./scheduledCalculations.js";
import { calculateObligationRemaining, buildPlanInstallmentSchedule } from "./creditModelCalculations.js";

function localDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function addDays(value, days) {
    const date = parseLocalDate(value);
    if (!date) return null;
    date.setDate(date.getDate() + days);
    return localDateString(date);
}

function occurrenceResolved(rule, occurrenceDate, movements) {
    return movements.some(item =>
        ["completed", "skipped", "cancelled"].includes(item.status) &&
        String(item.sourceScheduledMovementId || "") === String(rule.id) &&
        String(item.sourceScheduledDate || "") === String(occurrenceDate)
    );
}

function scheduledPendingItems(movements, referenceDate) {
    const rules = movements.filter(item =>
        item.status === "scheduled" &&
        item.scheduledDate &&
        item.scheduledDate <= referenceDate
    );

    const items = [];

    for (const rule of rules) {
        if (!rule.recurrence) {
            if (!occurrenceResolved(rule, rule.scheduledDate, movements)) {
                items.push({
                    id: `scheduled:${rule.id}:${rule.scheduledDate}`,
                    sourceType: "scheduledMovement",
                    sourceId: rule.id,
                    occurrenceDate: rule.scheduledDate,
                    dueDate: rule.scheduledDate,
                    description: rule.description || "Movimiento programado",
                    amount: Number(rule.amount) || 0,
                    movementType: rule.type || "expense",
                    recurring: false
                });
            }
            continue;
        }

        let cursor = rule.scheduledDate;
        let guard = 0;
        while (cursor && cursor <= referenceDate && guard < 5000) {
            if (occursOnDate(rule, cursor) && !occurrenceResolved(rule, cursor, movements)) {
                items.push({
                    id: `scheduled:${rule.id}:${cursor}`,
                    sourceType: "scheduledMovement",
                    sourceId: rule.id,
                    occurrenceDate: cursor,
                    dueDate: cursor,
                    description: rule.description || "Movimiento programado",
                    amount: Number(rule.amount) || 0,
                    movementType: rule.type || "expense",
                    recurring: true
                });
            }
            cursor = addDays(cursor, 1);
            guard += 1;
        }
    }

    return items;
}

function creditPendingItems(credits, operations, obligations, plans, referenceDate) {
    const names = new Map(credits.map(item => [String(item.id), item.name]));

    const obligationItems = obligations
        .filter(item =>
            item.dueDate &&
            item.dueDate <= referenceDate &&
            !["paid", "cancelled", "closed_partial"].includes(item.status)
        )
        .map(item => ({
            obligation: item,
            remaining: calculateObligationRemaining(item, operations)
        }))
        .filter(item => item.remaining > 0.005)
        .map(({ obligation, remaining }) => ({
            id: `credit:${obligation.id}`,
            sourceType: "creditObligation",
            sourceId: obligation.id,
            creditId: obligation.creditId,
            dueDate: obligation.dueDate,
            description: `Pago de ${names.get(String(obligation.creditId)) || "crédito"}`,
            amount: remaining,
            movementType: "expense",
            recurring: false
        }));

    const planItems = [];
    for (const plan of plans) {
        for (const installment of buildPlanInstallmentSchedule(plan, operations)) {
            if (installment.amount <= 0.005 || !installment.date || installment.date > referenceDate) continue;
            planItems.push({
                id: `credit-plan:${plan.id}:${installment.index}`,
                sourceType: "creditPlanInstallment",
                sourceId: plan.id,
                creditId: plan.creditId,
                dueDate: installment.date,
                description: `Pago de ${names.get(String(plan.creditId)) || "crédito"}`,
                amount: installment.amount,
                movementType: "expense",
                recurring: true,
                installmentIndex: installment.index
            });
        }
    }

    return [...obligationItems, ...planItems];
}

export async function getPendingItems(referenceDate = localDateString()) {
    const [movements, credits, operations, obligations, plans] = await Promise.all([
        getAllRecords("movements"),
        getAllRecords("credits"),
        getAllRecords("creditOperations"),
        getAllRecords("creditObligations"),
        getAllRecords("creditPlans")
    ]);

    return [
        ...scheduledPendingItems(movements, referenceDate),
        ...creditPendingItems(credits, operations, obligations, plans, referenceDate)
    ].sort((a, b) =>
        String(a.dueDate || "").localeCompare(String(b.dueDate || "")) ||
        String(a.description || "").localeCompare(String(b.description || ""))
    );
}

export { localDateString };

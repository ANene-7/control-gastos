import { getAllRecords } from "./database.js";
import { calculatePeriodForDate } from "./creditPeriods.js";
import { getScheduledMovementsForDate } from "./scheduledCalculations.js";
import {
    calculateObligationRemaining,
    buildPlanInstallmentSchedule,
    getOperationDebtEffect
} from "./creditModelCalculations.js";

function makeProjection({ id, creditId, creditName, amount, date, sourceType, sourceId, meta = null }) {
    return {
        id: `credit-projection-${sourceType}-${id}`,
        kind: "creditProjection",
        type: "expense",
        purpose: "creditPaymentProjection",
        displayKind: "creditPayment",
        description: `Pago de ${creditName || "crédito"}`,
        amount,
        paymentMethod: "debit",
        creditId,
        status: "scheduled",
        scheduledDate: date,
        completedDate: null,
        recurrence: null,
        category: "Deudas / créditos",
        labelColor: "red",
        virtual: true,
        projectionSourceType: sourceType,
        projectionSourceId: sourceId,
        projectionMeta: meta
    };
}

function getOpenPeriodProjectedAmount(period, operations) {
    return Math.max(0, operations
        .filter(operation => String(operation.periodId || "") === String(period.id))
        .reduce((sum, operation) => {
            // Los pagos no pertenecen al corte; compras, intereses, comisiones,
            // bonificaciones y ajustes sí modifican lo que esperamos pagar.
            if (operation.type === "payment") return sum;
            return sum + getOperationDebtEffect(operation);
        }, 0));
}

export async function getCreditProjectionMovements() {
    try {
        const [credits, operations, obligations, plans, periods, movements] = await Promise.all([
            getAllRecords("credits"), getAllRecords("creditOperations"), getAllRecords("creditObligations"),
            getAllRecords("creditPlans"), getAllRecords("creditPeriods"), getAllRecords("movements")
        ]);

        const names = new Map(credits.map(c => [String(c.id), c.name]));
        const projections = [];

        for (const obligation of obligations) {
            if (["paid", "cancelled", "closed_partial"].includes(obligation.status)) continue;
            const remaining = calculateObligationRemaining(obligation, operations);
            if (remaining <= 0.005 || !obligation.dueDate) continue;
            projections.push(makeProjection({
                id: obligation.id,
                creditId: obligation.creditId,
                creditName: names.get(String(obligation.creditId)),
                amount: remaining,
                date: obligation.dueDate,
                sourceType: "obligation",
                sourceId: obligation.id
            }));
        }

        for (const plan of plans) {
            const installments = buildPlanInstallmentSchedule(plan, operations);
            for (const installment of installments) {
                if (installment.amount <= 0.005) continue;
                projections.push(makeProjection({
                    id: `${plan.id}-${installment.index + 1}`,
                    creditId: plan.creditId,
                    creditName: names.get(String(plan.creditId)),
                    amount: installment.amount,
                    date: installment.date,
                    sourceType: "plan",
                    sourceId: plan.id,
                    meta: { installmentIndex: installment.index }
                }));
            }
        }

        // Un periodo abierto todavía no tiene una obligación persistida, pero
        // sus cargos ya son una salida futura realista. Lo proyectamos hacia su FLP.
        for (const period of periods) {
            if (period.status !== "open" || !period.dueDate) continue;
            const amount = getOpenPeriodProjectedAmount(period, operations);
            if (amount <= 0.005) continue;

            // Si por alguna anomalía ya existe una obligación del mismo periodo,
            // no proyectamos también el periodo abierto para evitar doble conteo.
            const hasStoredObligation = obligations.some(item =>
                String(item.periodId || "") === String(period.id) &&
                !["cancelled", "closed_partial"].includes(item.status)
            );
            if (hasStoredObligation) continue;

            projections.push(makeProjection({
                id: period.id,
                creditId: period.creditId,
                creditName: names.get(String(period.creditId)),
                amount: Math.round(amount * 100) / 100,
                date: period.dueDate,
                sourceType: "open_period",
                sourceId: period.id
            }));
        }

        // Compras recurrentes programadas con TDC: proyectar cada ocurrencia hacia la FLP de su periodo.
        const cardsById = new Map(credits.filter(c => c.active !== false && c.type === "credit_card").map(c => [String(c.id), c]));
        const hasRecurringCardRules = movements.some(m => m.status === "scheduled" && m.recurrence && m.type === "expense" && m.paymentMethod === "credit" && cardsById.has(String(m.creditId)));
        if (hasRecurringCardRules) {
            const today = new Date();
            const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 19, 0);
            const byDue = new Map();
            for (let cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
                const date = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}-${String(cursor.getDate()).padStart(2,"0")}`;
                const occurrences = getScheduledMovementsForDate(date, movements).filter(m => m.type === "expense" && m.paymentMethod === "credit" && cardsById.has(String(m.creditId)));
                for (const movement of occurrences) {
                    const credit = cardsById.get(String(movement.creditId));
                    const period = calculatePeriodForDate(credit, date);
                    if (!period?.dueDate) continue;
                    const key = `${credit.id}|${period.dueDate}`;
                    const item = byDue.get(key) || { credit, dueDate: period.dueDate, amount: 0, count: 0 };
                    item.amount += Number(movement.amount) || 0; item.count += 1; byDue.set(key, item);
                }
            }
            for (const item of byDue.values()) {
                if (item.amount <= .005) continue;
                projections.push(makeProjection({ id:`scheduled-${item.credit.id}-${item.dueDate}`, creditId:item.credit.id, creditName:item.credit.name, amount:Math.round(item.amount*100)/100, date:item.dueDate, sourceType:"scheduled_card_charges", sourceId:`scheduled-${item.credit.id}-${item.dueDate}`, meta:{occurrenceCount:item.count} }));
            }
        }

        return projections.sort((a, b) =>
            String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")) ||
            String(a.description || "").localeCompare(String(b.description || ""))
        );
    } catch (error) {
        console.warn("No se pudieron generar las proyecciones V3 de crédito:", error);
        return [];
    }
}

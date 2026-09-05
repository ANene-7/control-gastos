import { getAllRecords } from "./database.js";
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
        const [credits, operations, obligations, plans, periods] = await Promise.all([
            getAllRecords("credits"),
            getAllRecords("creditOperations"),
            getAllRecords("creditObligations"),
            getAllRecords("creditPlans"),
            getAllRecords("creditPeriods")
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

        return projections.sort((a, b) =>
            String(a.scheduledDate || "").localeCompare(String(b.scheduledDate || "")) ||
            String(a.description || "").localeCompare(String(b.description || ""))
        );
    } catch (error) {
        console.warn("No se pudieron generar las proyecciones V3 de crédito:", error);
        return [];
    }
}

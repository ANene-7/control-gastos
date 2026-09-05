import {
    STORES,
    createEntity,
    updateEntity,
    getAll,
    commit
} from "./repository.js";
import { calculatePeriodForDate } from "./creditPeriods.js";

function money(value, label) {
    const number = Number(value ?? 0);
    if (!Number.isFinite(number) || number < 0) throw new Error(`${label} no es válido.`);
    return number;
}

function nullableMoney(value, label) {
    if (value === "" || value === null || value === undefined) return null;
    return money(value, label);
}

function validDay(value, label) {
    const day = Number(value);
    if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error(`${label} debe estar entre 1 y 31.`);
    return day;
}

export async function createCreditFromSetup(input) {
    const name = input?.name?.trim();
    if (!name) throw new Error("Debes indicar un nombre para el crédito.");

    const type = input.type;
    if (!["credit_card", "loan", "other"].includes(type)) throw new Error("El tipo de crédito no es válido.");

    const initialDebt = money(input.initialDebt, "La deuda actual");
    const initialDebtDate = initialDebt > 0 ? input.initialDebtDate : null;
    if (initialDebt > 0 && !initialDebtDate) throw new Error("Indica la fecha de referencia de la deuda actual.");

    const limit = type === "credit_card" ? nullableMoney(input.limit, "El límite") : nullableMoney(input.limit, "El límite");
    const cutDay = type === "credit_card" ? validDay(input.cutDay, "El día de corte") : null;
    const dueDay = type === "credit_card" ? validDay(input.dueDay, "La fecha límite") : null;

    const nextPaymentAmount = nullableMoney(input.nextPaymentAmount, "El próximo pago") || 0;
    if (nextPaymentAmount > initialDebt) throw new Error("El próximo pago no puede ser mayor que la deuda actual.");
    if (nextPaymentAmount > 0 && !input.nextPaymentDate) throw new Error("Indica la fecha del próximo pago.");

    const credit = createEntity({
        name,
        type,
        limit,
        cutDay,
        dueDay,
        initialDebt,
        initialDebtDate,
        notes: input.notes?.trim() || "",
        active: true
    });

    const writes = [{ type: "put", storeName: STORES.credits, record: credit }];

    if (type === "credit_card") {
        const referenceDate = initialDebtDate || input.referenceDate;
        if (referenceDate) {
            const definition = calculatePeriodForDate(credit, referenceDate);
            if (definition) {
                const period = createEntity({
                    creditId: credit.id,
                    ...definition,
                    status: definition.endDate < input.referenceDate ? "closed" : "open",
                    closedAt: definition.endDate < input.referenceDate ? new Date().toISOString() : null,
                    obligationId: null
                });
                writes.push({ type: "put", storeName: STORES.creditPeriods, record: period });
            }
        }
    }

    if (nextPaymentAmount > 0) {
        const obligation = createEntity({
            creditId: credit.id,
            periodId: null,
            scheduledPeriodId: null,
            originalAmount: nextPaymentAmount,
            originalDueDate: input.nextPaymentDate,
            dueDate: input.nextPaymentDate,
            status: "pending",
            remainingResolution: "scheduled",
            source: "initial_setup"
        });
        writes.push({ type: "put", storeName: STORES.creditObligations, record: obligation });
    }

    const remaining = Math.max(0, initialDebt - nextPaymentAmount);
    if (remaining > 0 && input.remainingMode && input.remainingMode !== "manual") {
        const mode = input.remainingMode === "installments" ? "installments" : "fixed_amount";
        const count = input.installmentCount ? Number(input.installmentCount) : null;
        const installmentAmount = input.installmentAmount ? money(input.installmentAmount, "El importe del pago") : null;

        if (mode === "installments" && (!Number.isInteger(count) || count < 1)) {
            throw new Error("Indica un número válido de pagos.");
        }
        if (mode === "fixed_amount" && (!installmentAmount || installmentAmount <= 0)) {
            throw new Error("Indica un importe válido para cada pago.");
        }
        if (!input.planFirstDueDate) throw new Error("Indica la fecha del primer pago del plan.");

        const calculatedAmount = mode === "installments"
            ? Math.round((remaining / count) * 100) / 100
            : installmentAmount;

        const calculatedCount = mode === "fixed_amount"
            ? Math.ceil(remaining / installmentAmount)
            : count;

        const plan = createEntity({
            creditId: credit.id,
            sourceType: "initial_debt",
            sourceOperationId: null,
            originalAmount: remaining,
            mode,
            frequency: input.planFrequency || "monthly",
            installmentCount: calculatedCount,
            installmentAmount: calculatedAmount,
            firstDueDate: input.planFirstDueDate,
            status: "active"
        });
        writes.push({ type: "put", storeName: STORES.creditPlans, record: plan });
    }

    await commit(writes);
    return credit;
}


export async function updateCreditFromSetup(creditId, input) {
    const credits = await getAll(STORES.credits);
    const operations = await getAll(STORES.creditOperations);
    const obligations = await getAll(STORES.creditObligations);
    const plans = await getAll(STORES.creditPlans);

    const current = credits.find(item => String(item.id) === String(creditId));
    if (!current) throw new Error("No se encontró el crédito que quieres editar.");

    const name = input?.name?.trim();
    if (!name) throw new Error("Debes indicar un nombre para el crédito.");

    const type = input.type;
    if (!["credit_card", "loan", "other"].includes(type)) throw new Error("El tipo de crédito no es válido.");

    const creditOperations = operations.filter(item => String(item.creditId) === String(creditId));
    const requestedInitialDebt = money(input.initialDebt, "La deuda actual");
    const initialDebt = creditOperations.length ? Number(current.initialDebt || 0) : requestedInitialDebt;
    const initialDebtDate = initialDebt > 0
        ? (creditOperations.length ? current.initialDebtDate : input.initialDebtDate)
        : null;

    if (initialDebt > 0 && !initialDebtDate) throw new Error("Indica la fecha de referencia de la deuda actual.");

    const limit = nullableMoney(input.limit, "El límite");
    const cutDay = type === "credit_card" ? validDay(input.cutDay, "El día de corte") : null;
    const dueDay = type === "credit_card" ? validDay(input.dueDay, "La fecha límite") : null;

    const updatedCredit = updateEntity(current, {
        name,
        type,
        limit,
        cutDay,
        dueDay,
        initialDebt,
        initialDebtDate,
        notes: input.notes?.trim() || ""
    });

    const writes = [{ type: "put", storeName: STORES.credits, record: updatedCredit }];

    const setupObligations = obligations.filter(item =>
        String(item.creditId) === String(creditId) && item.source === "initial_setup"
    );
    const setupPlans = plans.filter(item =>
        String(item.creditId) === String(creditId) && item.sourceType === "initial_debt"
    );

    const nextPaymentAmount = nullableMoney(input.nextPaymentAmount, "El próximo pago") || 0;
    if (nextPaymentAmount > initialDebt) throw new Error("El próximo pago no puede ser mayor que la deuda actual.");
    if (nextPaymentAmount > 0 && !input.nextPaymentDate) throw new Error("Indica la fecha del próximo pago.");

    if (nextPaymentAmount > 0) {
        const currentObligation = setupObligations[0];
        const record = currentObligation
            ? updateEntity(currentObligation, {
                originalAmount: nextPaymentAmount,
                originalDueDate: currentObligation.originalDueDate || input.nextPaymentDate,
                dueDate: input.nextPaymentDate,
                status: "pending",
                remainingResolution: "scheduled"
            })
            : createEntity({
                creditId,
                periodId: null,
                scheduledPeriodId: null,
                originalAmount: nextPaymentAmount,
                originalDueDate: input.nextPaymentDate,
                dueDate: input.nextPaymentDate,
                status: "pending",
                remainingResolution: "scheduled",
                source: "initial_setup"
            });
        writes.push({ type: "put", storeName: STORES.creditObligations, record });
        setupObligations.slice(1).forEach(item => writes.push({ type: "delete", storeName: STORES.creditObligations, id: item.id }));
    } else {
        setupObligations.forEach(item => writes.push({ type: "delete", storeName: STORES.creditObligations, id: item.id }));
    }

    const remaining = Math.max(0, initialDebt - nextPaymentAmount);
    const shouldPlan = remaining > 0 && input.remainingMode && input.remainingMode !== "manual";

    if (shouldPlan) {
        const mode = input.remainingMode === "installments" ? "installments" : "fixed_amount";
        const count = input.installmentCount ? Number(input.installmentCount) : null;
        const installmentAmount = input.installmentAmount ? money(input.installmentAmount, "El importe del pago") : null;
        if (mode === "installments" && (!Number.isInteger(count) || count < 1)) throw new Error("Indica un número válido de pagos.");
        if (mode === "fixed_amount" && (!installmentAmount || installmentAmount <= 0)) throw new Error("Indica un importe válido para cada pago.");
        if (!input.planFirstDueDate) throw new Error("Indica la fecha del primer pago del plan.");

        const calculatedAmount = mode === "installments" ? Math.round((remaining / count) * 100) / 100 : installmentAmount;
        const calculatedCount = mode === "fixed_amount" ? Math.ceil(remaining / installmentAmount) : count;
        const currentPlan = setupPlans[0];
        const record = currentPlan
            ? updateEntity(currentPlan, {
                originalAmount: remaining,
                mode,
                frequency: input.planFrequency || "monthly",
                installmentCount: calculatedCount,
                installmentAmount: calculatedAmount,
                firstDueDate: input.planFirstDueDate,
                status: "active"
            })
            : createEntity({
                creditId,
                sourceType: "initial_debt",
                sourceOperationId: null,
                originalAmount: remaining,
                mode,
                frequency: input.planFrequency || "monthly",
                installmentCount: calculatedCount,
                installmentAmount: calculatedAmount,
                firstDueDate: input.planFirstDueDate,
                status: "active"
            });
        writes.push({ type: "put", storeName: STORES.creditPlans, record });
        setupPlans.slice(1).forEach(item => writes.push({ type: "delete", storeName: STORES.creditPlans, id: item.id }));
    } else {
        setupPlans.forEach(item => writes.push({ type: "delete", storeName: STORES.creditPlans, id: item.id }));
    }

    await commit(writes);
    return updatedCredit;
}

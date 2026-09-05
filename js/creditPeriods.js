import {
    STORES,
    createEntity,
    getAll,
    save,
    commit
} from "./repository.js";

function daysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function buildDate(year, month, day) {
    const normalizedMonth = Math.max(1, Math.min(12, Number(month)));
    const normalizedDay = Math.min(Number(day), daysInMonth(year, normalizedMonth));
    return `${year}-${String(normalizedMonth).padStart(2, "0")}-${String(normalizedDay).padStart(2, "0")}`;
}

function addMonths(year, month, delta) {
    const d = new Date(year, month - 1 + delta, 1);
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

function previousDay(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function nextDay(dateString) {
    const [year, month, day] = dateString.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function calculateDueDateFromClosing(closingDate, credit) {
    if (credit.type !== "credit_card" || !credit.dueDay) return null;

    const [year, month] = closingDate.split("-").map(Number);
    const dueDay = Number(credit.dueDay);
    const cutDay = Number(credit.cutDay);

    if (dueDay > cutDay) {
        return buildDate(year, month, dueDay);
    }

    const next = addMonths(year, month, 1);
    return buildDate(next.year, next.month, dueDay);
}

export function calculatePeriodForDate(credit, dateString) {
    if (credit.type !== "credit_card" || !credit.cutDay) return null;

    const [year, month, day] = dateString.split("-").map(Number);
    const cutDay = Number(credit.cutDay);

    let closingYear = year;
    let closingMonth = month;

    const currentMonthClosing = buildDate(year, month, cutDay);
    const currentClosingDay = Number(currentMonthClosing.slice(-2));

    if (day > currentClosingDay) {
        const next = addMonths(year, month, 1);
        closingYear = next.year;
        closingMonth = next.month;
    }

    const endDate = buildDate(closingYear, closingMonth, cutDay);
    const previous = addMonths(closingYear, closingMonth, -1);
    const previousClosing = buildDate(previous.year, previous.month, cutDay);
    const startDate = nextDay(previousClosing);

    return {
        startDate,
        endDate,
        dueDate: calculateDueDateFromClosing(endDate, credit)
    };
}

export async function ensurePeriodForDate(credit, dateString) {
    const definition = calculatePeriodForDate(credit, dateString);
    if (!definition) return null;

    const periods = await getAll(STORES.creditPeriods);
    const existing = periods.find(period =>
        String(period.creditId) === String(credit.id) &&
        period.startDate === definition.startDate &&
        period.endDate === definition.endDate
    );

    if (existing) return existing;

    const period = createEntity({
        creditId: credit.id,
        ...definition,
        status: definition.endDate < dateString ? "closed" : "open",
        closedAt: definition.endDate < dateString ? new Date().toISOString() : null,
        obligationId: null
    });

    await save(STORES.creditPeriods, period);
    return period;
}

export async function ensureCreditPeriodsUpToDate(credit, referenceDate) {
    if (credit.type !== "credit_card") return [];

    const periods = await getAll(STORES.creditPeriods);
    const operations = await getAll(STORES.creditOperations);
    const obligations = await getAll(STORES.creditObligations);
    const creditPeriods = periods.filter(period => String(period.creditId) === String(credit.id));
    const writes = [];
    const now = new Date().toISOString();

    for (const period of creditPeriods) {
        if (period.status !== "open" || period.endDate >= referenceDate) continue;

        const periodOperations = operations.filter(operation =>
            String(operation.creditId) === String(credit.id) &&
            String(operation.periodId) === String(period.id)
        );

        const amount = periodOperations.reduce((total, operation) => {
            const value = Number(operation.amount) || 0;
            if (["purchase", "interest", "fee"].includes(operation.type)) return total + value;
            if (operation.type === "refund") return total - value;
            if (operation.type === "adjustment") {
                return total + (operation.direction === "decrease" ? -value : operation.direction === "increase" ? value : 0);
            }
            return total;
        }, 0);

        let obligation = obligations.find(item => String(item.periodId) === String(period.id));

        if (!obligation && amount > 0.005) {
            obligation = createEntity({
                creditId: credit.id,
                periodId: period.id,
                scheduledPeriodId: period.id,
                originalAmount: Math.round(amount * 100) / 100,
                originalDueDate: period.dueDate,
                dueDate: period.dueDate,
                status: "pending",
                remainingResolution: "scheduled",
                source: "period_close"
            }, now);

            writes.push({ type: "put", storeName: STORES.creditObligations, record: obligation });
        }

        writes.push({
            type: "put",
            storeName: STORES.creditPeriods,
            record: {
                ...period,
                status: "closed",
                closedAt: period.closedAt || now,
                obligationId: obligation?.id || period.obligationId || null,
                updatedAt: now,
                revision: (Number(period.revision) || 1) + 1
            }
        });
    }

    if (writes.length) await commit(writes);

    const current = await ensurePeriodForDate(credit, referenceDate);
    return current ? [current] : [];
}

export async function ensureAllCreditPeriodsUpToDate(referenceDate) {
    const credits = await getAll(STORES.credits);
    const cards = credits.filter(credit => credit.active !== false && credit.type === "credit_card");

    for (const credit of cards) {
        await ensureCreditPeriodsUpToDate(credit, referenceDate);
    }
}

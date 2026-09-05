import { deleteRecord, getRecord, saveRecord } from "./database.js";
import { getPendingItems, localDateString } from "./pendingService.js";
import { showConfirmDialog, showDatePromptDialog } from "./ui.js";

function money(value) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    }).format(Number(value) || 0);
}

function prettyDate(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    if (!year || !month || !day) return value || "—";
    return new Intl.DateTimeFormat("es-MX", {
        day: "numeric",
        month: "short",
        year: "numeric"
    }).format(new Date(year, month - 1, day));
}

function makeId(prefix) {
    return `${prefix}-${crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

async function markOccurrenceSkipped(item) {
    const rule = await getRecord("movements", item.sourceId);
    if (!rule) throw new Error("No se encontró la programación original.");

    await saveRecord("movements", {
        id: makeId("mov-skip"),
        status: "skipped",
        type: rule.type,
        description: rule.description,
        amount: Number(rule.amount) || 0,
        completedDate: null,
        scheduledDate: null,
        recurrence: null,
        sourceScheduledMovementId: rule.id,
        sourceScheduledDate: item.occurrenceDate,
        createdAt: new Date().toISOString()
    });
}

function previousDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    date.setDate(date.getDate() - 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function deleteSingleScheduledItem(item) {
    const rule = await getRecord("movements", item.sourceId);
    if (!rule) throw new Error("No se encontró la programación original.");

    if (!rule.recurrence) {
        await deleteRecord("movements", rule.id);
        return;
    }

    await saveRecord("movements", {
        id: makeId("mov-cancelled"),
        status: "cancelled",
        type: rule.type,
        purpose: rule.purpose,
        description: rule.description,
        amount: Number(rule.amount) || 0,
        paymentMethod: rule.paymentMethod || null,
        creditId: rule.creditId || null,
        completedDate: null,
        scheduledDate: null,
        recurrence: null,
        sourceScheduledMovementId: rule.id,
        sourceScheduledDate: item.occurrenceDate,
        createdAt: new Date().toISOString()
    });
}

async function cancelThisAndFuture(item) {
    const rule = await getRecord("movements", item.sourceId);
    if (!rule) throw new Error("No se encontró la programación original.");

    if (!rule.recurrence) {
        await deleteRecord("movements", rule.id);
        return;
    }

    const endDate = previousDate(item.occurrenceDate);
    if (!endDate || item.occurrenceDate <= rule.scheduledDate) {
        await saveRecord("movements", {
            ...rule,
            status: "cancelled",
            updatedAt: new Date().toISOString()
        });
        return;
    }

    await saveRecord("movements", {
        ...rule,
        recurrence: {
            ...rule.recurrence,
            endDate
        },
        updatedAt: new Date().toISOString()
    });
}

async function postponeOccurrence(item, newDate) {
    const rule = await getRecord("movements", item.sourceId);
    if (!rule) throw new Error("No se encontró la programación original.");

    if (!rule.recurrence) {
        await saveRecord("movements", {
            ...rule,
            scheduledDate: newDate,
            updatedAt: new Date().toISOString()
        });
        return;
    }

    await markOccurrenceSkipped(item);

    await saveRecord("movements", {
        ...rule,
        id: makeId("mov-rescheduled"),
        status: "scheduled",
        scheduledDate: newDate,
        completedDate: null,
        recurrence: null,
        sourceRescheduledMovementId: rule.id,
        sourceRescheduledDate: item.occurrenceDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
}

function daysLate(dueDate, today) {
    const a = new Date(`${dueDate}T00:00:00`);
    const b = new Date(`${today}T00:00:00`);
    return Math.max(0, Math.round((b - a) / 86400000));
}

export function initializePendingUI({ refreshApp } = {}) {
    const button = document.getElementById("pendingItemsButton");
    const badge = document.getElementById("pendingItemsBadge");
    const modal = document.getElementById("pendingItemsModal");
    const close = document.getElementById("closePendingItemsModalButton");
    const list = document.getElementById("pendingItemsList");
    const summary = document.getElementById("pendingItemsSummary");

    if (!button || !badge || !modal || !list) return;

    let currentItems = [];

    async function refreshIndicator() {
        try {
            currentItems = await getPendingItems();
            const count = currentItems.length;
            badge.textContent = String(count);
            badge.classList.toggle("hidden", count === 0);
            button.classList.toggle("has-pending", count > 0);
            return currentItems;
        } catch (error) {
            console.warn("No se pudo actualizar la bandeja de pendientes:", error);
            return [];
        }
    }

    async function renderList() {
        const items = await refreshIndicator();
        const today = localDateString();
        list.innerHTML = "";

        if (summary) {
            summary.textContent = items.length
                ? `${items.length} elemento${items.length === 1 ? "" : "s"} por revisar.`
                : "No tienes movimientos vencidos pendientes de revisión.";
        }

        if (!items.length) {
            const empty = document.createElement("div");
            empty.className = "pending-empty-state";
            empty.innerHTML = `<strong>Todo al día</strong><span>No hay movimientos vencidos pendientes.</span>`;
            list.appendChild(empty);
            return;
        }

        for (const item of items) {
            const row = document.createElement("article");
            row.className = "pending-item-row";
            const late = daysLate(item.dueDate, today);
            row.innerHTML = `
                <div class="pending-item-main">
                    <div class="pending-item-title-line">
                        <strong>${item.description}</strong>
                        <span class="pending-item-type">${["creditObligation", "creditPlanInstallment"].includes(item.sourceType) ? "Pago de crédito" : item.recurring ? "Programado recurrente" : "Programado"}</span>
                    </div>
                    <div class="pending-item-meta">
                        <span>${money(item.amount)}</span>
                        <span>${prettyDate(item.dueDate)}</span>
                        <span class="pending-item-overdue">${late === 0 ? "Vence hoy" : `${late} día${late === 1 ? "" : "s"} pendiente`}</span>
                    </div>
                </div>
                <div class="pending-item-actions"></div>
            `;

            const actions = row.querySelector(".pending-item-actions");

            if (["creditObligation", "creditPlanInstallment"].includes(item.sourceType)) {
                const review = document.createElement("button");
                review.type = "button";
                review.className = "primary-button compact-button";
                review.textContent = "Revisar crédito";
                review.addEventListener("click", async () => {
                    modal.classList.add("hidden");
                    const payload = {
                        creditId: item.creditId,
                        amount: item.amount,
                        date: item.dueDate,
                        obligationId: item.sourceType === "creditObligation" ? item.sourceId : null,
                        planId: item.sourceType === "creditPlanInstallment" ? item.sourceId : null
                    };

                    if (typeof window.cauceOpenCreditPayment === "function") {
                        const opened = await window.cauceOpenCreditPayment(payload);
                        if (!opened) {
                            alert("No se pudo abrir el abono relacionado con este pendiente.");
                        }
                    } else {
                        window.dispatchEvent(new CustomEvent("openCreditPaymentById", {
                            detail: payload
                        }));
                    }
                });
                actions.appendChild(review);
            } else {
                const review = document.createElement("button");
                review.type = "button";
                review.className = "primary-button compact-button";
                review.textContent = "Realizar / revisar";
                review.addEventListener("click", async () => {
                    modal.classList.add("hidden");
                    const payload = {
                        movementId: item.sourceId,
                        occurrenceDate: item.occurrenceDate
                    };

                    if (typeof window.cauceOpenScheduledMovement === "function") {
                        await window.cauceOpenScheduledMovement(payload);
                    } else {
                        window.dispatchEvent(new CustomEvent("openScheduledMovement", {
                            detail: payload
                        }));
                    }
                });

                const postpone = document.createElement("button");
                postpone.type = "button";
                postpone.className = "secondary-button compact-button";
                postpone.textContent = "Posponer";
                postpone.addEventListener("click", async () => {
                    const newDate = await showDatePromptDialog({
                        title: "Posponer movimiento",
                        message: `Selecciona la nueva fecha para “${item.description}”.`,
                        value: item.occurrenceDate,
                        confirmText: "Posponer",
                        cancelText: "Cancelar"
                    });
                    if (!newDate) return;
                    try {
                        await postponeOccurrence(item, newDate);
                        await refreshApp?.();
                        await renderList();
                    } catch (error) {
                        alert(error.message || "No se pudo posponer el movimiento.");
                    }
                });

                const skip = document.createElement("button");
                skip.type = "button";
                skip.className = "secondary-button compact-button";
                skip.textContent = "Omitir";
                skip.addEventListener("click", async () => {
                    const confirmed = await showConfirmDialog({
                        title: "Omitir ocurrencia",
                        message: `¿Omitir esta ocurrencia de “${item.description}”? La programación futura continuará sin cambios.`,
                        confirmText: "Omitir",
                        cancelText: "Cancelar"
                    });
                    if (!confirmed) return;
                    try {
                        await markOccurrenceSkipped(item);
                        await refreshApp?.();
                        await renderList();
                    } catch (error) {
                        alert(error.message || "No se pudo omitir el movimiento.");
                    }
                });

                const remove = document.createElement("button");
                remove.type = "button";
                remove.className = "secondary-button compact-button danger-subtle-button";
                remove.textContent = item.recurring ? "Cancelar futuras" : "Eliminar";
                remove.addEventListener("click", async () => {
                    if (item.recurring) {
                        const firstConfirmed = await showConfirmDialog({
                            title: "Cancelar movimientos futuros",
                            message: `¿Cancelar “${item.description}” desde ${prettyDate(item.occurrenceDate)}? Las ocurrencias ya realizadas se conservarán.`,
                            confirmText: "Continuar",
                            cancelText: "Volver"
                        });
                        if (!firstConfirmed) return;

                        const finalConfirmed = await showConfirmDialog({
                            title: "Confirmación final",
                            message: "Esta acción cancelará esta ocurrencia y todas las futuras de la recurrencia. ¿Deseas continuar?",
                            confirmText: "Sí, cancelar futuras",
                            cancelText: "No cancelar"
                        });
                        if (!finalConfirmed) return;
                    } else {
                        const confirmed = await showConfirmDialog({
                            title: "Eliminar movimiento programado",
                            message: `¿Eliminar el movimiento programado “${item.description}”?`,
                            confirmText: "Eliminar",
                            cancelText: "Cancelar"
                        });
                        if (!confirmed) return;
                    }

                    try {
                        if (item.recurring) {
                            await cancelThisAndFuture(item);
                        } else {
                            await deleteSingleScheduledItem(item);
                        }
                        await refreshApp?.();
                        await renderList();
                    } catch (error) {
                        alert(error.message || "No se pudo cancelar la programación.");
                    }
                });

                actions.append(review, postpone, skip, remove);
            }

            list.appendChild(row);
        }
    }

    button.addEventListener("click", async () => {
        await renderList();
        modal.classList.remove("hidden");
    });

    close?.addEventListener("click", () => modal.classList.add("hidden"));
    modal.addEventListener("click", event => {
        if (event.target === modal) modal.classList.add("hidden");
    });

    window.addEventListener("focus", refreshIndicator);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) refreshIndicator();
    });
    window.addEventListener("cauceDataChanged", refreshIndicator);

    setInterval(refreshIndicator, 60000);
    refreshIndicator();

    if (new URLSearchParams(window.location.search).get("open") === "pending") {
        setTimeout(() => button.click(), 250);
    }
}

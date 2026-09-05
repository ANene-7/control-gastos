import { getAllRecords } from "./database.js";
import { calculateObligationRemaining } from "./creditModelCalculations.js";

function money(value) {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: "MXN"
    }).format(Number(value) || 0);
}

function getModalElements() {
    return {
        modal: document.getElementById("creditPaymentResolutionModal"),
        title: document.getElementById("creditPaymentResolutionTitle"),
        message: document.getElementById("creditPaymentResolutionMessage"),
        options: document.getElementById("creditPaymentResolutionOptions"),
        dateRow: document.getElementById("creditPaymentResolutionDateRow"),
        dateInput: document.getElementById("creditPaymentResolutionDate"),
        confirm: document.getElementById("creditPaymentResolutionConfirm"),
        cancel: document.getElementById("creditPaymentResolutionCancel"),
        close: document.getElementById("closeCreditPaymentResolutionModalButton")
    };
}

function requestPartialResolution({ pendingBefore, paymentAmount, dueDate }) {
    const remaining = Math.max(0, pendingBefore - paymentAmount);
    const elements = getModalElements();

    if (!elements.modal || !elements.options) {
        return Promise.resolve({ partialResolution: "keep", partialDueDate: null });
    }

    elements.title.textContent = "Pago parcial";
    elements.message.innerHTML = `El pago cubre <strong>${money(paymentAmount)}</strong> de ${money(pendingBefore)}. Quedarán <strong>${money(remaining)}</strong> pendientes.`;
    elements.options.innerHTML = `
        <label class="credit-payment-resolution-option">
            <input type="radio" name="creditPaymentResolution" value="keep" checked>
            <span><strong>Mantener pendiente</strong><small>Conservar el restante en la fecha actual${dueDate ? ` (${dueDate})` : ""}.</small></span>
        </label>
        <label class="credit-payment-resolution-option">
            <input type="radio" name="creditPaymentResolution" value="postpone">
            <span><strong>Posponer restante</strong><small>Elegir una nueva fecha para lo que falta.</small></span>
        </label>
        <label class="credit-payment-resolution-option">
            <input type="radio" name="creditPaymentResolution" value="next_period">
            <span><strong>Pasar al siguiente periodo</strong><small>Mover el restante a la siguiente fecha de pago.</small></span>
        </label>
        <label class="credit-payment-resolution-option">
            <input type="radio" name="creditPaymentResolution" value="unassigned">
            <span><strong>Dejar como deuda sin fecha</strong><small>La deuda permanece, pero deja de proyectarse como pago programado.</small></span>
        </label>
    `;

    elements.dateRow?.classList.add("hidden");
    if (elements.dateInput) elements.dateInput.value = dueDate || "";
    elements.modal.classList.remove("hidden");

    return new Promise(resolve => {
        const finish = result => {
            elements.modal.classList.add("hidden");
            elements.confirm.removeEventListener("click", onConfirm);
            elements.cancel.removeEventListener("click", onCancel);
            elements.close.removeEventListener("click", onCancel);
            elements.options.removeEventListener("change", onChange);
            resolve(result);
        };
        const onChange = () => {
            const selected = elements.options.querySelector('input[name="creditPaymentResolution"]:checked')?.value;
            elements.dateRow?.classList.toggle("hidden", selected !== "postpone");
        };
        const onConfirm = () => {
            const selected = elements.options.querySelector('input[name="creditPaymentResolution"]:checked')?.value || "keep";
            const partialDueDate = selected === "postpone" ? elements.dateInput?.value || null : null;
            if (selected === "postpone" && !partialDueDate) {
                alert("Selecciona una nueva fecha para el restante.");
                return;
            }
            finish({ partialResolution: selected, partialDueDate });
        };
        const onCancel = () => finish(null);
        elements.confirm.addEventListener("click", onConfirm);
        elements.cancel.addEventListener("click", onCancel);
        elements.close.addEventListener("click", onCancel);
        elements.options.addEventListener("change", onChange);
    });
}

export async function prepareCreditPayment({ creditId, amount }) {
    const paymentAmount = Number(amount) || 0;
    if (!creditId || paymentAmount <= 0) {
        return { partialResolution: "keep", partialDueDate: null };
    }

    const [operations, obligations] = await Promise.all([
        getAllRecords("creditOperations"),
        getAllRecords("creditObligations")
    ]);

    const pendingObligations = obligations
        .filter(item =>
            String(item.creditId) === String(creditId) &&
            !["paid", "cancelled", "closed_partial"].includes(item.status)
        )
        .map(item => ({
            ...item,
            pendingAmount: calculateObligationRemaining(item, operations)
        }))
        .filter(item => item.pendingAmount > 0.005)
        .sort((a, b) => String(a.dueDate || "9999-12-31").localeCompare(String(b.dueDate || "9999-12-31")));

    const first = pendingObligations[0];
    if (!first || paymentAmount >= first.pendingAmount - 0.005) {
        return { partialResolution: "keep", partialDueDate: null };
    }

    return requestPartialResolution({
        pendingBefore: first.pendingAmount,
        paymentAmount,
        dueDate: first.dueDate || null
    });
}

const FEEDBACK_FORM_URL = "https://forms.gle/eXruLBU318wW25NE6";

export function initializeFeedbackUI() {
    const button = document.getElementById("feedbackButton");
    if (!button) return;

    button.addEventListener("click", () => {
        /*
            Usamos un enlace real en vez de window.open().

            Algunos navegadores devuelven null al usar noopener aunque la
            pestaña sí se haya abierto. El fallback anterior interpretaba ese
            null como bloqueo y navegaba también la pestaña de Cauce, abriendo
            el formulario dos veces.
        */
        const link = document.createElement("a");
        link.href = FEEDBACK_FORM_URL;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();
    });
}

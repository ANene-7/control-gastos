import {
    calculateDailyBalance,
    calculateMonthlySummary,
    calculateMonthlyMinimumBalance
} from "./calculations.js";

import {
    renderCalendar
} from "./calendar.js";

import {
    calculateCreditObligations
} from "./creditCalculations.js";

import {
    saveRecord,
    getAllRecords,
    deleteRecord,
    clearStore,
    replaceStoreRecords,
    getSyncFoundationStatus
} from "./database.js";

import {
    setSettings
} from "./state.js";

import {
    getNotificationCapability,
    getNotificationPreferences,
    saveNotificationPreferences,
    requestNotificationPermission,
    sendTestNotification,
    checkDueNotifications
} from "./notifications.js";


/*
    Crédito que actualmente
    estamos editando.
*/

let editingCreditId =
    null;


export async function initializeUI(settings) {  

    /*
        APARIENCIA
    */

    const appearanceThemeSelect =
        document.getElementById("appearanceThemeSelect");

    const themeColorMeta =
        document.getElementById("themeColorMeta");

    const systemThemeQuery =
        window.matchMedia
            ? window.matchMedia("(prefers-color-scheme: dark)")
            : null;

    const getThemePreference = () =>
        localStorage.getItem("cg-theme-preference") || "system";

    const resolveTheme = (preference) => {

        if (preference === "dark" || preference === "light") {
            return preference;
        }

        return systemThemeQuery?.matches ? "dark" : "light";

    };

    const applyThemePreference = (preference) => {

        const normalized =
            ["system", "light", "dark"].includes(preference)
                ? preference
                : "system";

        const resolved = resolveTheme(normalized);

        document.documentElement.dataset.themePreference = normalized;
        document.documentElement.dataset.theme = resolved;

        localStorage.setItem("cg-theme-preference", normalized);

        if (themeColorMeta) {
            themeColorMeta.setAttribute(
                "content",
                resolved === "dark" ? "#081426" : "#ffffff"
            );
        }

        if (appearanceThemeSelect && appearanceThemeSelect.value !== normalized) {
            appearanceThemeSelect.value = normalized;
        }

    };

    applyThemePreference(getThemePreference());

    if (appearanceThemeSelect) {
        appearanceThemeSelect.value = getThemePreference();
        appearanceThemeSelect.addEventListener("change", () => {
            applyThemePreference(appearanceThemeSelect.value);
        });
    }

    if (systemThemeQuery) {
        systemThemeQuery.addEventListener?.("change", () => {
            if (getThemePreference() === "system") {
                applyThemePreference("system");
            }
        });
    }

    /*
        ELEMENTOS DEL DOM
    */

    const addMovementButton =
        document.getElementById(
            "addMovementButton"
        );


    const movementModal =
        document.getElementById(
            "movementModal"
        );


    const closeMovementModalButton =
        document.getElementById(
            "closeMovementModalButton"
        );


    const cancelMovementButton =
        document.getElementById(
            "cancelMovementButton"
        );


    const paymentMethod =
        document.getElementById(
            "paymentMethod"
        );


    const creditSelectorContainer =
        document.getElementById(
            "creditSelectorContainer"
        );


    const settingsButton =
        document.getElementById(
            "settingsButton"
        );


    const settingsModal =
        document.getElementById(
            "settingsModal"
        );


    const closeSettingsModalButton =
        document.getElementById(
            "closeSettingsModalButton"
        );


    const settingsForm =
        document.getElementById(
            "settingsForm"
        );


    const initialBalance =
        document.getElementById(
            "initialBalance"
        );


    const initialBalanceDate =
        document.getElementById(
            "initialBalanceDate"
        );


    const payrollForm =
        document.getElementById(
            "payrollForm"
        );

    const payrollDescription =
        document.getElementById(
            "payrollDescription"
        );

    const payrollAmount =
        document.getElementById(
            "payrollAmount"
        );

    const payrollFrequency =
        document.getElementById(
            "payrollFrequency"
        );

    const payrollStartDate =
        document.getElementById(
            "payrollStartDate"
        );

    const payrollBaseOffset =
        document.getElementById(
            "payrollBaseOffset"
        );

    const payrollWeekendDirection =
        document.getElementById(
            "payrollWeekendDirection"
        );

    const payrollAdjustSunday =
        document.getElementById(
            "payrollAdjustSunday"
        );

    const payrollAdjustSaturday =
        document.getElementById(
            "payrollAdjustSaturday"
        );

    const payrollList =
        document.getElementById(
            "payrollList"
        );

    const payrollEditingId =
        document.getElementById(
            "payrollEditingId"
        );

    const cancelPayrollEditButton =
        document.getElementById(
            "cancelPayrollEditButton"
        );

    const fixedMovementForm =
        document.getElementById(
            "fixedMovementForm"
        );

    const fixedMovementEditingId =
        document.getElementById(
            "fixedMovementEditingId"
        );

    const fixedMovementType =
        document.getElementById(
            "fixedMovementType"
        );

    const fixedMovementDescription =
        document.getElementById(
            "fixedMovementDescription"
        );

    const fixedMovementAmount =
        document.getElementById(
            "fixedMovementAmount"
        );


    const fixedMovementCategory =
        document.getElementById(
            "fixedMovementCategory"
        );

    const fixedMovementFrequency =
        document.getElementById(
            "fixedMovementFrequency"
        );

    const fixedMovementStartDate =
        document.getElementById(
            "fixedMovementStartDate"
        );

    const fixedMovementPaymentMethod =
        document.getElementById(
            "fixedMovementPaymentMethod"
        );

    const fixedMovementList =
        document.getElementById(
            "fixedMovementList"
        );

    const cancelFixedMovementEditButton =
        document.getElementById(
            "cancelFixedMovementEditButton"
        );

    const creditsButton =
        document.getElementById(
            "creditsButton"
        );

    const creditsModal =
        document.getElementById(
            "creditsModal"
        );

    const closeCreditsModalButton =
        document.getElementById(
            "closeCreditsModalButton"
        );

    const cancelCreditButton =
        document.getElementById(
            "cancelCreditButton"
        );


    const creditDetailModal =
        document.getElementById(
            "creditDetailModal"
        );

    const closeCreditDetailModalButton =
        document.getElementById(
            "closeCreditDetailModalButton"
        );

    const creditDetailTitle =
        document.getElementById(
            "creditDetailTitle"
        );

    const creditDetailSubtitle =
        document.getElementById(
            "creditDetailSubtitle"
        );

    const creditDetailContent =
        document.getElementById(
            "creditDetailContent"
        );

    const creditForm =
        document.getElementById(
            "creditForm"
        );

    const creditsList =
        document.getElementById(
            "creditsList"
        );

    const inactiveCreditsList =
        document.getElementById(
            "inactiveCreditsList"
        );


    const inactiveCreditsMenuButton =
        document.getElementById(
            "inactiveCreditsMenuButton"
        );


    const inactiveCreditsPanel =
        document.getElementById(
            "inactiveCreditsPanel"
        );


    /*
        Mostrar / ocultar
        créditos inactivos.
    */

    inactiveCreditsMenuButton.addEventListener(
        "click",
        () => {

            const isHidden =
                inactiveCreditsPanel
                    .classList
                    .toggle(
                        "hidden"
                    );


            inactiveCreditsMenuButton
                .setAttribute(
                    "aria-expanded",
                    String(!isHidden)
                );

        }
    );


    const creditSelector =
        document.getElementById(
            "creditSelector"
        );

    const creditPaymentSelectorContainer =
        document.getElementById(
            "creditPaymentSelectorContainer"
        );


    const creditPaymentSelector =
        document.getElementById(
            "creditPaymentSelector"
        );


    const exportBackupButton =
        document.getElementById(
            "exportBackupButton"
        );


    const importBackupButton =
        document.getElementById(
            "importBackupButton"
        );


    const backupFileInput =
        document.getElementById(
            "backupFileInput"
        );


    const resetAppButton =
        document.getElementById(
            "resetAppButton"
        );


    const syncStatusBadge =
        document.getElementById(
            "syncStatusBadge"
        );


    const syncPendingCount =
        document.getElementById(
            "syncPendingCount"
        );


    const syncLastChange =
        document.getElementById(
            "syncLastChange"
        );


    const notificationStatusBadge =
        document.getElementById(
            "notificationStatusBadge"
        );


    const notificationsEnabled =
        document.getElementById(
            "notificationsEnabled"
        );


    const notifyScheduledMovements =
        document.getElementById(
            "notifyScheduledMovements"
        );


    const notifyCreditPayments =
        document.getElementById(
            "notifyCreditPayments"
        );


    const notificationReminderDays =
        document.getElementById(
            "notificationReminderDays"
        );


    const requestNotificationPermissionButton =
        document.getElementById(
            "requestNotificationPermissionButton"
        );


    const testNotificationButton =
        document.getElementById(
            "testNotificationButton"
        );


    const saveNotificationSettingsButton =
        document.getElementById(
            "saveNotificationSettingsButton"
        );


    const headerMenu =
        document.getElementById(
            "headerMenu"
        );


    const headerMenuButton =
        document.getElementById(
            "headerMenuButton"
        );


    /*
        =================================
        MENÚ MÓVIL DEL HEADER
        =================================
    */

    headerMenuButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const isOpen =
                headerMenu.classList.toggle(
                    "open"
                );


            headerMenuButton.setAttribute(
                "aria-expanded",
                String(isOpen)
            );

        }
    );


    /*
        Cerrar al pulsar fuera.
    */

    document.addEventListener(
        "click",
        event => {

            if (
                !headerMenu.contains(
                    event.target
                )
            ) {

                headerMenu.classList.remove(
                    "open"
                );


                headerMenuButton.setAttribute(
                    "aria-expanded",
                    "false"
                );

            }

        }
    );


    /*
        =================================
        BASE DE SINCRONIZACIÓN
        =================================

        Todavía no existe una cuenta o
        servidor conectado. Esta vista
        solamente confirma que el dispositivo
        ya registra una cola local de cambios
        preparada para sincronización futura.
    */

    async function renderSyncFoundationStatus() {

        if (
            !syncStatusBadge ||
            !syncPendingCount ||
            !syncLastChange
        ) {

            return;

        }


        try {

            const status =
                await getSyncFoundationStatus();


            syncStatusBadge.textContent =
                status.ready
                    ? "Preparada · Local"
                    : "No disponible";


            syncStatusBadge.classList.toggle(
                "is-ready",
                status.ready
            );


            syncPendingCount.textContent =
                String(
                    status.pendingChanges
                );


            if (status.lastLocalChangeAt) {

                const date =
                    new Date(
                        status.lastLocalChangeAt
                    );


                syncLastChange.textContent =
                    Number.isNaN(
                        date.getTime()
                    )
                        ? "—"
                        : date.toLocaleString(
                            "es-MX",
                            {
                                dateStyle:
                                    "medium",
                                timeStyle:
                                    "short"
                            }
                        );

            } else {

                syncLastChange.textContent =
                    "Sin cambios nuevos en esta versión";

            }


        } catch (error) {

            console.warn(
                "No se pudo consultar el estado de sincronización local:",
                error
            );


            syncStatusBadge.textContent =
                "No disponible";

            syncStatusBadge.classList.remove(
                "is-ready"
            );

            syncPendingCount.textContent =
                "—";

            syncLastChange.textContent =
                "—";

        }

    }


    /*
        =================================
        NOTIFICACIONES PWA
        =================================

        En esta etapa los recordatorios se
        comprueban al abrir la app o cuando
        vuelve al primer plano. No fingimos
        tener un scheduler mágico en segundo
        plano porque los navegadores tampoco.
    */

    function renderNotificationPermissionStatus() {

        if (!notificationStatusBadge) {
            return;
        }

        const capability =
            getNotificationCapability();

        notificationStatusBadge.classList.remove(
            "is-ready",
            "is-warning"
        );

        if (!capability.supported) {

            notificationStatusBadge.textContent =
                "No compatible";

            return;
        }

        if (capability.permission === "granted") {

            notificationStatusBadge.textContent =
                "Permiso activo";

            notificationStatusBadge.classList.add(
                "is-ready"
            );

            return;
        }

        if (capability.permission === "denied") {

            notificationStatusBadge.textContent =
                "Permiso bloqueado";

            notificationStatusBadge.classList.add(
                "is-warning"
            );

            return;
        }

        notificationStatusBadge.textContent =
            "Permiso pendiente";

        notificationStatusBadge.classList.add(
            "is-warning"
        );

    }


    async function renderNotificationPreferences() {

        if (
            !notificationsEnabled ||
            !notifyScheduledMovements ||
            !notifyCreditPayments ||
            !notificationReminderDays
        ) {
            return;
        }

        const preferences =
            await getNotificationPreferences();

        notificationsEnabled.checked =
            Boolean(preferences.enabled);

        notifyScheduledMovements.checked =
            Boolean(
                preferences.notifyScheduledMovements
            );

        notifyCreditPayments.checked =
            Boolean(
                preferences.notifyCreditPayments
            );

        notificationReminderDays.value =
            String(
                preferences.reminderDays ?? 1
            );

        renderNotificationPermissionStatus();

    }


    requestNotificationPermissionButton?.addEventListener(
        "click",
        async () => {

            const permission =
                await requestNotificationPermission();

            renderNotificationPermissionStatus();

            if (permission === "granted") {

                showNotification(
                    "Permiso de notificaciones activado."
                );

                return;
            }

            if (permission === "denied") {

                showNotification(
                    "El navegador bloqueó las notificaciones. Puedes habilitarlas desde los permisos del sitio.",
                    "error"
                );

                return;
            }

            showNotification(
                "Este navegador no admite notificaciones PWA.",
                "error"
            );

        }
    );


    testNotificationButton?.addEventListener(
        "click",
        async () => {

            const capability =
                getNotificationCapability();

            if (
                !capability.supported ||
                capability.permission !== "granted"
            ) {

                showNotification(
                    "Activa primero el permiso de notificaciones.",
                    "error"
                );

                return;
            }

            const shown =
                await sendTestNotification();

            showNotification(
                shown
                    ? "Notificación de prueba enviada."
                    : "No se pudo mostrar la notificación de prueba.",
                shown ? "success" : "error"
            );

        }
    );


    saveNotificationSettingsButton?.addEventListener(
        "click",
        async () => {

            if (
                !notificationsEnabled ||
                !notifyScheduledMovements ||
                !notifyCreditPayments ||
                !notificationReminderDays
            ) {
                return;
            }

            const capability =
                getNotificationCapability();

            if (
                notificationsEnabled.checked &&
                capability.permission !== "granted"
            ) {

                showNotification(
                    "Para activar recordatorios necesitas conceder primero el permiso del navegador.",
                    "error"
                );

                return;
            }

            try {

                await saveNotificationPreferences({
                    enabled:
                        notificationsEnabled.checked,
                    notifyScheduledMovements:
                        notifyScheduledMovements.checked,
                    notifyCreditPayments:
                        notifyCreditPayments.checked,
                    reminderDays:
                        Number(
                            notificationReminderDays.value
                        )
                });

                showNotification(
                    "Preferencias de notificaciones guardadas."
                );

                if (notificationsEnabled.checked) {
                    checkDueNotifications();
                }

            } catch (error) {

                console.error(
                    "No se pudieron guardar las preferencias de notificaciones:",
                    error
                );

                showNotification(
                    "No se pudieron guardar las preferencias de notificaciones.",
                    "error"
                );

            }

        }
    );


    /*
        =================================
        DATOS Y RESPALDO
        =================================

        El respaldo V2 incluye todos los
        almacenes financieros actuales.
        Conservamos compatibilidad con los
        respaldos V1 generados anteriormente.
    */

    const BACKUP_STORES = [
        "settings",
        "movements",
        "credits",
        "recurringRules",
        "creditAdjustments"
    ];


    exportBackupButton.addEventListener(
        "click",
        async () => {

            try {

                const data = {};

                for (const storeName of BACKUP_STORES) {

                    data[storeName] =
                        await getAllRecords(
                            storeName
                        );

                }


                const backup = {

                    app:
                        "Control de Gastos",

                    version:
                        2,

                    exportedAt:
                        new Date()
                            .toISOString(),

                    data

                };


                const json =
                    JSON.stringify(
                        backup,
                        null,
                        2
                    );


                const blob =
                    new Blob(
                        [json],
                        {
                            type:
                                "application/json"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const link =
                    document.createElement(
                        "a"
                    );


                const date =
                    getLocalDateString();


                link.href =
                    url;


                link.download =
                    `cauce-respaldo-${date}.json`;


                document.body.appendChild(
                    link
                );


                link.click();
                link.remove();


                URL.revokeObjectURL(
                    url
                );


                showNotification(
                    "Respaldo completo exportado correctamente."
                );


            } catch (error) {

                console.error(
                    "No se pudo exportar el respaldo:",
                    error
                );


                showNotification(
                    "No se pudo exportar el respaldo.",
                    "error"
                );

            }

        }
    );


    importBackupButton.addEventListener(
        "click",
        () => {

            backupFileInput.value =
                "";


            backupFileInput.click();

        }
    );


    backupFileInput.addEventListener(
        "change",
        async () => {

            try {

                const file =
                    backupFileInput
                        .files[0];


                if (!file) {

                    return;

                }


                const text =
                    await file.text();


                let backup;


                try {

                    backup =
                        JSON.parse(
                            text
                        );

                } catch {

                    throw new Error(
                        "El archivo seleccionado no contiene un JSON válido."
                    );

                }


                if (
                    backup.app !==
                        "Control de Gastos"
                ) {

                    throw new Error(
                        "El archivo no corresponde a un respaldo compatible con Cauce."
                    );

                }


                if (
                    ![1, 2].includes(
                        backup.version
                    )
                ) {

                    throw new Error(
                        "La versión del respaldo no es compatible."
                    );

                }


                if (
                    !backup.data ||
                    !Array.isArray(
                        backup.data.settings
                    ) ||
                    !Array.isArray(
                        backup.data.movements
                    ) ||
                    !Array.isArray(
                        backup.data.credits
                    )
                ) {

                    throw new Error(
                        "El respaldo tiene una estructura inválida."
                    );

                }


                const normalizedData = {
                    settings:
                        backup.data.settings,

                    movements:
                        backup.data.movements,

                    credits:
                        backup.data.credits,

                    recurringRules:
                        Array.isArray(
                            backup.data.recurringRules
                        )
                            ? backup.data.recurringRules
                            : [],

                    creditAdjustments:
                        Array.isArray(
                            backup.data.creditAdjustments
                        )
                            ? backup.data.creditAdjustments
                            : []
                };


                const confirmed =
                    await showConfirmDialog({
                        title:
                            "Importar respaldo",

                        message:
                            "Los datos actuales serán reemplazados por los del respaldo seleccionado. Antes de continuar, asegúrate de haber exportado una copia si necesitas conservar el estado actual.",

                        confirmText:
                            "Continuar",

                        cancelText:
                            "Cancelar"
                    });


                if (!confirmed) {

                    return;

                }


                const finalConfirmation =
                    await showConfirmDialog({
                        title:
                            "Confirmar restauración",

                        message:
                            "Esta acción reemplazará la información guardada en este dispositivo y no se puede deshacer desde la app.",

                        confirmText:
                            "Importar respaldo",

                        cancelText:
                            "Volver"
                    });


                if (!finalConfirmation) {

                    return;

                }


                for (const storeName of BACKUP_STORES) {

                    await replaceStoreRecords(
                        storeName,
                        normalizedData[storeName]
                    );

                }


                showNotification(
                    "Respaldo restaurado correctamente."
                );


                setTimeout(
                    () => {

                        window.location.reload();

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "No se pudo importar el respaldo:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo importar el respaldo.",
                    "error"
                );

            }

        }
    );


    resetAppButton.addEventListener(
        "click",
        async () => {

            const confirmed =
                await showConfirmDialog({
                    title:
                        "Restaurar app",

                    message:
                        "Se eliminarán todos los movimientos, créditos, recurrencias, ajustes y configuración guardados en este dispositivo. Te recomendamos exportar un respaldo antes de continuar.",

                    confirmText:
                        "Entiendo, continuar",

                    cancelText:
                        "Cancelar"
                });


            if (!confirmed) {

                return;

            }


            const finalConfirmation =
                await showConfirmDialog({
                    title:
                        "¿Borrar toda la información?",

                    message:
                        "Esta es la última confirmación. La app volverá al estado inicial y los datos eliminados no podrán recuperarse salvo que tengas un respaldo exportado.",

                    confirmText:
                        "Borrar todo",

                    cancelText:
                        "Conservar mis datos"
                });


            if (!finalConfirmation) {

                return;

            }


            try {

                for (const storeName of BACKUP_STORES) {

                    await clearStore(
                        storeName
                    );

                }


                setSettings(
                    null
                );


                showNotification(
                    "La información fue eliminada. Reiniciando la app."
                );


                setTimeout(
                    () => {

                        window.location.reload();

                    },
                    700
                );


            } catch (error) {

                console.error(
                    "No se pudo restaurar la app:",
                    error
                );


                showNotification(
                    "No se pudo eliminar toda la información.",
                    "error"
                );

            }

        }
    );


    /*
        Abrir modal de créditos.
    */

    creditsButton.addEventListener(
        "click",
        () => {

            headerMenu.classList.remove(
                "open"
            );


            headerMenuButton.setAttribute(
                "aria-expanded",
                "false"
            );


            creditsModal.classList.remove(
                "hidden"
            );

        }
    );


    /*
        Cerrar modal.
    */

    closeCreditsModalButton.addEventListener(
        "click",
        () => {

            editingCreditId =
                null;


            creditForm.reset();


            creditsModal.classList.add(
                "hidden"
            );

        }
    );


    cancelCreditButton.addEventListener(
        "click",
        () => {

            editingCreditId =
                null;


            creditForm.reset();


            creditsModal.classList.add(
                "hidden"
            );

        }
    );


    closeCreditDetailModalButton.addEventListener(
        "click",
        () => {

            creditDetailModal.classList.add(
                "hidden"
            );

        }
    );


    creditDetailModal.addEventListener(
        "click",
        event => {

            if (
                event.target ===
                creditDetailModal
            ) {

                creditDetailModal.classList.add(
                    "hidden"
                );

            }

        }
    );


    /*
        Guardar crédito.
    */

    creditForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            try {

                const name =
                    document
                        .getElementById(
                            "creditName"
                        )
                        .value
                        .trim();


                const type =
                    document
                        .getElementById(
                            "creditType"
                        )
                        .value;


                const creditLimit =
                    Number(
                        document
                            .getElementById(
                                "creditLimit"
                            )
                            .value
                    );


                const closingDay =
                    Number(
                        document
                            .getElementById(
                                "creditClosingDay"
                            )
                            .value
                    );


                const paymentDueDay =
                    Number(
                        document
                            .getElementById(
                                "creditPaymentDueDay"
                            )
                            .value
                    );


                /*
                    Validaciones adicionales.
                */

                if (!name) {

                    throw new Error(
                        "Debes indicar un nombre para el crédito."
                    );

                }


                if (
                    creditLimit < 0
                ) {

                    throw new Error(
                        "El límite de crédito no puede ser negativo."
                    );

                }


                if (
                    closingDay < 1 ||
                    closingDay > 31
                ) {

                    throw new Error(
                        "El día de corte debe estar entre 1 y 31."
                    );

                }


                if (
                    paymentDueDay < 1 ||
                    paymentDueDay > 31
                ) {

                    throw new Error(
                        "La fecha límite de pago debe estar entre 1 y 31."
                    );

                }


                /*
                    Crear objeto del crédito.
                */

                let credit;


                /*
                    Si estamos editando,
                    conservar el mismo ID.
                */

                if (
                    editingCreditId
                ) {

                    const existingCredits =
                        await getAllRecords(
                            "credits"
                        );


                    const existingCredit =
                        existingCredits.find(
                            item =>
                                item.id ===
                                editingCreditId
                        );


                    if (!existingCredit) {

                        throw new Error(
                            "No se encontró el crédito que deseas editar."
                        );

                    }


                    credit = {

                        ...existingCredit,

                        name,

                        type,

                        creditLimit,

                        closingDay,

                        paymentDueDay,

                        updatedAt:
                            new Date()
                                .toISOString()

                    };

                } else {

                    credit = {

                        id:
                            crypto.randomUUID(),

                        name,

                        type,

                        creditLimit,

                        closingDay,

                        paymentDueDay,

                        active:
                            true,

                        createdAt:
                            new Date()
                                .toISOString()

                    };

                }


                /*
                    Guardar en IndexedDB.
                */

                await saveRecord(
                    "credits",
                    credit
                );

                editingCreditId =
                    null;

                /*
                    Limpiar formulario.
                */

                creditForm.reset();


                /*
                    Actualizar lista y selector.
                */

                await loadCredits(
                    creditSelector,
                    creditPaymentSelector,
                    creditsList,
                    inactiveCreditsList
                );


                creditsModal.classList.add(
                    "hidden"
                );


                showNotification(
                    "Crédito guardado correctamente."
                );

            } catch (error) {

                console.error(
                    "No se pudo guardar el crédito:",
                    error
                );


                showNotification(
                    error.message ||
                    "No se pudo guardar el crédito.",
                    "error"
                );

            }

        }
    );

    /*
        Cargar configuración existente
    */

    /*
        FECHA ACTUAL

        Sólo usamos hoy como fecha
        predeterminada cuando todavía
        no existe configuración.
    */

    if (settings) {

        initialBalance.value =
            settings.initialBalance;


        initialBalanceDate.value =
            settings.initialBalanceDate;


        await updateCurrentBalance();

    } else {

        const today =
            getLocalDateString();


        initialBalanceDate.value =
            today;

    }


    /*
        MOVIMIENTOS
    */

    addMovementButton.addEventListener(
        "click",
        () => {

            movementModal
                .classList
                .remove("hidden");

        }
    );


    closeMovementModalButton.addEventListener(
        "click",
        () => {

            movementModal
                .classList
                .add("hidden");

        }
    );


    cancelMovementButton.addEventListener(
        "click",
        () => {

            movementModal
                .classList
                .add("hidden");

        }
    );


    /*
        =================================
        CONFIGURACIÓN DE NÓMINA
        =================================
    */

    function resetPayrollForm() {

        payrollForm.reset();

        payrollDescription.value =
            "Nómina";

        payrollBaseOffset.value =
            "0";

        payrollWeekendDirection.value =
            "previous";

        payrollAdjustSunday.checked =
            true;

        payrollAdjustSaturday.checked =
            false;

        payrollEditingId.value =
            "";

        cancelPayrollEditButton
            .classList
            .add("hidden");

    }


    function formatPayrollRule(rule) {

        const recurrence =
            rule.recurrence || {};

        const adjustment =
            recurrence.dateAdjustment || {};

        const frequencyLabels = {
            weekly: "Semanal",
            biweekly: "Bisemanal",
            semimonthly: "Quincenal",
            monthly: "Mensual"
        };

        const frequencyText =
            frequencyLabels[recurrence.type] || "Mensual";

        const offset =
            Number(adjustment.offsetDays || 0);

        const offsetText =
            offset === -1
                ? "1 día antes"
                : offset === 1
                    ? "1 día después"
                    : "mismo día";

        const weekendDays = [];

        if (adjustment.adjustSaturday) {
            weekendDays.push("sábado");
        }

        if (adjustment.adjustSunday) {
            weekendDays.push("domingo");
        }

        const weekendText =
            weekendDays.length
                ? `${weekendDays.join(" y ")} → ${adjustment.weekendDirection === "next" ? "día hábil siguiente" : "día hábil anterior"}`
                : "sin ajuste de fin de semana";

        return `${frequencyText} · ${offsetText} · ${weekendText}`;

    }


    async function renderPayrollList() {

        const movements =
            await getAllRecords(
                "movements"
            );

        const payrollRules =
            movements
                .filter(
                    movement =>
                        movement.kind ===
                        "payroll"
                        &&
                        movement.status ===
                        "scheduled"
                )
                .sort(
                    (a, b) =>
                        (a.description || "")
                            .localeCompare(
                                b.description || "",
                                "es"
                            )
                );

        payrollList.innerHTML =
            "";

        if (!payrollRules.length) {

            payrollList.innerHTML = `
                <p class="payroll-empty-state">
                    No hay nóminas configuradas todavía.
                </p>
            `;

            return;

        }

        payrollRules.forEach(
            rule => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "payroll-rule-item";

                item.innerHTML = `
                    <div class="payroll-rule-copy">
                        <strong>${rule.description || "Nómina"}</strong>
                        <span>$${Number(rule.amount || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <small>${formatPayrollRule(rule)}</small>
                    </div>
                    <div class="payroll-rule-actions">
                        <button type="button" class="secondary-button payroll-edit-button">Editar</button>
                        <button type="button" class="secondary-button payroll-delete-button">Eliminar</button>
                    </div>
                `;

                item
                    .querySelector(
                        ".payroll-edit-button"
                    )
                    .addEventListener(
                        "click",
                        () => {

                            const adjustment =
                                rule.recurrence?.dateAdjustment || {};

                            payrollEditingId.value =
                                rule.id;

                            payrollDescription.value =
                                rule.description || "Nómina";

                            payrollAmount.value =
                                rule.amount;

                            payrollFrequency.value =
                                rule.recurrence?.type || "semimonthly";

                            payrollStartDate.value =
                                rule.scheduledDate || "";

                            payrollBaseOffset.value =
                                String(adjustment.offsetDays || 0);

                            payrollWeekendDirection.value =
                                adjustment.weekendDirection || "previous";

                            payrollAdjustSunday.checked =
                                Boolean(adjustment.adjustSunday);

                            payrollAdjustSaturday.checked =
                                Boolean(adjustment.adjustSaturday);

                            cancelPayrollEditButton
                                .classList
                                .remove("hidden");

                            payrollDescription.focus();

                        }
                    );

                item
                    .querySelector(
                        ".payroll-delete-button"
                    )
                    .addEventListener(
                        "click",
                        async () => {

                            const confirmed =
                                confirm(
                                    `¿Eliminar la programación de ${rule.description || "esta nómina"}? Los movimientos ya realizados no se eliminarán.`
                                );

                            if (!confirmed) {
                                return;
                            }

                            await deleteRecord(
                                "movements",
                                rule.id
                            );

                            resetPayrollForm();
                            await renderPayrollList();
                            await renderCalendar();
                            await updateCurrentBalance();

                        }
                    );

                payrollList.appendChild(
                    item
                );

            }
        );

    }


    const fixedFrequencyLabels = {
        weekly: "Semanal",
        biweekly: "Bisemanal",
        semimonthly: "Quincenal",
        monthly: "Mensual",
        bimonthly: "Bimestral",
        quarterly: "Trimestral",
        biannual: "Semestral",
        yearly: "Anual"
    };


    function resetFixedMovementForm() {

        if (!fixedMovementForm) {
            return;
        }

        fixedMovementForm.reset();
        fixedMovementEditingId.value = "";
        fixedMovementType.value = "expense";
        if (fixedMovementCategory) fixedMovementCategory.value = "";
        fixedMovementFrequency.value = "monthly";
        fixedMovementPaymentMethod.value = "debit";
        cancelFixedMovementEditButton.classList.add("hidden");

    }


    async function renderFixedMovementList() {

        if (!fixedMovementList) {
            return;
        }

        const movements = await getAllRecords("movements");
        const rules = movements
            .filter(item => item.kind === "fixed")
            .sort((a, b) => (a.description || "").localeCompare(b.description || "", "es"));

        fixedMovementList.innerHTML = "";

        if (!rules.length) {
            fixedMovementList.innerHTML = `
                <p class="payroll-empty-state">
                    No hay ingresos o egresos fijos configurados todavía.
                </p>
            `;
            return;
        }

        rules.forEach(rule => {

            const item = document.createElement("div");
            item.className = "payroll-rule-item";

            const frequency =
                fixedFrequencyLabels[rule.recurrence?.type] || "Recurrente";

            const typeText =
                rule.type === "income" ? "Ingreso" : "Egreso";

            const methodText =
                rule.paymentMethod === "cash" ? "Efectivo" : "Débito";

            item.innerHTML = `
                <div class="payroll-rule-copy">
                    <strong>${rule.description || "Movimiento fijo"}</strong>
                    <span>${typeText} · ${formatCurrency(Number(rule.amount || 0))}</span>
                    <small>${frequency} · inicia ${rule.scheduledDate || "—"} · ${methodText}</small>
                </div>
                <div class="payroll-rule-actions">
                    <button type="button" class="secondary-button fixed-edit-button">Editar</button>
                    <button type="button" class="secondary-button fixed-delete-button">Eliminar</button>
                </div>
            `;

            item.querySelector(".fixed-edit-button").addEventListener("click", () => {
                fixedMovementEditingId.value = rule.id;
                fixedMovementType.value = rule.type || "expense";
                fixedMovementDescription.value = rule.description || "";
                if (fixedMovementCategory) fixedMovementCategory.value = rule.category || "";
                fixedMovementAmount.value = Number(rule.amount || 0);
                fixedMovementFrequency.value = rule.recurrence?.type || "monthly";
                fixedMovementStartDate.value = rule.scheduledDate || "";
                fixedMovementPaymentMethod.value = rule.paymentMethod || "debit";
                cancelFixedMovementEditButton.classList.remove("hidden");
                fixedMovementDescription.focus();
            });

            item.querySelector(".fixed-delete-button").addEventListener("click", async () => {
                const confirmed = window.confirm(
                    `¿Eliminar la programación de ${rule.description || "este movimiento"}? Los movimientos ya realizados no se eliminarán.`
                );

                if (!confirmed) {
                    return;
                }

                await deleteRecord("movements", rule.id);
                await renderFixedMovementList();
                await renderCalendar();
                await updateCurrentBalance();
            });

            fixedMovementList.appendChild(item);

        });

    }


    fixedMovementForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const amount = Number(fixedMovementAmount.value);
            const description = fixedMovementDescription.value.trim();
            const startDate = fixedMovementStartDate.value;

            if (!description) {
                alert("Escribe un concepto para el movimiento fijo.");
                return;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Introduce un monto válido.");
                return;
            }

            if (!startDate) {
                alert("Selecciona una fecha de inicio.");
                return;
            }

            const existingId = fixedMovementEditingId.value;
            const type = fixedMovementType.value;
            const category = fixedMovementCategory?.value || "";
            const categoryColors = {
                "Alimentación": "yellow",
                "Transporte": "blue",
                "Vivienda": "purple",
                "Servicios": "blue",
                "Salud": "red",
                "Educación": "purple",
                "Entretenimiento": "yellow",
                "Compras": "red",
                "Deudas / créditos": "red",
                "Ahorro": "green",
                "Otros": "gray"
            };

            const fixedRule = {
                id: existingId || `fixed-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                kind: "fixed",
                type,
                purpose: "regular",
                description,
                amount,
                paymentMethod: fixedMovementPaymentMethod.value,
                creditId: null,
                status: "scheduled",
                scheduledDate: startDate,
                completedDate: null,
                recurrence: {
                    type: fixedMovementFrequency.value
                },
                category,
                labelColor: categoryColors[category] || (type === "income" ? "green" : "red"),
                notes: "Movimiento fijo configurado desde Configuración",
                createdAt: new Date().toISOString()
            };

            try {
                await saveRecord("movements", fixedRule);
                resetFixedMovementForm();
                await renderFixedMovementList();
                await renderCalendar();
                await updateCurrentBalance();
            } catch (error) {
                console.error("Error al guardar movimiento fijo:", error);
                alert("No se pudo guardar el movimiento fijo.");
            }

        }
    );


    cancelFixedMovementEditButton?.addEventListener(
        "click",
        resetFixedMovementForm
    );


    payrollForm.addEventListener(
        "submit",
        async event => {

            event.preventDefault();

            const amount =
                Number(payrollAmount.value);

            const description =
                payrollDescription.value.trim();

            const startDate =
                payrollStartDate.value;

            if (!description) {
                alert("Escribe un concepto para la nómina.");
                return;
            }

            if (!Number.isFinite(amount) || amount <= 0) {
                alert("Introduce un monto de nómina válido.");
                return;
            }

            if (!startDate) {
                alert("Selecciona una fecha nominal de inicio.");
                return;
            }

            const existingId =
                payrollEditingId.value;

            const payrollRule = {
                id:
                    existingId ||
                    `payroll-${Date.now()}-${Math.random().toString(16).slice(2)}`,
                kind: "payroll",
                type: "income",
                purpose: "regular",
                description,
                amount,
                paymentMethod: "debit",
                creditId: null,
                status: "scheduled",
                scheduledDate: startDate,
                completedDate: null,
                recurrence: {
                    type: payrollFrequency.value,
                    dateAdjustment: {
                        offsetDays:
                            Number(payrollBaseOffset.value),
                        adjustSaturday:
                            payrollAdjustSaturday.checked,
                        adjustSunday:
                            payrollAdjustSunday.checked,
                        weekendDirection:
                            payrollWeekendDirection.value
                    }
                },
                category: "Nómina",
                labelColor: "green",
                notes: "Nómina configurada desde Configuración",
                createdAt: new Date().toISOString()
            };

            try {

                await saveRecord(
                    "movements",
                    payrollRule
                );

                resetPayrollForm();
                await renderPayrollList();
                await renderCalendar();
                await updateCurrentBalance();

            } catch (error) {

                console.error(
                    "Error al guardar nómina:",
                    error
                );

                alert(
                    "No se pudo guardar la configuración de nómina."
                );

            }

        }
    );


    cancelPayrollEditButton.addEventListener(
        "click",
        resetPayrollForm
    );


    /*
        ABRIR CONFIGURACIÓN
    */

    settingsButton.addEventListener(
        "click",
        async () => {

            headerMenu.classList.remove(
                "open"
            );


            headerMenuButton.setAttribute(
                "aria-expanded",
                "false"
            );


            settingsModal
                .classList
                .remove("hidden");

            renderPayrollList();
            renderFixedMovementList();
            await renderSyncFoundationStatus();
            await renderNotificationPreferences();

        }
    );


    closeSettingsModalButton.addEventListener(
        "click",
        () => {
            settingsModal.classList.add("hidden");
        }
    );


    settingsModal.addEventListener(
        "click",
        (event) => {
            if (event.target === settingsModal) {
                settingsModal.classList.add("hidden");
            }
        }
    );


    /*
        GUARDAR CONFIGURACIÓN
    */

    settingsForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();


            const balance =
                Number(
                    initialBalance.value
                );


            const date =
                initialBalanceDate.value;


            /*
                Validaciones básicas
            */

            if (
                !Number.isFinite(balance) ||
                balance < 0
            ) {

                alert(
                    "Introduce un saldo válido."
                );

                return;

            }


            if (!date) {

                alert(
                    "Selecciona una fecha válida."
                );

                return;

            }


            /*
                Crear objeto de configuración
            */

            const settingsData = {

                id: "main",

                initialBalance:
                    balance,

                initialBalanceDate:
                    date

            };


            try {

                /*
                    Guardar en IndexedDB
                */

                await saveRecord(
                    "settings",
                    settingsData
                );


                /*
                    Actualizar estado
                */

                setSettings(
                    settingsData
                );


                /*
                    Cerrar modal
                */

                settingsModal
                    .classList
                    .add("hidden");


                console.log(
                    "Configuración guardada:",
                    settingsData
                );


                /*
                    Actualizar interfaz
                    temporalmente.
                */

                await updateCurrentBalance();

                await renderCalendar();


            } catch (error) {

                console.error(
                    "Error al guardar configuración:",
                    error
                );


                alert(
                    "No se pudo guardar la configuración."
                );

            }

        }
    );


    /*
        =================================
        DASHBOARD MENSUAL
        =================================

        Escuchar los cambios de periodo
        realizados desde el calendario.
    */

    window.addEventListener(
        "calendarPeriodChanged",
        event => {

            const {
                year,
                month
            } =
                event.detail;


            updateMonthlyDashboard(
                year,
                month
            );

        }
    );


    /*
        Cargar créditos existentes.
    */

    await loadCredits(
        creditSelector,
        creditPaymentSelector,
        creditsList,
        inactiveCreditsList
    );

}


/*
    Actualiza las tarjetas correspondientes
    al mes visible en el calendario.
*/

async function updateMonthlyDashboard(
    year,
    month
) {

    const movements =
        await getAllRecords(
            "movements"
        );


    const credits =
        await getAllRecords(
            "credits"
        );


    const summary =
        calculateMonthlySummary(
            year,
            month,
            movements,
            credits
        );


    const minimum =
        calculateMonthlyMinimumBalance(
            year,
            month,
            movements,
            credits
        );


    const monthlyIncome =
        document.getElementById(
            "monthlyIncome"
        );


    const monthlyExpenses =
        document.getElementById(
            "monthlyExpenses"
        );


    const monthlyBalance =
        document.getElementById(
            "monthlyBalance"
        );


    /*
        Determinar si el mes visible
        pertenece al pasado, presente
        o futuro.
    */

    const today =
        new Date();


    const currentYear =
        today.getFullYear();


    const currentMonth =
        today.getMonth();


    const visiblePeriod =
        year * 12 + month;


    const currentPeriod =
        currentYear * 12 +
        currentMonth;


    /*
        =================================
        MES PASADO
        =================================
    */

    if (
        visiblePeriod <
        currentPeriod
    ) {

        renderSingleSummaryValue(
            monthlyIncome,
            summary.realIncome
        );


        renderSingleSummaryValue(
            monthlyExpenses,
            summary.realExpenses
        );


        renderSingleSummaryValue(
            monthlyBalance,
            summary.realBalance
        );

    }


    /*
        =================================
        MES ACTUAL
        =================================
    */

    if (
        visiblePeriod ===
        currentPeriod
    ) {

        renderSummaryRows(
            monthlyIncome,
            [
                {
                    label:
                        "Realizados",
                    value:
                        summary.realIncome
                },
                {
                    label:
                        "Programados",
                    value:
                        summary.scheduledIncome
                }
            ]
        );


        renderSummaryRows(
            monthlyExpenses,
            [
                {
                    label:
                        "Realizados",
                    value:
                        summary.realExpenses
                },
                {
                    label:
                        "Programados",
                    value:
                        summary.scheduledExpenses
                }
            ]
        );


        renderSummaryRows(
            monthlyBalance,
            [
                {
                    label:
                        "Realizado",
                    value:
                        summary.realBalance
                },
                {
                    label:
                        "Proyectado",
                    value:
                        summary.projectedBalance
                }
            ]
        );

    }


    /*
        =================================
        MES FUTURO
        =================================
    */

    if (
        visiblePeriod >
        currentPeriod
    ) {

        renderSingleSummaryValue(
            monthlyIncome,
            summary.scheduledIncome,
            "Programados"
        );


        renderSingleSummaryValue(
            monthlyExpenses,
            summary.scheduledExpenses,
            "Programados"
        );


        renderSingleSummaryValue(
            monthlyBalance,
            summary.scheduledBalance,
            "Proyectado"
        );

    }


    const minimumBalance =
        document.getElementById(
            "minimumBalance"
        );


    const minimumBalanceDate =
        document.getElementById(
            "minimumBalanceDate"
        );


    if (
        minimum.balance === null
    ) {

        minimumBalance.textContent =
            "Sin cálculo";


        minimumBalanceDate.textContent =
            "";

        return;

    }


    minimumBalance.textContent =
        formatCurrency(
            minimum.balance
        );


    minimumBalanceDate.textContent =
        formatShortDate(
            minimum.date
        );

}


/*
    Muestra un único valor
    dentro de una tarjeta.
*/

function renderSingleSummaryValue(
    element,
    value,
    label = null
) {

    element.innerHTML =
        "";


    if (!label) {

        element.textContent =
            formatCurrency(
                value
            );

        return;

    }


    const row =
        document.createElement(
            "span"
        );


    row.classList.add(
        "summary-value-row"
    );


    const labelElement =
        document.createElement(
            "span"
        );


    labelElement.classList.add(
        "summary-value-row-label"
    );


    labelElement.textContent =
        label;


    const valueElement =
        document.createElement(
            "span"
        );


    valueElement.textContent =
        formatCurrency(
            value
        );


    row.appendChild(
        labelElement
    );


    row.appendChild(
        valueElement
    );


    element.appendChild(
        row
    );

}


/*
    Muestra varias filas dentro
    de una tarjeta resumen.
*/

function renderSummaryRows(
    element,
    rows
) {

    element.innerHTML =
        "";


    rows.forEach(
        rowData => {

            const row =
                document.createElement(
                    "span"
                );


            row.classList.add(
                "summary-value-row"
            );


            const label =
                document.createElement(
                    "span"
                );


            label.classList.add(
                "summary-value-row-label"
            );


            label.textContent =
                rowData.label;


            const value =
                document.createElement(
                    "span"
                );


            value.textContent =
                formatCurrency(
                    rowData.value
                );


            row.appendChild(
                label
            );


            row.appendChild(
                value
            );


            element.appendChild(
                row
            );

        }
    );

}


function formatShortDate(
    dateString
) {

    const [
        year,
        month,
        day
    ] =
        dateString
            .split("-")
            .map(Number);


    return new Intl.DateTimeFormat(
        "es-MX",
        {
            day:
                "numeric",

            month:
                "long",

            year:
                "numeric"
        }
    ).format(
        new Date(
            year,
            month - 1,
            day
        )
    );

}


export async function updateCurrentBalance() {

    const movements =
        await getAllRecords(
            "movements"
        );


    const today =
        getLocalDateString();


    const balance =
        calculateDailyBalance(
            today,
            movements
        );


    if (
        balance.accumulatedBalance ===
        null
    ) {

        updateBalanceDisplay(
            0
        );

        return;

    }


    updateBalanceDisplay(
        balance.accumulatedBalance
    );

}


/*
    Cargar créditos desde IndexedDB.
*/

function calculateRegisteredCreditUsage(
    credit,
    movements = []
) {

    const creditId =
        String(credit.id);


    let purchases = 0;
    let payments = 0;


    movements.forEach(
        movement => {

            if (
                movement.status !==
                "completed"
            ) {

                return;

            }


            if (
                String(
                    movement.creditId ??
                    ""
                ) !==
                creditId
            ) {

                return;

            }


            const amount =
                Number(
                    movement.amount
                );


            if (
                !Number.isFinite(amount)
                ||
                amount <= 0
            ) {

                return;

            }


            /*
                Compra registrada con el crédito.
            */

            if (
                movement.type ===
                    "expense"
                &&
                movement.purpose !==
                    "creditPayment"
                &&
                movement.paymentMethod ===
                    "credit"
            ) {

                purchases +=
                    amount;

                return;

            }


            /*
                Pago o abono registrado al crédito.
            */

            if (
                movement.type ===
                    "expense"
                &&
                movement.purpose ===
                    "creditPayment"
            ) {

                payments +=
                    amount;

            }

        }
    );


    const used =
        Math.max(
            0,
            purchases - payments
        );


    const limit =
        Number(
            credit.creditLimit
        );


    const hasValidLimit =
        Number.isFinite(limit)
        &&
        limit >= 0;


    const available =
        hasValidLimit
            ? limit - used
            : null;


    const utilization =
        hasValidLimit
        &&
        limit > 0
            ? (used / limit) * 100
            : 0;


    return {
        purchases,
        payments,
        used,
        available,
        utilization
    };

}


function getNextPendingCreditObligation(
    credit,
    obligations = []
) {

    const creditId =
        String(
            credit.id
        );


    const pending =
        obligations
            .filter(
                obligation =>
                    String(
                        obligation.creditId
                    ) === creditId
                    &&
                    Number(
                        obligation.pendingAmount
                    ) > 0.005
            )
            .sort(
                (a, b) =>
                    String(
                        a.dueDate
                    ).localeCompare(
                        String(
                            b.dueDate
                        )
                    )
            );


    return pending[0] ?? null;

}



function renderCreditDetail(
    credit,
    movements = [],
    obligations = [],
    modal,
    titleElement,
    subtitleElement,
    contentElement
) {

    const creditId =
        String(
            credit.id
        );


    const creditTypeLabel =
        credit.type === "creditCard"
            ? "Tarjeta de crédito"
            : credit.type === "storeCredit"
                ? "Crédito de tienda"
                : "Otro crédito";


    const usage =
        calculateRegisteredCreditUsage(
            credit,
            movements
        );


    const creditMovements =
        movements
            .filter(
                movement =>
                    String(
                        movement.creditId ?? ""
                    ) === creditId
            );


    const purchases =
        creditMovements
            .filter(
                movement =>
                    movement.status === "completed"
                    &&
                    movement.type === "expense"
                    &&
                    movement.paymentMethod === "credit"
                    &&
                    movement.completedDate
                    &&
                    movement.purpose !== "creditPayment"
            )
            .sort(
                (a, b) =>
                    String(
                        b.completedDate
                    ).localeCompare(
                        String(
                            a.completedDate
                        )
                    )
            );


    const payments =
        creditMovements
            .filter(
                movement =>
                    movement.status === "completed"
                    &&
                    movement.type === "expense"
                    &&
                    movement.purpose === "creditPayment"
                    &&
                    movement.completedDate
            )
            .sort(
                (a, b) =>
                    String(
                        b.completedDate
                    ).localeCompare(
                        String(
                            a.completedDate
                        )
                    )
            );


    const creditObligations =
        obligations
            .filter(
                obligation =>
                    String(
                        obligation.creditId
                    ) === creditId
            )
            .sort(
                (a, b) =>
                    String(
                        a.dueDate
                    ).localeCompare(
                        String(
                            b.dueDate
                        )
                    )
            );


    const nextObligation =
        getNextPendingCreditObligation(
            credit,
            obligations
        );


    titleElement.textContent =
        credit.name;


    subtitleElement.textContent =
        `${creditTypeLabel} · Corte día ${credit.closingDay} · Fecha límite día ${credit.paymentDueDay}`;


    contentElement.innerHTML =
        "";


    const summary =
        document.createElement(
            "div"
        );


    summary.classList.add(
        "credit-detail-summary"
    );


    const availableValue =
        usage.available === null
            ? "—"
            : formatCurrency(
                usage.available
            );


    const nextPaymentValue =
        nextObligation
            ? formatCurrency(
                Number(
                    nextObligation.pendingAmount
                )
            )
            : "Sin pendiente";


    summary.innerHTML = `
        <div>
            <span>Uso registrado</span>
            <strong>${formatCurrency(usage.used)}</strong>
        </div>
        <div>
            <span>Disponible estimado</span>
            <strong class="${usage.available !== null && usage.available < 0 ? "credit-negative-value" : ""}">${availableValue}</strong>
        </div>
        <div>
            <span>Límite</span>
            <strong>${formatCurrency(Number(credit.creditLimit) || 0)}</strong>
        </div>
        <div>
            <span>Próximo pendiente</span>
            <strong>${nextPaymentValue}</strong>
            ${nextObligation ? `<small>${formatShortDate(String(nextObligation.dueDate))}</small>` : ""}
        </div>
    `;


    contentElement.appendChild(
        summary
    );


    const note =
        document.createElement(
            "p"
        );


    note.classList.add(
        "credit-detail-note"
    );


    note.textContent =
        "Este detalle usa únicamente compras, pagos y obligaciones registradas en la app. No representa deuda previa, intereses ni planes externos.";


    contentElement.appendChild(
        note
    );


    const createSection = (
        sectionTitle,
        items,
        renderItem,
        emptyText
    ) => {

        const section =
            document.createElement(
                "section"
            );


        section.classList.add(
            "credit-detail-section"
        );


        const heading =
            document.createElement(
                "div"
            );


        heading.classList.add(
            "credit-detail-section-heading"
        );


        const headingTitle =
            document.createElement(
                "h3"
            );


        headingTitle.textContent =
            sectionTitle;


        const count =
            document.createElement(
                "span"
            );


        count.textContent =
            String(
                items.length
            );


        heading.append(
            headingTitle,
            count
        );


        section.appendChild(
            heading
        );


        if (
            items.length === 0
        ) {

            const empty =
                document.createElement(
                    "p"
                );


            empty.classList.add(
                "credit-detail-empty"
            );


            empty.textContent =
                emptyText;


            section.appendChild(
                empty
            );

        } else {

            const list =
                document.createElement(
                    "div"
                );


            list.classList.add(
                "credit-detail-list"
            );


            items.forEach(
                item =>
                    list.appendChild(
                        renderItem(
                            item
                        )
                    )
            );


            section.appendChild(
                list
            );

        }


        contentElement.appendChild(
            section
        );

    };


    const renderMovementItem = (
        movement,
        kind
    ) => {

        const row =
            document.createElement(
                "div"
            );


        row.classList.add(
            "credit-detail-row"
        );


        const main =
            document.createElement(
                "div"
            );


        const description =
            document.createElement(
                "strong"
            );


        description.textContent =
            movement.description ||
            (kind === "payment"
                ? "Pago a crédito"
                : "Compra con crédito");


        const meta =
            document.createElement(
                "span"
            );


        meta.textContent =
            formatShortDate(
                String(
                    movement.completedDate
                )
            );


        main.append(
            description,
            meta
        );


        const amount =
            document.createElement(
                "strong"
            );


        amount.classList.add(
            kind === "payment"
                ? "credit-detail-payment-amount"
                : "credit-detail-purchase-amount"
        );


        amount.textContent =
            `${kind === "payment" ? "−" : "+"}${formatCurrency(Number(movement.amount) || 0)}`;


        row.append(
            main,
            amount
        );


        return row;

    };


    createSection(
        "Compras registradas",
        purchases,
        movement =>
            renderMovementItem(
                movement,
                "purchase"
            ),
        "No hay compras realizadas registradas para este crédito."
    );


    createSection(
        "Pagos y abonos",
        payments,
        movement =>
            renderMovementItem(
                movement,
                "payment"
            ),
        "No hay pagos o abonos registrados para este crédito."
    );


    createSection(
        "Obligaciones por fecha límite",
        creditObligations,
        obligation => {

            const row =
                document.createElement(
                    "div"
                );


            row.classList.add(
                "credit-detail-row",
                "credit-detail-obligation-row"
            );


            const main =
                document.createElement(
                    "div"
                );


            const due =
                document.createElement(
                    "strong"
                );


            due.textContent =
                formatShortDate(
                    String(
                        obligation.dueDate
                    )
                );


            const paid =
                document.createElement(
                    "span"
                );


            paid.textContent =
                `Original ${formatCurrency(Number(obligation.originalAmount) || 0)} · Pagado ${formatCurrency(Number(obligation.paidAmount) || 0)}`;


            main.append(
                due,
                paid
            );


            const pending =
                document.createElement(
                    "strong"
                );


            const pendingAmount =
                Math.max(
                    0,
                    Number(
                        obligation.pendingAmount
                    ) || 0
                );


            pending.textContent =
                pendingAmount > 0.005
                    ? formatCurrency(
                        pendingAmount
                    )
                    : "Pagado";


            if (
                pendingAmount <= 0.005
            ) {

                pending.classList.add(
                    "credit-detail-paid"
                );

            }


            row.append(
                main,
                pending
            );


            return row;

        },
        "No hay obligaciones calculadas para este crédito."
    );


    modal.classList.remove(
        "hidden"
    );

}


async function loadCredits(
    creditSelector,
    creditPaymentSelector,
    creditsList,
    inactiveCreditsList
) {

    /*
        Obtener créditos registrados.
    */

    const credits =
        await getAllRecords(
            "credits"
        );


    /*
        Los datos de uso se calculan únicamente
        con movimientos registrados en la app.
        La gestión de deuda previa queda para V3.
    */

    const movements =
        await getAllRecords(
            "movements"
        );


    /*
        Las obligaciones se calculan una sola vez
        para toda la pantalla de créditos. Si algún
        registro antiguo resultara inconsistente,
        el panel sigue funcionando sin bloquear la app.
    */

    let creditObligations =
        [];


    try {

        creditObligations =
            calculateCreditObligations(
                movements,
                credits
            );

    } catch (error) {

        console.error(
            "No se pudieron calcular las obligaciones de crédito:",
            error
        );

    }


    /*
        Consideramos activos también
        los créditos antiguos que todavía
        no tengan la propiedad "active".
    */

    const activeCredits =
        credits.filter(
            credit =>
                credit.active !== false
        );


    const inactiveCredits =
        credits.filter(
            credit =>
                credit.active === false
        );


    /*
        =================================
        ACTUALIZAR SELECTORES
        =================================
    */

    creditSelector.innerHTML =
        "";


    creditPaymentSelector.innerHTML =
        "";


    if (
        activeCredits.length === 0
    ) {

        const purchaseOption =
            document.createElement(
                "option"
            );


        purchaseOption.value =
            "";


        purchaseOption.textContent =
            "No hay créditos configurados";


        creditSelector.appendChild(
            purchaseOption
        );


        creditSelector.disabled =
            true;


        const paymentOption =
            document.createElement(
                "option"
            );


        paymentOption.value =
            "";


        paymentOption.textContent =
            "No hay créditos configurados";


        creditPaymentSelector.appendChild(
            paymentOption
        );


        creditPaymentSelector.disabled =
            true;

    } else {

        creditSelector.disabled =
            false;


        creditPaymentSelector.disabled =
            false;


        const purchasePlaceholder =
            document.createElement(
                "option"
            );


        purchasePlaceholder.value =
            "";


        purchasePlaceholder.textContent =
            "Selecciona un crédito";


        creditSelector.appendChild(
            purchasePlaceholder
        );


        const paymentPlaceholder =
            document.createElement(
                "option"
            );


        paymentPlaceholder.value =
            "";


        paymentPlaceholder.textContent =
            "Selecciona un crédito";


        creditPaymentSelector.appendChild(
            paymentPlaceholder
        );


        activeCredits.forEach(
            credit => {

                const purchaseOption =
                    document.createElement(
                        "option"
                    );


                purchaseOption.value =
                    credit.id;


                purchaseOption.textContent =
                    credit.name;


                creditSelector.appendChild(
                    purchaseOption
                );


                const paymentOption =
                    document.createElement(
                        "option"
                    );


                paymentOption.value =
                    credit.id;


                paymentOption.textContent =
                    credit.name;


                creditPaymentSelector.appendChild(
                    paymentOption
                );

            }
        );

    }


    /*
        =================================
        MOSTRAR CRÉDITOS ACTIVOS
        =================================
    */

    creditsList.innerHTML =
        "";


    if (
        activeCredits.length === 0
    ) {

        const emptyMessage =
            document.createElement(
                "p"
            );


        emptyMessage.textContent =
            "No hay créditos activos.";


        creditsList.appendChild(
            emptyMessage
        );

    } else {

        activeCredits.forEach(
            credit => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.classList.add(
                    "credit-list-item"
                );


                const creditTypeLabel =
                    credit.type === "creditCard"
                        ? "Tarjeta de crédito"
                        : credit.type === "storeCredit"
                            ? "Crédito de tienda"
                            : "Otro crédito";


                const usage =
                    calculateRegisteredCreditUsage(
                        credit,
                        movements
                    );


                const nextObligation =
                    getNextPendingCreditObligation(
                        credit,
                        creditObligations
                    );


                const today =
                    getLocalDateString();


                const obligationIsOverdue =
                    nextObligation
                    &&
                    String(
                        nextObligation.dueDate
                    ) < today;


                const availableClass =
                    usage.available !== null
                    &&
                    usage.available < 0
                        ? "credit-negative-value"
                        : "";


                const utilizationWidth =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            usage.utilization
                        )
                    );


                const utilizationLabel =
                    Number.isFinite(
                        usage.utilization
                    )
                        ? `${usage.utilization.toFixed(0)}%`
                        : "0%";


                item.innerHTML = `
                    <div class="credit-list-header">

                        <div>
                            <strong>
                                ${credit.name}
                            </strong>

                            <span class="credit-type-label">
                                ${creditTypeLabel}
                            </span>
                        </div>

                    </div>

                    <div class="credit-usage-summary">

                        <div class="credit-usage-values">

                            <div>
                                <span>Uso registrado</span>
                                <strong>
                                    ${formatCurrency(
                                        usage.used
                                    )}
                                </strong>
                            </div>

                            <div>
                                <span>Disponible estimado</span>
                                <strong class="${availableClass}">
                                    ${usage.available === null
                                        ? "—"
                                        : formatCurrency(
                                            usage.available
                                        )}
                                </strong>
                            </div>

                        </div>

                        <div class="credit-utilization-row">
                            <div class="credit-utilization-track"
                                 aria-label="Uso registrado del límite">
                                <div class="credit-utilization-fill"
                                     style="width: ${utilizationWidth}%"></div>
                            </div>

                            <span>${utilizationLabel}</span>
                        </div>

                        <small>
                            Estimación basada sólo en compras y pagos registrados en esta app.
                        </small>

                    </div>

                    <div class="credit-next-payment ${obligationIsOverdue ? "credit-next-payment-overdue" : ""}">
                        ${nextObligation
                            ? `
                                <div>
                                    <span>
                                        ${obligationIsOverdue
                                            ? "Pago vencido"
                                            : "Próximo pago"}
                                    </span>
                                    <strong>
                                        ${formatCurrency(
                                            Number(
                                                nextObligation.pendingAmount
                                            )
                                        )}
                                    </strong>
                                </div>
                                <small>
                                    Fecha límite: ${formatShortDate(
                                        String(
                                            nextObligation.dueDate
                                        )
                                    )}
                                </small>
                            `
                            : `
                                <div>
                                    <span>Próximo pago</span>
                                    <strong>Sin pagos pendientes registrados</strong>
                                </div>
                            `}
                    </div>

                    <div class="credit-list-data credit-list-data-grid">

                        <div class="credit-data-block">
                            <span>Límite</span>
                            <strong>
                                ${formatCurrency(
                                    credit.creditLimit
                                )}
                            </strong>
                        </div>

                        <div class="credit-data-block">
                            <span>Corte</span>
                            <strong>
                                Día ${credit.closingDay}
                            </strong>
                        </div>

                        <div class="credit-data-block">
                            <span>Fecha límite</span>
                            <strong>
                                Día ${credit.paymentDueDay}
                            </strong>
                        </div>

                    </div>
                `;


                const actions =
                    document.createElement(
                        "div"
                    );


                actions.classList.add(
                    "credit-list-actions"
                );


                const detailButton =
                    document.createElement(
                        "button"
                    );


                detailButton.type =
                    "button";


                detailButton.classList.add(
                    "secondary-button"
                );


                detailButton.textContent =
                    "Ver detalle";


                const editButton =
                    document.createElement(
                        "button"
                    );


                editButton.type =
                    "button";


                editButton.classList.add(
                    "secondary-button"
                );


                editButton.textContent =
                    "Editar";


                const deactivateButton =
                    document.createElement(
                        "button"
                    );


                deactivateButton.type =
                    "button";


                deactivateButton.classList.add(
                    "secondary-button"
                );


                deactivateButton.textContent =
                    "Cancelar crédito";


                /*
                    VER DETALLE
                */

                detailButton.addEventListener(
                    "click",
                    () => {

                        renderCreditDetail(
                            credit,
                            movements,
                            creditObligations,
                            creditDetailModal,
                            creditDetailTitle,
                            creditDetailSubtitle,
                            creditDetailContent
                        );

                    }
                );


                /*
                    EDITAR
                */

                editButton.addEventListener(
                    "click",
                    () => {

                        editingCreditId =
                            credit.id;


                        document
                            .getElementById(
                                "creditName"
                            )
                            .value =
                                credit.name;


                        document
                            .getElementById(
                                "creditType"
                            )
                            .value =
                                credit.type;


                        document
                            .getElementById(
                                "creditLimit"
                            )
                            .value =
                                credit.creditLimit;


                        document
                            .getElementById(
                                "creditClosingDay"
                            )
                            .value =
                                credit.closingDay;


                        document
                            .getElementById(
                                "creditPaymentDueDay"
                            )
                            .value =
                                credit.paymentDueDay;


                        creditForm.scrollIntoView({
                            behavior:
                                "smooth",

                            block:
                                "start"
                        });

                    }
                );


                /*
                    DESACTIVAR
                */

                deactivateButton.addEventListener(
                    "click",
                    async () => {

                        try {

                            const confirmed =
                                await showConfirmDialog({

                                    title:
                                        "Cancelar crédito",

                                    message:
                                        `¿Deseas mover "${credit.name}" ` +
                                        `a créditos inactivos? ` +
                                        `Su historial y movimientos se conservarán.`,

                                    confirmText:
                                        "Cancelar crédito",

                                    cancelText:
                                        "Volver"

                                });


                            if (!confirmed) {

                                return;

                            }


                            const updatedCredit = {

                                ...credit,

                                active:
                                    false,

                                deactivatedAt:
                                    new Date()
                                        .toISOString()

                            };


                            await saveRecord(
                                "credits",
                                updatedCredit
                            );


                            if (
                                editingCreditId ===
                                credit.id
                            ) {

                                editingCreditId =
                                    null;


                                creditForm.reset();

                            }


                            await loadCredits(
                                creditSelector,
                                creditPaymentSelector,
                                creditsList,
                                inactiveCreditsList
                            );


                            showNotification(
                                "Crédito movido a inactivos."
                            );


                            await renderCalendar();


                        } catch (error) {

                            console.error(
                                "No se pudo cancelar el crédito:",
                                error
                            );


                            showNotification(
                                "No se pudo cancelar el crédito.",
                                "error"
                            );

                        }

                    }
                );


                actions.appendChild(
                    detailButton
                );


                actions.appendChild(
                    editButton
                );


                actions.appendChild(
                    deactivateButton
                );


                item.appendChild(
                    actions
                );


                creditsList.appendChild(
                    item
                );

            }
        );

    }


    /*
        =================================
        MOSTRAR CRÉDITOS INACTIVOS
        =================================
    */

    inactiveCreditsList.innerHTML =
        "";


    if (
        inactiveCredits.length === 0
    ) {

        const emptyMessage =
            document.createElement(
                "p"
            );


        emptyMessage.textContent =
            "No hay créditos inactivos.";


        inactiveCreditsList.appendChild(
            emptyMessage
        );

    } else {

        inactiveCredits.forEach(
            credit => {

                const item =
                    document.createElement(
                        "div"
                    );


                item.classList.add(
                    "credit-list-item",
                    "inactive-credit-item"
                );


                item.innerHTML = `
                    <div class="credit-list-header">

                        <strong>
                            ${credit.name}
                        </strong>

                    </div>

                    <div class="credit-list-data">

                        <div>
                            Límite:
                            ${formatCurrency(
                                credit.creditLimit
                            )}
                        </div>

                        <div>
                            Corte:
                            día ${credit.closingDay}
                        </div>

                        <div>
                            FLP:
                            día ${credit.paymentDueDay}
                        </div>

                    </div>
                `;


                const actions =
                    document.createElement(
                        "div"
                    );


                actions.classList.add(
                    "credit-list-actions"
                );


                const reactivateButton =
                    document.createElement(
                        "button"
                    );


                reactivateButton.type =
                    "button";


                reactivateButton.classList.add(
                    "secondary-button"
                );


                reactivateButton.textContent =
                    "Reactivar";


                reactivateButton.addEventListener(
                    "click",
                    async () => {

                        try {

                            const confirmed =
                                await showConfirmDialog({

                                    title:
                                        "Reactivar crédito",

                                    message:
                                        `¿Deseas volver a activar "${credit.name}"?`,

                                    confirmText:
                                        "Reactivar",

                                    cancelText:
                                        "Cancelar"

                                });


                            if (!confirmed) {

                                return;

                            }


                            const updatedCredit = {

                                ...credit,

                                active:
                                    true,

                                reactivatedAt:
                                    new Date()
                                        .toISOString()

                            };


                            await saveRecord(
                                "credits",
                                updatedCredit
                            );


                            await loadCredits(
                                creditSelector,
                                creditPaymentSelector,
                                creditsList,
                                inactiveCreditsList
                            );


                            showNotification(
                                "Crédito reactivado correctamente."
                            );


                        } catch (error) {

                            console.error(
                                "No se pudo reactivar el crédito:",
                                error
                            );


                            showNotification(
                                "No se pudo reactivar el crédito.",
                                "error"
                            );

                        }

                    }
                );


                actions.appendChild(
                    reactivateButton
                );


                item.appendChild(
                    actions
                );


                inactiveCreditsList.appendChild(
                    item
                );

            }
        );

    }

}


/*
    Actualiza el saldo mostrado
    en el dashboard.
*/

function updateBalanceDisplay(
    balance
) {

    const currentBalance =
        document.getElementById(
            "currentBalance"
        );


    if (!currentBalance) {
        return;
    }


    currentBalance.textContent =
        formatCurrency(balance);

}


/*
    Convierte un número a formato monetario.
*/

function formatCurrency(
    amount
) {

    return new Intl.NumberFormat(
        "es-MX",
        {
            style: "currency",
            currency: "MXN"
        }
    ).format(amount);

}


export function showNotification(
    message,
    type = "success"
) {

    const notification =
        document.getElementById(
            "appNotification"
        );


    if (!notification) {

        return;

    }


    notification.textContent =
        message;


    notification.classList.remove(
        "hidden",
        "success",
        "error"
    );


    notification.classList.add(
        type
    );


    setTimeout(
        () => {

            notification.classList.add(
                "hidden"
            );

        },
        2500
    );

}


/*
    Obtiene la fecha local del navegador
    en formato YYYY-MM-DD.

    No usamos toISOString() porque puede
    cambiar la fecha debido a UTC.
*/

function getLocalDateString() {

    const date =
        new Date();


    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return `${year}-${month}-${day}`;

}


export function showConfirmDialog({
    title = "Confirmar acción",
    message = "¿Deseas continuar?",
    confirmText = "Confirmar",
    cancelText = "Cancelar"
} = {}) {

    return new Promise(
        resolve => {

            const modal =
                document.getElementById(
                    "confirmModal"
                );


            const titleElement =
                document.getElementById(
                    "confirmModalTitle"
                );


            const messageElement =
                document.getElementById(
                    "confirmModalMessage"
                );


            const acceptButton =
                document.getElementById(
                    "acceptConfirmButton"
                );


            const cancelButton =
                document.getElementById(
                    "cancelConfirmButton"
                );


            const closeButton =
                document.getElementById(
                    "closeConfirmModalButton"
                );


            titleElement.textContent =
                title;


            messageElement.textContent =
                message;


            acceptButton.textContent =
                confirmText;


            cancelButton.textContent =
                cancelText;


            /*
                Terminamos la confirmación
                y retiramos listeners.

                Esto evita acumular listeners
                cada vez que abrimos el modal.
            */

            function finish(
                result
            ) {

                modal.classList.add(
                    "hidden"
                );


                acceptButton.removeEventListener(
                    "click",
                    accept
                );


                cancelButton.removeEventListener(
                    "click",
                    cancel
                );


                closeButton.removeEventListener(
                    "click",
                    cancel
                );


                resolve(
                    result
                );

            }


            function accept() {

                finish(
                    true
                );

            }


            function cancel() {

                finish(
                    false
                );

            }


            acceptButton.addEventListener(
                "click",
                accept
            );


            cancelButton.addEventListener(
                "click",
                cancel
            );


            closeButton.addEventListener(
                "click",
                cancel
            );


            modal.classList.remove(
                "hidden"
            );

        }
    );

}
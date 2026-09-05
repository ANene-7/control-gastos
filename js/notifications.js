import {
    getRecord,
    saveRecord,
    getAllRecords
} from "./database.js";

import {
    getScheduledMovementsForDate
} from "./scheduledCalculations.js";

import {
    calculateCreditObligations
} from "./creditCalculations.js";

import {
    getPendingItems
} from "./pendingService.js";


const NOTIFICATION_SETTINGS_ID = "notifications";
const NOTIFICATION_LOG_KEY = "controlGastosNotificationLog";

const DEFAULT_PREFERENCES = {
    id: NOTIFICATION_SETTINGS_ID,
    enabled: false,
    notifyScheduledMovements: true,
    notifyCreditPayments: true,
    reminderDays: 1
};


function localDateString(date = new Date()) {

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


function addDays(date, days) {

    const result = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

    result.setDate(
        result.getDate() + days
    );

    return result;

}


function dateDistanceInDays(dateString) {

    const today = new Date();
    const todayMidnight = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
    );

    const [year, month, day] =
        String(dateString)
            .split("-")
            .map(Number);

    const target = new Date(
        year,
        month - 1,
        day
    );

    return Math.round(
        (target - todayMidnight) / 86400000
    );

}


function money(value) {

    return Number(value || 0)
        .toLocaleString(
            "es-MX",
            {
                style: "currency",
                currency: "MXN"
            }
        );

}


function readNotificationLog() {

    try {

        const raw =
            localStorage.getItem(
                NOTIFICATION_LOG_KEY
            );

        return raw
            ? JSON.parse(raw)
            : {};

    } catch (error) {

        console.warn(
            "No se pudo leer el registro local de notificaciones:",
            error
        );

        return {};

    }

}


function markNotificationDelivered(key) {

    const today = localDateString();
    const log = readNotificationLog();

    const todayKeys =
        Array.isArray(log[today])
            ? log[today]
            : [];

    if (!todayKeys.includes(key)) {
        todayKeys.push(key);
    }

    /* Conservar solamente los últimos 7 días para no acumular basura. */
    const recentDates =
        Object.keys(log)
            .sort()
            .slice(-6);

    const nextLog = {};

    recentDates.forEach(date => {
        nextLog[date] = log[date];
    });

    nextLog[today] = todayKeys;

    try {
        localStorage.setItem(
            NOTIFICATION_LOG_KEY,
            JSON.stringify(nextLog)
        );
    } catch (error) {
        console.warn(
            "No se pudo guardar el registro local de notificaciones:",
            error
        );
    }

}


function wasDeliveredToday(key) {

    const today = localDateString();
    const log = readNotificationLog();

    return Array.isArray(log[today]) &&
        log[today].includes(key);

}


export function getNotificationCapability() {

    const supported =
        "Notification" in window &&
        "serviceWorker" in navigator;

    return {
        supported,
        permission:
            supported
                ? Notification.permission
                : "unsupported",
        secureContext:
            window.isSecureContext
    };

}


export async function getNotificationPreferences() {

    try {

        const stored =
            await getRecord(
                "settings",
                NOTIFICATION_SETTINGS_ID
            );

        return {
            ...DEFAULT_PREFERENCES,
            ...(stored || {}),
            id: NOTIFICATION_SETTINGS_ID
        };

    } catch (error) {

        console.warn(
            "No se pudieron leer las preferencias de notificaciones:",
            error
        );

        return {
            ...DEFAULT_PREFERENCES
        };

    }

}


export async function saveNotificationPreferences(preferences) {

    const normalized = {
        ...DEFAULT_PREFERENCES,
        ...preferences,
        id: NOTIFICATION_SETTINGS_ID,
        reminderDays:
            Math.max(
                0,
                Number(preferences.reminderDays) || 0
            )
    };

    await saveRecord(
        "settings",
        normalized
    );

    return normalized;

}


export async function requestNotificationPermission() {

    const capability =
        getNotificationCapability();

    if (!capability.supported) {
        return "unsupported";
    }

    if (Notification.permission === "granted") {
        return "granted";
    }

    return Notification.requestPermission();

}


export async function showDeviceNotification(
    title,
    options = {}
) {

    const capability =
        getNotificationCapability();

    if (
        !capability.supported ||
        Notification.permission !== "granted"
    ) {
        return false;
    }

    try {

        const registration =
            await navigator.serviceWorker.ready;

        await registration.showNotification(
            title,
            {
                icon: "./assets/icons/icon-192.png",
                badge: "./assets/icons/icon-192.png",
                ...options
            }
        );

        return true;

    } catch (error) {

        console.warn(
            "No se pudo mostrar la notificación del dispositivo:",
            error
        );

        return false;

    }

}


export async function sendTestNotification() {

    return showDeviceNotification(
        "Cauce",
        {
            body:
                "Las notificaciones están listas en este dispositivo.",
            tag:
                "control-gastos-test"
        }
    );

}


export async function checkDueNotifications() {

    const capability =
        getNotificationCapability();

    if (
        !capability.supported ||
        Notification.permission !== "granted"
    ) {
        return;
    }

    const preferences =
        await getNotificationPreferences();

    if (!preferences.enabled) {
        return;
    }

    const [
        movements,
        credits
    ] = await Promise.all([
        getAllRecords("movements"),
        getAllRecords("credits")
    ]);

    const reminderDays =
        Math.max(
            0,
            Number(preferences.reminderDays) || 0
        );

    const notifications = [];


    if (preferences.notifyScheduledMovements) {

        for (
            let offset = 0;
            offset <= reminderDays;
            offset += 1
        ) {

            const date =
                localDateString(
                    addDays(
                        new Date(),
                        offset
                    )
                );

            const scheduled =
                getScheduledMovementsForDate(
                    date,
                    movements
                );

            scheduled.forEach(movement => {

                const key =
                    `scheduled:${movement.id}:${date}`;

                if (wasDeliveredToday(key)) {
                    return;
                }

                const when =
                    offset === 0
                        ? "hoy"
                        : offset === 1
                            ? "mañana"
                            : `en ${offset} días`;

                const kind =
                    movement.type === "income"
                        ? "Ingreso programado"
                        : "Egreso programado";

                notifications.push({
                    key,
                    title: kind,
                    body:
                        `${movement.description || "Movimiento"} · ${money(movement.amount)} · ${when}`,
                    tag:
                        `scheduled-${movement.id}-${date}`
                });

            });

        }

    }


    if (preferences.notifyCreditPayments) {

        const obligations =
            calculateCreditObligations(
                movements,
                credits
            );

        obligations
            .filter(
                obligation =>
                    Number(obligation.pendingAmount) > 0
            )
            .forEach(obligation => {

                const distance =
                    dateDistanceInDays(
                        obligation.dueDate
                    );

                if (
                    distance < 0 ||
                    distance > reminderDays
                ) {
                    return;
                }

                const key =
                    `credit:${obligation.creditId}:${obligation.dueDate}`;

                if (wasDeliveredToday(key)) {
                    return;
                }

                const when =
                    distance === 0
                        ? "vence hoy"
                        : distance === 1
                            ? "vence mañana"
                            : `vence en ${distance} días`;

                notifications.push({
                    key,
                    title:
                        `Pago de ${obligation.creditName || "crédito"}`,
                    body:
                        `${money(obligation.pendingAmount)} pendiente · ${when}`,
                    tag:
                        `credit-${obligation.creditId}-${obligation.dueDate}`
                });

            });

    }


    try {
        const pendingItems = await getPendingItems();
        if (pendingItems.length > 0) {
            const key = `pending-review:${localDateString()}`;
            if (!wasDeliveredToday(key)) {
                notifications.unshift({
                    key,
                    title: "Movimientos pendientes",
                    body: `${pendingItems.length} elemento${pendingItems.length === 1 ? "" : "s"} requieren revisión en Cauce.`,
                    tag: "cauce-pending-review",
                    url: "./?open=pending"
                });
            }
        }
    } catch (error) {
        console.warn("No se pudieron revisar los pendientes para notificaciones:", error);
    }

    /* Evitar una avalancha si el usuario tiene muchos movimientos cercanos. */
    const batch = notifications.slice(0, 6);

    for (const item of batch) {

        const shown =
            await showDeviceNotification(
                item.title,
                {
                    body: item.body,
                    tag: item.tag,
                    data: {
                        url: item.url || "./"
                    }
                }
            );

        if (shown) {
            markNotificationDelivered(
                item.key
            );
        }

    }

}

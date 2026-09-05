const CACHE_NAME = "cauce-v45";


const APP_FILES = [

    "./",
    "./index.html",

    "./manifest.webmanifest",

    "./css/styles.css",

    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",
    "./assets/branding/cauce-flowline-sora-reverse-accent.svg",

    "./js/app.js",
    "./js/state.js",
    "./js/database.js",
    "./js/repository.js",
    "./js/creditService.js",
    "./js/creditSetupService.js",
    "./js/creditProjection.js",
    "./js/creditPaymentFlow.js",
    "./js/pendingService.js",
    "./js/pendingUI.js",
    "./js/feedbackUI.js",
    "./js/creditPeriods.js",
    "./js/creditModelCalculations.js",
    "./js/ui.js",
    "./js/calendar.js",
    "./js/calculations.js",
    "./js/creditCalculations.js",
    "./js/scheduledCalculations.js",
    "./js/notifications.js"
    

];


/*
    =================================
    INSTALACIÓN
    =================================

    Guardar los archivos principales
    de la aplicación.
*/

self.addEventListener(
    "install",
    event => {

        self.skipWaiting();

        event.waitUntil(

            caches
                .open(
                    CACHE_NAME
                )
                .then(
                    cache =>
                        cache.addAll(
                            APP_FILES
                        )
                )

        );

    }
);


/*
    =================================
    ACTIVACIÓN
    =================================

    Eliminar cachés antiguas.
*/

self.addEventListener(
    "activate",
    event => {

        self.clients.claim();

        event.waitUntil(

            caches
                .keys()
                .then(
                    cacheNames =>

                        Promise.all(

                            cacheNames
                                .filter(
                                    cacheName =>
                                        cacheName !==
                                        CACHE_NAME
                                )
                                .map(
                                    cacheName =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        )

                )

        );

    }
);


/*
    =================================
    PETICIONES
    =================================

    Para navegación, JS, CSS y manifest intentamos primero la red.
    Esto evita mezclar una versión nueva del HTML con módulos antiguos
    que todavía existan en caché. Si no hay conexión, usamos el caché.

    Para imágenes y demás recursos estáticos usamos caché primero.
*/
self.addEventListener(
    "fetch",
    event => {
        if (event.request.method !== "GET") return;

        const url = new URL(event.request.url);
        const isAppCode =
            event.request.mode === "navigate" ||
            ["script", "style", "manifest"].includes(event.request.destination) ||
            url.pathname.endsWith(".js") ||
            url.pathname.endsWith(".css") ||
            url.pathname.endsWith(".webmanifest") ||
            url.pathname.endsWith(".html");

        if (isAppCode) {
            event.respondWith(
                fetch(event.request)
                    .then(response => {
                        const copy = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(event.request, copy))
                            .catch(() => {});
                        return response;
                    })
                    .catch(() => caches.match(event.request))
            );
            return;
        }

        event.respondWith(
            caches.match(event.request)
                .then(cached => cached || fetch(event.request))
        );
    }
);

/*
    =================================
    NOTIFICACIONES
    =================================

    Al pulsar una notificación, intentar
    enfocar la app existente. Si no hay
    ninguna ventana abierta, abrirla.
*/
self.addEventListener(
    "notificationclick",
    event => {

        event.notification.close();

        const targetUrl =
            event.notification.data?.url ||
            "./";

        event.waitUntil(
            clients
                .matchAll({
                    type: "window",
                    includeUncontrolled: true
                })
                .then(windowClients => {

                    for (const client of windowClients) {

                        if ("focus" in client) {
                            return client.focus();
                        }

                    }

                    if (clients.openWindow) {
                        return clients.openWindow(targetUrl);
                    }

                    return undefined;

                })
        );

    }
);

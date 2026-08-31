const CACHE_NAME = "control-gastos-v20";


const APP_FILES = [

    "./",
    "./index.html",

    "./manifest.webmanifest",

    "./css/styles.css",

    "./assets/icons/icon-192.png",
    "./assets/icons/icon-512.png",

    "./js/app.js",
    "./js/state.js",
    "./js/database.js",
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

    Intentamos utilizar primero
    los archivos guardados localmente.

    Si no existen en caché,
    acudimos a la red.
*/

self.addEventListener(
    "fetch",
    event => {

        if (
            event.request.method !==
            "GET"
        ) {

            return;

        }


        event.respondWith(

            caches
                .match(
                    event.request
                )
                .then(
                    cachedResponse => {

                        if (
                            cachedResponse
                        ) {

                            return cachedResponse;

                        }


                        return fetch(
                            event.request
                        );

                    }
                )

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

const CACHE_NAME =
    "control-gastos-v4";


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
    "./js/scheduledCalculations.js"
    

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
const DATABASE_NAME = "ControlGastosDB";
const DATABASE_VERSION = 2;

let database = null;


/*
    Inicializa la base de datos.

    Si la base de datos todavía no existe,
    IndexedDB ejecutará onupgradeneeded y
    creará las estructuras necesarias.
*/

export function initializeDatabase() {

    return new Promise((resolve, reject) => {

        const request =
            indexedDB.open(
                DATABASE_NAME,
                DATABASE_VERSION
            );


        /*
            Este evento solamente ocurre cuando:

            - La base de datos se crea por primera vez.
            - Aumentamos DATABASE_VERSION.
        */

        request.onupgradeneeded = (event) => {

            const database =
                event.target.result;


            /*
                CONFIGURACIÓN
            */

            if (!database.objectStoreNames.contains("settings")) {

                database.createObjectStore(
                    "settings",
                    {
                        keyPath: "id"
                    }
                );

            }


            /*
                MOVIMIENTOS
            */

            if (!database.objectStoreNames.contains("movements")) {

                const movementsStore =
                    database.createObjectStore(
                        "movements",
                        {
                            keyPath: "id",
                            autoIncrement: false
                        }
                    );


                movementsStore.createIndex(
                    "date",
                    "date",
                    {
                        unique: false
                    }
                );


                movementsStore.createIndex(
                    "type",
                    "type",
                    {
                        unique: false
                    }
                );


                movementsStore.createIndex(
                    "paymentMethod",
                    "paymentMethod",
                    {
                        unique: false
                    }
                );


                movementsStore.createIndex(
                    "creditId",
                    "creditId",
                    {
                        unique: false
                    }
                );

            }


            /*
                Crear almacén de créditos
                si todavía no existe.
            */

            if (
                !database.objectStoreNames.contains(
                    "credits"
                )
            ) {

                database.createObjectStore(
                    "credits",
                    {
                        keyPath: "id"
                    }
                );

            }


            /*
                REGLAS RECURRENTES
            */

            if (!database.objectStoreNames.contains("recurringRules")) {

                const recurringStore =
                    database.createObjectStore(
                        "recurringRules",
                        {
                            keyPath: "id"
                        }
                    );


                recurringStore.createIndex(
                    "startDate",
                    "startDate",
                    {
                        unique: false
                    }
                );


                recurringStore.createIndex(
                    "active",
                    "active",
                    {
                        unique: false
                    }
                );

            }


            /*
                CRÉDITOS
            */

            if (!database.objectStoreNames.contains("credits")) {

                const creditsStore =
                    database.createObjectStore(
                        "credits",
                        {
                            keyPath: "id"
                        }
                    );


                creditsStore.createIndex(
                    "name",
                    "name",
                    {
                        unique: false
                    }
                );


                creditsStore.createIndex(
                    "active",
                    "active",
                    {
                        unique: false
                    }
                );

            }


            /*
                AJUSTES DE CRÉDITO

                Aquí almacenaremos:

                - abonos
                - devoluciones
                - otros ajustes
            */

            if (!database.objectStoreNames.contains("creditAdjustments")) {

                const adjustmentsStore =
                    database.createObjectStore(
                        "creditAdjustments",
                        {
                            keyPath: "id"
                        }
                    );


                adjustmentsStore.createIndex(
                    "creditId",
                    "creditId",
                    {
                        unique: false
                    }
                );


                adjustmentsStore.createIndex(
                    "date",
                    "date",
                    {
                        unique: false
                    }
                );


                adjustmentsStore.createIndex(
                    "type",
                    "type",
                    {
                        unique: false
                    }
                );

            }

        };


        /*
            Base de datos abierta correctamente.
        */

        request.onsuccess = (event) => {

            const databaseInstance =
                event.target.result;

            database = databaseInstance;


            console.log(
                "Base de datos inicializada:",
                DATABASE_NAME
            );

            resolve(databaseInstance);

        };


        /*
            Error al abrir o crear la base de datos.
        */

        request.onerror = (event) => {

            console.error(
                "Error al inicializar la base de datos:",
                event.target.error
            );


            reject(event.target.error);

        };

    });

}

export function addRecord(
    storeName,
    record
) {

    return new Promise((resolve, reject) => {

        if (!database) {

            reject(
                new Error(
                    "La base de datos no está inicializada."
                )
            );

            return;

        }


        const transaction =
            database.transaction(
                storeName,
                "readwrite"
            );


        const store =
            transaction.objectStore(
                storeName
            );


        const request =
            store.add(record);


        request.onsuccess = () => {

            resolve(record);

        };


        request.onerror = () => {

            reject(
                request.error
            );

        };

    });

}

export function getRecord(
    storeName,
    id
) {

    return new Promise((resolve, reject) => {

        if (!database) {

            reject(
                new Error(
                    "La base de datos no está inicializada."
                )
            );

            return;

        }


        const transaction =
            database.transaction(
                storeName,
                "readonly"
            );


        const store =
            transaction.objectStore(
                storeName
            );


        const request =
            store.get(id);


        request.onsuccess = () => {

            resolve(request.result);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}

export function saveRecord(
    storeName,
    record
) {

    return new Promise((resolve, reject) => {

        if (!database) {

            reject(
                new Error(
                    "La base de datos no está inicializada."
                )
            );

            return;

        }


        const transaction =
            database.transaction(
                storeName,
                "readwrite"
            );


        const store =
            transaction.objectStore(
                storeName
            );


        /*
            put() crea el registro si no existe
            y lo reemplaza si ya existe.

            Esto será perfecto para settings.
        */

        const request =
            store.put(record);


        request.onsuccess = () => {

            resolve(record);

        };


        request.onerror = () => {

            reject(request.error);

        };

    });

}

export function getAllRecords(
    storeName
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                reject(
                    new Error(
                        "La base de datos no está inicializada."
                    )
                );

                return;

            }


            const transaction =
                database.transaction(
                    storeName,
                    "readonly"
                );


            const store =
                transaction.objectStore(
                    storeName
                );


            const request =
                store.getAll();


            request.onsuccess = () => {

                resolve(
                    request.result
                );

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}

export function deleteRecord(
    storeName,
    id
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                reject(
                    new Error(
                        "La base de datos no está inicializada."
                    )
                );

                return;

            }


            const transaction =
                database.transaction(
                    storeName,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    storeName
                );


            const request =
                store.delete(id);


            request.onsuccess = () => {

                resolve();

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}

export function clearStore(
    storeName
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                reject(
                    new Error(
                        "La base de datos no está inicializada."
                    )
                );

                return;

            }


            const transaction =
                database.transaction(
                    storeName,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    storeName
                );


            const request =
                store.clear();


            request.onsuccess = () => {

                resolve();

            };


            request.onerror = () => {

                reject(
                    request.error
                );

            };

        }
    );

}

export function replaceStoreRecords(
    storeName,
    records
) {

    return new Promise(
        (resolve, reject) => {

            if (!database) {

                reject(
                    new Error(
                        "La base de datos no está inicializada."
                    )
                );

                return;

            }


            if (
                !Array.isArray(records)
            ) {

                reject(
                    new Error(
                        "Los registros a restaurar no son válidos."
                    )
                );

                return;

            }


            const transaction =
                database.transaction(
                    storeName,
                    "readwrite"
                );


            const store =
                transaction.objectStore(
                    storeName
                );


            /*
                Primero eliminamos todos
                los registros existentes.
            */

            store.clear();


            /*
                Después restauramos
                los del respaldo.
            */

            records.forEach(
                record => {

                    store.put(
                        record
                    );

                }
            );


            transaction.oncomplete =
                () => {

                    resolve();

                };


            transaction.onerror =
                () => {

                    reject(
                        transaction.error
                    );

                };


            transaction.onabort =
                () => {

                    reject(
                        transaction.error ||
                        new Error(
                            "La restauración fue cancelada."
                        )
                    );

                };

        }
    );

}
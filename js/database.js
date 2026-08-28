const DATABASE_NAME = "ControlGastosDB";
const DATABASE_VERSION = 3;

let database = null;


const SYNC_SYSTEM_STORES = new Set([
    "syncMeta",
    "syncQueue"
]);


function generateSyncId(prefix) {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {

        return `${prefix}-${crypto.randomUUID()}`;

    }


    return (
        `${prefix}-` +
        Date.now() +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 11)
    );

}


function ensureSyncDeviceIdentity() {

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
                "syncMeta",
                "readwrite"
            );


        const store =
            transaction.objectStore(
                "syncMeta"
            );


        const request =
            store.get(
                "device"
            );


        request.onsuccess = () => {

            if (request.result) {

                resolve(
                    request.result
                );

                return;

            }


            const now =
                new Date()
                    .toISOString();


            const device = {
                id: "device",
                deviceId:
                    generateSyncId(
                        "device"
                    ),
                createdAt:
                    now,
                updatedAt:
                    now
            };


            const saveRequest =
                store.put(
                    device
                );


            saveRequest.onsuccess =
                () => resolve(device);


            saveRequest.onerror =
                () => reject(
                    saveRequest.error
                );

        };


        request.onerror =
            () => reject(
                request.error
            );

    });

}


function queueSyncMutation(
    operation,
    storeName,
    recordId = null,
    payload = null
) {

    if (
        !database ||
        SYNC_SYSTEM_STORES.has(
            storeName
        )
    ) {

        return;

    }


    try {

        const transaction =
            database.transaction(
                [
                    "syncMeta",
                    "syncQueue"
                ],
                "readwrite"
            );


        const metaStore =
            transaction.objectStore(
                "syncMeta"
            );


        const queueStore =
            transaction.objectStore(
                "syncQueue"
            );


        const deviceRequest =
            metaStore.get(
                "device"
            );


        deviceRequest.onsuccess = () => {

            const now =
                new Date()
                    .toISOString();


            const device =
                deviceRequest.result;


            queueStore.put({
                id:
                    generateSyncId(
                        "change"
                    ),
                deviceId:
                    device?.deviceId ||
                    "unknown-device",
                operation,
                storeName,
                recordId:
                    recordId ?? null,
                payload:
                    payload ?? null,
                changedAt:
                    now,
                status:
                    "pending"
            });


            metaStore.put({
                id:
                    "syncState",
                lastLocalChangeAt:
                    now,
                updatedAt:
                    now
            });

        };


        transaction.onerror = () => {

            console.warn(
                "No se pudo registrar un cambio para sincronización futura:",
                transaction.error
            );

        };

    } catch (error) {

        /*
            La cola es auxiliar. Nunca debe
            bloquear el guardado local principal.
        */

        console.warn(
            "No se pudo preparar el cambio para sincronización futura:",
            error
        );

    }

}


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


            /*
                BASE DE SINCRONIZACIÓN

                Estos almacenes todavía no envían
                información a ningún servidor.
                Sirven para registrar la identidad
                local del dispositivo y una cola de
                cambios preparada para una futura
                sincronización entre dispositivos.
            */

            if (!database.objectStoreNames.contains("syncMeta")) {

                database.createObjectStore(
                    "syncMeta",
                    {
                        keyPath: "id"
                    }
                );

            }


            if (!database.objectStoreNames.contains("syncQueue")) {

                const syncQueueStore =
                    database.createObjectStore(
                        "syncQueue",
                        {
                            keyPath: "id"
                        }
                    );


                syncQueueStore.createIndex(
                    "changedAt",
                    "changedAt",
                    {
                        unique: false
                    }
                );


                syncQueueStore.createIndex(
                    "storeName",
                    "storeName",
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


            ensureSyncDeviceIdentity()
                .then(
                    () => resolve(databaseInstance)
                )
                .catch(
                    error => {

                        /*
                            La sincronización futura no
                            debe impedir que la app local
                            funcione si su metadata falla.
                        */

                        console.warn(
                            "No se pudo preparar la metadata de sincronización:",
                            error
                        );

                        resolve(databaseInstance);

                    }
                );

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

            queueSyncMutation(
                "add",
                storeName,
                record?.id ?? null,
                record
            );

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

            queueSyncMutation(
                "put",
                storeName,
                record?.id ?? null,
                record
            );

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

                queueSyncMutation(
                    "delete",
                    storeName,
                    id
                );

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

                queueSyncMutation(
                    "clear",
                    storeName
                );

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

                    queueSyncMutation(
                        "replace",
                        storeName,
                        null,
                        records
                    );

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


export async function getSyncFoundationStatus() {

    if (!database) {

        throw new Error(
            "La base de datos no está inicializada."
        );

    }


    const [
        device,
        syncState,
        queue
    ] =
        await Promise.all([
            getRecord(
                "syncMeta",
                "device"
            ),
            getRecord(
                "syncMeta",
                "syncState"
            ),
            getAllRecords(
                "syncQueue"
            )
        ]);


    return {
        ready:
            Boolean(
                device?.deviceId
            ),
        deviceId:
            device?.deviceId || null,
        pendingChanges:
            queue.filter(
                item =>
                    item.status ===
                    "pending"
            ).length,
        lastLocalChangeAt:
            syncState?.lastLocalChangeAt ||
            null
    };

}


export async function clearSyncSystemData() {

    if (!database) {

        throw new Error(
            "La base de datos no está inicializada."
        );

    }


    await Promise.all([
        clearStore(
            "syncQueue"
        ),
        clearStore(
            "syncMeta"
        )
    ]);

}

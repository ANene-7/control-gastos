const DATABASE_NAME = "CauceDB_V3";
const DATABASE_VERSION = 1;

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


            const createStore = (
                name,
                indexes = []
            ) => {

                if (
                    database.objectStoreNames.contains(
                        name
                    )
                ) {

                    return null;

                }


                const store =
                    database.createObjectStore(
                        name,
                        {
                            keyPath: "id"
                        }
                    );


                indexes.forEach(
                    index =>
                        store.createIndex(
                            index.name,
                            index.keyPath,
                            {
                                unique:
                                    Boolean(
                                        index.unique
                                    )
                            }
                        )
                );


                return store;

            };


            /*
                =================================
                NÚCLEO LOCAL
                =================================

                V3 parte de una base limpia.
                Conservamos temporalmente algunos
                almacenes V2 mientras sus pantallas
                son sustituidas por la nueva lógica.
            */

            createStore(
                "settings"
            );


            createStore(
                "movements",
                [
                    { name: "date", keyPath: "date" },
                    { name: "type", keyPath: "type" },
                    { name: "paymentMethod", keyPath: "paymentMethod" },
                    { name: "creditId", keyPath: "creditId" },
                    { name: "status", keyPath: "status" }
                ]
            );


            createStore(
                "recurringRules",
                [
                    { name: "startDate", keyPath: "startDate" },
                    { name: "active", keyPath: "active" }
                ]
            );


            /*
                =================================
                MODELO DE CRÉDITOS V3
                =================================
            */

            createStore(
                "credits",
                [
                    { name: "name", keyPath: "name" },
                    { name: "type", keyPath: "type" },
                    { name: "active", keyPath: "active" }
                ]
            );


            createStore(
                "creditOperations",
                [
                    { name: "creditId", keyPath: "creditId" },
                    { name: "date", keyPath: "date" },
                    { name: "type", keyPath: "type" },
                    { name: "periodId", keyPath: "periodId" },
                    { name: "planId", keyPath: "planId" },
                    { name: "obligationId", keyPath: "obligationId" },
                    { name: "movementId", keyPath: "movementId" }
                ]
            );


            createStore(
                "creditPeriods",
                [
                    { name: "creditId", keyPath: "creditId" },
                    { name: "startDate", keyPath: "startDate" },
                    { name: "endDate", keyPath: "endDate" },
                    { name: "dueDate", keyPath: "dueDate" },
                    { name: "status", keyPath: "status" }
                ]
            );


            createStore(
                "creditObligations",
                [
                    { name: "creditId", keyPath: "creditId" },
                    { name: "periodId", keyPath: "periodId" },
                    { name: "scheduledPeriodId", keyPath: "scheduledPeriodId" },
                    { name: "dueDate", keyPath: "dueDate" },
                    { name: "status", keyPath: "status" }
                ]
            );


            createStore(
                "creditPlans",
                [
                    { name: "creditId", keyPath: "creditId" },
                    { name: "sourceType", keyPath: "sourceType" },
                    { name: "sourceOperationId", keyPath: "sourceOperationId" },
                    { name: "status", keyPath: "status" }
                ]
            );


            /*
                Compatibilidad temporal con V2.
                Se retirará cuando el flujo de créditos
                antiguo deje de utilizarlo.
            */

            createStore(
                "creditAdjustments",
                [
                    { name: "creditId", keyPath: "creditId" },
                    { name: "date", keyPath: "date" },
                    { name: "type", keyPath: "type" }
                ]
            );


            /*
                =================================
                BASE DE SINCRONIZACIÓN
                =================================
            */

            createStore(
                "syncMeta"
            );


            createStore(
                "syncQueue",
                [
                    { name: "changedAt", keyPath: "changedAt" },
                    { name: "storeName", keyPath: "storeName" },
                    { name: "status", keyPath: "status" }
                ]
            );

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

/*
    Ejecuta varias escrituras como una sola transacción.

    Es la base para operaciones V3 que deben permanecer
    consistentes entre varios almacenes, por ejemplo:

    - movimiento de salida
    - operación de crédito
    - actualización de obligación

    Si una escritura falla, IndexedDB aborta toda la
    transacción y no queda un estado financiero a medias.
*/
export function writeRecordsAtomically(
    operations
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

        if (
            !Array.isArray(operations) ||
            operations.length === 0
        ) {
            resolve([]);
            return;
        }

        const storeNames = [
            ...new Set(
                operations.map(
                    operation =>
                        operation.storeName
                )
            )
        ];

        const transaction =
            database.transaction(
                storeNames,
                "readwrite"
            );

        const syncMutations = [];

        try {

            operations.forEach(
                operation => {

                    const store =
                        transaction.objectStore(
                            operation.storeName
                        );

                    switch (operation.type) {

                        case "add":
                            store.add(
                                operation.record
                            );
                            syncMutations.push({
                                operation: "add",
                                storeName: operation.storeName,
                                recordId:
                                    operation.record?.id ?? null,
                                payload:
                                    operation.record ?? null
                            });
                            break;

                        case "put":
                            store.put(
                                operation.record
                            );
                            syncMutations.push({
                                operation: "put",
                                storeName: operation.storeName,
                                recordId:
                                    operation.record?.id ?? null,
                                payload:
                                    operation.record ?? null
                            });
                            break;

                        case "delete":
                            store.delete(
                                operation.id
                            );
                            syncMutations.push({
                                operation: "delete",
                                storeName: operation.storeName,
                                recordId:
                                    operation.id ?? null,
                                payload: null
                            });
                            break;

                        default:
                            throw new Error(
                                `Operación atómica no soportada: ${operation.type}`
                            );

                    }

                }
            );

        } catch (error) {

            transaction.abort();
            reject(error);
            return;

        }

        transaction.oncomplete = () => {

            syncMutations.forEach(
                mutation =>
                    queueSyncMutation(
                        mutation.operation,
                        mutation.storeName,
                        mutation.recordId,
                        mutation.payload
                    )
            );

            resolve(
                operations.map(
                    operation =>
                        operation.record ?? null
                )
            );

        };

        transaction.onerror = () => {
            reject(
                transaction.error
            );
        };

        transaction.onabort = () => {
            reject(
                transaction.error ||
                new Error(
                    "La transacción fue cancelada."
                )
            );
        };

    });

}

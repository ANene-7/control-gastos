import {
    addRecord,
    getRecord,
    saveRecord,
    getAllRecords,
    deleteRecord,
    writeRecordsAtomically
} from "./database.js";


export const STORES = Object.freeze({
    settings: "settings",
    movements: "movements",
    recurringRules: "recurringRules",

    credits: "credits",
    creditOperations: "creditOperations",
    creditPeriods: "creditPeriods",
    creditObligations: "creditObligations",
    creditPlans: "creditPlans",

    // Temporal mientras desaparece el flujo V2.
    creditAdjustments: "creditAdjustments",

    syncMeta: "syncMeta",
    syncQueue: "syncQueue"
});


export function createId() {

    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        "-" +
        Math.random()
            .toString(36)
            .substring(2, 12)
    );

}


export function createEntity(
    data = {},
    now = new Date().toISOString()
) {

    return {
        ...data,
        id:
            data.id ||
            createId(),
        createdAt:
            data.createdAt ||
            now,
        updatedAt:
            now,
        revision:
            Number.isFinite(data.revision)
                ? data.revision
                : 1
    };

}


export function updateEntity(
    current,
    changes = {},
    now = new Date().toISOString()
) {

    if (!current?.id) {
        throw new Error(
            "No se puede actualizar una entidad sin id."
        );
    }

    return {
        ...current,
        ...changes,
        id: current.id,
        createdAt:
            current.createdAt ||
            now,
        updatedAt:
            now,
        revision:
            (Number(current.revision) || 1) + 1
    };

}


export function add(
    storeName,
    record
) {
    return addRecord(
        storeName,
        record
    );
}


export function getById(
    storeName,
    id
) {
    return getRecord(
        storeName,
        id
    );
}


export function save(
    storeName,
    record
) {
    return saveRecord(
        storeName,
        record
    );
}


export function getAll(
    storeName
) {
    return getAllRecords(
        storeName
    );
}


export function remove(
    storeName,
    id
) {
    return deleteRecord(
        storeName,
        id
    );
}


export function commit(
    operations
) {
    return writeRecordsAtomically(
        operations
    );
}


export const creditRepository = Object.freeze({

    getCredits() {
        return getAll(
            STORES.credits
        );
    },

    getCredit(id) {
        return getById(
            STORES.credits,
            id
        );
    },

    saveCredit(record) {
        return save(
            STORES.credits,
            record
        );
    },

    getOperations() {
        return getAll(
            STORES.creditOperations
        );
    },

    saveOperation(record) {
        return save(
            STORES.creditOperations,
            record
        );
    },

    getPeriods() {
        return getAll(
            STORES.creditPeriods
        );
    },

    savePeriod(record) {
        return save(
            STORES.creditPeriods,
            record
        );
    },

    getObligations() {
        return getAll(
            STORES.creditObligations
        );
    },

    saveObligation(record) {
        return save(
            STORES.creditObligations,
            record
        );
    },

    getPlans() {
        return getAll(
            STORES.creditPlans
        );
    },

    savePlan(record) {
        return save(
            STORES.creditPlans,
            record
        );
    }

});

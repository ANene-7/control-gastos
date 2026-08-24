let database = null;

let settings = null;


export function initializeApp(
    databaseInstance,
    settingsData = null
) {

    database = databaseInstance;

    settings = settingsData;


    console.log(
        "Aplicación inicializada correctamente."
    );

}


export function getDatabase() {

    return database;

}


export function getSettings() {

    return settings;

}


export function setSettings(
    settingsData
) {

    settings = settingsData;

}
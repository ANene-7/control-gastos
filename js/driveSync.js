/*
    Cauce · sincronización manual con Google Drive

    No usa servidor propio. El navegador solicita un token OAuth mediante
    Google Identity Services y Cauce guarda un único JSON en appDataFolder,
    un espacio privado de Drive accesible sólo para esta aplicación.
*/

const DRIVE_SCOPE =
    "https://www.googleapis.com/auth/drive.appdata";

const SYNC_FILE_NAME =
    "cauce-sync.json";

let tokenClient =
    null;

let accessToken =
    null;

let activeClientId =
    null;

let gisPromise =
    null;


function parseGoogleError(payload, fallback) {

    return (
        payload?.error?.message ||
        payload?.error_description ||
        payload?.error ||
        fallback
    );

}


async function readJsonResponse(response, fallbackMessage) {

    let payload = null;

    try {
        payload = await response.json();
    } catch {
        // Google puede devolver una respuesta vacía en algunos errores.
    }

    if (!response.ok) {
        const error = new Error(
            parseGoogleError(
                payload,
                `${fallbackMessage} (${response.status})`
            )
        );

        error.status =
            response.status;

        throw error;
    }

    return payload;

}


export function loadGoogleIdentityServices() {

    if (window.google?.accounts?.oauth2) {
        return Promise.resolve();
    }

    if (gisPromise) {
        return gisPromise;
    }

    gisPromise =
        new Promise(
            (resolve, reject) => {

                const existing =
                    document.querySelector(
                        'script[data-cauce-google-identity="true"]'
                    );

                if (existing) {

                    existing.addEventListener(
                        "load",
                        () => resolve(),
                        { once: true }
                    );

                    existing.addEventListener(
                        "error",
                        () => reject(
                            new Error(
                                "No se pudo cargar Google Identity Services."
                            )
                        ),
                        { once: true }
                    );

                    return;
                }

                const script =
                    document.createElement(
                        "script"
                    );

                script.src =
                    "https://accounts.google.com/gsi/client";

                script.async =
                    true;

                script.defer =
                    true;

                script.dataset.cauceGoogleIdentity =
                    "true";

                script.onload =
                    () => resolve();

                script.onerror =
                    () => reject(
                        new Error(
                            "No se pudo cargar Google Identity Services. Revisa tu conexión."
                        )
                    );

                document.head.appendChild(
                    script
                );

            }
        );

    return gisPromise;

}


async function ensureTokenClient(clientId) {

    const normalizedClientId =
        String(clientId || "")
            .trim();

    if (!normalizedClientId) {
        throw new Error(
            "Configura primero el Client ID de Google."
        );
    }

    await loadGoogleIdentityServices();

    if (
        tokenClient &&
        activeClientId === normalizedClientId
    ) {
        return tokenClient;
    }

    tokenClient =
        window.google.accounts.oauth2.initTokenClient({
            client_id:
                normalizedClientId,

            scope:
                DRIVE_SCOPE,

            callback:
                () => {}
        });

    activeClientId =
        normalizedClientId;

    accessToken =
        null;

    return tokenClient;

}


export async function requestDriveAccess(
    clientId,
    {
        forceConsent = false
    } = {}
) {

    const client =
        await ensureTokenClient(
            clientId
        );

    return new Promise(
        (resolve, reject) => {

            client.callback =
                response => {

                    if (response?.error) {

                        reject(
                            new Error(
                                parseGoogleError(
                                    response,
                                    "Google no autorizó el acceso a Drive."
                                )
                            )
                        );

                        return;
                    }

                    if (!response?.access_token) {

                        reject(
                            new Error(
                                "Google no devolvió un token de acceso."
                            )
                        );

                        return;
                    }

                    accessToken =
                        response.access_token;

                    resolve(
                        accessToken
                    );

                };


            client.requestAccessToken({
                prompt:
                    forceConsent
                        ? "consent"
                        : ""
            });

        }
    );

}


export function clearDriveAccess() {

    if (
        accessToken &&
        window.google?.accounts?.oauth2?.revoke
    ) {

        try {
            window.google.accounts.oauth2.revoke(
                accessToken,
                () => {}
            );
        } catch {
            // Cerrar la sesión local no debe romper la UI.
        }

    }

    accessToken =
        null;

}


async function authorizedFetch(
    url,
    options = {}
) {

    if (!accessToken) {
        throw new Error(
            "Autoriza primero el acceso a Google Drive."
        );
    }

    const headers =
        new Headers(
            options.headers ||
            {}
        );

    headers.set(
        "Authorization",
        `Bearer ${accessToken}`
    );

    const response =
        await fetch(
            url,
            {
                ...options,
                headers
            }
        );

    if (response.status === 401) {
        accessToken = null;

        throw new Error(
            "La autorización de Google expiró. Vuelve a conectar Drive."
        );
    }

    return response;

}


export async function findDriveSyncFile() {

    const params =
        new URLSearchParams({
            spaces:
                "appDataFolder",

            q:
                `name='${SYNC_FILE_NAME}' and trashed=false and 'appDataFolder' in parents`,

            fields:
                "files(id,name,modifiedTime,size,createdTime)",

            pageSize:
                "10"
        });


    const response =
        await authorizedFetch(
            `https://www.googleapis.com/drive/v3/files?${params.toString()}`
        );


    const payload =
        await readJsonResponse(
            response,
            "No se pudo consultar el respaldo de Cauce en Drive"
        );


    const files =
        Array.isArray(payload?.files)
            ? payload.files
            : [];


    files.sort(
        (a, b) =>
            String(b.modifiedTime || "")
                .localeCompare(
                    String(a.modifiedTime || "")
                )
    );


    return files[0] || null;

}


async function createDriveSyncFile(
    jsonText
) {

    const metadata = {
        name:
            SYNC_FILE_NAME,

        parents:
            ["appDataFolder"],

        mimeType:
            "application/json",

        appProperties: {
            app:
                "Cauce",

            purpose:
                "manual-sync"
        }
    };


    const boundary =
        `cauce_${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const body =
        new Blob(
            [
                `--${boundary}\r\n`,
                "Content-Type: application/json; charset=UTF-8\r\n\r\n",
                JSON.stringify(metadata),
                `\r\n--${boundary}\r\n`,
                "Content-Type: application/json; charset=UTF-8\r\n\r\n",
                jsonText,
                `\r\n--${boundary}--`
            ],
            {
                type:
                    `multipart/related; boundary=${boundary}`
            }
        );


    const response =
        await authorizedFetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        `multipart/related; boundary=${boundary}`
                },

                body
            }
        );


    return readJsonResponse(
        response,
        "No se pudo crear el respaldo de Cauce en Drive"
    );

}


async function updateDriveSyncFile(
    fileId,
    jsonText
) {

    const response =
        await authorizedFetch(
            `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media`,
            {
                method:
                    "PATCH",

                headers: {
                    "Content-Type":
                        "application/json; charset=UTF-8"
                },

                body:
                    jsonText
            }
        );


    await readJsonResponse(
        response,
        "No se pudo actualizar el respaldo de Cauce en Drive"
    );


    return getDriveFileMetadata(
        fileId
    );

}


export async function uploadDriveBackup(
    backup
) {

    const jsonText =
        JSON.stringify(
            backup,
            null,
            2
        );


    const existing =
        await findDriveSyncFile();


    if (existing) {
        return updateDriveSyncFile(
            existing.id,
            jsonText
        );
    }


    return createDriveSyncFile(
        jsonText
    );

}


export async function getDriveFileMetadata(
    fileId
) {

    const params =
        new URLSearchParams({
            fields:
                "id,name,modifiedTime,size,createdTime"
        });


    const response =
        await authorizedFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`
        );


    return readJsonResponse(
        response,
        "No se pudo consultar el respaldo de Cauce en Drive"
    );

}


export async function downloadDriveBackup() {

    const file =
        await findDriveSyncFile();


    if (!file) {
        throw new Error(
            "Todavía no existe un respaldo de Cauce en Google Drive."
        );
    }


    const response =
        await authorizedFetch(
            `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`
        );


    if (!response.ok) {

        let payload = null;

        try {
            payload =
                await response.json();
        } catch {
            // Nada.
        }

        throw new Error(
            parseGoogleError(
                payload,
                "No se pudo descargar el respaldo de Cauce desde Drive."
            )
        );
    }


    const text =
        await response.text();


    let backup;

    try {
        backup =
            JSON.parse(
                text
            );
    } catch {
        throw new Error(
            "El archivo guardado en Drive no contiene un respaldo JSON válido."
        );
    }


    return {
        file,
        backup
    };

}


export function hasDriveAccessToken() {

    return Boolean(
        accessToken
    );

}


export const driveSyncConfig = {
    scope:
        DRIVE_SCOPE,
    fileName:
        SYNC_FILE_NAME
};

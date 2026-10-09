// GÉNÉRÉ par `npm run gen:api` depuis api/openapi.json — ne pas éditer à la main.

export interface paths {
    "/api/v1/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Health */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** HealthRead */
        HealthRead: {
            /** Backupdirok */
            backupDirOk: boolean;
            /** Dbpath */
            dbPath: string | null;
            /** Isdevdb */
            isDevDb: boolean;
            /** Lastbackupat */
            lastBackupAt: string | null;
            /** Ok */
            ok: boolean;
            /** Schemarevision */
            schemaRevision: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthRead"];
                };
            };
        };
    };
}

// GÉNÉRÉ par `npm run gen:api` depuis api/openapi.json — ne pas éditer à la main.

export interface paths {
    "/api/v1/clients": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Clients */
        get: operations["listClients"];
        put?: never;
        /** Create Client */
        post: operations["createClient"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/{client_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Client */
        get: operations["getClient"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Client */
        patch: operations["updateClient"];
        trace?: never;
    };
    "/api/v1/clients/{client_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Client */
        post: operations["archiveClient"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/clients/{client_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Client */
        post: operations["unarchiveClient"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
        /** ClientCreate */
        ClientCreate: {
            /** Addressline1 */
            addressLine1?: string | null;
            /** Addressline2 */
            addressLine2?: string | null;
            /** City */
            city?: string | null;
            /** Contactname */
            contactName?: string | null;
            /**
             * Countrycode
             * @default FR
             */
            countryCode: string;
            /** Email */
            email?: string | null;
            /**
             * Kind
             * @default individual
             * @enum {string}
             */
            kind: "individual" | "company";
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Postalcode */
            postalCode?: string | null;
            /** Siren */
            siren?: string | null;
        };
        /** ClientRead */
        ClientRead: {
            /** Addressline1 */
            addressLine1: string | null;
            /** Addressline2 */
            addressLine2: string | null;
            /** Archivedat */
            archivedAt: string | null;
            /** City */
            city: string | null;
            /** Contactname */
            contactName: string | null;
            /** Countrycode */
            countryCode: string;
            /** Createdat */
            createdAt: string;
            /** Email */
            email: string | null;
            /** Id */
            id: number;
            /**
             * Kind
             * @enum {string}
             */
            kind: "individual" | "company";
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Phone */
            phone: string | null;
            /** Postalcode */
            postalCode: string | null;
            /** Siren */
            siren: string | null;
            /** Updatedat */
            updatedAt: string;
        };
        /**
         * ClientUpdate
         * @description Absent = unchanged; explicit null = cleared (nullable fields only).
         */
        ClientUpdate: {
            /** Addressline1 */
            addressLine1?: string | null;
            /** Addressline2 */
            addressLine2?: string | null;
            /** City */
            city?: string | null;
            /** Contactname */
            contactName?: string | null;
            /** Countrycode */
            countryCode?: string | null;
            /** Email */
            email?: string | null;
            /** Kind */
            kind?: ("individual" | "company") | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Postalcode */
            postalCode?: string | null;
            /** Siren */
            siren?: string | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
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
        /** ValidationError */
        ValidationError: {
            /** Context */
            ctx?: Record<string, never>;
            /** Input */
            input?: unknown;
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
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
    listClients: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
            };
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
                    "application/json": components["schemas"]["ClientRead"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    createClient: {
        parameters: {
            query?: {
                force?: boolean;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    getClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                client_id: number;
            };
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
                    "application/json": components["schemas"]["ClientRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    updateClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                client_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ClientUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ClientRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    archiveClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                client_id: number;
            };
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
                    "application/json": components["schemas"]["ClientRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    unarchiveClient: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                client_id: number;
            };
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
                    "application/json": components["schemas"]["ClientRead"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
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

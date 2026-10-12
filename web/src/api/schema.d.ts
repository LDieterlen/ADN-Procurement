// GÉNÉRÉ par `npm run gen:api` depuis api/openapi.json — ne pas éditer à la main.

export interface paths {
    "/api/v1/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Categories */
        get: operations["listCategories"];
        put?: never;
        /** Create Category */
        post: operations["createCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories/{category_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Category */
        get: operations["getCategory"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Category */
        patch: operations["updateCategory"];
        trace?: never;
    };
    "/api/v1/categories/{category_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Category */
        post: operations["archiveCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/categories/{category_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Category */
        post: operations["unarchiveCategory"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
    "/api/v1/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload File
         * @description 201 when the bytes are new, 200 when the same sha256 already exists (same body).
         */
        post: operations["uploadFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/files/{file_id}/content": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get File Content */
        get: operations["getFileContent"];
        put?: never;
        post?: never;
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
    "/api/v1/locations/{location_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Location */
        get: operations["getLocation"];
        put?: never;
        post?: never;
        /** Delete Location */
        delete: operations["deleteLocation"];
        options?: never;
        head?: never;
        /** Update Location */
        patch: operations["updateLocation"];
        trace?: never;
    };
    "/api/v1/locations/{location_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Location */
        post: operations["archiveLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/locations/{location_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Location */
        post: operations["unarchiveLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/manufacturers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Manufacturers */
        get: operations["listManufacturers"];
        put?: never;
        /** Create Manufacturer */
        post: operations["createManufacturer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/manufacturers/{manufacturer_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Manufacturer */
        get: operations["getManufacturer"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Manufacturer */
        patch: operations["updateManufacturer"];
        trace?: never;
    };
    "/api/v1/manufacturers/{manufacturer_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Manufacturer */
        post: operations["archiveManufacturer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/manufacturers/{manufacturer_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Manufacturer */
        post: operations["unarchiveManufacturer"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/placements/{placement_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Placement */
        delete: operations["deletePlacement"];
        options?: never;
        head?: never;
        /** Update Placement */
        patch: operations["updatePlacement"];
        trace?: never;
    };
    "/api/v1/products": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Products */
        get: operations["listProducts"];
        put?: never;
        /** Create Product */
        post: operations["createProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/products/{product_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Product */
        get: operations["getProduct"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Product */
        patch: operations["updateProduct"];
        trace?: never;
    };
    "/api/v1/products/{product_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Product */
        post: operations["archiveProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/products/{product_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Attach Product File */
        post: operations["attachProductFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/products/{product_id}/files/{file_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Detach Product File */
        delete: operations["detachProductFile"];
        options?: never;
        head?: never;
        /** Update Product File */
        patch: operations["updateProductFile"];
        trace?: never;
    };
    "/api/v1/products/{product_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Product */
        post: operations["unarchiveProduct"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Item */
        get: operations["getProjectItem"];
        put?: never;
        post?: never;
        /** Delete Item */
        delete: operations["deleteProjectItem"];
        options?: never;
        head?: never;
        /** Update Item */
        patch: operations["updateProjectItem"];
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Events */
        get: operations["listProjectItemEvents"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Attach File */
        post: operations["attachProjectItemFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/files/{file_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Detach File */
        delete: operations["detachProjectItemFile"];
        options?: never;
        head?: never;
        /** Update File */
        patch: operations["updateProjectItemFile"];
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/placements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add Placement */
        post: operations["addPlacement"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change Status */
        post: operations["changeProjectItemStatus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Projects */
        get: operations["listProjects"];
        put?: never;
        /** Create Project */
        post: operations["createProject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project */
        get: operations["getProject"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Project */
        patch: operations["updateProject"];
        trace?: never;
    };
    "/api/v1/projects/{project_id}/budget-lines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Budget Lines */
        get: operations["listBudgetLines"];
        /** Put Budget Lines */
        put: operations["putBudgetLines"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/exports": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Exports */
        get: operations["listProjectExports"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/exports/list.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export List */
        get: operations["exportList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/exports/sheets.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Sheets */
        get: operations["exportSheets"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/locations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Locations */
        get: operations["listLocations"];
        put?: never;
        /** Create Location */
        post: operations["createLocation"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/locations/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reorder Locations */
        post: operations["reorderLocations"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/project-items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Items */
        get: operations["listProjectItems"];
        put?: never;
        /** Create Item */
        post: operations["createProjectItem"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change Project Status */
        post: operations["changeProjectStatus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Summary */
        get: operations["getProjectSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/settings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Settings */
        get: operations["getSettings"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Settings */
        patch: operations["updateSettings"];
        trace?: never;
    };
    "/api/v1/suppliers": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Suppliers */
        get: operations["listSuppliers"];
        put?: never;
        /** Create Supplier */
        post: operations["createSupplier"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/suppliers/{supplier_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Supplier */
        get: operations["getSupplier"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Supplier */
        patch: operations["updateSupplier"];
        trace?: never;
    };
    "/api/v1/suppliers/{supplier_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Supplier */
        post: operations["archiveSupplier"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/suppliers/{supplier_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Supplier */
        post: operations["unarchiveSupplier"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/backup": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create Backup */
        post: operations["createBackup"];
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
        /** BackupRead */
        BackupRead: {
            /** At */
            at: string;
            /** Copiedto */
            copiedTo: string | null;
            /** Copyerror */
            copyError: string | null;
            /** Path */
            path: string;
            /** Quickcheck */
            quickCheck: string;
        };
        /** Body_uploadFile */
        Body_uploadFile: {
            /** File */
            file: string;
        };
        /** BudgetLineIn */
        BudgetLineIn: {
            /** Amountcents */
            amountCents: number;
            /** Family */
            family?: string | null;
            /** Locationid */
            locationId?: number | null;
            /** Notes */
            notes?: string | null;
            /**
             * Scope
             * @enum {string}
             */
            scope: "global" | "location" | "zone" | "family" | "supplier";
            /** Supplierid */
            supplierId?: number | null;
            /** Zone */
            zone?: string | null;
        };
        /** BudgetLineRead */
        BudgetLineRead: {
            /** Amountcents */
            amountCents: number;
            /** Createdat */
            createdAt: string;
            /** Family */
            family: string | null;
            /** Id */
            id: number;
            /** Locationid */
            locationId: number | null;
            /** Notes */
            notes: string | null;
            /** Projectid */
            projectId: number;
            /**
             * Scope
             * @enum {string}
             */
            scope: "global" | "location" | "zone" | "family" | "supplier";
            /** Supplierid */
            supplierId: number | null;
            /** Updatedat */
            updatedAt: string;
            /** Zone */
            zone: string | null;
        };
        /** BudgetLinesPut */
        BudgetLinesPut: {
            /** Lines */
            lines: components["schemas"]["BudgetLineIn"][];
        };
        /** CategoryCreate */
        CategoryCreate: {
            /** Code */
            code: string;
            /** Name */
            name: string;
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
        };
        /** CategoryRead */
        CategoryRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /**
         * CategoryUpdate
         * @description Name and order only: the code is immutable (item codes depend on it).
         */
        CategoryUpdate: {
            /** Name */
            name?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
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
        /** EventRead */
        EventRead: {
            /** Changedat */
            changedAt: string;
            /** Fromstatus */
            fromStatus: string | null;
            /** Id */
            id: number;
            /** Kind */
            kind: string;
            /** Newvalue */
            newValue: string | null;
            /** Note */
            note: string | null;
            /** Oldvalue */
            oldValue: string | null;
            /** Projectitemid */
            projectItemId: number;
            /** Tostatus */
            toStatus: string | null;
        };
        /** FileRead */
        FileRead: {
            /** Createdat */
            createdAt: string;
            /** Ext */
            ext: string;
            /** Id */
            id: number;
            /** Licensenote */
            licenseNote?: string | null;
            /** Mimetype */
            mimeType: string;
            /** Originalname */
            originalName: string;
            /** Sha256 */
            sha256: string;
            /** Sizebytes */
            sizeBytes: number;
            /** Sourceurl */
            sourceUrl: string | null;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HealthRead */
        HealthRead: {
            /** Backupdir */
            backupDir: string;
            /** Backupdirok */
            backupDirOk: boolean;
            /** Dbpath */
            dbPath: string | null;
            /** Isdevdb */
            isDevDb: boolean;
            /** Lastbackupat */
            lastBackupAt: string | null;
            /** Lastquickcheck */
            lastQuickCheck: string | null;
            /** Logpath */
            logPath: string | null;
            /** Ok */
            ok: boolean;
            /** Schemarevision */
            schemaRevision: string | null;
        };
        /** ItemFileAttach */
        ItemFileAttach: {
            /** Caption */
            caption?: string | null;
            /** Fileid */
            fileId: number;
            /**
             * Isprimary
             * @default false
             */
            isPrimary: boolean;
            /**
             * Kind
             * @default image
             * @enum {string}
             */
            kind: "image" | "drawing" | "other";
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
        };
        /** ItemFileRead */
        ItemFileRead: {
            /** Caption */
            caption: string | null;
            /** Ext */
            ext: string;
            /** Fileid */
            fileId: number;
            /** Isprimary */
            isPrimary: boolean;
            /**
             * Kind
             * @enum {string}
             */
            kind: "image" | "drawing" | "other";
            /** Mimetype */
            mimeType: string;
            /** Originalname */
            originalName: string;
            /** Sha256 */
            sha256: string;
            /** Sizebytes */
            sizeBytes: number;
            /** Sortorder */
            sortOrder: number;
        };
        /** ItemFileUpdate */
        ItemFileUpdate: {
            /** Caption */
            caption?: string | null;
            /** Isprimary */
            isPrimary?: boolean | null;
            /** Kind */
            kind?: ("image" | "drawing" | "other") | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /**
         * LineAmountsRead
         * @description Amounts of one article, computed by `money.py`, never stored.
         */
        LineAmountsRead: {
            /** Counted */
            counted: boolean;
            /** Itemcode */
            itemCode: string;
            /** Kind */
            kind: string;
            /** Netunitcents */
            netUnitCents: number;
            /** Netuniteurcents */
            netUnitEurCents: number;
            /** Placements */
            placements: components["schemas"]["PlacementAmountRead"][];
            /** Projectitemid */
            projectItemId: number;
            /** Status */
            status: string;
            /** Totalhtcents */
            totalHtCents: number;
            /** Totalqtymilli */
            totalQtyMilli: number;
        };
        /** LocationCreate */
        LocationCreate: {
            /** Code */
            code: string;
            /** Level */
            level?: string | null;
            /**
             * Multiplier
             * @default 1
             */
            multiplier: number;
            /** Name */
            name: string;
            /** Sortorder */
            sortOrder?: number | null;
            /** Zone */
            zone?: string | null;
        };
        /** LocationRead */
        LocationRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Level */
            level: string | null;
            /** Multiplier */
            multiplier: number;
            /** Name */
            name: string;
            /** Projectid */
            projectId: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
            /** Zone */
            zone: string | null;
        };
        /** LocationReorder */
        LocationReorder: {
            /** Locationids */
            locationIds: number[];
        };
        /** LocationUpdate */
        LocationUpdate: {
            /** Code */
            code?: string | null;
            /** Level */
            level?: string | null;
            /** Multiplier */
            multiplier?: number | null;
            /** Name */
            name?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
            /** Zone */
            zone?: string | null;
        };
        /** ManufacturerCreate */
        ManufacturerCreate: {
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Website */
            website?: string | null;
        };
        /** ManufacturerRead */
        ManufacturerRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Updatedat */
            updatedAt: string;
            /** Website */
            website: string | null;
        };
        /** ManufacturerUpdate */
        ManufacturerUpdate: {
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Website */
            website?: string | null;
        };
        /** Page[ManufacturerRead] */
        Page_ManufacturerRead_: {
            /** Items */
            items: components["schemas"]["ManufacturerRead"][];
            /** Total */
            total: number;
        };
        /** Page[ProductRead] */
        Page_ProductRead_: {
            /** Items */
            items: components["schemas"]["ProductRead"][];
            /** Total */
            total: number;
        };
        /** Page[SupplierRead] */
        Page_SupplierRead_: {
            /** Items */
            items: components["schemas"]["SupplierRead"][];
            /** Total */
            total: number;
        };
        /**
         * PlacementAmountRead
         * @description EUR share of one placement (quantity × multiplier at the net unit price).
         */
        PlacementAmountRead: {
            /** Placementid */
            placementId: number;
            /** Totalhtcents */
            totalHtCents: number;
        };
        /** PlacementCreate */
        PlacementCreate: {
            /** Locationid */
            locationId?: number | null;
            /**
             * Qtymilli
             * @default 1000
             */
            qtyMilli: number;
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
        };
        /** PlacementRead */
        PlacementRead: {
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Locationid */
            locationId: number | null;
            /** Projectitemid */
            projectItemId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /** PlacementUpdate */
        PlacementUpdate: {
            /** Locationid */
            locationId?: number | null;
            /** Qtymilli */
            qtyMilli?: number | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ProductCreate */
        ProductCreate: {
            /** Categoryid */
            categoryId: number;
            /**
             * Currency
             * @default EUR
             */
            currency: string;
            /** Dimensions */
            dimensions?: string | null;
            /** Finish */
            finish?: string | null;
            /** Listpricecents */
            listPriceCents?: number | null;
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Reference */
            reference?: string | null;
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
        };
        /** ProductFileAttach */
        ProductFileAttach: {
            /** Caption */
            caption?: string | null;
            /** Fileid */
            fileId: number;
            /**
             * Isprimary
             * @default false
             */
            isPrimary: boolean;
            /**
             * Kind
             * @default image
             * @enum {string}
             */
            kind: "image" | "datasheet" | "drawing" | "other";
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
        };
        /** ProductFileRead */
        ProductFileRead: {
            /** Caption */
            caption: string | null;
            /** Ext */
            ext: string;
            /** Fileid */
            fileId: number;
            /** Isprimary */
            isPrimary: boolean;
            /**
             * Kind
             * @enum {string}
             */
            kind: "image" | "datasheet" | "drawing" | "other";
            /** Licensenote */
            licenseNote?: string | null;
            /** Mimetype */
            mimeType: string;
            /** Originalname */
            originalName: string;
            /** Sha256 */
            sha256: string;
            /** Sizebytes */
            sizeBytes: number;
            /** Sortorder */
            sortOrder: number;
        };
        /** ProductFileUpdate */
        ProductFileUpdate: {
            /** Caption */
            caption?: string | null;
            /** Isprimary */
            isPrimary?: boolean | null;
            /** Kind */
            kind?: ("image" | "datasheet" | "drawing" | "other") | null;
            /** Licensenote */
            licenseNote?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ProductRead */
        ProductRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Categoryid */
            categoryId: number;
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Dimensions */
            dimensions: string | null;
            /** Files */
            files: components["schemas"]["ProductFileRead"][];
            /** Finish */
            finish: string | null;
            /** Id */
            id: number;
            /** Listpricecents */
            listPriceCents: number | null;
            /** Manufacturerid */
            manufacturerId: number | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Reference */
            reference: string | null;
            /** Sourceurl */
            sourceUrl: string | null;
            /** Supplierid */
            supplierId: number | null;
            /** Updatedat */
            updatedAt: string;
        };
        /** ProductUpdate */
        ProductUpdate: {
            /** Categoryid */
            categoryId?: number | null;
            /** Currency */
            currency?: string | null;
            /** Dimensions */
            dimensions?: string | null;
            /** Finish */
            finish?: string | null;
            /** Listpricecents */
            listPriceCents?: number | null;
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Reference */
            reference?: string | null;
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
        };
        /** ProjectCreate */
        ProjectCreate: {
            /** Clientid */
            clientId: number;
            /** Code */
            code?: string | null;
            /** Dueon */
            dueOn?: string | null;
            /** Globalbudgetcents */
            globalBudgetCents?: number | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
        };
        /** ProjectFileRead */
        ProjectFileRead: {
            /** Fileid */
            fileId: number;
            /** Id */
            id: number;
            /** Indice */
            indice?: string | null;
            /** Issuedat */
            issuedAt: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "sheets_pdf" | "list_pdf";
            /** Originalname */
            originalName: string;
            /** Projectid */
            projectId: number;
            /** Sizebytes */
            sizeBytes: number;
        };
        /**
         * ProjectItemCreate
         * @description From a catalogue product (`productId`: every absent field is copied) or free. A free
         *     article is added to the catalogue unless `addToCatalogue` is false (ADR-0013).
         */
        ProjectItemCreate: {
            /**
             * Addtocatalogue
             * @default true
             */
            addToCatalogue: boolean;
            /** Categoryid */
            categoryId?: number | null;
            /** Comments */
            comments?: string | null;
            /** Currency */
            currency?: string | null;
            /** Dimensions */
            dimensions?: string | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Family */
            family?: ("custom" | "joinery" | "ose" | "edition" | "gallery" | "artwork" | "textile") | null;
            /** Finish */
            finish?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Itemcode */
            itemCode?: string | null;
            /**
             * Kind
             * @default product
             * @enum {string}
             */
            kind: "product" | "fee";
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Name */
            name?: string | null;
            /** Placements */
            placements?: components["schemas"]["PlacementCreate"][] | null;
            /** Productid */
            productId?: number | null;
            /** Quoteindice */
            quoteIndice?: string | null;
            /** Quoteref */
            quoteRef?: string | null;
            /** Quoteurl */
            quoteUrl?: string | null;
            /** Reference */
            reference?: string | null;
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
            /** Usage */
            usage?: ("indoor" | "outdoor") | null;
        };
        /** ProjectItemRead */
        ProjectItemRead: {
            /** Categoryid */
            categoryId: number | null;
            /** Comments */
            comments: string | null;
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Dimensions */
            dimensions: string | null;
            /** Discountbp */
            discountBp: number;
            /** Family */
            family: ("custom" | "joinery" | "ose" | "edition" | "gallery" | "artwork" | "textile") | null;
            /** Files */
            files: components["schemas"]["ItemFileRead"][];
            /** Finish */
            finish: string | null;
            /** Fxratemicro */
            fxRateMicro: number;
            /** Id */
            id: number;
            /** Indice */
            indice: string | null;
            /** Itemcode */
            itemCode: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "product" | "fee";
            /** Manufacturerid */
            manufacturerId: number | null;
            /** Name */
            name: string;
            /** Placements */
            placements: components["schemas"]["PlacementRead"][];
            /** Productid */
            productId: number | null;
            /** Projectid */
            projectId: number;
            /** Quoteindice */
            quoteIndice: string | null;
            /** Quoteref */
            quoteRef: string | null;
            /** Quoteurl */
            quoteUrl: string | null;
            /** Reference */
            reference: string | null;
            /** Sortorder */
            sortOrder: number;
            /** Sourceurl */
            sourceUrl: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "to_quote" | "quoted" | "to_review" | "approved" | "deposit" | "purchased" | "cancelled";
            /** Supplierid */
            supplierId: number | null;
            /** Unitcostcents */
            unitCostCents: number;
            /** Updatedat */
            updatedAt: string;
            /** Usage */
            usage: ("indoor" | "outdoor") | null;
        };
        /**
         * ProjectItemUpdate
         * @description Absent = unchanged. `status` never here (POST …/status), placements have their own routes.
         */
        ProjectItemUpdate: {
            /** Categoryid */
            categoryId?: number | null;
            /** Comments */
            comments?: string | null;
            /** Currency */
            currency?: string | null;
            /** Dimensions */
            dimensions?: string | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Family */
            family?: ("custom" | "joinery" | "ose" | "edition" | "gallery" | "artwork" | "textile") | null;
            /** Finish */
            finish?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Itemcode */
            itemCode?: string | null;
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Name */
            name?: string | null;
            /** Productid */
            productId?: number | null;
            /** Quoteindice */
            quoteIndice?: string | null;
            /** Quoteref */
            quoteRef?: string | null;
            /** Quoteurl */
            quoteUrl?: string | null;
            /** Reference */
            reference?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
            /** Usage */
            usage?: ("indoor" | "outdoor") | null;
        };
        /**
         * ProjectListRead
         * @description A row of the projects list: the project plus its budget figures (computed, never stored).
         */
        ProjectListRead: {
            /** Budgetcents */
            budgetCents: number | null;
            /** Clientid */
            clientId: number;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Dueon */
            dueOn: string | null;
            /** Id */
            id: number;
            /** Itemcount */
            itemCount: number;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Siteaddress */
            siteAddress: string | null;
            /** Specifiedcents */
            specifiedCents: number;
            /**
             * Status
             * @enum {string}
             */
            status: "prospect" | "active" | "delivered" | "closed" | "cancelled";
            /** Updatedat */
            updatedAt: string;
        };
        /** ProjectRead */
        ProjectRead: {
            /** Clientid */
            clientId: number;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Dueon */
            dueOn: string | null;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Siteaddress */
            siteAddress: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "prospect" | "active" | "delivered" | "closed" | "cancelled";
            /** Updatedat */
            updatedAt: string;
        };
        /** ProjectStatusChange */
        ProjectStatusChange: {
            /**
             * Status
             * @enum {string}
             */
            status: "prospect" | "active" | "delivered" | "closed" | "cancelled";
        };
        /** ProjectSummaryRead */
        ProjectSummaryRead: {
            /**
             * Alert
             * @enum {string}
             */
            alert: "none" | "warning" | "over";
            /** Approvedcents */
            approvedCents: number;
            /** Budgetcents */
            budgetCents: number | null;
            /** Byfamily */
            byFamily: components["schemas"]["SummaryRowRead"][];
            /** Bylocation */
            byLocation: components["schemas"]["SummaryRowRead"][];
            /** Bystatus */
            byStatus: components["schemas"]["StatusShareRead"][];
            /** Bysupplier */
            bySupplier: components["schemas"]["SummaryRowRead"][];
            /** Bytype */
            byType: components["schemas"]["SummaryRowRead"][];
            /** Byzone */
            byZone: components["schemas"]["SummaryRowRead"][];
            /** Lines */
            lines: components["schemas"]["LineAmountsRead"][];
            /** Projectid */
            projectId: number;
            /** Quotedcents */
            quotedCents: number;
            /** Remainingcents */
            remainingCents: number | null;
            /** Specifiedcents */
            specifiedCents: number;
        };
        /** ProjectUpdate */
        ProjectUpdate: {
            /** Clientid */
            clientId?: number | null;
            /** Code */
            code?: string | null;
            /** Dueon */
            dueOn?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
        };
        /** SettingRead */
        SettingRead: {
            /** Agencyaddress */
            agencyAddress: string | null;
            /** Agencyemail */
            agencyEmail: string | null;
            /** Agencyname */
            agencyName: string;
            /** Agencyphone */
            agencyPhone: string | null;
            /** Basecurrency */
            baseCurrency: string;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Projectcodeprefix */
            projectCodePrefix: string;
            /** Seedcategoryversion */
            seedCategoryVersion: number;
            /** Updatedat */
            updatedAt: string;
        };
        /** SettingUpdate */
        SettingUpdate: {
            /** Agencyaddress */
            agencyAddress?: string | null;
            /** Agencyemail */
            agencyEmail?: string | null;
            /** Agencyname */
            agencyName?: string | null;
            /** Agencyphone */
            agencyPhone?: string | null;
            /** Projectcodeprefix */
            projectCodePrefix?: string | null;
        };
        /** StatusChange */
        StatusChange: {
            /** Note */
            note?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "to_quote" | "quoted" | "to_review" | "approved" | "deposit" | "purchased" | "cancelled";
        };
        /** StatusShareRead */
        StatusShareRead: {
            /** Amountcents */
            amountCents: number;
            /** Count */
            count: number;
            /** Sharebp */
            shareBp: number;
            /** Status */
            status: string;
        };
        /**
         * SummaryRowRead
         * @description One row of a compilation (by location, zone, family, type or supplier).
         */
        SummaryRowRead: {
            /**
             * Alert
             * @enum {string}
             */
            alert: "none" | "warning" | "over";
            /** Approvedcents */
            approvedCents: number;
            /** Budgetcents */
            budgetCents: number | null;
            /** Key */
            key: string;
            /** Label */
            label: string;
            /** Quotedcents */
            quotedCents: number;
            /** Remainingcents */
            remainingCents: number | null;
            /** Specifiedcents */
            specifiedCents: number;
        };
        /** SupplierCreate */
        SupplierCreate: {
            /** Contactname */
            contactName?: string | null;
            /**
             * Currency
             * @default EUR
             */
            currency: string;
            /**
             * Defaultdiscountbp
             * @default 0
             */
            defaultDiscountBp: number;
            /** Email */
            email?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Website */
            website?: string | null;
        };
        /** SupplierRead */
        SupplierRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Contactname */
            contactName: string | null;
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Defaultdiscountbp */
            defaultDiscountBp: number;
            /** Email */
            email: string | null;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Phone */
            phone: string | null;
            /** Updatedat */
            updatedAt: string;
            /** Website */
            website: string | null;
        };
        /** SupplierUpdate */
        SupplierUpdate: {
            /** Contactname */
            contactName?: string | null;
            /** Currency */
            currency?: string | null;
            /** Defaultdiscountbp */
            defaultDiscountBp?: number | null;
            /** Email */
            email?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Website */
            website?: string | null;
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
    listCategories: {
        parameters: {
            query?: {
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
                    "application/json": components["schemas"]["CategoryRead"][];
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
    createCategory: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryRead"];
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
    getCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: number;
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
                    "application/json": components["schemas"]["CategoryRead"];
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
    updateCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CategoryUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CategoryRead"];
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
    archiveCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: number;
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
                    "application/json": components["schemas"]["CategoryRead"];
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
    unarchiveCategory: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                category_id: number;
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
                    "application/json": components["schemas"]["CategoryRead"];
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
    uploadFile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_uploadFile"];
            };
        };
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FileRead"];
                };
            };
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["FileRead"];
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
    getFileContent: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                file_id: number;
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
                content?: never;
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
    getLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                location_id: number;
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
                    "application/json": components["schemas"]["LocationRead"];
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
    deleteLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                location_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    updateLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                location_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LocationUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationRead"];
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
    archiveLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                location_id: number;
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
                    "application/json": components["schemas"]["LocationRead"];
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
    unarchiveLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                location_id: number;
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
                    "application/json": components["schemas"]["LocationRead"];
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
    listManufacturers: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
                limit?: number;
                offset?: number;
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
                    "application/json": components["schemas"]["Page_ManufacturerRead_"];
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
    createManufacturer: {
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
                "application/json": components["schemas"]["ManufacturerCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManufacturerRead"];
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
    getManufacturer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                manufacturer_id: number;
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
                    "application/json": components["schemas"]["ManufacturerRead"];
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
    updateManufacturer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                manufacturer_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ManufacturerUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ManufacturerRead"];
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
    archiveManufacturer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                manufacturer_id: number;
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
                    "application/json": components["schemas"]["ManufacturerRead"];
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
    unarchiveManufacturer: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                manufacturer_id: number;
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
                    "application/json": components["schemas"]["ManufacturerRead"];
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
    deletePlacement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                placement_id: number;
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
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    updatePlacement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                placement_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlacementUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    listProducts: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
                categoryId?: number | null;
                manufacturerId?: number | null;
                supplierId?: number | null;
                limit?: number;
                offset?: number;
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
                    "application/json": components["schemas"]["Page_ProductRead_"];
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
    createProduct: {
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
                "application/json": components["schemas"]["ProductCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductRead"];
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
    getProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
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
                    "application/json": components["schemas"]["ProductRead"];
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
    updateProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductRead"];
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
    archiveProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
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
                    "application/json": components["schemas"]["ProductRead"];
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
    attachProductFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductFileAttach"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductRead"];
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
    detachProductFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
                file_id: number;
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
                    "application/json": components["schemas"]["ProductRead"];
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
    updateProductFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
                file_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProductFileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProductRead"];
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
    unarchiveProduct: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                product_id: number;
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
                    "application/json": components["schemas"]["ProductRead"];
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
    getProjectItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
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
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    deleteProjectItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
    updateProjectItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectItemUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    listProjectItemEvents: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
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
                    "application/json": components["schemas"]["EventRead"][];
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
    attachProjectItemFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemFileAttach"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    detachProjectItemFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
                file_id: number;
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
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    updateProjectItemFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
                file_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItemFileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    addPlacement: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PlacementCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    changeProjectItemStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                item_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StatusChange"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    listProjects: {
        parameters: {
            query?: {
                status?: ("prospect" | "active" | "delivered" | "closed" | "cancelled") | null;
                clientId?: number | null;
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
                    "application/json": components["schemas"]["ProjectListRead"][];
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
    createProject: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
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
    getProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["ProjectRead"];
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
    updateProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
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
    listBudgetLines: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["BudgetLineRead"][];
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
    putBudgetLines: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["BudgetLinesPut"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["BudgetLineRead"][];
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
    listProjectExports: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["ProjectFileRead"][];
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
    exportList: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
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
                    "application/pdf": unknown;
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
    exportSheets: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
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
                    "application/pdf": unknown;
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
    listLocations: {
        parameters: {
            query?: {
                includeArchived?: boolean;
            };
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["LocationRead"][];
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
    createLocation: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LocationCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationRead"];
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
    reorderLocations: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["LocationReorder"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["LocationRead"][];
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
    listProjectItems: {
        parameters: {
            query?: {
                locationId?: number | null;
                status?: ("to_quote" | "quoted" | "to_review" | "approved" | "deposit" | "purchased" | "cancelled") | null;
                categoryId?: number | null;
                supplierId?: number | null;
                kind?: ("product" | "fee") | null;
                q?: string | null;
            };
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["ProjectItemRead"][];
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
    createProjectItem: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectItemCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectItemRead"];
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
    changeProjectStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectStatusChange"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectRead"];
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
    getProjectSummary: {
        parameters: {
            query?: {
                locationId?: number | null;
                zone?: string | null;
                family?: string | null;
                categoryId?: number | null;
                supplierId?: number | null;
            };
            header?: never;
            path: {
                project_id: number;
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
                    "application/json": components["schemas"]["ProjectSummaryRead"];
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
    getSettings: {
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
                    "application/json": components["schemas"]["SettingRead"];
                };
            };
        };
    };
    updateSettings: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SettingUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SettingRead"];
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
    listSuppliers: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
                limit?: number;
                offset?: number;
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
                    "application/json": components["schemas"]["Page_SupplierRead_"];
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
    createSupplier: {
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
                "application/json": components["schemas"]["SupplierCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierRead"];
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
    getSupplier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: number;
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
                    "application/json": components["schemas"]["SupplierRead"];
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
    updateSupplier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["SupplierUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SupplierRead"];
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
    archiveSupplier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: number;
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
                    "application/json": components["schemas"]["SupplierRead"];
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
    unarchiveSupplier: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                supplier_id: number;
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
                    "application/json": components["schemas"]["SupplierRead"];
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
    createBackup: {
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
                    "application/json": components["schemas"]["BackupRead"];
                };
            };
        };
    };
}

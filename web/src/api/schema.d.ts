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
    "/api/v1/projects/{project_id}/zones": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Zones */
        get: operations["listZones"];
        put?: never;
        /** Create Zone */
        post: operations["createZone"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/zones/reorder": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reorder Zones */
        post: operations["reorderZones"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/zones/{zone_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Zone */
        get: operations["getZone"];
        put?: never;
        post?: never;
        /** Delete Zone */
        delete: operations["deleteZone"];
        options?: never;
        head?: never;
        /** Update Zone */
        patch: operations["updateZone"];
        trace?: never;
    };
    "/api/v1/zones/{zone_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Zone */
        post: operations["archiveZone"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/zones/{zone_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Zone */
        post: operations["unarchiveZone"];
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
        /** Body_uploadFile */
        Body_uploadFile: {
            /** File */
            file: string;
        };
        /** CategoryCreate */
        CategoryCreate: {
            /** Code */
            code?: string | null;
            /** Name */
            name: string;
            /** Parentid */
            parentId?: number | null;
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
            code: string | null;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Parentid */
            parentId: number | null;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /**
         * CategoryUpdate
         * @description Name and order only: code and parent are immutable (item codes depend on them, D6a.9).
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
        /** FileRead */
        FileRead: {
            /** Createdat */
            createdAt: string;
            /** Ext */
            ext: string;
            /** Id */
            id: number;
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
        /** ProductCreate */
        ProductCreate: {
            /** Categoryid */
            categoryId: number;
            /** Color */
            color?: string | null;
            /** Depthmm */
            depthMm?: number | null;
            /** Description */
            description?: string | null;
            /** Diametermm */
            diameterMm?: number | null;
            /** Discontinuedon */
            discontinuedOn?: string | null;
            /** Finish */
            finish?: string | null;
            /** Gtin */
            gtin?: string | null;
            /** Heightmm */
            heightMm?: number | null;
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Listpricecents */
            listPriceCents?: number | null;
            /**
             * Listpricecurrency
             * @default EUR
             */
            listPriceCurrency: string;
            /** Listpriceon */
            listPriceOn?: string | null;
            /**
             * Listpricetaxmode
             * @default ht
             * @enum {string}
             */
            listPriceTaxMode: "ht" | "ttc";
            /** Listpricevatbp */
            listPriceVatBp?: number | null;
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Manufacturerref */
            manufacturerRef?: string | null;
            /** Materials */
            materials?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /**
             * Sourcekind
             * @default manual
             * @enum {string}
             */
            sourceKind: "manual" | "url";
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
            /** Supplierref */
            supplierRef?: string | null;
            /**
             * Unit
             * @default piece
             * @enum {string}
             */
            unit: "piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll";
            /** Widthmm */
            widthMm?: number | null;
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
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ProductRead */
        ProductRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Categoryid */
            categoryId: number;
            /** Color */
            color: string | null;
            /** Createdat */
            createdAt: string;
            /** Depthmm */
            depthMm: number | null;
            /** Description */
            description: string | null;
            /** Diametermm */
            diameterMm: number | null;
            /** Discontinuedon */
            discontinuedOn: string | null;
            /** Files */
            files: components["schemas"]["ProductFileRead"][];
            /** Finish */
            finish: string | null;
            /** Gtin */
            gtin: string | null;
            /** Heightmm */
            heightMm: number | null;
            /** Id */
            id: number;
            /** Leadtimeweeks */
            leadTimeWeeks: number | null;
            /** Listpricecents */
            listPriceCents: number | null;
            /** Listpricecurrency */
            listPriceCurrency: string;
            /** Listpriceon */
            listPriceOn: string | null;
            /**
             * Listpricetaxmode
             * @enum {string}
             */
            listPriceTaxMode: "ht" | "ttc";
            /** Listpricevatbp */
            listPriceVatBp: number | null;
            /** Manufacturerid */
            manufacturerId: number | null;
            /** Manufacturerref */
            manufacturerRef: string | null;
            /** Materials */
            materials: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /**
             * Sourcekind
             * @enum {string}
             */
            sourceKind: "manual" | "url";
            /** Sourceurl */
            sourceUrl: string | null;
            /** Supplierid */
            supplierId: number | null;
            /** Supplierref */
            supplierRef: string | null;
            /**
             * Unit
             * @enum {string}
             */
            unit: "piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll";
            /** Updatedat */
            updatedAt: string;
            /** Widthmm */
            widthMm: number | null;
        };
        /** ProductUpdate */
        ProductUpdate: {
            /** Categoryid */
            categoryId?: number | null;
            /** Color */
            color?: string | null;
            /** Depthmm */
            depthMm?: number | null;
            /** Description */
            description?: string | null;
            /** Diametermm */
            diameterMm?: number | null;
            /** Discontinuedon */
            discontinuedOn?: string | null;
            /** Finish */
            finish?: string | null;
            /** Gtin */
            gtin?: string | null;
            /** Heightmm */
            heightMm?: number | null;
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Listpricecents */
            listPriceCents?: number | null;
            /** Listpricecurrency */
            listPriceCurrency?: string | null;
            /** Listpriceon */
            listPriceOn?: string | null;
            /** Listpricetaxmode */
            listPriceTaxMode?: ("ht" | "ttc") | null;
            /** Listpricevatbp */
            listPriceVatBp?: number | null;
            /** Manufacturerid */
            manufacturerId?: number | null;
            /** Manufacturerref */
            manufacturerRef?: string | null;
            /** Materials */
            materials?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Sourcekind */
            sourceKind?: ("manual" | "url") | null;
            /** Sourceurl */
            sourceUrl?: string | null;
            /** Supplierid */
            supplierId?: number | null;
            /** Supplierref */
            supplierRef?: string | null;
            /** Unit */
            unit?: ("piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll") | null;
            /** Widthmm */
            widthMm?: number | null;
        };
        /** ProjectCreate */
        ProjectCreate: {
            /** Clientid */
            clientId: number;
            /** Code */
            code?: string | null;
            /** Defaultvatbp */
            defaultVatBp?: number | null;
            /** Deliveryaddress */
            deliveryAddress?: string | null;
            /** Deliverycontact */
            deliveryContact?: string | null;
            /** Dueon */
            dueOn?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
            /** Starton */
            startOn?: string | null;
        };
        /** ProjectRead */
        ProjectRead: {
            /** Clientid */
            clientId: number;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Defaultvatbp */
            defaultVatBp: number;
            /** Deliveryaddress */
            deliveryAddress: string | null;
            /** Deliverycontact */
            deliveryContact: string | null;
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
            /** Starton */
            startOn: string | null;
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
        /** ProjectUpdate */
        ProjectUpdate: {
            /** Clientid */
            clientId?: number | null;
            /** Code */
            code?: string | null;
            /** Defaultvatbp */
            defaultVatBp?: number | null;
            /** Deliveryaddress */
            deliveryAddress?: string | null;
            /** Deliverycontact */
            deliveryContact?: string | null;
            /** Dueon */
            dueOn?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
            /** Starton */
            startOn?: string | null;
        };
        /** SupplierCreate */
        SupplierCreate: {
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
            /** Legalname */
            legalName?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Paymentterms */
            paymentTerms?: string | null;
            /** Phone */
            phone?: string | null;
            /** Postalcode */
            postalCode?: string | null;
            /** Siren */
            siren?: string | null;
            /** Siret */
            siret?: string | null;
            /** Vatnumber */
            vatNumber?: string | null;
            /** Website */
            website?: string | null;
        };
        /** SupplierRead */
        SupplierRead: {
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
            /** Currency */
            currency: string;
            /** Defaultdiscountbp */
            defaultDiscountBp: number;
            /** Email */
            email: string | null;
            /** Id */
            id: number;
            /** Legalname */
            legalName: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Paymentterms */
            paymentTerms: string | null;
            /** Phone */
            phone: string | null;
            /** Postalcode */
            postalCode: string | null;
            /** Siren */
            siren: string | null;
            /** Siret */
            siret: string | null;
            /** Updatedat */
            updatedAt: string;
            /** Vatnumber */
            vatNumber: string | null;
            /** Website */
            website: string | null;
        };
        /** SupplierUpdate */
        SupplierUpdate: {
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
            /** Currency */
            currency?: string | null;
            /** Defaultdiscountbp */
            defaultDiscountBp?: number | null;
            /** Email */
            email?: string | null;
            /** Legalname */
            legalName?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Paymentterms */
            paymentTerms?: string | null;
            /** Phone */
            phone?: string | null;
            /** Postalcode */
            postalCode?: string | null;
            /** Siren */
            siren?: string | null;
            /** Siret */
            siret?: string | null;
            /** Vatnumber */
            vatNumber?: string | null;
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
        /** ZoneCreate */
        ZoneCreate: {
            /** Code */
            code: string;
            /** Kind */
            kind?: string | null;
            /**
             * Multiplier
             * @default 1
             */
            multiplier: number;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ZoneRead */
        ZoneRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Kind */
            kind: string | null;
            /** Multiplier */
            multiplier: number;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Projectid */
            projectId: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /** ZoneReorder */
        ZoneReorder: {
            /** Zoneids */
            zoneIds: number[];
        };
        /** ZoneUpdate */
        ZoneUpdate: {
            /** Code */
            code?: string | null;
            /** Kind */
            kind?: string | null;
            /** Multiplier */
            multiplier?: number | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
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
                    "application/json": components["schemas"]["ProjectRead"][];
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
    listZones: {
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
                    "application/json": components["schemas"]["ZoneRead"][];
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
    createZone: {
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
                "application/json": components["schemas"]["ZoneCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ZoneRead"];
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
    reorderZones: {
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
                "application/json": components["schemas"]["ZoneReorder"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ZoneRead"][];
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
    getZone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                zone_id: number;
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
                    "application/json": components["schemas"]["ZoneRead"];
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
    deleteZone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                zone_id: number;
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
    updateZone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                zone_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ZoneUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ZoneRead"];
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
    archiveZone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                zone_id: number;
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
                    "application/json": components["schemas"]["ZoneRead"];
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
    unarchiveZone: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                zone_id: number;
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
                    "application/json": components["schemas"]["ZoneRead"];
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
}

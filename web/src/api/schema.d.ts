// GÉNÉRÉ par `npm run gen:api` depuis api/openapi.json — ne pas éditer à la main.

export interface paths {
    "/api/v1/captures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Captures */
        get: operations["listCaptures"];
        put?: never;
        /**
         * Create Capture
         * @description From the extension: the page as displayed (multipart `url`, `html` as a file part — a form
         *     field is capped at 1 Mo by Starlette, a rendered page is often bigger — optional `image`).
         */
        post: operations["createCapture"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/captures/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Capture Image */
        post: operations["captureImage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/captures/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Preview Capture */
        get: operations["previewCapture"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/captures/{capture_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Capture */
        delete: operations["deleteCapture"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/captures/{capture_id}/image": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Attach Capture Image
         * @description From the extension, for each photo the server could not download (`url` = its address).
         */
        post: operations["attachCaptureImage"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
    "/api/v1/choices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Choices */
        get: operations["listChoices"];
        put?: never;
        /** Create Choice */
        post: operations["createChoice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/choices/{choice_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Choice */
        patch: operations["updateChoice"];
        trace?: never;
    };
    "/api/v1/choices/{choice_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Choice */
        post: operations["archiveChoice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/choices/{choice_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Choice */
        post: operations["unarchiveChoice"];
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
    "/api/v1/installation-plans/{plan_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Plan */
        delete: operations["deleteInstallationPlan"];
        options?: never;
        head?: never;
        /** Update Plan */
        patch: operations["updateInstallationPlan"];
        trace?: never;
    };
    "/api/v1/installation-sheets/{sheet_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Sheet */
        get: operations["getInstallationSheet"];
        put?: never;
        post?: never;
        /** Delete Sheet */
        delete: operations["deleteInstallationSheet"];
        options?: never;
        head?: never;
        /** Update Sheet */
        patch: operations["updateInstallationSheet"];
        trace?: never;
    };
    "/api/v1/installation-sheets/{sheet_id}/items": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /** Set Items */
        put: operations["setInstallationSheetItems"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/installation-sheets/{sheet_id}/pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Sheet */
        get: operations["exportInstallationSheet"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/listing-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Profiles */
        get: operations["listListingProfiles"];
        put?: never;
        /** Create Profile */
        post: operations["createListingProfile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/listing-profiles/columns": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List Columns
         * @description The column catalogue, in printing order, with its French labels.
         */
        get: operations["listListingColumns"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/listing-profiles/{profile_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Profile */
        delete: operations["deleteListingProfile"];
        options?: never;
        head?: never;
        /** Update Profile */
        patch: operations["updateListingProfile"];
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
    "/api/v1/professionals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Professionals */
        get: operations["listProfessionals"];
        put?: never;
        /** Create Professional */
        post: operations["createProfessional"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/professionals/specialties": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Specialties */
        get: operations["listProfessionalSpecialties"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/professionals/{professional_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Professional */
        get: operations["getProfessional"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Update Professional */
        patch: operations["updateProfessional"];
        trace?: never;
    };
    "/api/v1/professionals/{professional_id}/archive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Archive Professional */
        post: operations["archiveProfessional"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/professionals/{professional_id}/unarchive": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Unarchive Professional */
        post: operations["unarchiveProfessional"];
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
    "/api/v1/project-items/{item_id}/detach": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Detach Option
         * @description The option becomes an independent article, unassigned (ADR-0021).
         */
        post: operations["detachProjectItemOption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/project-items/{item_id}/options": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Attach Option
         * @description An existing article of the project becomes an option of this one (ADR-0021).
         */
        post: operations["attachProjectItemOption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/project-items/{item_id}/retain": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Retain Option
         * @description This option takes its base's place (ADR-0021); returns the option, now the base.
         */
        post: operations["retainProjectItemOption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/save": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Save Item
         * @description « Enregistrer » on the article page: sheet, status, placements, files and options at once,
         *     all or nothing.
         */
        post: operations["saveProjectItem"];
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
    "/api/v1/projects/{project_id}/diffusions/last": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /**
         * Revert Last Diffusion
         * @description Takes the last official diffusion back (ADR-0022): indices and rules as before it.
         */
        delete: operations["revertLastDiffusion"];
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
        /**
         * Export List
         * @description Listing PDF: the columns of listing profile `profile` (ADR-0023), all of them without;
         *     the options only with `options=true`.
         */
        get: operations["exportList"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/exports/sheets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Issue Sheets
         * @description « Fiches PDF » (ADR-0022): issues the sheets on each paper asked, as an official diffusion
         *     (indices moved) or a working document; the PDFs are then downloaded from `/files/{id}`.
         */
        post: operations["issueSheets"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/installation-plans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Plans */
        get: operations["listInstallationPlans"];
        put?: never;
        /**
         * Create Plan
         * @description `fileId`: an uploaded image, or a PDF whose first page is drawn.
         */
        post: operations["createInstallationPlan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/installation-sheets": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Sheets */
        get: operations["listInstallationSheets"];
        put?: never;
        /** Create Sheet */
        post: operations["createInstallationSheet"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/installation.pdf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Export Installation
         * @description Every sheet of the project, or of one room with `locationId`.
         */
        get: operations["exportInstallation"];
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
    "/api/v1/settings/extension-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Generate Extension Token */
        post: operations["generateExtensionToken"];
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
    "/api/v1/suppliers/specialties": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Specialties */
        get: operations["listSupplierSpecialties"];
        put?: never;
        post?: never;
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
        /** Body_attachCaptureImage */
        Body_attachCaptureImage: {
            /** Image */
            image: string;
            /** Url */
            url?: string | null;
        };
        /** Body_createCapture */
        Body_createCapture: {
            /** Html */
            html: string;
            /** Image */
            image?: string | null;
            /** Url */
            url: string;
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
        /** CaptureImageIn */
        CaptureImageIn: {
            /** Url */
            url: string;
        };
        /** CapturePreviewRead */
        CapturePreviewRead: {
            /** Brand */
            brand: string | null;
            /** Currency */
            currency: string | null;
            /** Description */
            description: string | null;
            /** Dimensions */
            dimensions?: string | null;
            /** Finish */
            finish?: string | null;
            /** Imageurl */
            imageUrl: string | null;
            /**
             * Imageurls
             * @default []
             */
            imageUrls: string[];
            /** Leadtime */
            leadTime?: string | null;
            /** Name */
            name: string | null;
            /** Pricecents */
            priceCents: number | null;
            /** Reference */
            reference: string | null;
            /**
             * Source
             * @enum {string}
             */
            source: "json-ld" | "opengraph" | "title";
            /** Typecode */
            typeCode?: string | null;
            /** Url */
            url: string;
        };
        /**
         * CaptureRead
         * @description A page sent by the browser extension, waiting on « Nouvel article ».
         */
        CaptureRead: {
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Images */
            images: components["schemas"]["FileRead"][];
            preview: components["schemas"]["CapturePreviewRead"];
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
        /** ChoiceCreate */
        ChoiceCreate: {
            /**
             * List
             * @enum {string}
             */
            list: "family" | "usage" | "prestation";
            /** Name */
            name: string;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ChoiceRead */
        ChoiceRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /**
             * List
             * @enum {string}
             */
            list: "family" | "usage" | "prestation";
            /** Name */
            name: string;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /**
         * ChoiceUpdate
         * @description Label and order only: the code is kept by articles, envelopes and professionals.
         */
        ChoiceUpdate: {
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
        /** DiffusionRead */
        DiffusionRead: {
            /** Id */
            id: number;
            /** Issuedat */
            issuedAt: string;
            /** Number */
            number: number;
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
        /**
         * FileSave
         * @description One file of the article as it must be after the save (already uploaded by `POST /files`).
         */
        FileSave: {
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
            kind: "image" | "finish" | "drawing" | "other";
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
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
        /**
         * InstallationArticle
         * @description A placement as the sheet shows it: its code, its article and its photo.
         */
        InstallationArticle: {
            /** Code */
            code: string;
            /** Color */
            color: string;
            /** Itemid */
            itemId: number;
            /** Markers */
            markers: components["schemas"]["InstallationMarker"][];
            /** Name */
            name: string;
            /** Othersheets */
            otherSheets: string[];
            /** Outofroom */
            outOfRoom: boolean;
            /** Photofileid */
            photoFileId: number | null;
            /** Placementid */
            placementId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Typename */
            typeName: string | null;
        };
        /** InstallationCellIn */
        InstallationCellIn: {
            /**
             * Markers
             * @default []
             */
            markers: components["schemas"]["InstallationMarker"][];
            /** Placementid */
            placementId: number;
        };
        /**
         * InstallationLayout
         * @description A page's grid (`ffe.installation.layout`): column widths and row heights in px of the A3
         *     page, the block the plan spans, the article cells in reading order.
         */
        InstallationLayout: {
            /**
             * Arrangement
             * @enum {string}
             */
            arrangement: "ring" | "sides" | "ends" | "right";
            /** Colwidths */
            colWidths: number[];
            /** Perpage */
            perPage: number;
            plan: components["schemas"]["InstallationPlanBox"];
            /** Rowheights */
            rowHeights: number[];
            /** Slots */
            slots: components["schemas"]["InstallationSlot"][];
        };
        /**
         * InstallationMarker
         * @description A numbered dot on the plan, in thousandths of the plan as stored (before any rotation).
         */
        InstallationMarker: {
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** InstallationPlanBox */
        InstallationPlanBox: {
            /** Col */
            col: number;
            /** Cols */
            cols: number;
            /** Row */
            row: number;
            /** Rows */
            rows: number;
        };
        /** InstallationPlanCreate */
        InstallationPlanCreate: {
            /** Fileid */
            fileId: number;
            /** Name */
            name?: string | null;
        };
        /** InstallationPlanRead */
        InstallationPlanRead: {
            /** Createdat */
            createdAt: string;
            /** Fileid */
            fileId: number;
            /** Id */
            id: number;
            /** Name */
            name: string;
            /** Projectid */
            projectId: number;
            /** Sourcefileid */
            sourceFileId: number | null;
            /** Updatedat */
            updatedAt: string;
        };
        /** InstallationPlanUpdate */
        InstallationPlanUpdate: {
            /** Name */
            name: string;
        };
        /** InstallationSheetCreate */
        InstallationSheetCreate: {
            /**
             * Arrangement
             * @default ring
             * @enum {string}
             */
            arrangement: "ring" | "sides" | "ends" | "right";
            /**
             * Colorbytype
             * @default false
             */
            colorByType: boolean;
            /** Locationid */
            locationId: number;
            /** Name */
            name: string;
            /**
             * Perpage
             * @default 12
             * @enum {integer}
             */
            perPage: 8 | 12 | 16;
            /** Planid */
            planId?: number | null;
            /**
             * Planrotation
             * @default 0
             * @enum {integer}
             */
            planRotation: 0 | 90 | 180 | 270;
        };
        /** InstallationSheetDetail */
        InstallationSheetDetail: {
            /**
             * Arrangement
             * @enum {string}
             */
            arrangement: "ring" | "sides" | "ends" | "right";
            /** Candidates */
            candidates: components["schemas"]["InstallationArticle"][];
            /** Colorbytype */
            colorByType: boolean;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Itemcount */
            itemCount: number;
            /** Items */
            items: (components["schemas"]["InstallationArticle"] | null)[];
            /** Layouts */
            layouts: components["schemas"]["InstallationLayout"][];
            /** Locationid */
            locationId: number;
            /** Name */
            name: string;
            /** Pagecount */
            pageCount: number;
            /** Perpage */
            perPage: number;
            /** Planid */
            planId: number | null;
            /**
             * Planrotation
             * @enum {integer}
             */
            planRotation: 0 | 90 | 180 | 270;
            /** Projectid */
            projectId: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /**
         * InstallationSheetItemsSet
         * @description The sheet's cells in order, saved at once: an article and its dots on the plan, or null
         *     for a cell left empty.
         */
        InstallationSheetItemsSet: {
            /** Cells */
            cells: (components["schemas"]["InstallationCellIn"] | null)[];
        };
        /** InstallationSheetRead */
        InstallationSheetRead: {
            /**
             * Arrangement
             * @enum {string}
             */
            arrangement: "ring" | "sides" | "ends" | "right";
            /** Colorbytype */
            colorByType: boolean;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Itemcount */
            itemCount: number;
            /** Locationid */
            locationId: number;
            /** Name */
            name: string;
            /** Pagecount */
            pageCount: number;
            /** Perpage */
            perPage: number;
            /** Planid */
            planId: number | null;
            /**
             * Planrotation
             * @enum {integer}
             */
            planRotation: 0 | 90 | 180 | 270;
            /** Projectid */
            projectId: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
        };
        /** InstallationSheetUpdate */
        InstallationSheetUpdate: {
            /** Arrangement */
            arrangement?: ("ring" | "sides" | "ends" | "right") | null;
            /** Colorbytype */
            colorByType?: boolean | null;
            /** Name */
            name?: string | null;
            /** Perpage */
            perPage?: (8 | 12 | 16) | null;
            /** Planid */
            planId?: number | null;
            /** Planrotation */
            planRotation?: (0 | 90 | 180 | 270) | null;
        };
        /** InstallationSlot */
        InstallationSlot: {
            /** Col */
            col: number;
            /** Row */
            row: number;
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
            kind: "image" | "finish" | "drawing" | "other";
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
            kind: "image" | "finish" | "drawing" | "other";
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
            kind?: ("image" | "finish" | "drawing" | "other") | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /**
         * ItemSave
         * @description « Enregistrer » on the article page: every change at once, one transaction (all or nothing).
         *     Absent = unchanged; `placements` and `files` are the full lists wanted.
         */
        ItemSave: {
            /**
             * Attachoptions
             * @default []
             */
            attachOptions: number[];
            /** Files */
            files?: components["schemas"]["FileSave"][] | null;
            /** Optionaction */
            optionAction?: ("retain" | "detach") | null;
            /** Placements */
            placements?: components["schemas"]["PlacementSave"][] | null;
            sheet?: components["schemas"]["ProjectItemUpdate"] | null;
            status?: components["schemas"]["StatusChange"] | null;
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
        /** ListingColumnRead */
        ListingColumnRead: {
            /**
             * Key
             * @enum {string}
             */
            key: "photo" | "code" | "type" | "name" | "comments" | "link" | "reference" | "supplier" | "contact" | "dimensions" | "finish" | "family" | "usage" | "lead_time" | "quantity" | "amount" | "status" | "indice";
            /** Label */
            label: string;
        };
        /** ListingProfileCreate */
        ListingProfileCreate: {
            /** Columns */
            columns: ("photo" | "code" | "type" | "name" | "comments" | "link" | "reference" | "supplier" | "contact" | "dimensions" | "finish" | "family" | "usage" | "lead_time" | "quantity" | "amount" | "status" | "indice")[];
            /** Name */
            name: string;
        };
        /** ListingProfileRead */
        ListingProfileRead: {
            /** Columns */
            columns: ("photo" | "code" | "type" | "name" | "comments" | "link" | "reference" | "supplier" | "contact" | "dimensions" | "finish" | "family" | "usage" | "lead_time" | "quantity" | "amount" | "status" | "indice")[];
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
        /** ListingProfileUpdate */
        ListingProfileUpdate: {
            /** Columns */
            columns?: ("photo" | "code" | "type" | "name" | "comments" | "link" | "reference" | "supplier" | "contact" | "dimensions" | "finish" | "family" | "usage" | "lead_time" | "quantity" | "amount" | "status" | "indice")[] | null;
            /** Name */
            name?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
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
        /**
         * OptionAttach
         * @description An existing article of the project becomes an option of the base (ADR-0021).
         */
        OptionAttach: {
            /** Projectitemid */
            projectItemId: number;
        };
        /** Page[ProfessionalRead] */
        Page_ProfessionalRead_: {
            /** Items */
            items: components["schemas"]["ProfessionalRead"][];
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
            /** Change */
            change?: ("new" | "revised") | null;
            /** Code */
            code: string;
            /** Createdat */
            createdAt: string;
            /**
             * Diffused
             * @default false
             */
            diffused: boolean;
            /** Id */
            id: number;
            /** Indice */
            indice: string | null;
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
        /**
         * PlacementSave
         * @description One placement of the article as it must be after the save: `id` = kept, none = new.
         */
        PlacementSave: {
            /** Id */
            id?: number | null;
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
        /** PlacementUpdate */
        PlacementUpdate: {
            /** Locationid */
            locationId?: number | null;
            /** Qtymilli */
            qtyMilli?: number | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /** ProfessionalCreate */
        ProfessionalCreate: {
            /** Contact2Email */
            contact2Email?: string | null;
            /** Contact2Name */
            contact2Name?: string | null;
            /** Contact2Phone */
            contact2Phone?: string | null;
            /** Contactname */
            contactName?: string | null;
            /** Email */
            email?: string | null;
            /**
             * Kind
             * @default manufacturer
             */
            kind: string;
            /** Mobile */
            mobile?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Specialty */
            specialty?: string | null;
            /** Website */
            website?: string | null;
        };
        /** ProfessionalRead */
        ProfessionalRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Contact2Email */
            contact2Email: string | null;
            /** Contact2Name */
            contact2Name: string | null;
            /** Contact2Phone */
            contact2Phone: string | null;
            /** Contactname */
            contactName: string | null;
            /** Createdat */
            createdAt: string;
            /** Email */
            email: string | null;
            /** Id */
            id: number;
            /** Kind */
            kind: string;
            /** Mobile */
            mobile: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Phone */
            phone: string | null;
            /** Specialty */
            specialty: string | null;
            /** Updatedat */
            updatedAt: string;
            /** Website */
            website: string | null;
        };
        /** ProfessionalUpdate */
        ProfessionalUpdate: {
            /** Contact2Email */
            contact2Email?: string | null;
            /** Contact2Name */
            contact2Name?: string | null;
            /** Contact2Phone */
            contact2Phone?: string | null;
            /** Contactname */
            contactName?: string | null;
            /** Email */
            email?: string | null;
            /** Kind */
            kind?: string | null;
            /** Mobile */
            mobile?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Specialty */
            specialty?: string | null;
            /** Website */
            website?: string | null;
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
            /** Procurementlogofileid */
            procurementLogoFileId?: number | null;
            /** Procurementname */
            procurementName?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
        };
        /** ProjectFileRead */
        ProjectFileRead: {
            /** Diffusionnumber */
            diffusionNumber?: number | null;
            /**
             * Diffusionrevoked
             * @default false
             */
            diffusionRevoked: boolean;
            /** Fileid */
            fileId: number;
            /** Id */
            id: number;
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
         * @description The whole sheet is typed here (ADR-0016: no catalogue).
         */
        ProjectItemCreate: {
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
            family?: string | null;
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
            /** Leadtime */
            leadTime?: string | null;
            /** Name */
            name?: string | null;
            /** Optionofid */
            optionOfId?: number | null;
            /** Placements */
            placements?: components["schemas"]["PlacementCreate"][] | null;
            /** Productname */
            productName?: string | null;
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
            usage?: string | null;
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
            /** Diffused */
            diffused: boolean;
            /** Dimensions */
            dimensions: string | null;
            /** Discountbp */
            discountBp: number;
            /** Family */
            family: string | null;
            /** Files */
            files: components["schemas"]["ItemFileRead"][];
            /** Finish */
            finish: string | null;
            /** Fxratemicro */
            fxRateMicro: number;
            /** Id */
            id: number;
            /** Itemcode */
            itemCode: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "product" | "fee";
            /** Leadtime */
            leadTime: string | null;
            /** Name */
            name: string;
            /** Optionletter */
            optionLetter: string | null;
            /** Optionofid */
            optionOfId: number | null;
            /** Placements */
            placements: components["schemas"]["PlacementRead"][];
            /** Productname */
            productName: string;
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
            usage: string | null;
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
            family?: string | null;
            /** Finish */
            finish?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Itemcode */
            itemCode?: string | null;
            /** Leadtime */
            leadTime?: string | null;
            /** Name */
            name?: string | null;
            /** Productname */
            productName?: string | null;
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
            usage?: string | null;
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
            /**
             * Diffusioncount
             * @default 0
             */
            diffusionCount: number;
            /** Dueon */
            dueOn: string | null;
            /** Id */
            id: number;
            /** Itemcount */
            itemCount: number;
            lastDiffusion?: components["schemas"]["DiffusionRead"] | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Procurementlogofileid */
            procurementLogoFileId: number | null;
            /** Procurementname */
            procurementName: string | null;
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
            /**
             * Diffusioncount
             * @default 0
             */
            diffusionCount: number;
            /** Dueon */
            dueOn: string | null;
            /** Id */
            id: number;
            lastDiffusion?: components["schemas"]["DiffusionRead"] | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Procurementlogofileid */
            procurementLogoFileId: number | null;
            /** Procurementname */
            procurementName: string | null;
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
            /** Procurementlogofileid */
            procurementLogoFileId?: number | null;
            /** Procurementname */
            procurementName?: string | null;
            /** Siteaddress */
            siteAddress?: string | null;
        };
        /** SettingRead */
        SettingRead: {
            /** Agencyaddress */
            agencyAddress: string | null;
            /** Agencyemail */
            agencyEmail: string | null;
            /** Agencylogofileid */
            agencyLogoFileId?: number | null;
            /** Agencyname */
            agencyName: string;
            /** Agencyphone */
            agencyPhone: string | null;
            /** Basecurrency */
            baseCurrency: string;
            /** Createdat */
            createdAt: string;
            /** Extensiontoken */
            extensionToken: string | null;
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
            /** Agencylogofileid */
            agencyLogoFileId?: number | null;
            /** Agencyname */
            agencyName?: string | null;
            /** Agencyphone */
            agencyPhone?: string | null;
            /** Projectcodeprefix */
            projectCodePrefix?: string | null;
        };
        /**
         * SheetsIssue
         * @description « Fiches PDF » (ADR-0022): an official diffusion or a working document, on one or two
         *     papers (tinted for the screen, white for a printer), options included or not.
         */
        SheetsIssue: {
            /**
             * Diffuse
             * @default false
             */
            diffuse: boolean;
            /**
             * Hideagencylogo
             * @default false
             */
            hideAgencyLogo: boolean;
            /**
             * Hideagencyname
             * @default false
             */
            hideAgencyName: boolean;
            /**
             * Hidestudio
             * @default false
             */
            hideStudio: boolean;
            /**
             * Includeoptions
             * @default false
             */
            includeOptions: boolean;
            /** Papers */
            papers?: ("color" | "white")[];
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
            /** Contact2Email */
            contact2Email?: string | null;
            /** Contact2Name */
            contact2Name?: string | null;
            /** Contact2Phone */
            contact2Phone?: string | null;
            /** Contactname */
            contactName?: string | null;
            /**
             * Currency
             * @default EUR
             */
            currency: string;
            /** Email */
            email?: string | null;
            /** Mobile */
            mobile?: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Specialty */
            specialty?: string | null;
            /** Website */
            website?: string | null;
        };
        /** SupplierRead */
        SupplierRead: {
            /** Archivedat */
            archivedAt: string | null;
            /** Contact2Email */
            contact2Email: string | null;
            /** Contact2Name */
            contact2Name: string | null;
            /** Contact2Phone */
            contact2Phone: string | null;
            /** Contactname */
            contactName: string | null;
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Email */
            email: string | null;
            /** Id */
            id: number;
            /** Mobile */
            mobile: string | null;
            /** Name */
            name: string;
            /** Notes */
            notes: string | null;
            /** Phone */
            phone: string | null;
            /** Specialty */
            specialty: string | null;
            /** Updatedat */
            updatedAt: string;
            /** Website */
            website: string | null;
        };
        /** SupplierUpdate */
        SupplierUpdate: {
            /** Contact2Email */
            contact2Email?: string | null;
            /** Contact2Name */
            contact2Name?: string | null;
            /** Contact2Phone */
            contact2Phone?: string | null;
            /** Contactname */
            contactName?: string | null;
            /** Currency */
            currency?: string | null;
            /** Email */
            email?: string | null;
            /** Mobile */
            mobile?: string | null;
            /** Name */
            name?: string | null;
            /** Notes */
            notes?: string | null;
            /** Phone */
            phone?: string | null;
            /** Specialty */
            specialty?: string | null;
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
    listCaptures: {
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
                    "application/json": components["schemas"]["CaptureRead"][];
                };
            };
        };
    };
    createCapture: {
        parameters: {
            query?: never;
            header?: {
                "X-FFE-Token"?: string | null;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_createCapture"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaptureRead"];
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
    captureImage: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CaptureImageIn"];
            };
        };
        responses: {
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
    previewCapture: {
        parameters: {
            query: {
                url: string;
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
                    "application/json": components["schemas"]["CapturePreviewRead"];
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
    deleteCapture: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                capture_id: number;
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
    attachCaptureImage: {
        parameters: {
            query?: never;
            header?: {
                "X-FFE-Token"?: string | null;
            };
            path: {
                capture_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["Body_attachCaptureImage"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CaptureRead"];
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
    listChoices: {
        parameters: {
            query?: {
                list?: ("family" | "usage" | "prestation") | null;
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
                    "application/json": components["schemas"]["ChoiceRead"][];
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
    createChoice: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChoiceCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ChoiceRead"];
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
    updateChoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                choice_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ChoiceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ChoiceRead"];
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
    archiveChoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                choice_id: number;
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
                    "application/json": components["schemas"]["ChoiceRead"];
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
    unarchiveChoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                choice_id: number;
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
                    "application/json": components["schemas"]["ChoiceRead"];
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
    deleteInstallationPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: number;
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
    updateInstallationPlan: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                plan_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InstallationPlanUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstallationPlanRead"];
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
    getInstallationSheet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sheet_id: number;
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
                    "application/json": components["schemas"]["InstallationSheetDetail"];
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
    deleteInstallationSheet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sheet_id: number;
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
    updateInstallationSheet: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sheet_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InstallationSheetUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstallationSheetDetail"];
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
    setInstallationSheetItems: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                sheet_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InstallationSheetItemsSet"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstallationSheetDetail"];
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
    exportInstallationSheet: {
        parameters: {
            query?: {
                print?: boolean;
            };
            header?: never;
            path: {
                sheet_id: number;
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
    listListingProfiles: {
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
                    "application/json": components["schemas"]["ListingProfileRead"][];
                };
            };
        };
    };
    createListingProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ListingProfileCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingProfileRead"];
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
    listListingColumns: {
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
                    "application/json": components["schemas"]["ListingColumnRead"][];
                };
            };
        };
    };
    deleteListingProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                profile_id: number;
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
    updateListingProfile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                profile_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ListingProfileUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ListingProfileRead"];
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
    listProfessionals: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
                limit?: number;
                offset?: number;
                specialty?: string | null;
                kind?: string | null;
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
                    "application/json": components["schemas"]["Page_ProfessionalRead_"];
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
    createProfessional: {
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
                "application/json": components["schemas"]["ProfessionalCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfessionalRead"];
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
    listProfessionalSpecialties: {
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
                    "application/json": string[];
                };
            };
        };
    };
    getProfessional: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                professional_id: number;
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
                    "application/json": components["schemas"]["ProfessionalRead"];
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
    updateProfessional: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                professional_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProfessionalUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProfessionalRead"];
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
    archiveProfessional: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                professional_id: number;
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
                    "application/json": components["schemas"]["ProfessionalRead"];
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
    unarchiveProfessional: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                professional_id: number;
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
                    "application/json": components["schemas"]["ProfessionalRead"];
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
    detachProjectItemOption: {
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
    attachProjectItemOption: {
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
                "application/json": components["schemas"]["OptionAttach"];
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
    retainProjectItemOption: {
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
    saveProjectItem: {
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
                "application/json": components["schemas"]["ItemSave"];
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
    revertLastDiffusion: {
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
            query?: {
                print?: boolean;
                profile?: number | null;
                options?: boolean;
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
    issueSheets: {
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
                "application/json": components["schemas"]["SheetsIssue"];
            };
        };
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
    listInstallationPlans: {
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
                    "application/json": components["schemas"]["InstallationPlanRead"][];
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
    createInstallationPlan: {
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
                "application/json": components["schemas"]["InstallationPlanCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstallationPlanRead"];
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
    listInstallationSheets: {
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
                    "application/json": components["schemas"]["InstallationSheetRead"][];
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
    createInstallationSheet: {
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
                "application/json": components["schemas"]["InstallationSheetCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InstallationSheetDetail"];
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
    exportInstallation: {
        parameters: {
            query?: {
                print?: boolean;
                locationId?: number | null;
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
    generateExtensionToken: {
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
    listSuppliers: {
        parameters: {
            query?: {
                q?: string | null;
                includeArchived?: boolean;
                limit?: number;
                offset?: number;
                specialty?: string | null;
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
    listSupplierSpecialties: {
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
                    "application/json": string[];
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

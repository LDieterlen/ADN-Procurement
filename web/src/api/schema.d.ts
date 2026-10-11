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
    "/api/v1/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Dashboard */
        get: operations["getDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/deliveries/{delivery_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Delivery */
        delete: operations["deleteDelivery"];
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
    "/api/v1/invoices/{invoice_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Invoice */
        delete: operations["deleteInvoice"];
        options?: never;
        head?: never;
        /** Update Invoice */
        patch: operations["updateInvoice"];
        trace?: never;
    };
    "/api/v1/invoices/{invoice_id}/pay": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Pay Invoice */
        post: operations["payInvoice"];
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
    "/api/v1/project-items/{item_id}/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Item Quotes */
        get: operations["listProjectItemQuotes"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Refresh From Catalogue */
        post: operations["refreshProjectItemFromCatalogue"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/project-items/{item_id}/replace": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Replace Product */
        post: operations["replaceProjectItemProduct"];
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
    "/api/v1/projects/{project_id}/alerts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Alerts */
        get: operations["listProjectAlerts"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
    "/api/v1/projects/{project_id}/exports/schedule.xlsx": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Export Schedule */
        get: operations["exportSchedule"];
        put?: never;
        post?: never;
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
    "/api/v1/projects/{project_id}/purchase-orders": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Pos */
        get: operations["listPurchaseOrders"];
        put?: never;
        /** Create Po */
        post: operations["createPurchaseOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/projects/{project_id}/quotes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Quotes */
        get: operations["listQuotes"];
        put?: never;
        /** Create Quote */
        post: operations["createQuote"];
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
    "/api/v1/purchase-order-lines/{line_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Line */
        delete: operations["deletePurchaseOrderLine"];
        options?: never;
        head?: never;
        /** Update Line */
        patch: operations["updatePurchaseOrderLine"];
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Po */
        get: operations["getPurchaseOrder"];
        put?: never;
        post?: never;
        /** Delete Po */
        delete: operations["deletePurchaseOrder"];
        options?: never;
        head?: never;
        /** Update Po */
        patch: operations["updatePurchaseOrder"];
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/deliveries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Deliveries */
        get: operations["listDeliveries"];
        put?: never;
        /** Create Delivery */
        post: operations["createDelivery"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Attach File */
        post: operations["attachPurchaseOrderFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/files/{file_id}": {
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
        delete: operations["detachPurchaseOrderFile"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/invoices": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Invoices */
        get: operations["listInvoices"];
        put?: never;
        /** Create Invoice */
        post: operations["createInvoice"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/issue": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Issue Po */
        post: operations["issuePurchaseOrder"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/lines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add Lines */
        post: operations["addPurchaseOrderLines"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/purchase-orders/{po_id}/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Change Status */
        post: operations["changePurchaseOrderStatus"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quote-lines/{line_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete Line */
        delete: operations["deleteQuoteLine"];
        options?: never;
        head?: never;
        /** Update Line */
        patch: operations["updateQuoteLine"];
        trace?: never;
    };
    "/api/v1/quote-lines/{line_id}/retain": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Retain Line */
        post: operations["retainQuoteLine"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes/{quote_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Quote */
        get: operations["getQuote"];
        put?: never;
        post?: never;
        /** Delete Quote */
        delete: operations["deleteQuote"];
        options?: never;
        head?: never;
        /** Update Quote */
        patch: operations["updateQuote"];
        trace?: never;
    };
    "/api/v1/quotes/{quote_id}/decline": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Decline Quote */
        post: operations["declineQuote"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes/{quote_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Attach File */
        post: operations["attachQuoteFile"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes/{quote_id}/files/{file_id}": {
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
        delete: operations["detachQuoteFile"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/quotes/{quote_id}/lines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Add Line */
        post: operations["addQuoteLine"];
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
        /** AlertRead */
        AlertRead: {
            /** Categoryid */
            categoryId?: number | null;
            /**
             * Kind
             * @enum {string}
             */
            kind: "budget_90" | "budget_100" | "order_overdue";
            /** Message */
            message: string;
            /** Projectitemid */
            projectItemId?: number | null;
            /** Zoneid */
            zoneId?: number | null;
        };
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
            /** Categoryid */
            categoryId?: number | null;
            /** Notes */
            notes?: string | null;
            /** Zoneid */
            zoneId?: number | null;
        };
        /** BudgetLineRead */
        BudgetLineRead: {
            /** Amountcents */
            amountCents: number;
            /** Categoryid */
            categoryId: number | null;
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Notes */
            notes: string | null;
            /** Projectid */
            projectId: number;
            /** Updatedat */
            updatedAt: string;
            /** Zoneid */
            zoneId: number | null;
        };
        /** BudgetLinesPut */
        BudgetLinesPut: {
            /** Lines */
            lines: components["schemas"]["BudgetLineIn"][];
        };
        /**
         * BudgetRowRead
         * @description One row of the Budget tab: per zone (D8.3 default) or per level-1 category; D8.4 alert level.
         */
        BudgetRowRead: {
            /**
             * Alert
             * @enum {string}
             */
            alert: "none" | "warning" | "over";
            /** Approvedcents */
            approvedCents: number;
            /** Budgetcents */
            budgetCents: number | null;
            /** Categoryid */
            categoryId: number | null;
            /** Engagedcents */
            engagedCents: number;
            /** Label */
            label: string;
            /** Multiplier */
            multiplier: number;
            /** Remainingcents */
            remainingCents: number | null;
            /** Specifiedcents */
            specifiedCents: number;
            /** Zoneid */
            zoneId: number | null;
        };
        /** BudgetSummaryRead */
        BudgetSummaryRead: {
            /**
             * Alert
             * @enum {string}
             */
            alert: "none" | "warning" | "over";
            /** Approvedcents */
            approvedCents: number;
            /** Bycategory */
            byCategory: components["schemas"]["BudgetRowRead"][];
            /** Byzone */
            byZone: components["schemas"]["BudgetRowRead"][];
            /** Contingencybp */
            contingencyBp: number;
            /** Contingencycents */
            contingencyCents: number;
            /** Engagedcents */
            engagedCents: number;
            /** Globalcents */
            globalCents: number | null;
            /** Invoicedcents */
            invoicedCents: number;
            /** Paidcents */
            paidCents: number;
            /** Remainingcents */
            remainingCents: number | null;
            /** Specifiedcents */
            specifiedCents: number;
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
        /** DashboardProjectRead */
        DashboardProjectRead: {
            /**
             * Alert
             * @enum {string}
             */
            alert: "none" | "warning" | "over";
            /** Approvedcents */
            approvedCents: number;
            /** Budgetcents */
            budgetCents: number | null;
            /** Clientname */
            clientName: string;
            /** Code */
            code: string;
            /** Draftlines */
            draftLines: number;
            /** Dueon */
            dueOn: string | null;
            /** Name */
            name: string;
            /** Onholdlines */
            onHoldLines: number;
            /** Overduelines */
            overdueLines: number;
            /** Projectid */
            projectId: number;
            /** Remainingcents */
            remainingCents: number | null;
            /** Specifiedcents */
            specifiedCents: number;
            /** Status */
            status: string;
        };
        /** DeliveryCreate */
        DeliveryCreate: {
            /** Lines */
            lines: components["schemas"]["DeliveryLineIn"][];
            /** Notes */
            notes?: string | null;
            /** Receivedon */
            receivedOn: string;
            /** Reference */
            reference?: string | null;
        };
        /** DeliveryLineIn */
        DeliveryLineIn: {
            /** Purchaseorderlineid */
            purchaseOrderLineId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Remarks */
            remarks?: string | null;
        };
        /** DeliveryLineRead */
        DeliveryLineRead: {
            /** Id */
            id: number;
            /** Itemcode */
            itemCode: string;
            /** Purchaseorderlineid */
            purchaseOrderLineId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Remarks */
            remarks: string | null;
        };
        /** DeliveryRead */
        DeliveryRead: {
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Lines */
            lines: components["schemas"]["DeliveryLineRead"][];
            /** Notes */
            notes: string | null;
            /** Purchaseorderid */
            purchaseOrderId: number;
            /** Receivedon */
            receivedOn: string;
            /** Reference */
            reference: string | null;
            /** Updatedat */
            updatedAt: string;
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
        /** InvoiceCreate */
        InvoiceCreate: {
            /** Amounthtcents */
            amountHtCents: number;
            /** Dueon */
            dueOn?: string | null;
            /** Invoicedon */
            invoicedOn: string;
            /**
             * Kind
             * @default balance
             * @enum {string}
             */
            kind: "deposit" | "balance" | "other";
            /** Notes */
            notes?: string | null;
            /** Reference */
            reference: string;
            /**
             * Vatcents
             * @default 0
             */
            vatCents: number;
        };
        /** InvoicePay */
        InvoicePay: {
            /** Paidon */
            paidOn: string;
            /** Paymentref */
            paymentRef?: string | null;
        };
        /** InvoiceRead */
        InvoiceRead: {
            /** Amounthtcents */
            amountHtCents: number;
            /** Amounthteurcents */
            amountHtEurCents: number;
            /** Createdat */
            createdAt: string;
            /** Dueon */
            dueOn: string | null;
            /** Id */
            id: number;
            /** Invoicedon */
            invoicedOn: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "deposit" | "balance" | "other";
            /** Notes */
            notes: string | null;
            /** Paidon */
            paidOn: string | null;
            /** Paymentref */
            paymentRef: string | null;
            /** Purchaseorderid */
            purchaseOrderId: number;
            /** Reference */
            reference: string;
            /** Ttccents */
            ttcCents: number;
            /** Updatedat */
            updatedAt: string;
            /** Vatcents */
            vatCents: number;
        };
        /** InvoiceUpdate */
        InvoiceUpdate: {
            /** Amounthtcents */
            amountHtCents?: number | null;
            /** Dueon */
            dueOn?: string | null;
            /** Invoicedon */
            invoicedOn?: string | null;
            /** Kind */
            kind?: ("deposit" | "balance" | "other") | null;
            /** Notes */
            notes?: string | null;
            /** Paidon */
            paidOn?: string | null;
            /** Paymentref */
            paymentRef?: string | null;
            /** Reference */
            reference?: string | null;
            /** Vatcents */
            vatCents?: number | null;
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
             * @default other
             * @enum {string}
             */
            kind: "image" | "quote" | "approval" | "drawing" | "other";
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
            kind: "image" | "quote" | "approval" | "drawing" | "other";
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
            kind?: ("image" | "quote" | "approval" | "drawing" | "other") | null;
            /** Sortorder */
            sortOrder?: number | null;
        };
        /**
         * ItemQuoteRead
         * @description One row of the comparison of `GET /project-items/{id}/quotes`.
         */
        ItemQuoteRead: {
            /** Currency */
            currency: string;
            /** Declined */
            declined: boolean;
            /** Description */
            description: string | null;
            /** Discountbp */
            discountBp: number;
            /** Fxratemicro */
            fxRateMicro: number;
            /** Leadtimeweeks */
            leadTimeWeeks: number | null;
            /** Netunitcents */
            netUnitCents: number;
            /** Netuniteurcents */
            netUnitEurCents: number;
            /** Quoteid */
            quoteId: number;
            /** Quotelineid */
            quoteLineId: number;
            /** Quotedon */
            quotedOn: string | null;
            /** Reference */
            reference: string;
            /** Retained */
            retained: boolean;
            /** Supplierid */
            supplierId: number;
            /** Suppliername */
            supplierName: string;
            /** Unitcostcents */
            unitCostCents: number;
            /** Validuntil */
            validUntil: string | null;
        };
        /** LineAmountsRead */
        LineAmountsRead: {
            /** Amountcounted */
            amountCounted: boolean;
            /** Approvedcents */
            approvedCents: number | null;
            /** Counted */
            counted: boolean;
            /** Itemcode */
            itemCode: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "ffe" | "ose" | "custom" | "existing" | "fee";
            /** Netunitcents */
            netUnitCents: number;
            /** Netuniteurcents */
            netUnitEurCents: number;
            /** Orderby */
            orderBy: string | null;
            /** Orderoverdue */
            orderOverdue: boolean;
            /** Projectitemid */
            projectItemId: number;
            /**
             * Status
             * @enum {string}
             */
            status: "draft" | "specified" | "quoted" | "approved" | "ordered" | "delivered" | "installed" | "cancelled" | "replaced";
            /** Totalhtcents */
            totalHtCents: number;
            /** Totalqtymilli */
            totalQtyMilli: number;
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
        /** PlacementCreate */
        PlacementCreate: {
            /** Notes */
            notes?: string | null;
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
            /** Zoneid */
            zoneId?: number | null;
        };
        /** PlacementRead */
        PlacementRead: {
            /** Createdat */
            createdAt: string;
            /** Id */
            id: number;
            /** Notes */
            notes: string | null;
            /** Projectitemid */
            projectItemId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Sortorder */
            sortOrder: number;
            /** Updatedat */
            updatedAt: string;
            /** Zoneid */
            zoneId: number | null;
        };
        /** PlacementUpdate */
        PlacementUpdate: {
            /** Notes */
            notes?: string | null;
            /** Qtymilli */
            qtyMilli?: number | null;
            /** Sortorder */
            sortOrder?: number | null;
            /** Zoneid */
            zoneId?: number | null;
        };
        /** PoCreate */
        PoCreate: {
            /** Expecteddeliveryon */
            expectedDeliveryOn?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /**
             * Itemids
             * @default []
             */
            itemIds: number[];
            /** Notes */
            notes?: string | null;
            /** Supplierid */
            supplierId: number;
        };
        /** PoFileAttach */
        PoFileAttach: {
            /** Caption */
            caption?: string | null;
            /** Fileid */
            fileId: number;
        };
        /** PoFileRead */
        PoFileRead: {
            /** Caption */
            caption: string | null;
            /** Ext */
            ext: string;
            /** Fileid */
            fileId: number;
            /** Mimetype */
            mimeType: string;
            /** Originalname */
            originalName: string;
            /** Sha256 */
            sha256: string;
            /** Sizebytes */
            sizeBytes: number;
        };
        /** PoLineRead */
        PoLineRead: {
            /** Description */
            description: string;
            /** Discountbp */
            discountBp: number;
            /** Id */
            id: number;
            /** Itemcode */
            itemCode: string;
            /** Itemstatus */
            itemStatus: string;
            /** Netunitcents */
            netUnitCents: number;
            /** Netuniteurcents */
            netUnitEurCents: number;
            /** Projectitemid */
            projectItemId: number;
            /** Purchaseorderid */
            purchaseOrderId: number;
            /** Qtymilli */
            qtyMilli: number;
            /** Receivedqtymilli */
            receivedQtyMilli: number;
            /** Sortorder */
            sortOrder: number;
            /** Totalcents */
            totalCents: number;
            /** Totaleurcents */
            totalEurCents: number;
            /** Unitcostcents */
            unitCostCents: number;
            /** Vatratebp */
            vatRateBp: number;
        };
        /** PoLineUpdate */
        PoLineUpdate: {
            /** Description */
            description?: string | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Qtymilli */
            qtyMilli?: number | null;
            /** Sortorder */
            sortOrder?: number | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
            /** Vatratebp */
            vatRateBp?: number | null;
        };
        /** PoLinesAdd */
        PoLinesAdd: {
            /** Itemids */
            itemIds: number[];
        };
        /** PoRead */
        PoRead: {
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Deliveriescount */
            deliveriesCount: number;
            /** Deliveryaddress */
            deliveryAddress: string | null;
            /** Deliverycontact */
            deliveryContact: string | null;
            /** Expecteddeliveryon */
            expectedDeliveryOn: string | null;
            /** Files */
            files: components["schemas"]["PoFileRead"][];
            /** Fxratemicro */
            fxRateMicro: number;
            /** Id */
            id: number;
            /** Internalnotes */
            internalNotes: string | null;
            /** Invoicedhtcents */
            invoicedHtCents: number;
            /** Issuedon */
            issuedOn: string | null;
            /** Lines */
            lines: components["schemas"]["PoLineRead"][];
            /** Notes */
            notes: string | null;
            /** Number */
            number: string;
            /** Paidhtcents */
            paidHtCents: number;
            /** Paymentterms */
            paymentTerms: string | null;
            /** Projectid */
            projectId: number;
            /**
             * Status
             * @enum {string}
             */
            status: "draft" | "issued" | "acknowledged" | "partially_delivered" | "closed" | "cancelled";
            /** Supplierid */
            supplierId: number;
            /** Suppliername */
            supplierName: string;
            /** Supplierref */
            supplierRef: string | null;
            /** Totalcents */
            totalCents: number;
            /** Totaleurcents */
            totalEurCents: number;
            /** Ttceurcents */
            ttcEurCents: number;
            /** Updatedat */
            updatedAt: string;
            /** Vatbyratebp */
            vatByRateBp: {
                [key: string]: number;
            };
            /** Vatcents */
            vatCents: number;
        };
        /** PoStatusChange */
        PoStatusChange: {
            /** Note */
            note?: string | null;
            /**
             * Status
             * @enum {string}
             */
            status: "acknowledged" | "closed" | "cancelled";
        };
        /** PoUpdate */
        PoUpdate: {
            /** Deliveryaddress */
            deliveryAddress?: string | null;
            /** Deliverycontact */
            deliveryContact?: string | null;
            /** Expecteddeliveryon */
            expectedDeliveryOn?: string | null;
            /** Internalnotes */
            internalNotes?: string | null;
            /** Notes */
            notes?: string | null;
            /** Paymentterms */
            paymentTerms?: string | null;
            /** Supplierref */
            supplierRef?: string | null;
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
            /** Contingencybp */
            contingencyBp?: number | null;
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
        /** ProjectFileRead */
        ProjectFileRead: {
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
            kind: "schedule_xlsx" | "book_pdf";
            /** Originalname */
            originalName: string;
            /** Projectid */
            projectId: number;
            /** Sizebytes */
            sizeBytes: number;
            /**
             * Variant
             * @enum {string}
             */
            variant: "internal" | "client";
        };
        /**
         * ProjectItemCreate
         * @description From a product (`productId`: every absent field is copied, DATA_MODEL §6) or free.
         */
        ProjectItemCreate: {
            /** Categoryid */
            categoryId?: number | null;
            /** Clientdescription */
            clientDescription?: string | null;
            /** Color */
            color?: string | null;
            /** Currency */
            currency?: string | null;
            /** Depthmm */
            depthMm?: number | null;
            /** Diametermm */
            diameterMm?: number | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Expecteddeliveryon */
            expectedDeliveryOn?: string | null;
            /** Finish */
            finish?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Heightmm */
            heightMm?: number | null;
            /** Internalnotes */
            internalNotes?: string | null;
            /** Itemcode */
            itemCode?: string | null;
            /**
             * Kind
             * @default ffe
             * @enum {string}
             */
            kind: "ffe" | "ose" | "custom" | "existing" | "fee";
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Materials */
            materials?: string | null;
            /** Name */
            name?: string | null;
            /** Placements */
            placements?: components["schemas"]["PlacementCreate"][] | null;
            /** Productid */
            productId?: number | null;
            /** Quoteref */
            quoteRef?: string | null;
            /** Quotevaliduntil */
            quoteValidUntil?: string | null;
            /** Quotedon */
            quotedOn?: string | null;
            /** Requiredonsite */
            requiredOnSite?: string | null;
            /**
             * Sortorder
             * @default 0
             */
            sortOrder: number;
            /** Supplierid */
            supplierId?: number | null;
            /** Unit */
            unit?: ("piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll") | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
            /** Vatratebp */
            vatRateBp?: number | null;
            /** Widthmm */
            widthMm?: number | null;
        };
        /** ProjectItemRead */
        ProjectItemRead: {
            /** Approvedat */
            approvedAt: string | null;
            /** Approvedtotalqtymilli */
            approvedTotalQtyMilli: number | null;
            /** Approvedunitnetcents */
            approvedUnitNetCents: number | null;
            /** Categoryid */
            categoryId: number;
            /** Clientdescription */
            clientDescription: string | null;
            /** Color */
            color: string | null;
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Depthmm */
            depthMm: number | null;
            /** Diametermm */
            diameterMm: number | null;
            /** Discountbp */
            discountBp: number;
            /** Expecteddeliveryon */
            expectedDeliveryOn: string | null;
            /** Files */
            files: components["schemas"]["ItemFileRead"][];
            /** Finish */
            finish: string | null;
            /** Fxratemicro */
            fxRateMicro: number;
            /** Heightmm */
            heightMm: number | null;
            /** Id */
            id: number;
            /** Internalnotes */
            internalNotes: string | null;
            /** Itemcode */
            itemCode: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "ffe" | "ose" | "custom" | "existing" | "fee";
            /** Leadtimeweeks */
            leadTimeWeeks: number | null;
            /** Materials */
            materials: string | null;
            /** Name */
            name: string;
            /** Onhold */
            onHold: boolean;
            /** Orderref */
            orderRef: string | null;
            /** Placements */
            placements: components["schemas"]["PlacementRead"][];
            /** Productid */
            productId: number | null;
            /** Projectid */
            projectId: number;
            /** Quoteref */
            quoteRef: string | null;
            /** Quotevaliduntil */
            quoteValidUntil: string | null;
            /** Quotedon */
            quotedOn: string | null;
            /** Replacedbyid */
            replacedById: number | null;
            /** Requiredonsite */
            requiredOnSite: string | null;
            /** Sortorder */
            sortOrder: number;
            /**
             * Status
             * @enum {string}
             */
            status: "draft" | "specified" | "quoted" | "approved" | "ordered" | "delivered" | "installed" | "cancelled" | "replaced";
            /** Supplierid */
            supplierId: number | null;
            /**
             * Unit
             * @enum {string}
             */
            unit: "piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll";
            /** Unitcostcents */
            unitCostCents: number;
            /** Updatedat */
            updatedAt: string;
            /** Vatratebp */
            vatRateBp: number;
            /** Widthmm */
            widthMm: number | null;
        };
        /**
         * ProjectItemUpdate
         * @description Absent = unchanged. `status` never here (POST …/status), placements have their own routes.
         */
        ProjectItemUpdate: {
            /** Categoryid */
            categoryId?: number | null;
            /** Clientdescription */
            clientDescription?: string | null;
            /** Color */
            color?: string | null;
            /** Currency */
            currency?: string | null;
            /** Depthmm */
            depthMm?: number | null;
            /** Diametermm */
            diameterMm?: number | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Expecteddeliveryon */
            expectedDeliveryOn?: string | null;
            /** Finish */
            finish?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Heightmm */
            heightMm?: number | null;
            /** Internalnotes */
            internalNotes?: string | null;
            /** Itemcode */
            itemCode?: string | null;
            /** Kind */
            kind?: ("ffe" | "ose" | "custom" | "existing" | "fee") | null;
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Materials */
            materials?: string | null;
            /** Name */
            name?: string | null;
            /** Onhold */
            onHold?: boolean | null;
            /** Orderref */
            orderRef?: string | null;
            /** Productid */
            productId?: number | null;
            /** Quoteref */
            quoteRef?: string | null;
            /** Quotevaliduntil */
            quoteValidUntil?: string | null;
            /** Quotedon */
            quotedOn?: string | null;
            /** Requiredonsite */
            requiredOnSite?: string | null;
            /** Sortorder */
            sortOrder?: number | null;
            /** Supplierid */
            supplierId?: number | null;
            /** Unit */
            unit?: ("piece" | "pair" | "set" | "lot" | "m" | "m2" | "roll") | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
            /** Vatratebp */
            vatRateBp?: number | null;
            /** Widthmm */
            widthMm?: number | null;
        };
        /** ProjectRead */
        ProjectRead: {
            /** Clientid */
            clientId: number;
            /** Code */
            code: string;
            /** Contingencybp */
            contingencyBp: number;
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
        /** ProjectSummaryRead */
        ProjectSummaryRead: {
            /** Approvedcents */
            approvedCents: number;
            budget?: components["schemas"]["BudgetSummaryRead"] | null;
            /** Lines */
            lines: components["schemas"]["LineAmountsRead"][];
            /** Osecents */
            oseCents: number;
            /** Projectid */
            projectId: number;
            /** Specifiedcents */
            specifiedCents: number;
            /** Ttccents */
            ttcCents: number;
            /** Vatbyratebp */
            vatByRateBp: {
                [key: string]: number;
            };
            /** Vatcents */
            vatCents: number;
            /** Zones */
            zones: components["schemas"]["ZoneAmountsRead"][];
        };
        /** ProjectUpdate */
        ProjectUpdate: {
            /** Clientid */
            clientId?: number | null;
            /** Code */
            code?: string | null;
            /** Contingencybp */
            contingencyBp?: number | null;
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
        /** QuoteCreate */
        QuoteCreate: {
            /** Currency */
            currency?: string | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /**
             * Lines
             * @default []
             */
            lines: components["schemas"]["QuoteLineCreate"][];
            /** Notes */
            notes?: string | null;
            /** Quotedon */
            quotedOn?: string | null;
            /** Reference */
            reference: string;
            /** Supplierid */
            supplierId: number;
            /** Validuntil */
            validUntil?: string | null;
        };
        /** QuoteFileAttach */
        QuoteFileAttach: {
            /** Caption */
            caption?: string | null;
            /** Fileid */
            fileId: number;
        };
        /** QuoteFileRead */
        QuoteFileRead: {
            /** Caption */
            caption: string | null;
            /** Ext */
            ext: string;
            /** Fileid */
            fileId: number;
            /** Mimetype */
            mimeType: string;
            /** Originalname */
            originalName: string;
            /** Sha256 */
            sha256: string;
            /** Sizebytes */
            sizeBytes: number;
        };
        /** QuoteLineCreate */
        QuoteLineCreate: {
            /** Description */
            description?: string | null;
            /**
             * Discountbp
             * @default 0
             */
            discountBp: number;
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Notes */
            notes?: string | null;
            /** Projectitemid */
            projectItemId: number;
            /** Unitcostcents */
            unitCostCents: number;
        };
        /** QuoteLineRead */
        QuoteLineRead: {
            /** Createdat */
            createdAt: string;
            /** Description */
            description: string | null;
            /** Discountbp */
            discountBp: number;
            /** Id */
            id: number;
            /** Itemcode */
            itemCode: string;
            /** Itemname */
            itemName: string;
            /** Leadtimeweeks */
            leadTimeWeeks: number | null;
            /** Netunitcents */
            netUnitCents: number;
            /** Netuniteurcents */
            netUnitEurCents: number;
            /** Notes */
            notes: string | null;
            /** Projectitemid */
            projectItemId: number;
            /** Quoteid */
            quoteId: number;
            /** Retainedat */
            retainedAt: string | null;
            /** Unitcostcents */
            unitCostCents: number;
            /** Updatedat */
            updatedAt: string;
        };
        /** QuoteLineUpdate */
        QuoteLineUpdate: {
            /** Description */
            description?: string | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Leadtimeweeks */
            leadTimeWeeks?: number | null;
            /** Notes */
            notes?: string | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
        };
        /** QuoteRead */
        QuoteRead: {
            /** Createdat */
            createdAt: string;
            /** Currency */
            currency: string;
            /** Declinedat */
            declinedAt: string | null;
            /** Files */
            files: components["schemas"]["QuoteFileRead"][];
            /** Fxratemicro */
            fxRateMicro: number;
            /** Id */
            id: number;
            /** Lines */
            lines: components["schemas"]["QuoteLineRead"][];
            /** Notes */
            notes: string | null;
            /** Projectid */
            projectId: number;
            /** Quotedon */
            quotedOn: string | null;
            /** Reference */
            reference: string;
            /** Retainedcount */
            retainedCount: number;
            /** Supplierid */
            supplierId: number;
            /** Suppliername */
            supplierName: string;
            /** Updatedat */
            updatedAt: string;
            /** Validuntil */
            validUntil: string | null;
        };
        /** QuoteUpdate */
        QuoteUpdate: {
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Notes */
            notes?: string | null;
            /** Quotedon */
            quotedOn?: string | null;
            /** Reference */
            reference?: string | null;
            /** Validuntil */
            validUntil?: string | null;
        };
        /**
         * ReplaceProduct
         * @description « Remplacer le produit » from `approved`: a new line takes the code, the old one is `replaced`.
         */
        ReplaceProduct: {
            /** Currency */
            currency?: string | null;
            /** Discountbp */
            discountBp?: number | null;
            /** Fxratemicro */
            fxRateMicro?: number | null;
            /** Note */
            note?: string | null;
            /** Productid */
            productId: number;
            /** Supplierid */
            supplierId?: number | null;
            /** Unitcostcents */
            unitCostCents?: number | null;
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
            /** Agencysiret */
            agencySiret: string | null;
            /** Agencyvatnumber */
            agencyVatNumber: string | null;
            /** Basecurrency */
            baseCurrency: string;
            /** Createdat */
            createdAt: string;
            /** Defaultcontingencybp */
            defaultContingencyBp: number;
            /** Defaultvatbp */
            defaultVatBp: number;
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
            /** Agencysiret */
            agencySiret?: string | null;
            /** Agencyvatnumber */
            agencyVatNumber?: string | null;
            /** Defaultcontingencybp */
            defaultContingencyBp?: number | null;
            /** Defaultvatbp */
            defaultVatBp?: number | null;
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
            status: "draft" | "specified" | "quoted" | "approved" | "ordered" | "delivered" | "installed" | "cancelled" | "replaced";
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
        /** ZoneAmountsRead */
        ZoneAmountsRead: {
            /** Multiplier */
            multiplier: number;
            /** Specifiedcents */
            specifiedCents: number;
            /** Zonecode */
            zoneCode: string | null;
            /** Zoneid */
            zoneId: number | null;
            /** Zonename */
            zoneName: string;
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
    getDashboard: {
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
                    "application/json": components["schemas"]["DashboardProjectRead"][];
                };
            };
        };
    };
    deleteDelivery: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                delivery_id: number;
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
                    "application/json": components["schemas"]["PoRead"];
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
    deleteInvoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: number;
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
    updateInvoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoiceUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InvoiceRead"];
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
    payInvoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                invoice_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoicePay"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InvoiceRead"];
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
    listProjectItemQuotes: {
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
                    "application/json": components["schemas"]["ItemQuoteRead"][];
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
    refreshProjectItemFromCatalogue: {
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
    replaceProjectItemProduct: {
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
                "application/json": components["schemas"]["ReplaceProduct"];
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
    listProjectAlerts: {
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
                    "application/json": components["schemas"]["AlertRead"][];
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
    exportSchedule: {
        parameters: {
            query?: {
                variant?: "internal" | "client";
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
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": unknown;
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
                zoneId?: number | null;
                status?: ("draft" | "specified" | "quoted" | "approved" | "ordered" | "delivered" | "installed" | "cancelled" | "replaced") | null;
                categoryId?: number | null;
                supplierId?: number | null;
                kind?: ("ffe" | "ose" | "custom" | "existing" | "fee") | null;
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
    listPurchaseOrders: {
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
                    "application/json": components["schemas"]["PoRead"][];
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
    createPurchaseOrder: {
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
                "application/json": components["schemas"]["PoCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    listQuotes: {
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
                    "application/json": components["schemas"]["QuoteRead"][];
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
    createQuote: {
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
                "application/json": components["schemas"]["QuoteCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteRead"];
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
    deletePurchaseOrderLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: number;
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
                    "application/json": components["schemas"]["PoRead"];
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
    updatePurchaseOrderLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoLineUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    getPurchaseOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
                    "application/json": components["schemas"]["PoRead"];
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
    deletePurchaseOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
    updatePurchaseOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    listDeliveries: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
                    "application/json": components["schemas"]["DeliveryRead"][];
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
    createDelivery: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DeliveryCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DeliveryRead"];
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
    attachPurchaseOrderFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoFileAttach"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    detachPurchaseOrderFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
                    "application/json": components["schemas"]["PoRead"];
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
    listInvoices: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
                    "application/json": components["schemas"]["InvoiceRead"][];
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
    createInvoice: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["InvoiceCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InvoiceRead"];
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
    issuePurchaseOrder: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
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
                    "application/json": components["schemas"]["PoRead"];
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
    addPurchaseOrderLines: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoLinesAdd"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    changePurchaseOrderStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                po_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PoStatusChange"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PoRead"];
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
    deleteQuoteLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: number;
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
                    "application/json": components["schemas"]["QuoteRead"];
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
    updateQuoteLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteLineUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteRead"];
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
    retainQuoteLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                line_id: number;
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
    getQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
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
                    "application/json": components["schemas"]["QuoteRead"];
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
    deleteQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
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
    updateQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteUpdate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteRead"];
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
    declineQuote: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
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
                    "application/json": components["schemas"]["QuoteRead"];
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
    attachQuoteFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteFileAttach"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteRead"];
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
    detachQuoteFile: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
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
                    "application/json": components["schemas"]["QuoteRead"];
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
    addQuoteLine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                quote_id: number;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuoteLineCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuoteRead"];
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

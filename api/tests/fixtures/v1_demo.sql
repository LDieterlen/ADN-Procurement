-- Frozen v1 database (ADR-0020): schema 0001 + the 21 product types + the demo project, dumped
-- with sqlite3 iterdump on 2026-10-14. NEVER regenerate it: every later migration must upgrade it
-- without losing a row (tests/test_v1_upgrade.py).
BEGIN TRANSACTION;
CREATE TABLE alembic_version (
	version_num VARCHAR(32) NOT NULL, 
	CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);
INSERT INTO "alembic_version" VALUES('0001');
CREATE TABLE budget_line (
	id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	scope TEXT NOT NULL, 
	location_id INTEGER, 
	zone TEXT, 
	family TEXT, 
	supplier_id INTEGER, 
	amount_cents INTEGER NOT NULL, 
	notes TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_budget_line PRIMARY KEY (id), 
	CONSTRAINT ck_budget_line_scope_family CHECK ((scope = 'family') = (family IS NOT NULL)), 
	CONSTRAINT ck_budget_line_scope_location CHECK ((scope = 'location') = (location_id IS NOT NULL)), 
	CONSTRAINT ck_budget_line_scope_supplier CHECK ((scope = 'supplier') = (supplier_id IS NOT NULL)), 
	CONSTRAINT ck_budget_line_scope_zone CHECK ((scope = 'zone') = (zone IS NOT NULL)), 
	CONSTRAINT ck_budget_line_scope_enum CHECK (scope IN ('global', 'location', 'zone', 'family', 'supplier')), 
	CONSTRAINT ck_budget_line_amount_min CHECK (amount_cents >= 0), 
	CONSTRAINT fk_budget_line_location_id_location FOREIGN KEY(location_id, project_id) REFERENCES location (id, project_id) ON DELETE RESTRICT, 
	CONSTRAINT fk_budget_line_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_budget_line_supplier_id_supplier FOREIGN KEY(supplier_id) REFERENCES supplier (id) ON DELETE RESTRICT
)
 STRICT

;
INSERT INTO "budget_line" VALUES(1,1,'global',NULL,NULL,NULL,NULL,85000000,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "budget_line" VALUES(2,1,'zone',NULL,'Hébergement',NULL,NULL,50000000,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "budget_line" VALUES(3,1,'zone',NULL,'Zones communes',NULL,NULL,30000000,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE capture (
	id INTEGER NOT NULL, 
	url TEXT NOT NULL, 
	name TEXT, 
	brand TEXT, 
	reference TEXT, 
	image_url TEXT, 
	image_urls TEXT, 
	price_cents INTEGER, 
	currency TEXT, 
	description TEXT, 
	type_code TEXT, 
	dimensions TEXT, 
	lead_time TEXT, 
	finish TEXT, 
	source TEXT NOT NULL, 
	created_at TEXT NOT NULL, 
	CONSTRAINT pk_capture PRIMARY KEY (id), 
	CONSTRAINT ck_capture_source_values CHECK (source IN ('json-ld','opengraph','title')), 
	CONSTRAINT ck_capture_url_not_empty CHECK (length(url) > 0), 
	CONSTRAINT ck_capture_price_cents_min CHECK (price_cents IS NULL OR price_cents >= 0)
)
 STRICT

;
CREATE TABLE capture_image (
	id INTEGER NOT NULL, 
	capture_id INTEGER NOT NULL, 
	file_id INTEGER NOT NULL, 
	sort_order INTEGER NOT NULL, 
	CONSTRAINT pk_capture_image PRIMARY KEY (id), 
	CONSTRAINT ck_capture_image_sort_order_min CHECK (sort_order >= 0), 
	CONSTRAINT fk_capture_image_capture_id_capture FOREIGN KEY(capture_id) REFERENCES capture (id) ON DELETE CASCADE, 
	CONSTRAINT fk_capture_image_file_id_file FOREIGN KEY(file_id) REFERENCES file (id) ON DELETE RESTRICT, 
	CONSTRAINT uq_capture_image_file UNIQUE (capture_id, file_id)
)
 STRICT

;
CREATE TABLE category (
	id INTEGER NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	sort_order INTEGER DEFAULT '0' NOT NULL, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_category PRIMARY KEY (id), 
	CONSTRAINT ck_category_code_format CHECK (code NOT GLOB '*[^A-Z]*' AND length(code) BETWEEN 2 AND 4), 
	CONSTRAINT ck_category_name_not_empty CHECK (length(name) > 0), 
	CONSTRAINT uq_category_code UNIQUE (code)
)
 STRICT

;
INSERT INTO "category" VALUES(1,'AS','Assise',10,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(2,'TAB','Table',20,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(3,'TBR','Tabouret',30,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(4,'AGE','Agencement',40,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(5,'LIT','Lit',50,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(6,'TAP','Tapis',60,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(7,'RID','Rideau',70,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(8,'LIN','Linge',80,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(9,'LUA','Luminaire architectural',90,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(10,'LUD','Luminaire décoratif',100,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(11,'MIR','Miroir',110,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(12,'DEC','Décoration',120,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(13,'ART','Œuvre d''art',130,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(14,'ACC','Accessoire',140,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(15,'ACA','Accastillage',150,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(16,'QUI','Quincaillerie',160,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(17,'SAN','Sanitaire',165,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(18,'SIG','Signalétique',170,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(19,'REV','Revêtement',175,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(20,'EQU','Équipement',180,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "category" VALUES(21,'DIV','Divers',190,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE choice (
	id INTEGER NOT NULL, 
	list TEXT NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	sort_order INTEGER NOT NULL, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_choice PRIMARY KEY (id), 
	CONSTRAINT ck_choice_list_values CHECK (list IN ('family','usage','prestation')), 
	CONSTRAINT ck_choice_code_not_empty CHECK (length(code) > 0), 
	CONSTRAINT ck_choice_name_not_empty CHECK (length(name) > 0), 
	CONSTRAINT uq_choice_list_code UNIQUE (list, code)
)
 STRICT

;
INSERT INTO "choice" VALUES(1,'family','custom','Pièce sur-mesure',10,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(2,'family','joinery','Agencement',20,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(3,'family','ose','OS&E',30,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(4,'family','edition','Pièce d''édition',40,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(5,'family','gallery','Pièce de galerie',50,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(6,'family','artwork','Œuvre d''art',60,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(7,'family','textile','Confection',70,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(8,'usage','indoor','Intérieur',80,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(9,'usage','outdoor','Extérieur',90,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(10,'prestation','manufacturer','Fabricant',100,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(11,'prestation','distributor','Distributeur',110,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(12,'prestation','publisher','Éditeur',120,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
INSERT INTO "choice" VALUES(13,'prestation','artisan','Artisan',130,NULL,'2026-10-14T13:21:30Z','2026-10-14T13:21:30Z');
CREATE TABLE client (
	id INTEGER NOT NULL, 
	name TEXT NOT NULL, 
	kind TEXT DEFAULT 'individual' NOT NULL, 
	contact_name TEXT, 
	email TEXT, 
	phone TEXT, 
	address_line1 TEXT, 
	address_line2 TEXT, 
	postal_code TEXT, 
	city TEXT, 
	country_code TEXT DEFAULT 'FR' NOT NULL, 
	siren TEXT, 
	notes TEXT, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_client PRIMARY KEY (id), 
	CONSTRAINT ck_client_kind_enum CHECK (kind IN ('individual', 'company')), 
	CONSTRAINT ck_client_siren_format CHECK (siren IS NULL OR siren GLOB '[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]'), 
	CONSTRAINT ck_client_country_code_length CHECK (length(country_code) = 2), 
	CONSTRAINT ck_client_name_not_empty CHECK (length(name) > 0)
)
 STRICT

;
INSERT INTO "client" VALUES(1,'Belvédère Hospitality','company',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'FR',NULL,NULL,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE file (
	id INTEGER NOT NULL, 
	sha256 TEXT NOT NULL, 
	ext TEXT NOT NULL, 
	mime_type TEXT NOT NULL, 
	size_bytes INTEGER NOT NULL, 
	original_name TEXT NOT NULL, 
	source_url TEXT, 
	license_note TEXT, 
	created_at TEXT NOT NULL, 
	CONSTRAINT pk_file PRIMARY KEY (id), 
	CONSTRAINT ck_file_ext_length CHECK (length(ext) BETWEEN 1 AND 10), 
	CONSTRAINT ck_file_sha256_length CHECK (length(sha256) = 64), 
	CONSTRAINT ck_file_size_bytes_min CHECK (size_bytes >= 0), 
	CONSTRAINT uq_file_sha256 UNIQUE (sha256)
)
 STRICT

;
CREATE TABLE item_code_sequence (
	project_id INTEGER NOT NULL, 
	location_code TEXT NOT NULL, 
	prefix TEXT NOT NULL, 
	next_value INTEGER DEFAULT 1 NOT NULL, 
	CONSTRAINT pk_item_code_sequence PRIMARY KEY (project_id, location_code, prefix), 
	CONSTRAINT ck_item_code_sequence_prefix_length CHECK (length(prefix) BETWEEN 2 AND 4), 
	CONSTRAINT ck_item_code_sequence_next_value_min CHECK (next_value >= 1), 
	CONSTRAINT fk_item_code_sequence_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE CASCADE
)
 STRICT

;
INSERT INTO "item_code_sequence" VALUES(1,'LOB','AS',2);
INSERT INTO "item_code_sequence" VALUES(1,'CHA','LUD',2);
INSERT INTO "item_code_sequence" VALUES(1,'SUI','LUD',2);
INSERT INTO "item_code_sequence" VALUES(1,'CHA','LIT',2);
INSERT INTO "item_code_sequence" VALUES(1,'BAR','TBR',2);
INSERT INTO "item_code_sequence" VALUES(1,'','FR',2);
CREATE TABLE location (
	id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	zone TEXT, 
	level TEXT, 
	multiplier INTEGER DEFAULT 1 NOT NULL, 
	sort_order INTEGER DEFAULT 0 NOT NULL, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_location PRIMARY KEY (id), 
	CONSTRAINT ck_location_code_not_empty CHECK (length(code) > 0), 
	CONSTRAINT ck_location_name_not_empty CHECK (length(name) > 0), 
	CONSTRAINT ck_location_multiplier_min CHECK (multiplier >= 1), 
	CONSTRAINT fk_location_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE RESTRICT, 
	CONSTRAINT uq_location_id UNIQUE (id, project_id), 
	CONSTRAINT uq_location_project_id UNIQUE (project_id, code)
)
 STRICT

;
INSERT INTO "location" VALUES(1,1,'LOB','Lobby','Zones communes','R0',1,10,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "location" VALUES(2,1,'BAR','Bar','Zones communes','R0',1,20,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "location" VALUES(3,1,'CHA','Chambre typo A','Hébergement','R+1',24,30,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "location" VALUES(4,1,'SUI','Junior suite','Hébergement','R+3',4,40,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE professional (
	id INTEGER NOT NULL, 
	name TEXT NOT NULL, 
	kind TEXT DEFAULT 'manufacturer' NOT NULL, 
	specialty TEXT, 
	contact_name TEXT, 
	phone TEXT, 
	mobile TEXT, 
	email TEXT, 
	contact2_name TEXT, 
	contact2_phone TEXT, 
	contact2_email TEXT, 
	website TEXT, 
	notes TEXT, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_professional PRIMARY KEY (id), 
	CONSTRAINT ck_professional_name_not_empty CHECK (length(name) > 0)
)
 STRICT

;
CREATE TABLE project (
	id INTEGER NOT NULL, 
	code TEXT NOT NULL, 
	name TEXT NOT NULL, 
	client_id INTEGER NOT NULL, 
	status TEXT DEFAULT 'prospect' NOT NULL, 
	site_address TEXT, 
	due_on TEXT, 
	notes TEXT, 
	indice TEXT, 
	indice_changed_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_project PRIMARY KEY (id), 
	CONSTRAINT ck_project_due_on_date CHECK (due_on IS NULL OR due_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'), 
	CONSTRAINT ck_project_status_enum CHECK (status IN ('prospect', 'active', 'delivered', 'closed', 'cancelled')), 
	CONSTRAINT ck_project_code_not_empty CHECK (length(code) > 0), 
	CONSTRAINT ck_project_name_not_empty CHECK (length(name) > 0), 
	CONSTRAINT fk_project_client_id_client FOREIGN KEY(client_id) REFERENCES client (id) ON DELETE RESTRICT, 
	CONSTRAINT uq_project_code UNIQUE (code)
)
 STRICT

;
INSERT INTO "project" VALUES(1,'DEMO-001','Hôtel Le Belvédère — ouverture',1,'prospect',NULL,NULL,NULL,NULL,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE project_file (
	id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	file_id INTEGER NOT NULL, 
	kind TEXT NOT NULL, 
	issued_at TEXT NOT NULL, 
	indice TEXT, 
	CONSTRAINT pk_project_file PRIMARY KEY (id), 
	CONSTRAINT ck_project_file_kind_enum CHECK (kind IN ('sheets_pdf', 'list_pdf')), 
	CONSTRAINT fk_project_file_file_id_file FOREIGN KEY(file_id) REFERENCES file (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_project_file_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE RESTRICT
)
 STRICT

;
CREATE TABLE project_indice (
	id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	indice TEXT NOT NULL, 
	declared_at TEXT NOT NULL, 
	CONSTRAINT pk_project_indice PRIMARY KEY (id), 
	CONSTRAINT ck_project_indice_indice_not_empty CHECK (length(indice) > 0), 
	CONSTRAINT fk_project_indice_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE CASCADE, 
	CONSTRAINT uq_project_indice_letter UNIQUE (project_id, indice)
)
 STRICT

;
CREATE TABLE project_item (
	id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	item_code TEXT, 
	kind TEXT DEFAULT 'product' NOT NULL, 
	category_id INTEGER, 
	supplier_id INTEGER, 
	name TEXT NOT NULL, 
	product_name TEXT NOT NULL, 
	reference TEXT, 
	family TEXT, 
	usage TEXT, 
	finish TEXT, 
	dimensions TEXT, 
	lead_time TEXT, 
	source_url TEXT, 
	comments TEXT, 
	unit_cost_cents INTEGER DEFAULT 0 NOT NULL, 
	currency TEXT DEFAULT 'EUR' NOT NULL, 
	fx_rate_micro INTEGER DEFAULT (1000000) NOT NULL, 
	discount_bp INTEGER DEFAULT 0 NOT NULL, 
	quote_ref TEXT, 
	quote_indice TEXT, 
	quote_url TEXT, 
	status TEXT DEFAULT 'to_quote' NOT NULL, 
	indice TEXT, 
	sort_order INTEGER DEFAULT 0 NOT NULL, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_project_item PRIMARY KEY (id), 
	CONSTRAINT ck_project_item_fee_has_no_type CHECK ((kind = 'fee') = (category_id IS NULL)), 
	CONSTRAINT ck_project_item_eur_rate_is_one CHECK (currency <> 'EUR' OR fx_rate_micro = 1000000), 
	CONSTRAINT ck_project_item_kind_enum CHECK (kind IN ('product', 'fee')), 
	CONSTRAINT ck_project_item_status_enum CHECK (status IN ('to_quote', 'quoted', 'to_review', 'approved', 'deposit', 'purchased', 'cancelled')), 
	CONSTRAINT ck_project_item_discount_bp_range CHECK (discount_bp BETWEEN 0 AND 10000), 
	CONSTRAINT ck_project_item_fx_rate_positive CHECK (fx_rate_micro > 0), 
	CONSTRAINT ck_project_item_currency_length CHECK (length(currency) = 3), 
	CONSTRAINT ck_project_item_item_code_not_empty CHECK (length(item_code) > 0), 
	CONSTRAINT ck_project_item_fee_code_only CHECK ((kind = 'fee') = (item_code IS NOT NULL)), 
	CONSTRAINT ck_project_item_name_not_empty CHECK (length(name) > 0), 
	CONSTRAINT ck_project_item_unit_cost_min CHECK (unit_cost_cents >= 0), 
	CONSTRAINT fk_project_item_category_id_category FOREIGN KEY(category_id) REFERENCES category (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_project_item_project_id_project FOREIGN KEY(project_id) REFERENCES project (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_project_item_supplier_id_supplier FOREIGN KEY(supplier_id) REFERENCES supplier (id) ON DELETE RESTRICT, 
	CONSTRAINT uq_project_item_id UNIQUE (id, project_id)
)
 STRICT

;
INSERT INTO "project_item" VALUES(1,1,NULL,'product',1,1,'Canapé Sesann 3 places','Canapé Sesann 3 places','SESANN-3','edition','indoor','Velours vert, piètement chrome','L 230 × P 95 × H 72 cm',NULL,'https://example.com/sesann',NULL,640000,'EUR',1000000,0,NULL,NULL,NULL,'quoted',NULL,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item" VALUES(2,1,NULL,'product',10,1,'Lampe de chevet IC Lights T1','Lampe de chevet IC Lights T1','IC-T1-LOW','edition','indoor','Laiton brossé','Ø 20 × H 38 cm',NULL,NULL,NULL,38500,'EUR',1000000,0,'DV-2026-118','A',NULL,'approved',NULL,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item" VALUES(3,1,NULL,'product',5,2,'Tête de lit sur-mesure chêne','Tête de lit sur-mesure chêne',NULL,'custom',NULL,'Chêne naturel huilé','L 200 × H 120 cm',NULL,NULL,NULL,185000,'EUR',1000000,0,NULL,NULL,NULL,'to_quote',NULL,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item" VALUES(4,1,NULL,'product',3,1,'Tabouret de bar Pelleossa','Tabouret de bar Pelleossa',NULL,'edition',NULL,NULL,'H 75 cm',NULL,NULL,NULL,42000,'EUR',1000000,0,NULL,NULL,NULL,'to_quote',NULL,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item" VALUES(5,1,'FR-01','fee',NULL,1,'Livraison et emballage','Livraison et emballage',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,120000,'EUR',1000000,0,NULL,NULL,NULL,'to_quote',NULL,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE project_item_event (
	id INTEGER NOT NULL, 
	project_item_id INTEGER NOT NULL, 
	kind TEXT NOT NULL, 
	from_status TEXT, 
	to_status TEXT, 
	old_value TEXT, 
	new_value TEXT, 
	changed_at TEXT NOT NULL, 
	note TEXT, 
	CONSTRAINT pk_project_item_event PRIMARY KEY (id), 
	CONSTRAINT fk_project_item_event_project_item_id_project_item FOREIGN KEY(project_item_id) REFERENCES project_item (id) ON DELETE CASCADE
)
 STRICT

;
INSERT INTO "project_item_event" VALUES(1,1,'created',NULL,'to_quote',NULL,'{"cost":640000,"currency":"EUR","fx":1000000,"discount":0}','2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(2,1,'status','to_quote','quoted',NULL,NULL,'2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(3,2,'created',NULL,'to_quote',NULL,'{"cost":38500,"currency":"EUR","fx":1000000,"discount":0}','2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(4,2,'status','to_quote','approved',NULL,NULL,'2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(5,3,'created',NULL,'to_quote',NULL,'{"cost":185000,"currency":"EUR","fx":1000000,"discount":0}','2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(6,4,'created',NULL,'to_quote',NULL,'{"cost":42000,"currency":"EUR","fx":1000000,"discount":0}','2026-10-14T12:00:00Z',NULL);
INSERT INTO "project_item_event" VALUES(7,5,'created',NULL,'to_quote',NULL,'{"cost":120000,"currency":"EUR","fx":1000000,"discount":0}','2026-10-14T12:00:00Z',NULL);
CREATE TABLE project_item_file (
	id INTEGER NOT NULL, 
	project_item_id INTEGER NOT NULL, 
	file_id INTEGER NOT NULL, 
	kind TEXT DEFAULT 'image' NOT NULL, 
	is_primary INTEGER DEFAULT 0 NOT NULL, 
	caption TEXT, 
	sort_order INTEGER DEFAULT 0 NOT NULL, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_project_item_file PRIMARY KEY (id), 
	CONSTRAINT ck_project_item_file_primary_is_image CHECK (is_primary = 0 OR kind = 'image'), 
	CONSTRAINT ck_project_item_file_kind_enum CHECK (kind IN ('image', 'drawing', 'other')), 
	CONSTRAINT ck_project_item_file_is_primary_bool CHECK (is_primary IN (0, 1)), 
	CONSTRAINT fk_project_item_file_file_id_file FOREIGN KEY(file_id) REFERENCES file (id) ON DELETE RESTRICT, 
	CONSTRAINT fk_project_item_file_project_item_id_project_item FOREIGN KEY(project_item_id) REFERENCES project_item (id) ON DELETE CASCADE, 
	CONSTRAINT uq_project_item_file_project_item_id UNIQUE (project_item_id, file_id)
)
 STRICT

;
CREATE TABLE project_item_placement (
	id INTEGER NOT NULL, 
	project_item_id INTEGER NOT NULL, 
	project_id INTEGER NOT NULL, 
	location_id INTEGER, 
	code TEXT NOT NULL, 
	qty_milli INTEGER DEFAULT (1000) NOT NULL, 
	sort_order INTEGER DEFAULT 0 NOT NULL, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_project_item_placement PRIMARY KEY (id), 
	CONSTRAINT ck_project_item_placement_code_not_empty CHECK (length(code) > 0), 
	CONSTRAINT ck_project_item_placement_qty_min CHECK (qty_milli >= 0), 
	CONSTRAINT fk_project_item_placement_location_id_location FOREIGN KEY(location_id, project_id) REFERENCES location (id, project_id) ON DELETE RESTRICT, 
	CONSTRAINT fk_project_item_placement_project_item_id_project_item FOREIGN KEY(project_item_id, project_id) REFERENCES project_item (id, project_id) ON DELETE CASCADE, 
	CONSTRAINT uq_project_item_placement_code UNIQUE (project_id, code)
)
 STRICT

;
INSERT INTO "project_item_placement" VALUES(1,1,1,1,'LOB-AS-01',2000,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item_placement" VALUES(2,2,1,3,'CHA-LUD-01',2000,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item_placement" VALUES(3,2,1,4,'SUI-LUD-01',3000,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item_placement" VALUES(4,3,1,3,'CHA-LIT-01',1000,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "project_item_placement" VALUES(5,4,1,2,'BAR-TBR-01',8000,0,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE TABLE setting (
	id INTEGER NOT NULL, 
	base_currency TEXT DEFAULT 'EUR' NOT NULL, 
	seed_category_version INTEGER DEFAULT 0 NOT NULL, 
	project_code_prefix TEXT DEFAULT '' NOT NULL, 
	agency_name TEXT DEFAULT '' NOT NULL, 
	agency_address TEXT, 
	agency_email TEXT, 
	agency_phone TEXT, 
	extension_token TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_setting PRIMARY KEY (id), 
	CONSTRAINT ck_setting_base_currency_eur CHECK (base_currency = 'EUR'), 
	CONSTRAINT ck_setting_single_row CHECK (id = 1)
)
 STRICT

;
INSERT INTO "setting" VALUES(1,'EUR',3,'','',NULL,NULL,NULL,NULL,'2026-10-14T13:21:30Z','2026-10-14T12:00:00Z');
CREATE TABLE supplier (
	id INTEGER NOT NULL, 
	name TEXT NOT NULL, 
	specialty TEXT, 
	contact_name TEXT, 
	email TEXT, 
	phone TEXT, 
	mobile TEXT, 
	contact2_name TEXT, 
	contact2_phone TEXT, 
	contact2_email TEXT, 
	website TEXT, 
	currency TEXT DEFAULT 'EUR' NOT NULL, 
	notes TEXT, 
	archived_at TEXT, 
	created_at TEXT NOT NULL, 
	updated_at TEXT NOT NULL, 
	CONSTRAINT pk_supplier PRIMARY KEY (id), 
	CONSTRAINT ck_supplier_currency_length CHECK (length(currency) = 3), 
	CONSTRAINT ck_supplier_name_not_empty CHECK (length(name) > 0)
)
 STRICT

;
INSERT INTO "supplier" VALUES(1,'Silvera',NULL,'Claire Martin','c.martin@example.com','+33 1 00 00 00 00',NULL,NULL,NULL,NULL,NULL,'EUR',NULL,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
INSERT INTO "supplier" VALUES(2,'Atelier Bois & Cie',NULL,'Paul Durand',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'EUR',NULL,NULL,'2026-10-14T12:00:00Z','2026-10-14T12:00:00Z');
CREATE INDEX ix_category_sort_order ON category (sort_order);
CREATE INDEX ix_client_archived_at ON client (archived_at, name);
CREATE INDEX ix_supplier_archived_at ON supplier (archived_at, name);
CREATE INDEX ix_capture_image_capture_id ON capture_image (capture_id);
CREATE INDEX ix_project_client_id ON project (client_id);
CREATE INDEX ix_project_status ON project (status);
CREATE INDEX ix_location_project_id ON location (project_id, sort_order);
CREATE INDEX ix_project_file_file_id ON project_file (file_id);
CREATE INDEX ix_project_file_project_id ON project_file (project_id);
CREATE INDEX ix_project_item_category_id ON project_item (category_id);
CREATE INDEX ix_project_item_project_id ON project_item (project_id, sort_order);
CREATE INDEX ix_project_item_status ON project_item (project_id, status);
CREATE INDEX ix_project_item_supplier_id ON project_item (supplier_id);
CREATE UNIQUE INDEX uq_project_item_code ON project_item (project_id, item_code) WHERE item_code IS NOT NULL;
CREATE INDEX ix_budget_line_project_id ON budget_line (project_id);
CREATE INDEX ix_project_item_event_project_item_id ON project_item_event (project_item_id, changed_at);
CREATE INDEX ix_project_item_file_file_id ON project_item_file (file_id);
CREATE UNIQUE INDEX uq_project_item_file_primary ON project_item_file (project_item_id) WHERE is_primary = 1;
CREATE INDEX ix_project_item_placement_project_id ON project_item_placement (project_id, location_id, sort_order);
CREATE UNIQUE INDEX uq_category_name_lower ON category (lower(name));
CREATE UNIQUE INDEX uq_professional_name_lower ON professional (lower(name));
CREATE UNIQUE INDEX uq_project_item_placement_location ON project_item_placement (project_item_id, COALESCE(location_id, 0));
CREATE UNIQUE INDEX uq_budget_line_scope ON budget_line (project_id, scope, COALESCE(location_id, 0), COALESCE(zone, ''), COALESCE(family, ''), COALESCE(supplier_id, 0));
COMMIT;

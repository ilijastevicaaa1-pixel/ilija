-- Tabela za ulazne fakture
CREATE TABLE input_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    invoice_number VARCHAR(64),
    issue_date DATE,
    receipt_date DATE,
    payment_date DATE,
    amount_without_vat NUMERIC,
    vat_amount NUMERIC,
    total_amount NUMERIC,
    supplier VARCHAR(128),
    expense_category VARCHAR(64),
    pdf_path VARCHAR(256)
);

-- Tabela za izlazne fakture
CREATE TABLE output_invoices (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    invoice_number VARCHAR(64),
    issue_date DATE,
    due_date DATE,
    amount_without_vat NUMERIC,
    vat_amount NUMERIC,
    total_amount NUMERIC,
    customer VARCHAR(128),
    status VARCHAR(32)
);

-- Tabela pre bankové účty
CREATE TABLE bank_accounts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    iban VARCHAR(34),
    bic VARCHAR(11),
    account_number VARCHAR(64),
    currency VARCHAR(3) DEFAULT 'EUR',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela pre bankové transakcie (FULL forma pre SK bankovníctvo)
CREATE TABLE bank_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    account_id INTEGER REFERENCES bank_accounts(id),
    transaction_date DATE NOT NULL,
    amount NUMERIC(15,2) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('priliv', 'odliv', 'prijem', 'vydavok')),
    description VARCHAR(512),
    variable_symbol VARCHAR(20),
    specific_symbol VARCHAR(20),
    constant_symbol VARCHAR(10),
    counter_iban VARCHAR(34),
    category VARCHAR(64),
    invoice_id INTEGER REFERENCES input_invoices(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za PDV periode
CREATE TABLE vat_periods (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    period_start DATE,
    period_end DATE,
    input_vat NUMERIC,
    output_vat NUMERIC,
    vat_due NUMERIC,
    exported_table_path VARCHAR(256)
);

-- Tabela za rokove
CREATE TABLE deadlines (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    deadline_date DATE,
    description VARCHAR(256),
    status VARCHAR(32)
);

CREATE TABLE annual_reports (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    year INTEGER,
    total_income NUMERIC,
    total_expense NUMERIC,
    total_vat NUMERIC,
    total_transactions NUMERIC,
    profit NUMERIC
);

-- Tabela za korisnike (autentikacija)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    company_id INTEGER,
    email VARCHAR(128) UNIQUE NOT NULL,
    password_hash VARCHAR(256) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    name VARCHAR(128)
);

-- Tabela za dashboard transakcije (prihodi i rashodi)
CREATE TABLE IF NOT EXISTS transakcije (
    id SERIAL PRIMARY KEY,
    datum DATE NOT NULL,
    iznos NUMERIC(12,2) NOT NULL,
    tip VARCHAR(10) NOT NULL CHECK (tip IN ('prihod', 'rashod')),
    opis TEXT
);

-- Test podaci za dashboard
INSERT INTO transakcije (datum, iznos, tip, opis) VALUES
('2026-01-10', 10000, 'prihod', 'Uplata klijenta A'),
('2026-01-15', 8000, 'rashod', 'Plaćanje dobavljaču B'),
('2026-02-05', 12000, 'prihod', 'Uplata klijenta C'),
('2026-02-20', 9000, 'rashod', 'Troškovi kancelarije');

-- Tabela za audit log
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(32), -- npr. 'CREATE', 'UPDATE', 'DELETE'
    entity VARCHAR(64), -- npr. 'input_invoices', 'output_invoices', 'bank_transactions', 'users'
    entity_id INTEGER,
    old_value JSONB,
    new_value JSONB,
    message TEXT
);
-- SKLADIŠNO GOSPODARSTVO --

CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name VARCHAR(128) NOT NULL,
    code VARCHAR(64),
    unit VARCHAR(16),
    description TEXT
);

CREATE TABLE warehouse_cards (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL DEFAULT 0,
    min_quantity NUMERIC(14,3) DEFAULT 0,
    max_quantity NUMERIC(14,3),
    UNIQUE (tenant_id, item_id)
);

CREATE TABLE receipts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    document VARCHAR(64),
    note TEXT
);

CREATE TABLE issues (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    quantity NUMERIC(14,3) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    document VARCHAR(64),
    note TEXT
);

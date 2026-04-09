-- Minimal test data for API routes
INSERT INTO output_invoices (invoice_number, issue_date, due_date, amount_without_vat, vat_amount, total_amount, customer, status)
VALUES ('INV-001', '2026-01-01', '2026-01-31', 1000, 200, 1200, 'Test Customer', 'paid');

INSERT INTO input_invoices (invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category)
VALUES ('INP-001', '2026-01-01', '2026-01-02', '2026-01-15', 500, 100, 600, 'Test Supplier', 'office');

INSERT INTO bank_transactions (transaction_date, amount, description, category)
VALUES ('2026-01-10', 1200, 'Payment for invoice', 'income');

INSERT INTO deadlines (deadline_date, description, status)
VALUES ('2026-02-01', 'Submit VAT report', 'open');

INSERT INTO vat_periods (period_start, period_end, input_vat, output_vat, vat_due)
VALUES ('2026-01-01', '2026-01-31', 100, 200, 100);

INSERT INTO annual_reports (year, total_income, total_expense, total_vat, total_transactions, profit)
VALUES ('2026', 1200, 600, 100, 1, 600);

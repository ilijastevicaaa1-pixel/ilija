# Plan: Viaceré bankové účty (Multi-bank account support)

## Information Gathered:
1. **Frontend** - BankScreen.jsx currently manages single bank with fields: bankName, iban, bic, accountNumber
2. **Backend** - Has bank upload routes (bankUpload.js), bank matching (matching.js), and Tink integration
3. **Database** - bank_transactions table exists without account linking, no dedicated bank_accounts table

## Plan:

### 1. Database Update
- Add new `bank_accounts` table in schema.sql:
  - id (SERIAL PRIMARY KEY)
  - tenant_id/company_id (INTEGER)
  - name (VARCHAR) - e.g., "Firemný účet", "Súkromný účet", "Revolut", "PayPal", "Wise", "Tatra banka", "VÚB", "ČSOB", "Slovenská sporiteľňa"
  - iban (VARCHAR)
  - bic (VARCHAR)
  - account_number (VARCHAR)
  - currency (VARCHAR) - EUR, USD, etc.
  - is_active (BOOLEAN DEFAULT true)
  - created_at (TIMESTAMP)

- Modify bank_transactions table:
  - Add account_id (INTEGER REFERENCES bank_accounts(id))

### 2. Backend API Routes
- Create new routes in backend/routes/bankAccounts.js:
  - GET /api/bank-accounts - List all accounts
  - POST /api/bank-accounts - Add new account
  - PUT /api/bank-accounts/:id - Update account
  - DELETE /api/bank-accounts/:id - Delete account

- Modify existing routes:
  - bankTransactions.js - Filter by account_id
  - matching.js - Include account_id in matches

### 3. Frontend Updates
- Update BankScreen.jsx:
  - Add state for multiple accounts (accounts array)
  - Add dropdown to select account
  - Add "Pridať účet" button to show add account form
  - Add account form with fields: name, iban, bic, account_number, currency
  - Filter transactions by selected account
  - Save/load accounts from backend

### 4. Implementation Order
1. Create database migration/schema update
2. Create backend bank-accounts API
3. Update frontend BankScreen with multi-account support
4. Test integration

## Dependent Files:
- database/schema.sql
- backend/routes/bankAccounts.js (new)
- backend/server.js (add route import)
- frontend/src/screens/BankScreen.jsx

## Followup Steps:
1. Run database migration
2. Start backend server
3. Test API with curl or frontend
4. Verify account selection and filtering

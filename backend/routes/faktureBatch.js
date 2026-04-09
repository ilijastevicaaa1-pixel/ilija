import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();
router.use(auth);

// POST /api/fakture/batch
// Body: [{ type: 'input'|'output', faktura: {...}, stavke: [{item_id, quantity, ...}] }]
router.post("/batch", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId;
  const fakture = req.body;
  if (!Array.isArray(fakture)) return res.status(400).json({ message: "Očekuje se niz faktura" });
  const results = [];
  for (const fakturaObj of fakture) {
    try {
      const { type, faktura, stavke } = fakturaObj;
      let fakturaId = null;
      // 1. Kreiraj fakturu
      if (type === 'input') {
        const result = await db.query(
          `INSERT INTO input_invoices (company_id, invoice_number, issue_date, receipt_date, payment_date, amount_without_vat, vat_amount, total_amount, supplier, expense_category, pdf_path)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [tenantId, faktura.invoice_number, faktura.issue_date, faktura.receipt_date, faktura.payment_date, faktura.amount_without_vat, faktura.vat_amount, faktura.total_amount, faktura.supplier, faktura.expense_category, faktura.pdf_path]
        );
        fakturaId = result.rows[0].id;
      } else if (type === 'output') {
        const result = await db.query(
          `INSERT INTO output_invoices (company_id, invoice_number, issue_date, due_date, amount_without_vat, vat_amount, total_amount, customer, status)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [tenantId, faktura.invoice_number, faktura.issue_date, faktura.due_date, faktura.amount_without_vat, faktura.vat_amount, faktura.total_amount, faktura.customer, faktura.status]
        );
        fakturaId = result.rows[0].id;
      } else {
        results.push({ success: false, error: 'Nepoznat tip fakture', faktura });
        continue;
      }
      // 2. Kreiraj skladišne promene
      for (const s of stavke) {
        if (type === 'input') {
          // automatska príjemka
          await db.query(
            `INSERT INTO receipts (tenant_id, item_id, quantity, date, document, note) VALUES ($1,$2,$3,$4,$5,$6)`,
            [tenantId, s.item_id, s.quantity, faktura.receipt_date || faktura.issue_date, faktura.invoice_number, 'Automatska príjemka iz fakture']
          );
          await db.query(
            `INSERT INTO warehouse_cards (tenant_id, item_id, quantity)
             VALUES ($1, $2, $3)
             ON CONFLICT (tenant_id, item_id) DO UPDATE SET quantity = warehouse_cards.quantity + EXCLUDED.quantity`,
            [tenantId, s.item_id, s.quantity]
          );
        } else if (type === 'output') {
          // automatska výdajka
          // prvo proveri zalihu
          const state = await db.query(
            `SELECT quantity FROM warehouse_cards WHERE tenant_id = $1 AND item_id = $2`,
            [tenantId, s.item_id]
          );
          const current = state.rows[0]?.quantity || 0;
          if (Number(current) < Number(s.quantity)) {
            results.push({ success: false, error: 'Nedovoljno zaliha za artikal', faktura, item_id: s.item_id });
            continue;
          }
          await db.query(
            `INSERT INTO issues (tenant_id, item_id, quantity, date, document, note) VALUES ($1,$2,$3,$4,$5,$6)`,
            [tenantId, s.item_id, s.quantity, faktura.issue_date, faktura.invoice_number, 'Automatska výdajka iz fakture']
          );
          await db.query(
            `UPDATE warehouse_cards SET quantity = quantity - $1 WHERE tenant_id = $2 AND item_id = $3`,
            [s.quantity, tenantId, s.item_id]
          );
        }
      }
      results.push({ success: true, fakturaId });
    } catch (err) {
      results.push({ success: false, error: err.message, faktura: fakturaObj });
    }
  }
  res.json({ results });
});

export default router;

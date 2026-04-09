import express from "express";
import { getDb } from "../db.js";
import { auth } from "../authMiddleware.js";

const router = express.Router();
router.use(auth);

// POST /api/matching/bank-invoice
// Automatski predlozi za povezivanje bankovnih transakcija i faktura
router.post("/bank-invoice", async (req, res) => {
  const db = await getDb();
  const tenantId = req.user.tenantId || req.user.company_id;
  // Učitaj sve bank transakcije i fakture za tenant-a
  const { rows: bankTxs } = await db.query(
    "SELECT * FROM bank_transactions WHERE tenant_id = $1 ORDER BY transaction_date DESC",
    [tenantId]
  );
  const { rows: invoices } = await db.query(
    "SELECT * FROM input_invoices WHERE company_id = $1 ORDER BY payment_date DESC",
    [tenantId]
  );
  // Jednostavan matching algoritam: po iznosu i datumu (tolerancija ±3 dana)
  const matches = [];
  for (const tx of bankTxs) {
    for (const inv of invoices) {
      const amountMatch = Math.abs(Number(tx.amount) - Number(inv.total_amount)) < 1;
      const dateTx = new Date(tx.transaction_date);
      const dateInv = new Date(inv.payment_date);
      const dateDiff = Math.abs(dateTx - dateInv) / (1000 * 60 * 60 * 24);
      if (amountMatch && dateDiff <= 3) {
        matches.push({
          bank_tx_id: tx.id,
          invoice_id: inv.id,
          score: 1 - dateDiff / 3, // score 1.0 (isti dan), 0.67 (1 dan razlike), ...
          reason: `Iznos i datum poklapaju se (±${dateDiff} dana)`
        });
      }
    }
  }
  res.json({ matches, bankTxs, invoices });
});

export default router;

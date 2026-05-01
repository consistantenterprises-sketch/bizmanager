const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/firebase');
const { authenticate, requireRole, branchFilter } = require('../middleware/auth');

router.use(authenticate, branchFilter);

// GET /api/receipts
router.get('/', async (req, res) => {
  try {
    const db = getDb();
let query = db.collection('receipts').orderBy('date', 'desc').orderBy('createdAt', 'desc');
      if (req.branchFilter) query = query.where('branch', '==', req.branchFilter);
    const snap = await query.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/receipts
router.post('/', async (req, res) => {
  const { date, billNo, custId, name, village, mandal, model, models,
          soldPrice, amtPaid, balance, mode, bank, utr, branch, isPayment } = req.body;
  if (!date || !billNo || !name) return res.status(400).json({ error: 'Missing required fields' });
  // Branch manager cannot backdate
  if (req.user.role === 'branch_manager' && date < new Date().toISOString().split('T')[0]) {
    return res.status(403).json({ error: 'Branch managers cannot backdate receipts' });
  }
  try {
    const db = getDb();
    const ref = await db.collection('receipts').add({
      date, billNo, custId: custId || null, name, village: village || '',
      mandal: mandal || '', model: model || '', models: models || [],
      soldPrice: soldPrice || 0, amtPaid: amtPaid || 0, balance: balance || 0,
      mode: mode || '', bank: bank || '', utr: utr || '',
      branch: branch || req.user.branch, isPayment: isPayment || false,
      createdAt: new Date().toISOString(), createdBy: req.user.uid,
    });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/receipts/:id — update payment (admin only for edit, all for payment update)
router.patch('/:id', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('receipts').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Receipt not found' });
    // Only admin can edit non-payment fields
    const { amtPaid, balance, ...rest } = req.body;
   let updates = { balance, updatedAt: new Date().toISOString() };
    if (req.user.role === 'admin') updates = { ...updates, ...rest };
    await db.collection('receipts').doc(req.params.id).update(updates);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/receipts/:id — admin only
router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('receipts').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Receipt not found' });
    const receipt = doc.data();

    // If customer exists, update their record
    if (receipt.custId) {
      const custRef = db.collection('customers').doc(receipt.custId);
      const custDoc = await custRef.get();
      if (custDoc.exists) {
        const cust = custDoc.data();
        // Check all remaining receipts for this customer (excluding this one)
        const remaining = await db.collection('receipts')
          .where('custId', '==', receipt.custId).get();
        const otherReceipts = remaining.docs.filter(d => d.id !== req.params.id);

        if (receipt.isPayment) {
          // Reverse payment: reduce totalPaid, increase balance
          const newPaid = Math.max(0, (cust.totalPaid || 0) - (receipt.amtPaid || 0));
          await custRef.update({ totalPaid: newPaid });
          // Also update the original receipt's balance
          const origReceipt = otherReceipts.find(d => !d.data().isPayment);
          if (origReceipt) {
            const orig = origReceipt.data();
            await db.collection('receipts').doc(origReceipt.id).update({
              amtPaid: Math.max(0, (orig.amtPaid || 0) - (receipt.amtPaid || 0)),
              balance: (orig.balance || 0) + (receipt.amtPaid || 0),
            });
          }
        } else {
          // Original receipt deleted
          if (otherReceipts.length === 0) {
            // No other receipts — delete customer entirely
            await custRef.delete();
          } else {
            // Has other receipts — recalculate totals
            const totalPaid = otherReceipts
              .filter(d => d.data().isPayment)
              .reduce((s, d) => s + (d.data().amtPaid || 0), 0);
            await custRef.update({ totalPaid, soldPrice: receipt.soldPrice });
          }
        }
      }
    }

    await db.collection('receipts').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

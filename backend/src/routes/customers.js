// ── customers.js ──────────────────────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/firebase');
const { authenticate, requireRole, branchFilter } = require('../middleware/auth');

router.use(authenticate, branchFilter);

router.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('customers').orderBy('date', 'desc');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const db = getDb();
    const ref = await db.collection('customers').add({
      ...req.body, createdAt: new Date().toISOString(), createdBy: req.user.uid,
    });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.patch('/:id', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('customers').doc(req.params.id).update({
      ...req.body, updatedAt: new Date().toISOString(),
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    await db.collection('customers').doc(req.params.id).delete();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;

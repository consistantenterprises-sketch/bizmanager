const express = require('express');
const router = express.Router();
const { getDb } = require('../lib/firebase');
const { authenticate, requireRole, branchFilter } = require('../middleware/auth');

router.use(authenticate, branchFilter);

// GET stock entries
router.get('/entries', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('stockEntries').orderBy('date', 'desc');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST stock entry — admin + stock_manager only
router.post('/entries', requireRole('admin', 'stock_manager'), async (req, res) => {
  const { date } = req.body;
  const today = new Date().toISOString().split('T')[0];
  if (req.user.role === 'stock_manager' && date < today) {
    return res.status(403).json({ error: 'Stock managers cannot backdate stock entries' });
  }
  try {
    const db = getDb();
    const ref = await db.collection('stockEntries').add({
      ...req.body, createdAt: new Date().toISOString(), createdBy: req.user.uid,
    });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transfer history
router.get('/transfers', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('transfers').orderBy('date', 'desc');
    const snap = await q.get();
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (req.branchFilter) {
      data = data.filter(t => t.fromBranch === req.branchFilter || t.toBranch === req.branchFilter);
    }
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST transfer — admin + stock_manager only
router.post('/transfers', requireRole('admin', 'stock_manager'), async (req, res) => {
  const { date, fromBranch, toBranch, items } = req.body;
  const today = new Date().toISOString().split('T')[0];
  if (req.user.role === 'stock_manager' && date < today) {
    return res.status(403).json({ error: 'Stock managers cannot backdate transfers' });
  }
  if (!fromBranch || !toBranch || !items?.length) {
    return res.status(400).json({ error: 'Missing transfer fields' });
  }
  try {
    const db = getDb();
    const batch = db.batch();
    // Save transfer record
    const trRef = db.collection('transfers').doc();
    batch.set(trRef, { date, fromBranch, toBranch, items, createdAt: new Date().toISOString() });
    // Save stock entries for each item
    items.forEach(item => {
      const entryRef = db.collection('stockEntries').doc();
      batch.set(entryRef, {
        date, invoice: `TR-${trRef.id.slice(0, 8)}`,
        model: item.model, type: 'Transfer',
        qty: item.qty, branch: fromBranch,
        transferTo: toBranch, createdAt: new Date().toISOString(),
      });
    });
    await batch.commit();
    res.json({ id: trRef.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE transfer — admin only, reverses stock
router.delete('/transfers/:id', requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    // Delete related stock entries
    const entries = await db.collection('stockEntries')
      .where('invoice', '==', `TR-${req.params.id.slice(0, 8)}`).get();
    const batch = db.batch();
    entries.docs.forEach(d => batch.delete(d.ref));
    batch.delete(db.collection('transfers').doc(req.params.id));
    await batch.commit();
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET models list
router.get('/models', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('config').doc('models').get();
    res.json(snap.exists ? snap.data().list : []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST model — admin + stock_manager
router.post('/models', requireRole('admin', 'stock_manager'), async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Model name required' });
  try {
    const db = getDb();
    const ref = db.collection('config').doc('models');
    const snap = await ref.get();
    const current = snap.exists ? snap.data().list : [];
    if (current.includes(name)) return res.json({ already: true });
    await ref.set({ list: [...current, name] }, { merge: true });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
// DELETE model — admin only
router.delete('/models/:name', requireRole('admin'), async (req, res) => {
  try {
    const db = getDb();
    const ref = db.collection('config').doc('models');
    const snap = await ref.get();
    const current = snap.exists ? snap.data().list : [];
    const updated = current.filter(m => m !== decodeURIComponent(req.params.name));
    await ref.set({ list: updated });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
module.exports = router;

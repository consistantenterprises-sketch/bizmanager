// ── expenses.js ───────────────────────────────────────────────────────────
const express = require('express');
const { getDb } = require('../lib/firebase');
const { authenticate, requireRole, branchFilter } = require('../middleware/auth');

const expenses = express.Router();
expenses.use(authenticate, branchFilter);
expenses.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('expenses').orderBy('date', 'desc');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
expenses.post('/', async (req, res) => {
  try {
    const db = getDb();
    const ref = await db.collection('expenses').add({ ...req.body, createdBy: req.user.uid, createdAt: new Date().toISOString() });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
expenses.patch('/:id', requireRole('admin'), async (req, res) => {
  try { await getDb().collection('expenses').doc(req.params.id).update(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
expenses.delete('/:id', requireRole('admin'), async (req, res) => {
  try { await getDb().collection('expenses').doc(req.params.id).delete(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── deposits.js ───────────────────────────────────────────────────────────
const deposits = express.Router();
deposits.use(authenticate, branchFilter);
deposits.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('deposits').orderBy('date', 'desc');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
deposits.post('/', async (req, res) => {
  try {
    const ref = await getDb().collection('deposits').add({ ...req.body, createdBy: req.user.uid, createdAt: new Date().toISOString() });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
deposits.patch('/:id', requireRole('admin'), async (req, res) => {
  try { await getDb().collection('deposits').doc(req.params.id).update(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
deposits.delete('/:id', requireRole('admin'), async (req, res) => {
  try { await getDb().collection('deposits').doc(req.params.id).delete(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── bookings.js ───────────────────────────────────────────────────────────
const bookings = express.Router();
bookings.use(authenticate, branchFilter);
bookings.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('bookings').orderBy('date', 'desc');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
bookings.post('/', async (req, res) => {
  try {
    const ref = await getDb().collection('bookings').add({ ...req.body, createdBy: req.user.uid, createdAt: new Date().toISOString() });
    res.json({ id: ref.id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});
bookings.patch('/:id', async (req, res) => {
  try { await getDb().collection('bookings').doc(req.params.id).update(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});
bookings.delete('/:id', requireRole('admin'), async (req, res) => {
  try { await getDb().collection('bookings').doc(req.params.id).delete(); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── feedback.js ───────────────────────────────────────────────────────────
const feedback = express.Router();
feedback.use(authenticate, branchFilter);
feedback.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('feedback').orderBy('dueDate', 'asc');
    const snap = await q.get();
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (req.branchFilter) data = data.filter(f => f.branch === req.branchFilter);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});
feedback.patch('/:id', async (req, res) => {
  try { await getDb().collection('feedback').doc(req.params.id).update(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── employees.js ──────────────────────────────────────────────────────────
const employees = express.Router();
employees.use(authenticate, requireRole('admin'));
employees.get('/', async (req, res) => {
  try {
    const snap = await getDb().collection('employees').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
employees.patch('/:id', async (req, res) => {
  try { await getDb().collection('employees').doc(req.params.id).update(req.body); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

// ── attendance.js ─────────────────────────────────────────────────────────
const attendance = express.Router();
attendance.use(authenticate, branchFilter);
attendance.get('/', async (req, res) => {
  try {
    const db = getDb();
    let q = db.collection('attendance');
    if (req.branchFilter) q = q.where('branch', '==', req.branchFilter);
    const snap = await q.get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});
attendance.post('/', async (req, res) => {
  const { staffId, date, status, branch } = req.body;
  const today = new Date().toISOString().split('T')[0];
  if (req.user.role === 'branch_manager' && date !== today) {
    return res.status(403).json({ error: 'Branch managers can only mark today\'s attendance' });
  }
  try {
    // Use staffId+date as doc ID to prevent duplicates
    const docId = `${staffId}_${date}`;
    await getDb().collection('attendance').doc(docId).set({ staffId, date, status, branch, updatedBy: req.user.uid, updatedAt: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── dashboard.js ──────────────────────────────────────────────────────────
const dashboard = express.Router();
dashboard.use(authenticate);
dashboard.get('/', async (req, res) => {
  try {
    const db = getDb();
    const branch = req.user.role === 'branch_manager' ? req.user.branch : null;
    // Fetch customers for financial totals
    let custQ = db.collection('customers');
    if (branch) custQ = custQ.where('branch', '==', branch);
    const custSnap = await custQ.get();
    const custs = custSnap.docs.map(d => d.data());
    // Fetch expenses
    let expQ = db.collection('expenses');
    if (branch) expQ = expQ.where('branch', '==', branch);
    const expSnap = await expQ.get();
    const exps = expSnap.docs.map(d => d.data());
    const totalSales = custs.reduce((s, c) => s + (c.soldPrice || 0), 0);
    const totalCollected = custs.reduce((s, c) => s + (c.totalPaid || 0), 0);
    const totalBalance = custs.reduce((s, c) => s + ((c.soldPrice || 0) - (c.totalPaid || 0)), 0);
    const totalExpenses = exps.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ totalSales, totalCollected, totalBalance, totalExpenses,
      totalCustomers: custs.length,
      pendingCustomers: custs.filter(c => c.status === 'Pending').length,
      deliveredCustomers: custs.filter(c => c.status === 'Delivered').length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = { expenses, deposits, bookings, feedback, employees, attendance, dashboard };

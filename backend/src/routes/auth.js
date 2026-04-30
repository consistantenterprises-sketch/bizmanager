const express = require('express');
const router = express.Router();
const { getAdmin, getDb } = require('../lib/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/auth/me — get current user info
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// POST /api/auth/set-role — admin only: set role + branch on a user
router.post('/set-role', authenticate, requireRole('admin'), async (req, res) => {
  const { uid, role, branch } = req.body;
  if (!uid || !role) return res.status(400).json({ error: 'uid and role required' });
  const validRoles = ['admin', 'branch_manager', 'stock_manager'];
  if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
  try {
    const admin = getAdmin();
    await admin.auth().setCustomUserClaims(uid, { role, branch: branch || '' });
    // Also save to Firestore employees collection
    const db = getDb();
    await db.collection('employees').doc(uid).set({ role, branch }, { merge: true });
    res.json({ success: true, message: `Role ${role} set for user ${uid}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/create-user — admin only: create a new employee account
router.post('/create-user', authenticate, requireRole('admin'), async (req, res) => {
  const { email, password, name, role, branch, phone, joined } = req.body;
  if (!email || !password || !name || !role) {
    return res.status(400).json({ error: 'email, password, name, role required' });
  }
  try {
    const admin = getAdmin();
    const db = getDb();
    // Create Firebase Auth user
    const userRecord = await admin.auth().createUser({ email, password, displayName: name });
    // Set custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, branch });
    // Save to Firestore
    await db.collection('employees').doc(userRecord.uid).set({
      uid: userRecord.uid, name, email, role, branch,
      phone: phone || '', joined: joined || new Date().toISOString().split('T')[0],
      status: 'active', createdAt: new Date().toISOString(),
    });
    res.json({ success: true, uid: userRecord.uid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/delete-user/:uid — admin only
router.delete('/delete-user/:uid', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const admin = getAdmin();
    const db = getDb();
    await admin.auth().deleteUser(req.params.uid);
    await db.collection('employees').doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

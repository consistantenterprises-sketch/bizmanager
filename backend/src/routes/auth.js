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
// POST /api/auth/check-device
router.post('/check-device', authenticate, async (req, res) => {
  const { deviceCode } = req.body;
  if (!deviceCode) return res.json({ allowed: false });
  try {
    const db = getDb();
    const empDoc = await db.collection('employees').doc(req.user.uid).get();
    if (!empDoc.exists) return res.json({ allowed: false });
    const emp = empDoc.data();
    // If no devices set, allow (not yet configured)
    if (!emp.allowedDevices || emp.allowedDevices.length === 0) return res.json({ allowed: true });
    const allowed = emp.allowedDevices.includes(deviceCode);
    res.json({ allowed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/add-device — admin adds device for employee
router.post('/add-device', authenticate, requireRole('admin'), async (req, res) => {
  const { uid, deviceCode, maxDevices } = req.body;
  if (!uid || !deviceCode) return res.status(400).json({ error: 'uid and deviceCode required' });
  try {
    const db = getDb();
    const empRef = db.collection('employees').doc(uid);
    const empDoc = await empRef.get();
    const current = empDoc.exists ? (empDoc.data().allowedDevices || []) : [];
    const max = maxDevices || empDoc.data()?.maxDevices || 2;
    if (current.length >= max) return res.status(400).json({ error: `Max ${max} devices allowed` });
    if (current.includes(deviceCode)) return res.json({ already: true });
    await empRef.update({ allowedDevices: [...current, deviceCode], maxDevices: max });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/remove-device — admin removes device
router.delete('/remove-device', authenticate, requireRole('admin'), async (req, res) => {
  const { uid, deviceCode } = req.body;
  try {
    const db = getDb();
    const empRef = db.collection('employees').doc(uid);
    const empDoc = await empRef.get();
    const current = empDoc.exists ? (empDoc.data().allowedDevices || []) : [];
    await empRef.update({ allowedDevices: current.filter(d => d !== deviceCode) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;

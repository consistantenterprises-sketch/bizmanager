const { getAdmin } = require('../lib/firebase');

// Verify Firebase ID token on every protected request
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split('Bearer ')[1];
  try {
    const admin = getAdmin();
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || 'branch_manager',   // custom claim set on user
      branch: decoded.branch || 'Maheshwaram',  // custom claim
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Role guard middleware factory
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Branch filter — branch_manager only sees their own branch data
function branchFilter(req, res, next) {
  if (req.user.role === 'branch_manager') {
    req.branchFilter = req.user.branch;
  } else {
    req.branchFilter = null; // admin sees all
  }
  next();
}

module.exports = { authenticate, requireRole, branchFilter };

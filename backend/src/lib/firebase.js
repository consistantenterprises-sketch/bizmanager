const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return;

  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  };

  if (!serviceAccount.client_email) {
    throw new Error('FIREBASE_CLIENT_EMAIL not set');
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('Firebase Admin initialized ✓');
}

function getDb() { if (!db) throw new Error('Firebase not initialized'); return db; }
function getAdmin() { return admin; }

module.exports = { initFirebase, getDb, getAdmin };

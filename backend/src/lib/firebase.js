const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return;

  let credential;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      credential = admin.credential.cert(serviceAccount);
    } catch(e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON: ' + e.message);
    }
  } else if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    credential = admin.credential.cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
    });
  } else {
    throw new Error('Firebase credentials not configured');
  }

  admin.initializeApp({ credential, projectId: process.env.FIREBASE_PROJECT_ID });
  db = admin.firestore();
  console.log('Firebase Admin initialized ✓');
}

function getDb() { if (!db) throw new Error('Firebase not initialized'); return db; }
function getAdmin() { return admin; }

module.exports = { initFirebase, getDb, getAdmin };

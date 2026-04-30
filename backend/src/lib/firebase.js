const admin = require('firebase-admin');

let db;

function initFirebase() {
  if (admin.apps.length > 0) return;

  let credential;

  // Railway: store the JSON as an env variable
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    credential = admin.credential.cert(serviceAccount);
  } else {
    throw new Error('FIREBASE_SERVICE_ACCOUNT env variable not set');
  }

  admin.initializeApp({
    credential,
    projectId: process.env.FIREBASE_PROJECT_ID,
  });

  db = admin.firestore();
  console.log('Firebase Admin initialized ✓');
}

function getDb() {
  if (!db) throw new Error('Firebase not initialized');
  return db;
}

function getAdmin() {
  return admin;
}

module.exports = { initFirebase, getDb, getAdmin };

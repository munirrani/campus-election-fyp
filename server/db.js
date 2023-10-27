const admin = require("firebase-admin");
const { getStorage } = require('firebase-admin/storage');
const serviceAccount = require('./databaseKeys.json');

module.exports = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: serviceAccount.project_id + ".appspot.com"
});

const db = admin.firestore();
const bucket = getStorage().bucket()

module.exports = {
  db,
  bucket
}
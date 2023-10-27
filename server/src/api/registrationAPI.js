const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { db } = require('../../db');
const app = require('../server/express-server');
const Web3Static = require('web3');
const { calculateHash } = require('../cryptography/cryptography');
const { sendEmail } = require('../email/email');
const { authenticateToken } = require('../server/authentication');

dotenv.config()

// Get full name of user session
app.get('/api/user/user-details', async (req, res) => {
  console.log('/api/user/user-details');
  const { currentWallet } = req.query;
  const snapshot = await db.collection('Account').where('ethereumAddress', '==', currentWallet.toLowerCase()).get();
  if (snapshot.empty) {
    res.json([]);
    return;
  }
  const doc = snapshot.docs[0];
  const data = doc.data();
  const {signature, verified, zone, ethereumAddress, ...rest} = data;
  res.json(rest);
})
  
app.get('/api/user/check-info-exists', async (req, res) => {
  console.log('/api/user/check-info-exists');
  const { siswamail, matrixNum } = req.query;
  
  let formErrors = {}
  
  const emailQuerySnapshot = await db.collection('Account').where('email', '==', siswamail).get();
  emailQuerySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.verified) {
      formErrors["siswamail"] = "*The provided siswamail has already been registered.";
    }
  });

  const matrixQuerySnapshot = await db.collection('Account').where('matrixNum', '==', matrixNum).get();
  matrixQuerySnapshot.forEach((doc) => {
    formErrors["matrixNum"] = "*The provided matrix number has already been registered.";
  });

  res.status(200).json(formErrors);
});

app.post('/api/register', async(req, res) => {
  // TODO add full name as part of the registration
  const { ethereumAddress, fullname, email, matrixNum, faculty, signature, zone } = req.body;
  // validate email address format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let validEmail = emailRegex.test(email);
  // validate ethereum address format
  const address = ethereumAddress.toLowerCase();
  const addressRegex = /^(0x){1}[0-9a-fA-F]{40}$/i;
  let validEthAddress = addressRegex.test(address);

  try {
    if (validEthAddress) {
      // Check if the address has a valid checksum
      const addressWithoutPrefix = address.replace(/^0x/, '');
      const addressHash = Web3Static.utils.sha3(addressWithoutPrefix);
      const checksumAddress = '0x' + addressWithoutPrefix
        .split('')
        .map((char, index) => parseInt(addressHash[index], 16) >= 8 ? char.toUpperCase() : char)
        .join('');
  
      if (checksumAddress.toLowerCase() !== address.toLowerCase()) {
        validEthAddress = false;
      }
    }
    if (!validEmail) {
      res.status(400).json({ valid: false, message: 'Invalid email format.' });
    } else if (!validEthAddress) {
      res.status(400).json({ valid: false, message: 'Invalid Ethereum Address format.' });
    } else {
      // Put the address into database as unverified voter
      const accountData = {
        fullname: fullname,
        email: email,
        ethereumAddress: address, 
        faculty: faculty, 
        zone: zone,
        matrixNum: matrixNum, 
        signature: signature,
        verified: false,
      }

      await db.collection('Account').doc(address).set(accountData);
      
      const date = new Date().getTime();
      console.log("date: " + date)

      const registrationData = { 
        ethereumAddress: ethereumAddress,
        signature: signature,
        timestamp: date
      }
      
      const signatureHash = calculateHash(date, signature);
      console.log("signatureHash", signatureHash)
      await db.collection('PendingRegistration').doc(signatureHash).set(registrationData);
      const verificationLink = `${process.env.SERVER_ENDPOINT}/verify/${signatureHash}`;
      console.log("verificationLink", verificationLink)
      // Send email verification link
      sendEmail(ethereumAddress, email, verificationLink);
      res.status(200).json({ 
        valid: true, 
      });
    }
  } catch (error) {
    console.log(error)
  }
    
});
  
app.get('/api/verify/:signatureHash', async(req, res) => {
  const { signatureHash } = req.params;

  try {
    // Get from database if hash exists
    const doc = await db.collection('PendingRegistration').doc(signatureHash).get();
    if (!doc.exists) {
      console.log('No such registration token!');
      res.status(400).json({ valid: false, message: "No such registration token!"});
    } else {
      // Change account to verified voter
      const { ethereumAddress, signature, timestamp  } = doc.data()
      const sameSignature = signatureHash === calculateHash(timestamp, signature);
      if (sameSignature) {
        const accountRef = await db.collection('Account').doc(ethereumAddress).update({ verified: true });
        if (accountRef) {
          // Delete the signature hash from database
          await db.collection('PendingRegistration').doc(signatureHash).delete();
          res.status(200).json({ valid: true, message: "Account verified!"});
        }
      } else {
        res.status(400).json({ valid: false, message: "Signature does not match!"});
      }
    }
  } catch (error) {
    res.status(400).json({ valid: false, message: "Failed to write to database!"});
    console.log(error)
  }
})
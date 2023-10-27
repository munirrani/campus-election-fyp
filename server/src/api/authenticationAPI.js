const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { web3 } = require('../web3/web3');
const app = require('../server/express-server');
const uuidv4 = require('uuid/v4');
const { authenticateToken } = require('../server/authentication');
const { db } = require('../../db');

dotenv.config()

let nonces = {}
let adminAuthToken = {
    state: null
};

const getNonceForWallet = async (walletAddress) => {
    walletAddress = walletAddress.toLowerCase();

    if (nonces[walletAddress]) {
        return nonces[walletAddress];
    } else {
        const nonce = uuidv4();
        nonces[walletAddress] = nonce;
        return nonces[walletAddress];
    }
}

const isValidSignature = (walletAddress, signature, message) => {
    const signingAddress = web3.eth.accounts.recover(message, signature);
    return signingAddress.toLowerCase() === walletAddress.toLowerCase();
}

app.get('/api/nonce', async (req, res) => {
    const walletAddress = req.query.wallet.toLowerCase();
  
    // get the nonce for this walletAddress
    const nonce = await getNonceForWallet(walletAddress);
    
    res.json({ nonce });
});

app.get('/api/check-if-registered', async (req, res) => {
    const walletAddress = req.query.wallet;
    const docRef = db.collection('Account').doc(walletAddress);
    const docSnap = await docRef.get();
  
    if (docSnap.exists) {
      const data = docSnap.data();
      if (data.verified) {
        res.json({ registered: true, verified: true });
      } else {
        res.json({ registered: true, verified: false });
      }
    } else {
        res.json({ registered: false, verified: false });
    }
})

app.get('/api/authenticate', async (req, res) => {
    const currentWallet = req.query.wallet.toLowerCase(); 
    const message = req.query.message;
    const signature = req.headers['x-signature']; 

    // TODO - check if wallet is registered in the database, if no do not proceed

    console.log("/api/authenticate",currentWallet,signature,message)

    if (!currentWallet) {
        res.status(400).send('Invalid wallet');
        return;
    }
    if (!signature) {
        res.status(400).send('Invalid signature');
        return;
    }
    if (!message) {
        res.status(400).send('Invalid message');
        return;
    }
    const noncePart = message.split('with the given nonce: ');
    if (noncePart.length < 2) {
        res.status(400).send('Invalid message format');
        return;
    }
    
    const nonce = nonces.hasOwnProperty(currentWallet) ? nonces[currentWallet] : null;
    if (!nonce) {
        res.status(401).send('Nonce for the wallet does not exist');
        return;
    }

    const givenNonce = noncePart[1];
    if (givenNonce !== nonce) {
        res.status(401).send('Invalid nonce');
    }
    const isValid = isValidSignature(currentWallet, signature, message);
    if (!isValid) {
        res.status(401).send('Invalid signature');
        return;
    }
    const token = jwt.sign({ currentWallet }, process.env.SECRET_KEY_JWT, { expiresIn: '1h' });

    res.json({ token });
})


app.get('/api/logout', async (req, res) => {
    const currentWallet = req.query.wallet.toLowerCase(); 
    const message = req.query.message;
    const signature = req.headers['x-signature']; 

    console.log("/api/logout",currentWallet,signature)

    if (!currentWallet) {
        res.status(400).send('Invalid wallet');
        return;
    }
    if (!signature) {
        res.status(400).send('Invalid signature');
        return;
    }
    if (!message) {
        res.status(400).send('Invalid message');
        return;
    }
    const noncePart = message.split('with the given nonce: ');
    if (noncePart.length < 2) {
        res.status(400).send('Invalid message format');
        return;
    }

    const nonce = nonces.hasOwnProperty(currentWallet) ? nonces[currentWallet] : null;
    if (!nonce) {
        res.status(401).send('Nonce for the wallet does not exist');
        return;
    }


    const givenNonce = noncePart[1];
    if (givenNonce !== nonce) {
        res.status(401).send('Invalid nonce');
    }

    const isValid = isValidSignature(currentWallet, signature, message);
    if (!isValid) {
        res.status(401).send('Invalid signature');
        return;
    }
    delete nonces[currentWallet];
    res.json({ valid: true });
})

module.exports = {
    adminAuthToken,
}
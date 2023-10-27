const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      return res.sendStatus(401);
    }
  
    jwt.verify(token, process.env.SECRET_KEY_JWT, (err, user) => {
      if (err) {
        return res.sendStatus(403);
      }
  
      req.user = user;
  
      next();
    });
};

const authenticateContractOwner = (req, res, next) => {
    let contractOwner;
    if (req.method === 'GET') {
        contractOwner = req.params.contractOwner;
    } else if (req.method === 'POST') {
        contractOwner = req.body.contractOwner;
    } else {
      // Handle other HTTP methods if needed
      res.status(405).json({ message: 'Method not allowed.' });
      return;
    }

    const authToken = req.headers['authorization'].split(' ')[1];
    const decoded = jwt.verify(authToken, process.env.SECRET_KEY_JWT);
    const contractOwnerDecoded = decoded.currentWallet;
    
    if (contractOwnerDecoded.toLowerCase() !== contractOwner.toLowerCase()) {
        res.status(401).json({ message: 'Unauthorized.' });
        return; 
    }
    next();
}

module.exports = { authenticateContractOwner, authenticateToken } ;
  
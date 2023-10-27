const app = require('../server/express-server');
const chains = require('../../constants/chains');
const dotenv = require('dotenv');

dotenv.config();

app.get('/api/chainInfo', async(req, res) => {
    try {
      res.status(200).json({ chain: chains[process.env.CHAIN_SELECTION] });
    } catch (error) {
      console.log(error)
    }
})
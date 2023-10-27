const app = require('./src/server/express-server');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const port = process.env.PORT;

require('./src/api/infoAPI');
require('./src/api/registrationAPI');
require('./src/api/authenticationAPI');
require('./src/api/voteAPI');
require('./src/api/electionAPI');
require('./src/api/adminAPI');
require('./src/web3/contractListener')

app.use(express.static(path.resolve(__dirname, '../client/build')));

// app.get('*', (req, res) => {
//   res.sendFile(path.resolve(__dirname, '../client/build', 'index.html'));
// });


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});



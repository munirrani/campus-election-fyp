const express = require('express');
const app = express();
const cors = require('cors');

app.use(express.json());
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-signature', 'Authorization'],
    credentials: true,
}));

module.exports = app;

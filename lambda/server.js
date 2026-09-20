const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const { skillBuilder } = require('./index');

const app = express();
const skill = skillBuilder.create();
const verifyRequests = process.env.DISABLE_VERIFICATION !== 'true';
const adapter = new ExpressAdapter(skill, verifyRequests, verifyRequests);

app.post('/', (req, res, next) => {
    const start = Date.now();
    console.log(`Incoming POST / at ${new Date().toISOString()}`);
    res.on('finish', () => {
        console.log(`Responded ${res.statusCode} after ${Date.now() - start}ms`);
    });
    next();
}, adapter.getRequestHandlers());

process.on('unhandledRejection', (err) => {
    console.error('Unhandled rejection:', err && err.stack ? err.stack : err);
});

app.get('/', (req, res) => {
    res.status(200).send('Barca Live Score skill endpoint is running.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Barca Live Score skill listening on port ${port}`);
});

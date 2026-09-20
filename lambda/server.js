const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const { skillBuilder } = require('./index');

const app = express();
const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);

app.post('/', (req, res, next) => {
    console.log(`Incoming POST / at ${new Date().toISOString()}`);
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

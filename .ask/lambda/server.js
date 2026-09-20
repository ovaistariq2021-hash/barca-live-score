const express = require('express');
const { ExpressAdapter } = require('ask-sdk-express-adapter');
const { skillBuilder } = require('./index');

const app = express();
const skill = skillBuilder.create();
const adapter = new ExpressAdapter(skill, true, true);

app.post('/', express.json(), adapter.getRequestHandlers());

app.get('/', (req, res) => {
    res.status(200).send('Barca Live Score skill endpoint is running.');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Barca Live Score skill listening on port ${port}`);
});

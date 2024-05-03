const express = require('express');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./swagger-output.json');

const app = express();
const port = process.env.PORT;

app.use(express.json());

app.use('/register', require('./src/routes/register'));
app.use('/login', require('./src/routes/login'));
app.use('/book', require('./src/routes/book'));
app.use('/readingList', require('./src/routes/readingList'));
app.use('/user', require('./src/routes/user'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.listen(port, function () {
  console.log('SERVER STARTED ON localhost:' + port);
})
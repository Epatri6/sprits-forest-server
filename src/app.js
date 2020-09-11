require('dotenv').config();
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const {NODE_ENV} = require('./config');
const errorHandler = require('./error-handler');
const levelDataRouter = require('./level-data/level-data-router');
const UserRouter = require('./users/user-router');
const authRouter = require('./auth/auth-router');

const app = express();

const morganOption = NODE_ENV === 'production' ? 'tiny' : 'common';

app.use(morgan(morganOption));
app.use(helmet());
app.use(cors());

app.use('/api/levels', levelDataRouter);
app.use('/api/users', UserRouter);
app.use('/api/auth', authRouter);

app.use(errorHandler);

module.exports = app;

const express = require('express');
const LevelDataService = require('./level-data-service');
const levelDataRouter = express.Router();
const { requireAuth } = require('../middleware/jwt-auth');

levelDataRouter
  .route('/')
  .all(requireAuth)
  .get((req, res, next) => {
    LevelDataService.getLevels(req.app.get('db'))
      .then((levels) => {
        res.json(levels);
      })
      .catch(next);
  });

levelDataRouter
  .route('/random')
  .all(requireAuth)
  .get((req, res, next) => {
    LevelDataService.getLevel(req.app.get('db'))
      .then((level) => {
        if (!level) {
          res.status(404).send('Level not found.');
        }
        res.json(level);
      })
      .catch(next);
  });

module.exports = levelDataRouter;

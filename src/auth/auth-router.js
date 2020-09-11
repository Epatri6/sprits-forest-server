const express = require('express');
const AuthService = require('./auth-service');

const authRouter = express.Router();
const jsonBodyParser = express.json();

authRouter.post('/login', jsonBodyParser, (req, res, next) => {
  const { username, pass } = req.body;
  const loginUser = { username, pass };

  for (const [key, value] of Object.entries(loginUser)) {
    if (value == null)
      return res.status(400).json({
        error: `Missing '${key}' in request body`,
      });
  }

  AuthService.getUserWithUserName(req.app.get('db'), loginUser.username)
    .then((dbUser) => {
      if (!dbUser)
        return res.status(400).json({
          error: 'Incorrect username or password',
        });

      return AuthService.comparePasswords(loginUser.pass, dbUser.pass).then(
        (compareMatch) => {
          if (!compareMatch)
            return res.status(400).json({
              error: 'Incorrect username or password',
            });

          const sub = dbUser.username.toLowerCase();
          const payload = { user_id: dbUser.id };
          res.send({
            authToken: AuthService.createJwt(sub, payload),
          });
        }
      );
    })
    .catch(next);
});

module.exports = authRouter;

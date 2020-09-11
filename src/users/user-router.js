const express = require('express');
const path = require('path');
const UserService = require('./user-service');
const userRouter = express.Router();
const jsonParser = express.json();
const { requireAuth } = require('../middleware/jwt-auth');
const AuthService = require('../auth/auth-service');

userRouter
  .route('/')
  .get(requireAuth, (req, res, next) => {
    return res.status(200).json(UserService.serializeUser(req.user));
  })
  .patch(requireAuth, jsonParser, (req, res, next) => {
    let { username = '', pass, score, savegame } = req.body;
    let userToUpdate = { username, pass, score, savegame };

    const numberOfValues = Object.values(userToUpdate).filter(Boolean).length;
    if (numberOfValues === 0) {
      return res.status(400).json({
        error: {
          message: 'Request body must contain data',
        },
      });
    }

    let finish = function (updateData) {
      return UserService.updateUser(
        req.app.get('db'),
        req.user.username,
        updateData
      )
        .then((updatedUser) => {
          return res.status(200).json({
            authToken: AuthService.createJwt(updatedUser.username, {
              user_id: updatedUser.id,
            }),
          });
        })
        .catch(next);
    };

    UserService.hasUserWithUserName(req.app.get('db'), username)
      .then((hasUserWithUserName) => {
        if (hasUserWithUserName)
          return res.status(400).json({ error: 'Username already taken' });

        if (score) {
          userToUpdate.score = parseInt(score);
          if (isNaN(score)) {
            return res.status(400).json({ error: 'score must be a number' });
          }
        } else {
          delete userToUpdate.score;
        }
        if (!userToUpdate.username) {
          delete userToUpdate.username;
        }
        if (!userToUpdate.savegame) {
          delete userToUpdate.savegame;
        }
        if (pass) {
          const passwordError = UserService.validatePassword(pass);

          if (passwordError) {
            return res.status(400).json({ error: passwordError });
          }
          return UserService.hashPassword(pass)
            .then((updatedPassword) => {
              userToUpdate.pass = updatedPassword;
              return finish(userToUpdate);
            })
            .catch(next);
        }
        delete userToUpdate.pass;
        return finish(userToUpdate);
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { pass, username } = req.body;

    for (const field of ['username', 'pass'])
      if (!req.body[field])
        return res.status(400).json({
          error: `Missing '${field}' in request body`,
        });

    const passwordError = UserService.validatePassword(pass);

    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    UserService.hasUserWithUserName(req.app.get('db'), username)
      .then((hasUserWithUserName) => {
        if (hasUserWithUserName)
          return res.status(400).json({ error: 'Username already taken' });

        return UserService.hashPassword(pass).then((hashedPassword) => {
          const newUser = {
            username,
            pass: hashedPassword,
          };

          return UserService.insertUser(req.app.get('db'), newUser).then(
            (user) => {
              res
                .status(201)
                .location(path.posix.join(req.originalUrl, `/${user.id}`))
                .json(UserService.serializeUser(user));
            }
          );
        });
      })
      .catch(next);
  })
  .delete(requireAuth, (req, res, next) => {
    UserService.deleteUser(req.app.get('db'), req.user.username)
      .then(() => {
        return res.status(204).end();
      })
      .catch(next);
  });

module.exports = userRouter;

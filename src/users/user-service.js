const bcrypt = require('bcryptjs');
const xss = require('xss');

const REGEX_UPPER_LOWER_NUMBER_SPECIAL = /(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\$%\^&])[\S]+/;

const UsersService = {
  hasUserWithUserName(db, username) {
    if (username) {
      username = username.toLowerCase();
    }
    return db('users')
      .where({ username })
      .first()
      .then((user) => !!user);
  },
  insertUser(db, newUser) {
    newUser.username = newUser.username.toLowerCase();
    if (newUser.userName) {
      newUser.username = newUser.username.toLowerCase();
    }
    return db
      .insert(newUser)
      .into('users')
      .returning('*')
      .then(([user]) => user);
  },
  updateUser(db, username, newUser) {
    if (username) {
      username = username.toLowerCase();
    }
    if (newUser.userName) {
      newUser.username = newUser.username.toLowerCase();
    }
    return db('users')
      .where({ username })
      .update(newUser)
      .returning('*')
      .then((rows) => rows[0]);
  },
  deleteUser(db, username) {
    if (username) {
      username = username.toLowerCase();
    }
    return db('users').where({ username }).delete();
  },
  validatePassword(password) {
    if (password.length < 8) {
      return 'Password be longer than 8 characters';
    }
    if (password.length > 72) {
      return 'Password be less than 72 characters';
    }
    if (password.startsWith(' ') || password.endsWith(' ')) {
      return 'Password must not start or end with empty spaces';
    }
    if (!REGEX_UPPER_LOWER_NUMBER_SPECIAL.test(password)) {
      return 'Password must contain one upper case, lower case, number and special character';
    }
    return null;
  },
  hashPassword(password) {
    return bcrypt.hash(password, 12);
  },
  serializeUser(user) {
    return {
      id: user.id,
      username: xss(user.username),
      score: user.score,
      savegame: user.savegame,
    };
  },
};

module.exports = UsersService;

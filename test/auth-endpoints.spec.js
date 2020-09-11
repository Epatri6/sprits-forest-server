const knex = require('knex');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const bcrypt = require('bcryptjs');
const { makeUserArray } = require('./users.fixtures');

describe('Auth Endpoints', function () {
  const API_TOKEN = process.env.API_TOKEN;
  let db;

  const testUsers = makeUserArray();
  const testUser = testUsers[0];
  const preppedUsers = testUsers.map((user) => ({
    ...user,
    pass: bcrypt.hashSync(user.pass, 1),
  }));

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set('db', db);
  });

  after('disconnect from db', () => db.destroy());

  before('cleanup', () => db('users').truncate());

  afterEach('cleanup', () => db('users').truncate());

  describe('POST /api/auth/login', () => {
    beforeEach('insert users', () => db.insert(preppedUsers).into('users'));

    const requiredFields = ['username', 'pass'];

    requiredFields.forEach((field) => {
      const loginAttemptBody = {
        username: testUser.username,
        pass: testUser.pass,
      };

      it(`responds with 400 required error when '${field}' is missing`, () => {
        delete loginAttemptBody[field];

        return supertest(app)
          .post('/api/auth/login')
          .send(loginAttemptBody)
          .expect(400, {
            error: `Missing '${field}' in request body`,
          });
      });
    });

    it('responds 400 "invalid username or password" when bad user_name', () => {
      const userInvalidUser = { username: 'user-not', pass: 'existy' };
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidUser)
        .expect(400, { error: 'Incorrect username or password' });
    });

    it('responds 400 "invalid username or password" when bad password', () => {
      const userInvalidPass = {
        username: testUser.username,
        pass: 'incorrect',
      };
      return supertest(app)
        .post('/api/auth/login')
        .send(userInvalidPass)
        .expect(400, { error: 'Incorrect username or password' });
    });

    it('responds 200 and JWT auth token using secret when valid credentials', () => {
      const userValidCreds = {
        username: testUser.username,
        pass: testUser.pass,
      };
      const expectedToken = jwt.sign(
        { user_id: testUser.id },
        process.env.JWT_SECRET,
        {
          subject: testUser.username,
          algorithm: 'HS256',
        }
      );
      return supertest(app)
        .post('/api/auth/login')
        .send(userValidCreds)
        .expect(200, {
          authToken: expectedToken,
        });
    });
  });
});

const knex = require('knex');
const bcrypt = require('bcryptjs');
const app = require('../src/app');
const { makeUserArray } = require('./users.fixtures');
const makeAuthHeader = require('./helpers');
const supertest = require('supertest');

describe('Users Endpoints', function () {
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

  describe('GET /api/users', () => {
    beforeEach('insert users', () => db.insert(preppedUsers).into('users'));
    it('Returns user data', () => {
      const expected = {
        id: testUser.id,
        username: testUser.username,
        score: testUser.score,
        savegame: testUser.savegame,
      };
      return supertest(app)
        .get('/api/users')
        .set('Authorization', makeAuthHeader(testUser))
        .expect(200, expected);
    });
  });

  describe('PATCH /api/users', () => {
    beforeEach('insert users', () => db.insert(preppedUsers).into('users'));
    it('patches user data', () => {
      const newData = {
        score: 1,
        pass: 'Testing!1',
      };
      const expected = {
        id: testUser.id,
        username: testUser.username,
        score: 1,
        savegame: testUser.savegame,
      };
      const header = makeAuthHeader(testUser);
      return supertest(app)
        .patch('/api/users')
        .set('Authorization', header)
        .send(newData)
        .expect(200)
        .then(() => {
          return supertest(app)
            .get('/api/users')
            .set('Authorization', header)
            .expect(200, expected);
        });
    });
  });

  describe('POST /api/users', () => {
    context('User Validation', () => {
      beforeEach('insert users', () => db.insert(preppedUsers).into('users'));

      const requiredFields = ['username', 'pass'];

      requiredFields.forEach((field) => {
        const registerAttemptBody = {
          username: 'test username',
          pass: 'test password',
        };

        it(`responds with 400 required error when '${field}' is missing`, () => {
          delete registerAttemptBody[field];

          return supertest(app)
            .post('/api/users')
            .send(registerAttemptBody)
            .expect(400, {
              error: `Missing '${field}' in request body`,
            });
        });
      });

      it(`responds 400 'Password be longer than 8 characters' when empty password`, () => {
        const userShortPassword = {
          username: 'test user_name',
          pass: '1234567',
        };
        return supertest(app)
          .post('/api/users')
          .send(userShortPassword)
          .expect(400, { error: 'Password be longer than 8 characters' });
      });

      it(`responds 400 'Password be less than 72 characters' when long password`, () => {
        const userLongPassword = {
          username: 'test user_name',
          pass: '*'.repeat(73),
        };
        return supertest(app)
          .post('/api/users')
          .send(userLongPassword)
          .expect(400, { error: `Password be less than 72 characters` });
      });

      it(`responds 400 error when password starts with spaces`, () => {
        const userPasswordStartsSpaces = {
          username: 'test user_name',
          pass: ' 1Aa!2Bb@',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordStartsSpaces)
          .expect(400, {
            error: `Password must not start or end with empty spaces`,
          });
      });

      it(`responds 400 error when password ends with spaces`, () => {
        const userPasswordEndsSpaces = {
          username: 'test user_name',
          pass: '1Aa!2Bb@ ',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordEndsSpaces)
          .expect(400, {
            error: `Password must not start or end with empty spaces`,
          });
      });

      it(`responds 400 error when password isn't complex enough`, () => {
        const userPasswordNotComplex = {
          username: 'test username',
          pass: '11AAaabb',
        };
        return supertest(app)
          .post('/api/users')
          .send(userPasswordNotComplex)
          .expect(400, {
            error: `Password must contain one upper case, lower case, number and special character`,
          });
      });

      it(`responds 400 'User name already taken' when username isn't unique`, () => {
        const duplicateUser = {
          username: testUser.username,
          pass: '11AAaa!!',
        };
        return supertest(app)
          .post('/api/users')
          .send(duplicateUser)
          .expect(400, { error: `Username already taken` });
      });
    });

    context(`Happy path`, () => {
      it(`responds 201, serialized user, storing bcryped password`, () => {
        const newUser = {
          username: 'test user_name',
          pass: '11AAaa!!',
        };
        return supertest(app)
          .post('/api/users')
          .send(newUser)
          .expect(201)
          .expect((res) => {
            expect(res.body).to.have.property('id');
            expect(res.body.username).to.eql(newUser.username);
            expect(res.body).to.not.have.property('pass');
            expect(res.headers.location).to.eql(`/api/users/${res.body.id}`);
          })
          .expect((res) =>
            db
              .from('users')
              .select('*')
              .where({ id: res.body.id })
              .first()
              .then((row) => {
                expect(row.username).to.eql(newUser.username);
                return bcrypt.compare(newUser.pass, row.pass);
              })
              .then((compareMatch) => {
                expect(compareMatch).to.be.true;
              })
          );
      });
    });
  });
});

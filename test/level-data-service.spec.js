const { makeDataArray } = require('./level-data.fixtures');
const knex = require('knex');
const app = require('../src/app');
const supertest = require('supertest');
const makeAuthHeader = require('./helpers');
const { makeUserArray } = require('./users.fixtures');
const bcrypt = require('bcryptjs');

describe('Level Data Router', () => {
  let db;

  const testUsers = makeUserArray();
  const testUser = testUsers[0];
  const preppedUsers = testUsers.map((user) => ({
    ...user,
    pass: bcrypt.hashSync(user.pass, 1),
  }));

  before(() => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DATABASE_URL,
    });
    app.set('db', db);
  });

  before(() => db('level_data').truncate());
  before(() => db.insert(preppedUsers).into('users'));

  after(() => db('users').truncate());
  after(() => db.destroy());

  describe('/levels endpoint', () => {
    context('given no data in database', () => {
      it('returns an empty array', () => {
        return supertest(app)
          .get('/api/levels')
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, []);
      });
    });

    context('given data in database', () => {
      const testData = makeDataArray();
      beforeEach(() => db.into('level_data').insert(testData));
      afterEach(() => db('level_data').truncate());

      it('returns all levels', () => {
        return supertest(app)
          .get('/api/levels')
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, testData);
      });
    });
  });

  describe('/levels/random endpoint', () => {
    context('given no data in database', () => {
      it('returns 404 when level not found', () => {
        return supertest(app)
          .get('/api/levels/random')
          .set('Authorization', makeAuthHeader(testUser))
          .expect(404, 'Level not found.');
      });
    });

    context('given data in database', () => {
      const testData = makeDataArray();
      beforeEach(() => db.into('level_data').insert(testData[0]));
      afterEach(() => db('level_data').truncate());

      it('returns random level', () => {
        return supertest(app)
          .get('/api/levels/random')
          .set('Authorization', makeAuthHeader(testUser))
          .expect(200, testData[0]);
      });
    });
  });
});

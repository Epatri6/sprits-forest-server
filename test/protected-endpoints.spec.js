const knex = require('knex');
const app = require('../src/app');
const { makeUserArray } = require('./users.fixtures');
const bcrypt = require('bcryptjs');
const makeAuthHeader = require('./helpers');

describe('Protected endpoints', function () {
  let db;

  const testUsers = makeUserArray();
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

  beforeEach('insert users', () => db.insert(preppedUsers).into('users'));

  const protectedEndpoints = [
    {
      name: 'GET /api/users',
      path: '/api/users',
      method: supertest(app).get,
    },
    {
      name: 'PATCH /api/users',
      path: '/api/users',
      method: supertest(app).patch,
    },
    {
      name: 'GET /api/levels',
      path: '/api/levels',
      method: supertest(app).get,
    },
    {
      name: 'GET /api/levels/random',
      path: '/api/levels/random',
      method: supertest(app).get,
    }
  ];

  protectedEndpoints.forEach((endpoint) => {
    describe(endpoint.name, () => {
      it('responds 401 "Missing bearer token" when no bearer token', () => {
        return endpoint
          .method(endpoint.path)
          .expect(401, { error: 'Missing bearer token' });
      });

      it('responds 401 "Unauthorized request" when invalid JWT secret', () => {
        const validUser = testUsers[0];
        const invalidSecret = 'bad-secret';
        return endpoint
          .method(endpoint.path)
          .set('Authorization',
            makeAuthHeader(validUser, invalidSecret)
          )
          .expect(401, { error: 'Unauthorized request' });
      });

      it('responds 401 "Unauthorized request" when invalid sub in payload', () => {
        const invalidUser = { username: 'user-not-existy', id: 1 };
        return endpoint
          .method(endpoint.path)
          .set('Authorization', makeAuthHeader(invalidUser))
          .expect(401, { error: 'Unauthorized request' });
      });
    });
  });
});

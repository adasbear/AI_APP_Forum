import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import * as dbConfig from '../db/config.js';
import { getProfileService, updateProfileService } from '../src/api/auth/service/auth.service.js';

describe('Auth Service Profile Tests', () => {
  it('getProfileService should return user profile data', async () => {
    const fakeRow = {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: '/uploads/avatars/1.jpg',
      bio: 'Test bio',
      questionsAsked: 5,
      answersGiven: 2
    };

    mock.method(dbConfig, 'safeExecute', async () => {
      return [fakeRow];
    });

    const profile = await getProfileService(1);
    assert.deepStrictEqual(profile, fakeRow);

    dbConfig.safeExecute.mock.restore();
  });

  it('updateProfileService should construct correct query and return profile', async () => {
    const fakeRow = {
      id: 1,
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'john@example.com',
      avatarUrl: '/uploads/avatars/2.jpg',
      bio: 'New bio',
      questionsAsked: 5,
      answersGiven: 2
    };

    let executedQuery = '';
    let executedParams = [];

    mock.method(dbConfig, 'safeExecute', async (query, params) => {
      if (query.includes('UPDATE users')) {
        executedQuery = query;
        executedParams = params;
        return { affectedRows: 1 };
      }
      return [fakeRow];
    });

    const updatedProfile = await updateProfileService(1, {
      firstName: 'Jane',
      lastName: 'Doe',
      bio: 'New bio',
      avatarUrl: '/uploads/avatars/2.jpg'
    });

    assert.ok(executedQuery.includes('UPDATE users'));
    assert.deepStrictEqual(executedParams, ['Jane', 'Doe', 'New bio', '/uploads/avatars/2.jpg', 1]);
    assert.deepStrictEqual(updatedProfile, fakeRow);

    dbConfig.safeExecute.mock.restore();
  });
});

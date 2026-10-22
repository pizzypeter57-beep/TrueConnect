import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createApiServer } from './app.js';

async function createTestApi(t) {
  const directory = mkdtempSync(join(tmpdir(), 'trueconnect-api-'));
  const api = createApiServer({
    databasePath: join(directory, 'test.sqlite'),
    exposeDevelopmentCode: true,
  });
  api.server.listen(0, '127.0.0.1');
  await once(api.server, 'listening');
  const address = api.server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  t.after(async () => {
    await api.close();
    rmSync(directory, { recursive: true, force: true });
  });

  return { baseUrl };
}

async function postJson(baseUrl, path, body, cookie) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  return fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

async function createMember(baseUrl, email, name, city) {
  const registration = await postJson(baseUrl, '/api/auth/register', {
    email,
    name,
    password: 'strong-password',
  });
  assert.equal(registration.status, 201);
  const { developmentCode } = await registration.json();
  const verification = await postJson(baseUrl, '/api/auth/verify', {
    email,
    code: developmentCode,
  });
  assert.equal(verification.status, 200);
  const cookie = verification.headers.get('set-cookie').split(';', 1)[0];
  const me = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } });
  const { user } = await me.json();
  const profile = await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, age: 29, city }),
  });
  assert.equal(profile.status, 200);
  return { cookie, user };
}

test('register, verify, authenticate, save profile, and log out', async (t) => {
  const { baseUrl } = await createTestApi(t);
  const registration = await postJson(baseUrl, '/api/auth/register', {
    email: 'Taylor@Example.com',
    name: 'Taylor',
    password: 'strong-password',
  });

  assert.equal(registration.status, 201);
  const registrationBody = await registration.json();
  assert.match(registrationBody.developmentCode, /^\d{6}$/);
  assert.equal('password' in registrationBody, false);

  const verification = await postJson(baseUrl, '/api/auth/verify', {
    email: 'taylor@example.com',
    code: registrationBody.developmentCode,
  });
  assert.equal(verification.status, 200);
  const cookie = verification.headers.get('set-cookie').split(';', 1)[0];

  const currentUser = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  assert.equal(currentUser.status, 200);
  assert.equal((await currentUser.json()).user.email, 'taylor@example.com');

  const profileResponse = await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: { Cookie: cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Taylor', age: 29, city: 'Seattle', intent: 'New friends' }),
  });
  assert.equal(profileResponse.status, 200);
  assert.equal((await profileResponse.json()).profile.city, 'Seattle');

  const logout = await postJson(baseUrl, '/api/auth/logout', {}, cookie);
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
  });
  assert.equal(afterLogout.status, 401);
});

test('rejects duplicate email addresses and unauthenticated profile writes', async (t) => {
  const { baseUrl } = await createTestApi(t);
  const body = { email: 'taylor@example.com', name: 'Taylor', password: 'strong-password' };
  const firstRegistration = await postJson(baseUrl, '/api/auth/register', body);
  const duplicateRegistration = await postJson(baseUrl, '/api/auth/register', body);
  const profileResponse = await fetch(`${baseUrl}/api/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Taylor', age: 29, city: 'Seattle' }),
  });

  assert.equal(firstRegistration.status, 201);
  assert.equal(duplicateRegistration.status, 409);
  assert.equal(profileResponse.status, 401);
});

test('discovers members, records mutual likes, and gates messages on a match', async (t) => {
  const { baseUrl } = await createTestApi(t);
  const first = await createMember(baseUrl, 'riley@example.com', 'Riley', 'Portland');
  const second = await createMember(baseUrl, 'jordan@example.com', 'Jordan', 'Portland');
  const discover = await fetch(`${baseUrl}/api/discover`, {
    headers: { Cookie: first.cookie },
  });
  const discoverBody = await discover.json();

  assert.equal(discover.status, 200);
  assert.equal(discoverBody.members.length, 1);
  assert.equal(discoverBody.members[0].userId, second.user.id);

  const firstLike = await fetch(`${baseUrl}/api/likes`, {
    method: 'POST',
    headers: { Cookie: first.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId: second.user.id, action: 'like' }),
  });
  assert.equal(firstLike.status, 200);
  assert.equal((await firstLike.json()).matched, false);
  const incomingLikes = await fetch(`${baseUrl}/api/likes`, {
    headers: { Cookie: second.cookie },
  });
  assert.equal((await incomingLikes.json()).likes[0].matched, false);

  const earlyMessage = await postJson(baseUrl, '/api/messages', {
    recipientId: first.user.id,
    body: 'Hello before a match',
  }, second.cookie);
  assert.equal(earlyMessage.status, 403);

  const secondLike = await fetch(`${baseUrl}/api/likes`, {
    method: 'POST',
    headers: { Cookie: second.cookie, 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetId: first.user.id, action: 'like' }),
  });
  assert.equal((await secondLike.json()).matched, true);
  const mutualLikes = await fetch(`${baseUrl}/api/likes`, {
    headers: { Cookie: first.cookie },
  });
  assert.equal((await mutualLikes.json()).likes[0].matched, true);

  const message = await postJson(baseUrl, '/api/messages', {
    recipientId: second.user.id,
    body: 'Hello, Jordan!',
  }, first.cookie);
  assert.equal(message.status, 201);

  const messages = await fetch(`${baseUrl}/api/messages?with=${second.user.id}`, {
    headers: { Cookie: first.cookie },
  });
  assert.equal((await messages.json()).messages[0].body, 'Hello, Jordan!');

  const conversations = await fetch(`${baseUrl}/api/conversations`, {
    headers: { Cookie: first.cookie },
  });
  assert.equal((await conversations.json()).conversations.length, 1);
});
import { createHash, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';

const SESSION_LIFETIME = 14 * 24 * 60 * 60 * 1000;
const VERIFICATION_LIFETIME = 15 * 60 * 1000;
const MAX_BODY_SIZE = 16 * 1024;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, body, headers = {}) {
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json; charset=utf-8',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_SIZE) throw new HttpError(413, 'Request is too large.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function parseCookies(header = '') {
  return new Map(header.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return ['', ''];
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }));
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sameHash(first, second) {
  const firstBuffer = Buffer.from(first, 'hex');
  const secondBuffer = Buffer.from(second, 'hex');
  return firstBuffer.length === secondBuffer.length && timingSafeEqual(firstBuffer, secondBuffer);
}

function sessionCookie(token, maxAge, production) {
  return `tc_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${production ? '; Secure' : ''}`;
}

function initializeDatabase(database) {
  database.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS verification_codes (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      age INTEGER,
      city TEXT,
      intent TEXT,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profile_actions (
      actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
      created_at TEXT NOT NULL,
      PRIMARY KEY (actor_id, target_id),
      CHECK (actor_id <> target_id)
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS messages_participants_idx
      ON messages(sender_id, recipient_id, id);
  `);
}

function profileFor(database, userId) {
  return database.prepare(`
    SELECT name, age, city, intent, updated_at AS updatedAt
    FROM profiles WHERE user_id = ?
  `).get(userId) ?? null;
}

export function createApiServer({ databasePath, exposeDevelopmentCode = process.env.NODE_ENV !== 'production' } = {}) {
  if (!databasePath) throw new TypeError('databasePath is required.');
  const database = new DatabaseSync(databasePath);
  initializeDatabase(database);
  const production = process.env.NODE_ENV === 'production';

  function createSession(response, userId) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + SESSION_LIFETIME;
    database.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)')
      .run(hash(token), userId, expiresAt);
    response.setHeader('Set-Cookie', sessionCookie(token, SESSION_LIFETIME / 1000, production));
  }

  function authenticatedUser(request) {
    const token = parseCookies(request.headers.cookie).get('tc_session');
    if (!token) return null;
    const tokenHash = hash(token);
    const session = database.prepare(`
      SELECT users.id, users.email, users.created_at AS createdAt
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ? AND users.verified = 1
    `).get(tokenHash, Date.now());
    if (!session) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
    return session ?? null;
  }

  function isMatched(firstUserId, secondUserId) {
    return Boolean(database.prepare(`
      SELECT 1 FROM profile_actions first
      JOIN profile_actions second
        ON second.actor_id = first.target_id AND second.target_id = first.actor_id
      WHERE first.actor_id = ? AND first.target_id = ?
        AND first.action = 'like' AND second.action = 'like'
    `).get(firstUserId, secondUserId));
  }

  async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (!url.pathname.startsWith('/api/')) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/register') {
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const password = typeof body.password === 'string' ? body.password : '';
      const intent = typeof body.intent === 'string' ? body.intent.trim().slice(0, 80) : '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        throw new HttpError(400, 'Enter a valid email address.');
      }
      if (!name || name.length > 80) throw new HttpError(400, 'Name must be between 1 and 80 characters.');
      if (password.length < 8 || password.length > 128) {
        throw new HttpError(400, 'Password must be between 8 and 128 characters.');
      }
      if (database.prepare('SELECT id FROM users WHERE email = ?').get(email)) {
        throw new HttpError(409, 'An account with this email already exists.');
      }

      const userId = randomUUID();
      const salt = randomBytes(16).toString('hex');
      const passwordHash = scryptSync(password, salt, 64).toString('hex');
      const code = String(randomInt(100000, 1000000));
      const now = new Date().toISOString();
      database.exec('BEGIN');
      try {
        database.prepare(`
          INSERT INTO users (id, email, password_salt, password_hash, created_at)
          VALUES (?, ?, ?, ?, ?)
        `).run(userId, email, salt, passwordHash, now);
        database.prepare(`
          INSERT INTO profiles (user_id, name, intent, updated_at) VALUES (?, ?, ?, ?)
        `).run(userId, name, intent || null, now);
        database.prepare(`
          INSERT INTO verification_codes (user_id, code_hash, expires_at) VALUES (?, ?, ?)
        `).run(userId, hash(code), Date.now() + VERIFICATION_LIFETIME);
        database.exec('COMMIT');
      } catch (error) {
        database.exec('ROLLBACK');
        if (error.code === 'ERR_SQLITE_CONSTRAINT_UNIQUE') {
          throw new HttpError(409, 'An account with this email already exists.');
        }
        throw error;
      }

      sendJson(response, 201, {
        email,
        message: 'Account created. Verify your email to continue.',
        ...(exposeDevelopmentCode ? { developmentCode: code } : {}),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/verify') {
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const code = typeof body.code === 'string' ? body.code : '';
      const user = database.prepare('SELECT id FROM users WHERE email = ?').get(email);
      const verification = user && database.prepare(`
        SELECT code_hash AS codeHash, expires_at AS expiresAt
        FROM verification_codes WHERE user_id = ?
      `).get(user.id);
      if (!verification || verification.expiresAt < Date.now() || !/^\d{6}$/.test(code)
        || !sameHash(verification.codeHash, hash(code))) {
        throw new HttpError(400, 'That code is invalid or expired.');
      }
      database.prepare('UPDATE users SET verified = 1 WHERE id = ?').run(user.id);
      database.prepare('DELETE FROM verification_codes WHERE user_id = ?').run(user.id);
      createSession(response, user.id);
      sendJson(response, 200, { message: 'Email verified.' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJson(request);
      const email = normalizeEmail(body.email);
      const password = typeof body.password === 'string' ? body.password : '';
      const user = database.prepare(`
        SELECT id, password_salt AS passwordSalt, password_hash AS passwordHash, verified
        FROM users WHERE email = ?
      `).get(email);
      if (!user || password.length > 128
        || !sameHash(user.passwordHash, scryptSync(password, user.passwordSalt, 64).toString('hex'))) {
        throw new HttpError(401, 'Email or password is incorrect.');
      }
      if (!user.verified) throw new HttpError(403, 'Verify your email before signing in.');
      createSession(response, user.id);
      sendJson(response, 200, { message: 'Signed in.' });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/auth/logout') {
      const token = parseCookies(request.headers.cookie).get('tc_session');
      if (token) database.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
      sendJson(response, 200, { message: 'Signed out.' }, {
        'Set-Cookie': sessionCookie('', 0, production),
      });
      return;
    }

    const user = authenticatedUser(request);
    if (!user) throw new HttpError(401, 'Sign in to continue.');

    if (request.method === 'GET' && url.pathname === '/api/auth/me') {
      sendJson(response, 200, { user: { ...user, profile: profileFor(database, user.id) } });
      return;
    }

    if (request.method === 'PUT' && url.pathname === '/api/profile') {
      const body = await readJson(request);
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const age = body.age;
      const city = typeof body.city === 'string' ? body.city.trim() : '';
      const intent = typeof body.intent === 'string' ? body.intent.trim().slice(0, 80) : '';
      if (!name || name.length > 80) throw new HttpError(400, 'Name must be between 1 and 80 characters.');
      if (!Number.isInteger(age) || age < 18 || age > 120) throw new HttpError(400, 'Age must be between 18 and 120.');
      if (!city || city.length > 100) throw new HttpError(400, 'City must be between 1 and 100 characters.');
      database.prepare(`
        INSERT INTO profiles (user_id, name, age, city, intent, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          name = excluded.name,
          age = excluded.age,
          city = excluded.city,
          intent = excluded.intent,
          updated_at = excluded.updated_at
      `).run(user.id, name, age, city, intent || null, new Date().toISOString());
      sendJson(response, 200, { profile: profileFor(database, user.id) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/discover') {
      const members = database.prepare(`
        SELECT users.id AS userId, profiles.name, profiles.age, profiles.city, profiles.intent
        FROM users JOIN profiles ON profiles.user_id = users.id
        WHERE users.verified = 1 AND users.id <> ?
          AND profiles.age IS NOT NULL AND profiles.city IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM profile_actions
            WHERE actor_id = ? AND target_id = users.id
          )
        ORDER BY profiles.updated_at DESC LIMIT 50
      `).all(user.id, user.id);
      sendJson(response, 200, { members });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/likes') {
      const likes = database.prepare(`
        SELECT users.id AS userId, profiles.name, profiles.age, profiles.city, profiles.intent,
          EXISTS (
            SELECT 1 FROM profile_actions reciprocal
            WHERE reciprocal.actor_id = ? AND reciprocal.target_id = users.id
              AND reciprocal.action = 'like'
          ) AS matched
        FROM profile_actions
        JOIN users ON users.id = profile_actions.actor_id
        JOIN profiles ON profiles.user_id = users.id
        WHERE profile_actions.target_id = ? AND profile_actions.action = 'like'
        ORDER BY profile_actions.created_at DESC
      `).all(user.id, user.id).map((like) => ({ ...like, matched: Boolean(like.matched) }));
      sendJson(response, 200, { likes });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/likes') {
      const body = await readJson(request);
      const targetId = typeof body.targetId === 'string' ? body.targetId : '';
      const action = body.action;
      const target = database.prepare(`
        SELECT users.id FROM users
        JOIN profiles ON profiles.user_id = users.id
        WHERE users.id = ? AND users.verified = 1
          AND profiles.age IS NOT NULL AND profiles.city IS NOT NULL
      `).get(targetId);
      if (!target || targetId === user.id) throw new HttpError(404, 'That member is not available.');
      if (action !== 'like' && action !== 'pass') throw new HttpError(400, 'Choose like or pass.');
      database.prepare(`
        INSERT INTO profile_actions (actor_id, target_id, action, created_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(actor_id, target_id) DO UPDATE SET
          action = excluded.action, created_at = excluded.created_at
      `).run(user.id, targetId, action, new Date().toISOString());
      sendJson(response, 200, { matched: action === 'like' && isMatched(user.id, targetId) });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/conversations') {
      const conversations = database.prepare(`
        SELECT members.id AS userId, profiles.name, profiles.city,
          (SELECT body FROM messages
            WHERE (sender_id = ? AND recipient_id = members.id)
              OR (sender_id = members.id AND recipient_id = ?)
            ORDER BY id DESC LIMIT 1) AS lastMessage,
          (SELECT created_at FROM messages
            WHERE (sender_id = ? AND recipient_id = members.id)
              OR (sender_id = members.id AND recipient_id = ?)
            ORDER BY id DESC LIMIT 1) AS lastMessageAt
        FROM profile_actions outgoing
        JOIN profile_actions reciprocal
          ON reciprocal.actor_id = outgoing.target_id AND reciprocal.target_id = outgoing.actor_id
        JOIN users members ON members.id = outgoing.target_id
        JOIN profiles ON profiles.user_id = members.id
        WHERE outgoing.actor_id = ? AND outgoing.action = 'like' AND reciprocal.action = 'like'
        ORDER BY COALESCE(lastMessageAt, outgoing.created_at) DESC
      `).all(user.id, user.id, user.id, user.id, user.id);
      sendJson(response, 200, { conversations });
      return;
    }

    if (request.method === 'GET' && url.pathname === '/api/messages') {
      const recipientId = url.searchParams.get('with') || '';
      if (!isMatched(user.id, recipientId)) throw new HttpError(403, 'Messaging is available after a mutual like.');
      const messages = database.prepare(`
        SELECT id, sender_id AS senderId, recipient_id AS recipientId, body, created_at AS createdAt
        FROM messages
        WHERE (sender_id = ? AND recipient_id = ?) OR (sender_id = ? AND recipient_id = ?)
        ORDER BY id
      `).all(user.id, recipientId, recipientId, user.id);
      sendJson(response, 200, { messages });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/messages') {
      const body = await readJson(request);
      const recipientId = typeof body.recipientId === 'string' ? body.recipientId : '';
      const message = typeof body.body === 'string' ? body.body.trim() : '';
      if (!isMatched(user.id, recipientId)) throw new HttpError(403, 'Messaging is available after a mutual like.');
      if (!message || message.length > 1000) throw new HttpError(400, 'Message must be between 1 and 1000 characters.');
      const createdAt = new Date().toISOString();
      const result = database.prepare(`
        INSERT INTO messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)
      `).run(user.id, recipientId, message, createdAt);
      sendJson(response, 201, {
        message: { id: Number(result.lastInsertRowid), senderId: user.id, recipientId, body: message, createdAt },
      });
      return;
    }

    sendJson(response, 404, { error: 'Not found.' });
  }

  const server = createServer((request, response) => {
    handle(request, response).catch((error) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }
      const status = error instanceof HttpError ? error.status : 500;
      if (status === 500) console.error(error);
      sendJson(response, status, { error: status === 500 ? 'Internal server error.' : error.message });
    });
  });

  return {
    server,
    async close() {
      if (server.listening) await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
      database.close();
    },
  };
}
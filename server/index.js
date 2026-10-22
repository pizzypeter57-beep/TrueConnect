import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApiServer } from './app.js';

const directory = dirname(fileURLToPath(import.meta.url));
const databasePath = resolve(directory, '../data/trueconnect.sqlite');
mkdirSync(dirname(databasePath), { recursive: true });

const api = createApiServer({ databasePath });
const port = Number(process.env.API_PORT || 3001);
api.server.listen(port, '127.0.0.1', () => {
  console.log(`TrueConnect API listening on http://127.0.0.1:${port}`);
  console.log(`SQLite database: ${databasePath}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => api.close().then(() => process.exit(0)));
}
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { configFromEnv, createApp } from './app.ts';
import { seedSamples } from './store.ts';

const DIST = join(process.cwd(), 'dist');
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
};

const seeded = await seedSamples();
if (seeded) console.log(`added ${seeded} sample replays`);
const handle = createApp(configFromEnv());
const server = createServer(async (req, res) => {
  if (await handle(req, res)) return;
  const path = new URL(req.url ?? '/', 'http://x').pathname;
  let file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) return void res.writeHead(400).end();
  const s = await stat(file).catch(() => null);
  // Client-side routes (/replay/:id, /leaderboard) fall back to the page.
  if (!s || s.isDirectory()) file = join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});
const port = Number(process.env.PORT ?? 3000);
server.listen(port, () => console.log(`jev-fighter on http://localhost:${port}`));

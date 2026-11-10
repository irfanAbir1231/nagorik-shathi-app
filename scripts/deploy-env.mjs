// Helper for the free deployment (docs/technical/Free-Deployment-Guide.md).
//
//   npm run deploy:secrets   fill the three empty secret keys in .env.deploy.local
//   npm run deploy:check     report what is missing or wrong, without changing anything
//   npm run deploy:db        create the tables and load the data in the Turso database
//
// Values live in `.env.deploy.local`, which is git-ignored. Nothing here prints a secret.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const envPath = process.env.DEPLOY_ENV_FILE ?? join(root, '.env.deploy.local'); // override is for testing
const [command, ...flags] = process.argv.slice(2);
const allowLocal = flags.includes('--allow-local'); // only for testing the pipeline on a local file

function fail(message) {
  console.error(`\n  ${message}\n`);
  process.exit(1);
}

if (!existsSync(envPath)) fail('Missing .env.deploy.local in the project folder.');

/** KEY=VALUE lines; blank lines and # comments are ignored; surrounding quotes are stripped. */
function parse(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || line.trimStart().startsWith('#')) continue;
    values[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return values;
}

const read = () => parse(readFileSync(envPath, 'utf8'));

/** Problems that would stop a deployment working. Returns a list of plain-English messages. */
function problems(values, { needDatabase }) {
  const out = [];
  if (needDatabase) {
    const url = values.DATABASE_URL ?? '';
    if (!url) out.push('DATABASE_URL is empty (paste the libsql:// URL from Turso).');
    else if (!/^(libsql|https):\/\//.test(url) && !(allowLocal && url.startsWith('file:'))) {
      out.push('DATABASE_URL must start with libsql:// (copy it from the Turso database page).');
    }
    if (!allowLocal && !values.DATABASE_AUTH_TOKEN) out.push('DATABASE_AUTH_TOKEN is empty (generate a token in Turso).');
    if (values.DATABASE_AUTH_TOKEN && /\s/.test(values.DATABASE_AUTH_TOKEN)) {
      out.push('DATABASE_AUTH_TOKEN contains a space; paste it again without spaces or line breaks.');
    }
  }
  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    if (!values[key]) out.push(`${key} is empty (run: npm run deploy:secrets).`);
    else if (values[key].length < 32) out.push(`${key} must be at least 32 characters.`);
  }
  if (!values.FIELD_ENCRYPTION_KEY) out.push('FIELD_ENCRYPTION_KEY is empty (run: npm run deploy:secrets).');
  else if (Buffer.from(values.FIELD_ENCRYPTION_KEY, 'base64').length !== 32) {
    out.push('FIELD_ENCRYPTION_KEY must be base64 for exactly 32 bytes (run: npm run deploy:secrets).');
  }
  if (values.OTP_DEV_ECHO !== 'false') out.push('OTP_DEV_ECHO must be false (the server will not start in production otherwise).');
  return out;
}

if (command === 'secrets') {
  let text = readFileSync(envPath, 'utf8');
  const generators = {
    JWT_SECRET: () => randomBytes(48).toString('hex'),
    JWT_REFRESH_SECRET: () => randomBytes(48).toString('hex'),
    FIELD_ENCRYPTION_KEY: () => randomBytes(32).toString('base64'),
  };
  const current = parse(text);
  const filled = [];
  for (const [key, make] of Object.entries(generators)) {
    if (current[key]) continue; // never overwrite: changing these signs users out / breaks encrypted data
    text = text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${make()}`);
    filled.push(key);
  }
  writeFileSync(envPath, text);
  console.log(filled.length ? `\n  Filled: ${filled.join(', ')}\n` : '\n  Secrets were already filled; nothing changed.\n');
} else if (command === 'check') {
  const list = problems(read(), { needDatabase: true });
  if (list.length === 0) {
    console.log('\n  Everything needed is filled in. Next: npm run deploy:db\n');
  } else {
    console.log('\n  Still to do:');
    for (const p of list) console.log(`   - ${p}`);
    console.log('');
    process.exit(1);
  }
} else if (command === 'db') {
  const values = read();
  const list = problems(values, { needDatabase: true });
  if (list.length) fail(`Not ready:\n   - ${list.join('\n   - ')}\n\n  Run: npm run deploy:check`);

  // Values set here beat .env.local, so this can never touch your local dev database.
  const env = { ...process.env, ...values };
  const host = values.DATABASE_URL.replace(/^[a-z]+:\/\//, '').split('/')[0];
  console.log(`\n  Loading the database at ${host} ...\n`);

  for (const [label, cmd] of [
    ['creating tables', 'npx drizzle-kit push --force'],
    ['loading programmes and demo accounts', 'npx tsx scripts/seed.ts'],
  ]) {
    console.log(`  -> ${label}`);
    const result = spawnSync(cmd, { cwd: root, env, stdio: 'inherit', shell: true });
    if (result.status !== 0) fail(`Stopped while ${label}. Scroll up for the error.`);
  }
  console.log('\n  Done. The database is ready. Next: add these values in Vercel and deploy.\n');
} else {
  fail('Use one of: npm run deploy:secrets | deploy:check | deploy:db');
}

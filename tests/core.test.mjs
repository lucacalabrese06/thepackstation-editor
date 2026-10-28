// Tests for sign-in sessions, the GitHub calls and the settings checks.
// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { seal, unseal, sameText, randomState } = await import('../src/lib/session.ts');
const { GitHub, GitHubError, exchangeCode, authorizeUrl, toBase64, fromBase64 } = await import('../src/lib/github.ts');
const { checkMachines, checkTheme, checkers } = await import('../src/lib/validate.ts');

const SECRET = 'x'.repeat(40);
const session = { login: 'sam', name: 'Sam', avatar: '', token: 'ghu_abc', exp: Date.now() + 60_000 };

test('a sealed session opens with the right secret', async () => {
  const cookie = await seal(session, SECRET);
  assert.ok(!cookie.includes('ghu_abc'), 'token is not readable in the cookie');
  assert.deepEqual(await unseal(cookie, SECRET), session);
});

test('a session is rejected if tampered with, expired, or opened with another secret', async () => {
  const cookie = await seal(session, SECRET);
  const tampered = cookie.slice(0, -3) + (cookie.endsWith('A') ? 'BBB' : 'AAA');
  assert.equal(await unseal(tampered, SECRET), null);
  assert.equal(await unseal(cookie, 'y'.repeat(40)), null);
  assert.equal(await unseal(await seal({ ...session, exp: Date.now() - 1 }, SECRET), SECRET), null);
  assert.equal(await unseal(undefined, SECRET), null);
  assert.equal(await unseal('rubbish', SECRET), null);
});

test('a short session secret is refused', async () => {
  await assert.rejects(seal(session, 'short'), /at least 32/);
});

test('state values are random and compared safely', () => {
  const a = randomState();
  assert.notEqual(a, randomState());
  assert.ok(sameText(a, a));
  assert.ok(!sameText(a, a.slice(0, -1) + 'x'));
  assert.ok(!sameText(a, ''));
});

test('base64 keeps £, é and emoji intact', () => {
  const text = 'Booster packs from £5 · Pokémon ✨';
  assert.equal(fromBase64(toBase64(text)), text);
});

// A fake GitHub that records calls and answers from a table.
function fakeGitHub(routes) {
  const calls = [];
  const fetcher = async (url, init = {}) => {
    const path = url.replace('https://api.github.com', '');
    const method = init.method || 'GET';
    calls.push({ method, path, body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers?.Authorization });
    const key = Object.keys(routes).find((k) => {
      const [m, p] = k.split(' ');
      return m === method && path.startsWith(p);
    });
    if (!key) return new Response(JSON.stringify({ message: 'Not Found' }), { status: 404 });
    const [status, body] = routes[key](calls.at(-1));
    return new Response(body === undefined ? '' : JSON.stringify(body), { status });
  };
  return { gh: new GitHub('ghu_token', { owner: 'o', repo: 'r' }, fetcher), calls };
}

test('reads a settings file from the preview branch', async () => {
  const content = toBase64(JSON.stringify({ name: 'The Pack Station' }));
  const { gh, calls } = fakeGitHub({ 'GET /repos/o/r/contents/src/settings/business.json': () => [200, { content, sha: 'abc' }] });
  const file = await gh.readJson('src/settings/business.json', 'development');
  assert.deepEqual(file, { data: { name: 'The Pack Station' }, sha: 'abc' });
  assert.match(calls[0].path, /\?ref=development$/);
  assert.equal(calls[0].auth, 'Bearer ghu_token');
});

test('saves a settings file as formatted JSON on the right branch', async () => {
  const { gh, calls } = fakeGitHub({ 'PUT /repos/o/r/contents/': () => [200, { content: { sha: 'new' }, commit: { sha: 'c1', html_url: 'u' } }] });
  const result = await gh.writeJson('src/settings/faq.json', { faq: [{ q: 'Q?', a: 'Café' }] }, { branch: 'development', sha: 'old', message: 'Update FAQs' });
  assert.equal(result.sha, 'new');
  const body = calls[0].body;
  assert.equal(body.branch, 'development');
  assert.equal(body.sha, 'old');
  assert.equal(fromBase64(body.content), '{\n  "faq": [\n    {\n      "q": "Q?",\n      "a": "Café"\n    }\n  ]\n}\n');
});

test('a clash with someone else saving gives a plain-English message', async () => {
  const { gh } = fakeGitHub({ 'PUT /repos/o/r/contents/': () => [409, { message: 'is at abc but expected def' }] });
  await assert.rejects(gh.writeJson('x.json', {}, { branch: 'development', sha: 'old', message: 'm' }), (e) => e instanceof GitHubError && /Someone else saved/.test(e.message));
});

test('write access is checked on the website repository', async () => {
  assert.equal(await fakeGitHub({ 'GET /repos/o/r': () => [200, { permissions: { push: true } }] }).gh.canWrite(), true);
  assert.equal(await fakeGitHub({ 'GET /repos/o/r': () => [200, { permissions: { push: false } }] }).gh.canWrite(), false);
  assert.equal(await fakeGitHub({}).gh.canWrite(), false, 'no access at all reads as false');
});

test('pending changes list newest first', async () => {
  const commits = [
    { sha: '1', commit: { message: 'Added machine TPS-01\n\nmore', author: { name: 'Sam', date: '2026-10-28T10:00:00Z' } }, author: { login: 'sam' } },
    { sha: '2', commit: { message: 'Updated FAQs', author: { name: 'Sam', date: '2026-10-28T11:00:00Z' } }, author: null },
  ];
  const { gh } = fakeGitHub({ 'GET /repos/o/r/compare/master...development': () => [200, { commits }] });
  const list = await gh.pending('master', 'development');
  assert.deepEqual(list.map((c) => c.message), ['Updated FAQs', 'Added machine TPS-01']);
  assert.equal(list[1].author, 'sam');
});

test('build check state', async () => {
  const state = async (runs) => fakeGitHub({ 'GET /repos/o/r/commits/development/check-runs': () => [200, { check_runs: runs }] }).gh.checkState('development');
  assert.equal(await state([]), 'none');
  assert.equal(await state([{ status: 'in_progress', conclusion: null }]), 'running');
  assert.equal(await state([{ status: 'completed', conclusion: 'failure' }]), 'failed');
  assert.equal(await state([{ status: 'completed', conclusion: 'success' }, { status: 'completed', conclusion: 'skipped' }]), 'passed');
});

test('publish does nothing when there are no changes', async () => {
  const { gh, calls } = fakeGitHub({ 'GET /repos/o/r/compare/': () => [200, { commits: [] }] });
  assert.deepEqual(await gh.publish('master', 'development', 'sam'), { merged: false, nothingToDo: true });
  assert.equal(calls.length, 1);
});

test('publish opens a pull request and merges it', async () => {
  const commit = { sha: '1', commit: { message: 'Updated FAQs', author: { name: 'Sam', date: 'd' } }, author: { login: 'sam' } };
  const { gh, calls } = fakeGitHub({
    'GET /repos/o/r/compare/': () => [200, { commits: [commit] }],
    'GET /repos/o/r/pulls': () => [200, []],
    'POST /repos/o/r/pulls': () => [201, { number: 7, html_url: 'pr-url' }],
    'PUT /repos/o/r/pulls/7/merge': () => [200, { merged: true }],
  });
  assert.deepEqual(await gh.publish('master', 'development', 'sam'), { merged: true, url: 'pr-url' });
  const created = calls.find((c) => c.method === 'POST').body;
  assert.equal(created.head, 'development');
  assert.equal(created.base, 'master');
  assert.match(created.body, /Updated FAQs/);
});

test('publish reuses an open pull request', async () => {
  const commit = { sha: '1', commit: { message: 'x', author: { name: 'Sam', date: 'd' } } };
  const { gh, calls } = fakeGitHub({
    'GET /repos/o/r/compare/': () => [200, { commits: [commit] }],
    'GET /repos/o/r/pulls': () => [200, [{ number: 3, html_url: 'u3' }]],
    'PUT /repos/o/r/pulls/3/merge': () => [200, { merged: true }],
  });
  await gh.publish('master', 'development', 'sam');
  assert.ok(!calls.some((c) => c.method === 'POST'));
});

test('publish explains when the build check blocks it', async () => {
  const commit = { sha: '1', commit: { message: 'x', author: { name: 'Sam', date: 'd' } } };
  const { gh } = fakeGitHub({
    'GET /repos/o/r/compare/': () => [200, { commits: [commit] }],
    'GET /repos/o/r/pulls': () => [200, [{ number: 3, html_url: 'u3' }]],
    'PUT /repos/o/r/pulls/3/merge': () => [405, { message: 'Required status check "build" is expected.' }],
  });
  await assert.rejects(gh.publish('master', 'development', 'sam'), /build check hasn't passed yet/);
});

test('sign-in code exchange', async () => {
  const ok = async () => new Response(JSON.stringify({ access_token: 'ghu_new' }), { status: 200 });
  assert.equal(await exchangeCode('code', 'id', 'secret', 'https://e/cb', ok), 'ghu_new');
  const bad = async () => new Response(JSON.stringify({ error: 'bad_verification_code', error_description: 'The code passed is incorrect or expired.' }), { status: 200 });
  await assert.rejects(exchangeCode('code', 'id', 'secret', 'https://e/cb', bad), /incorrect or expired/);
  const url = new URL(authorizeUrl('id', 'https://e/api/callback', 'st'));
  assert.equal(url.searchParams.get('state'), 'st');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://e/api/callback');
});

test('every settings file the editor saves has a checker', async () => {
  const { settingsFiles } = await import('../src/settings/editor.ts');
  for (const key of Object.keys(settingsFiles)) assert.equal(typeof checkers[key], 'function', key);
});

test('settings checks catch common mistakes', () => {
  const m = { code: 'TPS-01', status: 'live', name: 'A', venue: 'B', town: 'C', postcode: 'D', hours: [{ days: 'Mon', times: '9-5' }], payment: 'Card' };
  assert.deepEqual(checkMachines({ machines: [m], comingSoonAreas: [] }), []);
  assert.ok(checkMachines({ machines: [m, { ...m }], comingSoonAreas: [] }).some((x) => /already uses/.test(x)));
  const theme = JSON.parse(readFileSync(new URL('./fixtures/theme.json', import.meta.url)));
  assert.deepEqual(checkTheme(theme), []);
  assert.ok(checkTheme({ ...theme, sizes: { ...theme.sizes, buttonHeight: 10 } })[0].includes('Button height'));
});

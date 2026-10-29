const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
process.env.SESSION_SECRET = 'isolated-unit-test-secret';
const jwt = require('jsonwebtoken');
const { verifyToken } = require('../src/backend/middlewares/auth');

test('authentication requires Bearer HS256 tokens', () => {
  for (const [header, accepted] of [
    [`Bearer ${jwt.sign({ id: 'test', role: 'user' }, process.env.SESSION_SECRET)}`, true],
    [`Basic ${jwt.sign({ id: 'test' }, process.env.SESSION_SECRET)}`, false],
    [`Bearer ${jwt.sign({ id: 'test' }, process.env.SESSION_SECRET, { algorithm: 'HS384' })}`, false],
    ['Bearer invalid', false],
    ['', false]
  ]) {
    let next = false, status;
    const res = { status(code) { status = code; return this; }, json() {} };
    verifyToken({ headers: { authorization: header } }, res, () => { next = true; });
    assert.equal(next, accepted);
    if (!accepted) assert.equal(status, 401);
  }
});

test('statistics render hostile strings as text, never HTML', async () => {
  const payload = '<img src=x onerror=alert(document.domain)>';
  const tables = [];
  const document = {
    addEventListener() {},
    querySelector() {
      const table = { rows: [], set innerHTML(v) { assert.equal(v, ''); }, appendChild(row) { this.rows.push(row); } };
      tables.push(table); return table;
    },
    createElement(tag) {
      return { tag, children: [], textContent: '',
        set innerHTML(v) { throw new Error('Untrusted HTML insertion: ' + v); },
        appendChild(child) { this.children.push(child); } };
    }
  };
  const errors = [];
  const context = vm.createContext({ document, console: { error: (...e) => errors.push(e) },
    fetch: async url => ({ json: async () => url.includes('popular')
      ? [{ _id: { from: payload, to: payload }, count: 1 }]
      : [{ userIdentifier: payload, totalCalls: 1 }] }) });
  vm.runInContext(fs.readFileSync('public/admin/statistics.js', 'utf8'), context);
  await context.loadPopularRoutes('test');
  await context.loadTopUsers('test');
  assert.equal(errors.length, 0);
  assert.equal(tables[0].rows[0].children[0].textContent, payload);
  assert.equal(tables[1].rows[0].children[0].textContent, payload);
});

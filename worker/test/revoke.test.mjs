/* 本地测：模拟 KV / caches / samples，不连现网。 node worker/test/revoke.test.mjs */
import assert from 'node:assert/strict';
import { readFileSync, copyFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const tmp = path.join(dir, '.wf-worker.test.mjs');
copyFileSync(path.join(dir, '..', 'wf-worker.js'), tmp);
const worker = (await import(pathToFileURL(tmp).href)).default;

class KV {
  constructor() { this.m = new Map(); }
  async get(k, t) { const v = this.m.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; }
  async put(k, v) { this.m.set(k, v); }
  async list({ prefix = '' } = {}) { return { keys: [...this.m.keys()].filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true }; }
}
globalThis.caches = { default: { match: async () => null, put: async () => {} } };
const samples = { fonts: [JSON.parse(readFileSync(path.join(dir, 'fixture-ibmps.json'), 'utf8'))] };
globalThis.fetch = async (u) => {
  if (String(u).endsWith('/samples.json')) return new Response(JSON.stringify(samples), { headers: { 'content-type': 'application/json' } });
  throw new Error('unexpected fetch ' + u);
};

const OLD1 = 'WF-20261022-E7F783942C', NEW1 = 'WF-20261028-8E57D06464';
const OLD2 = 'WF-20261020-33EB45AC57', NEW2 = 'WF-20261028-1EEE30EDB4';
const PROBE = 'WF-20261028-5EFD56A973';
const ledger = { generated: '2026-10-28', records: [
  { serial: NEW1, norm: 'mjdzt', catalogName: '文风·美绩点阵体', issuedAt: '2026-10-28', holder: null, spdx: 'OFL-1.1' },
  { serial: NEW2, norm: 'mjdztmc', catalogName: '文风·美绩点阵体明朝', issuedAt: '2026-10-28', holder: null, spdx: 'OFL-1.1' },
  { serial: PROBE, norm: 'ibmps', catalogName: '文风·IBM Plex Sans', issuedAt: '2026-10-28', holder: null, spdx: 'OFL-1.1' },
  { serial: OLD1, norm: 'mjdzt', catalogName: '文风·美绩点阵体', issuedAt: '2026-10-22', holder: null, spdx: 'OFL-1.1' },
  { serial: OLD2, norm: 'mjdztmc', catalogName: '文风·美绩点阵体明朝', issuedAt: '2026-10-20', holder: null, spdx: 'OFL-1.1' },
] };

function mkEnv(extra = {}) {
  const kv = new KV();
  kv.m.set('ledger:records', JSON.stringify(ledger));
  const recs = JSON.parse(readFileSync(path.join(dir, '..', 'revocations', '2026-10-28-mjd-ibmps.json'), 'utf8'));
  for (const r of recs) kv.m.set('revoked:' + r.serial, JSON.stringify(r));
  return { ATTEST_KV: kv, ATTEST_HMAC_SECRET: 'test-only', ...extra };
}
const call = async (env, p, init) => { const r = await worker.fetch(new Request('https://wenfeng.org' + p, init), env); return [r.status, await r.json()]; };

let env = mkEnv();
const before = env.ATTEST_KV.m.get('ledger:records');

// 1. 旧证：只凭编号即显示已作废 + 取代编号
for (const [o, n] of [[OLD1, NEW1], [OLD2, NEW2]]) {
  for (const q of ['', '&holder=' + encodeURIComponent('通用核验记录')]) {
    const [st, j] = await call(env, '/api/v1/certs/lookup?s=' + o + q);
    assert.equal(st, 200); assert.equal(j.status, 'revoked'); assert.equal(j.supersededBy, n); assert.equal(j.holder, undefined);
  }
}
{ const [, j] = await call(env, '/api/v1/certs/lookup?s=' + PROBE); assert.equal(j.status, 'revoked'); assert.equal(j.supersededBy, null); assert.match(j.revoked.reason, /探测误签发/); }
// 2. 新证：照旧有效
for (const n of [NEW1, NEW2]) {
  const [st, j] = await call(env, '/api/v1/certs/lookup?s=' + n + '&holder=' + encodeURIComponent('通用核验记录'));
  assert.equal(st, 200); assert.equal(j.status, 'valid'); assert.equal(j.serial, n);
  const [st2, j2] = await call(env, '/api/v1/certs/lookup?s=' + n);
  assert.equal(st2, 400); assert.equal(j2.error, 'need_serial_and_holder');
}
// 3. 台账：条目原样保留，旧证带作废标记
{ const [, j] = await call(env, '/api/v1/certs/issued'); assert.equal(j.count, 5); assert.equal(j.revokedCount, 3);
  const by = Object.fromEntries(j.records.map((r) => [r.serial, r]));
  assert.equal(by[OLD1].status, 'revoked'); assert.equal(by[OLD2].status, 'revoked'); assert.equal(by[PROBE].status, 'revoked');
  assert.equal(by[NEW1].status, undefined); assert.equal(by[NEW2].status, undefined); }
assert.equal(env.ATTEST_KV.m.get('ledger:records'), before, 'ledger must not be modified');
// 4. 徽章：作废的 410，新证照常
{ const r = await worker.fetch(new Request('https://wenfeng.org/badge/' + OLD1 + '.svg'), env); assert.equal(r.status, 410); }
{ const r = await worker.fetch(new Request('https://wenfeng.org/badge/' + NEW1 + '.svg'), env); assert.equal(r.status, 200); }
// 5. verify：签名有效但已作废 → valid:false status revoked；未作废的照常 valid
{
  const env2 = mkEnv(); env2.ATTEST_KV.m.delete('revoked:' + PROBE);
  const [, c] = await call(env2, '/api/v1/certs/ibmps');
  assert.ok(c.serial, 'cert built'); const sig = c;
  const [st1, v1] = await call(env2, '/api/v1/certs/verify', { method: 'POST', body: JSON.stringify(sig) });
  assert.equal(st1, 200); assert.equal(v1.valid, true);
  env2.ATTEST_KV.m.set('revoked:' + c.serial, JSON.stringify({ serial: c.serial, revokedAt: '2026-10-28', reason: 'x', supersededBy: NEW1 }));
  const [st2, v2] = await call(env2, '/api/v1/certs/verify', { method: 'POST', body: JSON.stringify(sig) });
  assert.equal(st2, 200); assert.equal(v2.valid, false); assert.equal(v2.status, 'revoked'); assert.equal(v2.signatureValid, true); assert.equal(v2.supersededBy, NEW1);
  // GET 同日再算出已作废编号：返回带作废标记，不重复入账
  const n0 = JSON.parse(env2.ATTEST_KV.m.get('ledger:records')).records.length;
  const [, c2] = await call(env2, '/api/v1/certs/ibmps'); assert.equal(c2.status, 'revoked');
  assert.equal(JSON.parse(env2.ATTEST_KV.m.get('ledger:records')).records.length, n0);
}
// 6. 自动入账开关：默认旧行为（GET 即入账）；LEDGER_REQUIRE_ISSUE=1 时只有 issue=1 才入账
{
  const e1 = mkEnv(); e1.ATTEST_KV.m.delete('revoked:' + PROBE);
  e1.ATTEST_KV.m.set('ledger:records', JSON.stringify({ records: [] }));
  await call(e1, '/api/v1/certs/ibmps'); assert.equal(JSON.parse(e1.ATTEST_KV.m.get('ledger:records')).records.length, 1);
  const e2 = mkEnv({ LEDGER_REQUIRE_ISSUE: '1' }); e2.ATTEST_KV.m.delete('revoked:' + PROBE);
  e2.ATTEST_KV.m.set('ledger:records', JSON.stringify({ records: [] }));
  await call(e2, '/api/v1/certs/ibmps'); assert.equal(JSON.parse(e2.ATTEST_KV.m.get('ledger:records')).records.length, 0);
  await call(e2, '/api/v1/certs/ibmps?holder=X&issue=1'); assert.equal(JSON.parse(e2.ATTEST_KV.m.get('ledger:records')).records.length, 1);
}
console.log('ALL PASS');

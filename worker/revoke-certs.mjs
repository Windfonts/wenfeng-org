#!/usr/bin/env node
/* 把作废记录写进 KV（revoked:<编号>），只增不改。
 * 默认只打印计划；加 --apply 才写入，写前逐键确认不存在，已存在就跳过不覆盖。
 * 需要环境变量：CF_ACCOUNT_ID、CF_KV_NAMESPACE_ID（wenfeng-attest）、CF_API_TOKEN（KV 写权限）。脚本不打印任何凭据。
 * 用法：node worker/revoke-certs.mjs worker/revocations/2026-10-28-mjd-ibmps.json [--apply]
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
const apply = process.argv.includes('--apply');
if (!file) { console.error('need records file'); process.exit(2); }
const recs = JSON.parse(readFileSync(file, 'utf8'));
const SERIAL_RE = /^WF-\d{8}-[0-9A-F]{10}$/;
for (const r of recs) {
  if (!SERIAL_RE.test(r.serial || '')) throw new Error('bad serial ' + r.serial);
  if (r.supersededBy && !SERIAL_RE.test(r.supersededBy)) throw new Error('bad supersededBy ' + r.supersededBy);
  if (!r.reason || !r.revokedAt) throw new Error('need reason/revokedAt ' + r.serial);
}
if (!apply) {
  for (const r of recs) console.log('PLAN put revoked:' + r.serial, JSON.stringify(r));
  console.log('dry-run only; add --apply to write');
  process.exit(0);
}
const { CF_ACCOUNT_ID: acc, CF_KV_NAMESPACE_ID: ns, CF_API_TOKEN: tok } = process.env;
if (!acc || !ns || !tok) { console.error('missing CF_ACCOUNT_ID / CF_KV_NAMESPACE_ID / CF_API_TOKEN'); process.exit(2); }
const base = `https://api.cloudflare.com/client/v4/accounts/${acc}/storage/kv/namespaces/${ns}/values/`;
const H = { Authorization: 'Bearer ' + tok };
for (const r of recs) {
  const key = encodeURIComponent('revoked:' + r.serial);
  const cur = await fetch(base + key, { headers: H });
  if (cur.status === 200) { console.log('SKIP exists revoked:' + r.serial); continue; }
  if (cur.status !== 404) { console.error('check failed', r.serial, cur.status); process.exit(1); }
  const put = await fetch(base + key, { method: 'PUT', headers: { ...H, 'Content-Type': 'text/plain' }, body: JSON.stringify(r) });
  console.log((put.ok ? 'PUT ok ' : 'PUT FAIL ' + put.status + ' ') + 'revoked:' + r.serial);
  if (!put.ok) process.exit(1);
}

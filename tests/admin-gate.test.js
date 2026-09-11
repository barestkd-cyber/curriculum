/* The announcements panel opens by role, not by a password in the page
 * (2026-09-11). Plain Node:
 *     node tests/admin-gate.test.js
 */
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8');
const grab = n => { const i = src.indexOf('function ' + n + '('); const a = src.lastIndexOf('async', i);
  const st = (a >= 0 && i - a <= 6) ? a : i; let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(st, k + 1); } };

function attempt(role) {
  let opened = false;
  const ctx = vm.createContext({ currentRole: role, openAdminPanel() { opened = true; } });
  vm.runInContext(grab('openAdmin'), ctx);
  ctx.openAdmin();
  return opened;
}

let failed = 0;
try {
  for (const role of ['student', 'leader', null]) assert.ok(!attempt(role), String(role) + ' opened the admin panel');
  for (const role of ['instructor', 'admin']) assert.ok(attempt(role), role + ' could not open the admin panel');
  console.log('  ok   panel opens for staff roles only');
} catch (e) { console.error('  FAIL roles: ' + e.message); failed++; }
try {
  for (const s of ['BaresTKD2026', 'ADMIN_PASSWORD', 'checkAdminPassword', 'adminLoginModal', 'adminPwInput', 'isAdmin', 'toggleAdminLogin'])
    assert.ok(!src.includes(s), 'index.html still contains ' + s);
  console.log('  ok   no local password left in the page');
} catch (e) { console.error('  FAIL source: ' + e.message); failed++; }
if (failed) process.exitCode = 1;
console.log('admin-gate: ' + (2 - failed) + ' passed, ' + failed + ' failed');

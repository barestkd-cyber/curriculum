/* The schedule is the live one or nothing (owner, 2026-11-22: "i dont think
 * there should be anything on there until the real schedule loads"). It used
 * to open on two typed tables marked Updated January 2026; By Program never
 * got a live one and sent families to a Thursday Kickboxing class that had
 * moved to Wednesday. Plain Node:
 *     node tests/schedule.test.js
 */
'use strict';
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(require('path').join(__dirname, '..', 'index.html'), 'utf8').replace(/\r/g, '');
const grab = n => { const i = src.indexOf('function ' + n + '('); if (i < 0) throw new Error('no ' + n); const a = src.lastIndexOf('async', i);
  const st = (a >= 0 && i - a <= 6) ? a : i; let d = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(st, k + 1); } };
const vars = n => { const i = src.indexOf(n); if (i < 0) throw new Error('no ' + n); return src.slice(i, src.indexOf(';\n', i) + 2); };

let passed = 0, failed = 0;
const test = async (name, fn) => { try { await fn(); console.log('  ok   ' + name); passed++; } catch (e) { console.error('  FAIL ' + name + '\n       ' + e.message); failed++; process.exitCode = 1; } };
const tick = () => new Promise(r => setImmediate(r));

// The schedule as it was on 2026-11-22, the parts each view turns on.
const J = ['Juniors'], T = ['Teens/Adults'], B = ['Juniors', 'Teens/Adults'];
const c = (day, time_h, time_m, label, belt, divisions, program, x) => Object.assign({ day, time_h, time_m, time: time_h + ':' + time_m, label, belt, divisions, program, prog_css: '', duration: 45, starts_on: null, ends_on: null }, x);
const ROWS = [
  c(0, 16, 30, "AMP'D", '', B, "AMP'D"), c(0, 17, 0, 'Juniors + Teens / Adults', 'GR-BLK', B, 'Taekwondo'),
  c(0, 17, 45, 'Kickboxing', '13+', T, 'Kickboxing'), c(0, 18, 45, 'Jiu Jitsu', '13+', T, 'Jiu Jitsu'),
  c(1, 16, 0, 'Cubs', 'Pre-K', null, 'Cubs'), c(1, 16, 30, 'Juniors', 'WHI-ORG', J, 'Taekwondo'), c(1, 17, 45, 'Leadership', 'ORG-BLK', B, 'Leadership'),
  c(1, 18, 15, 'Juniors', 'GR-BLK', J, 'Taekwondo'), c(1, 19, 15, 'Teens / Adults', '', T, 'Taekwondo'),
  c(2, 9, 30, 'Little Kickers', 'Ages 2-3', null, 'Little Kickers'), c(2, 10, 15, 'Juniors/Teens/Adults', 'All', B, 'Taekwondo'),
  c(2, 16, 15, 'Juniors', 'BR-BLK', J, 'Taekwondo'), c(2, 16, 45, 'Juniors', 'WHI-BLU', J, 'Taekwondo'), c(2, 18, 30, 'Kickboxing', '13+', T, 'Kickboxing'),
  c(3, 17, 30, 'Forms', 'All', B, 'Taekwondo'), c(3, 18, 15, 'Sparring', 'All', B, 'Taekwondo'), c(3, 19, 0, 'Jiu Jitsu', '13+', T, 'Jiu Jitsu'),
  c(5, 9, 30, 'Cubs', 'Pre-K', null, 'Cubs'), c(5, 10, 0, 'Juniors', '', J, 'Taekwondo'), c(5, 11, 0, 'Teens / Adults', '', T, 'Taekwondo'),
];

function app({ rows = ROWS, answer } = {}) {
  const els = {};
  const el = id => (els[id] = { id, _h: '', get innerHTML() { return this._h; }, set innerHTML(h) { this._h = h; if (/id="curr-sched-grid"/.test(h)) el('curr-sched-grid'); }, get firstChild() { return this._h || null; } });
  const blank = () => { Object.keys(els).forEach(k => delete els[k]); el('byDaySchedule'); el('byProgramSchedule'); };
  blank();
  const box = { asked: 0, drawn: [], timers: [] };
  const ctx = vm.createContext({
    console: { error() {} }, Date, Promise,
    setTimeout: (fn, ms) => { box.timers.push({ fn, ms, on: true }); return box.timers.length; },
    clearTimeout: i => { if (box.timers[i - 1]) box.timers[i - 1].on = false; },
    document: { getElementById: id => els[id] || null },
    openSharedPlanView() {},
    BTKDGrid: { inject() {}, render: o => box.drawn.push(o.schedule.length), getWeekStart: () => new Date(2026, 10, 16) },
    BTKD: { sb: { from: t => { const q = { select: () => q, eq: () => q,
      then: (r, j) => { if (t === 'schedule_template') box.asked++; return (t === 'schedule_template' && answer ? answer() : Promise.resolve({ data: t === 'schedule_template' ? rows : [], error: null })).then(r, j); } }; return q; } } },
  });
  const code = ['let _currGridState = null;', vars('let _schedCache = null, _schedLoading = null;'), vars('const SCHED_FRESH_MS'),
    vars('const BYPROG_RANGE'), src.slice(src.indexOf('const BYPROG_COLS'), src.indexOf('];\n', src.indexOf('const BYPROG_COLS')) + 3), vars('const BYPROG_OTHER')]
    .concat(['currStudentWeekStart', 'currLocalYMD', 'currEsc', 'hydrateByDaySchedule', 'scheduleFailed', 'loadSchedule', 'drawSchedule', 'byProgTakes', 'byProgTime', 'byProgramHtml'].map(grab)).join('\n');
  vm.runInContext(code, ctx);
  return { ctx, els, box, blank, html: () => (els.byDaySchedule._h + els.byProgramSchedule._h) };
}

// the By Program table, as { row: { column: text } }, and the lines under it
function table(html) {
  const text = h => h.replace(/<br>/g, ' ').replace(/<[^>]+>/g, '').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  const heads = [...html.matchAll(/<th[^>]*>(.*?)<\/th>/g)].map(m => text(m[1])).slice(1);
  const out = {};
  [...html.matchAll(/<tr style[^>]*>(.*?)<\/tr>/g)].forEach(m => {
    const cells = [...m[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(x => text(x[1]));
    out[cells[0]] = Object.fromEntries(heads.map((h, i) => [h, cells[i + 1]]));
  });
  return { heads, rows: out, under: text(html.slice(html.indexOf('</table>'))) };
}

(async () => {
  await test('no typed schedule is left in the page', () => {
    assert.ok(!/Updated January 2026/.test(src));
    assert.ok(/html \+= '<div id="byDaySchedule"><\/div>';/.test(src), 'By Day should start empty');
    assert.ok(/html \+= '<div id="byProgramSchedule"><\/div>';/.test(src), 'By Program should start empty');
  });

  await test('nothing shows until it loads, then both views are drawn', async () => {
    const a = app();
    a.ctx.hydrateByDaySchedule();
    assert.strictEqual(a.html(), '');
    for (let i = 0; i < 6; i++) await tick();
    assert.ok(/By Day/.test(a.els.byDaySchedule._h));
    assert.ok(/By Program/.test(a.els.byProgramSchedule._h));
    assert.deepStrictEqual(a.box.drawn, [ROWS.length]);
    assert.strictEqual(a.box.timers[0].on, false);
  });

  await test('a redraw of the page draws it again at once, without asking again', async () => {
    const a = app();
    a.ctx.hydrateByDaySchedule();
    for (let i = 0; i < 6; i++) await tick();
    a.blank();
    a.ctx.hydrateByDaySchedule();
    assert.ok(/By Day/.test(a.els.byDaySchedule._h), 'it went blank again on a redraw');
    assert.strictEqual(a.box.asked, 1);
  });

  await test('two redraws while it is still loading ask once', async () => {
    const a = app();
    a.ctx.hydrateByDaySchedule(); a.ctx.hydrateByDaySchedule(); a.ctx.hydrateByDaySchedule();
    for (let i = 0; i < 6; i++) await tick();
    assert.strictEqual(a.box.asked, 1);
  });

  for (const [why, opts] of [['it errors', { answer: () => Promise.resolve({ data: null, error: new Error('x') }) }],
    ['the connection drops', { answer: () => Promise.reject(new Error('offline')) }], ['nothing is published', { rows: [] }]]) {
    await test('when ' + why + ', one line says so', async () => {
      const a = app(opts);
      a.ctx.hydrateByDaySchedule();
      for (let i = 0; i < 6; i++) await tick();
      assert.ok(/isn't loading right now/.test(a.els.byDaySchedule._h), a.els.byDaySchedule._h);
      assert.strictEqual(a.els.byProgramSchedule._h, '');
    });
  }

  await test('no answer in 15 seconds counts as a failure, and a late answer still draws', async () => {
    let give;
    const a = app({ answer: () => new Promise(r => { give = r; }) });
    a.ctx.hydrateByDaySchedule();
    await tick();
    assert.strictEqual(a.box.timers[0].ms, 15000);
    a.box.timers[0].fn();
    assert.ok(/isn't loading right now/.test(a.els.byDaySchedule._h));
    give({ data: ROWS, error: null });
    for (let i = 0; i < 6; i++) await tick();
    assert.ok(/By Day/.test(a.els.byDaySchedule._h));
  });

  const t = table(app().ctx.byProgramHtml(ROWS));
  await test('By Program puts each class under the ranks that take it', () => {
    assert.deepStrictEqual(t.heads, ['CUBS', 'WHI-ORG', 'GR-BLU', 'BR-BLK', "AMP'D", 'TEENS/ ADULTS']);
    assert.deepStrictEqual(t.rows.T, { CUBS: '4:00 PM', 'WHI-ORG': '4:30 PM', 'GR-BLU': '6:15 PM', 'BR-BLK': '6:15 PM', "AMP'D": '', 'TEENS/ ADULTS': '7:15 PM' });
    assert.deepStrictEqual(t.rows.W, { CUBS: '', 'WHI-ORG': '10:15 AM 4:45 PM', 'GR-BLU': '10:15 AM 4:45 PM', 'BR-BLK': '10:15 AM 4:15 PM', "AMP'D": '', 'TEENS/ ADULTS': '10:15 AM' });
  });

  await test('Monday 5:00 is Green through Black Juniors and all teens and adults', () => {
    assert.deepStrictEqual(t.rows.M, { CUBS: '', 'WHI-ORG': '', 'GR-BLU': '5:00 PM', 'BR-BLK': '5:00 PM', "AMP'D": '4:30 PM', 'TEENS/ ADULTS': '5:00 PM' });
  });

  await test('forms and sparring are named, and Saturday Juniors is every rank', () => {
    assert.strictEqual(t.rows.TH['WHI-ORG'], '5:30 PM Forms 6:15 PM Sparring');
    assert.strictEqual(t.rows.TH['TEENS/ ADULTS'], '5:30 PM Forms 6:15 PM Sparring');
    assert.deepStrictEqual(['WHI-ORG', 'GR-BLU', 'BR-BLK'].map(k => t.rows.S[k]), ['10:00 AM', '10:00 AM', '10:00 AM']);
  });

  await test('every class is on it somewhere: the other programs are listed underneath', () => {
    assert.ok(/KICKBOXING Mon 5:45 PM \| Wed 6:30 PM/.test(t.under), t.under);
    assert.ok(/JIU JITSU Mon 6:45 PM \| Thu 7:00 PM/.test(t.under), t.under);
    assert.ok(/LEADERSHIP Tue 5:45 PM/.test(t.under), t.under);
    assert.ok(/LITTLE KICKERS Wed 9:30 AM · in six-week sessions/.test(t.under), t.under);
  });

  await test('a class outside this week is on neither view', async () => {
    const a = app({ rows: ROWS.concat([c(4, 17, 0, 'Cubs', 'Pre-K', null, 'Cubs', { starts_on: '2027-01-04' }), c(4, 18, 0, 'Kickboxing', '13+', T, 'Kickboxing', { ends_on: '2026-09-01' })]) });
    a.ctx.hydrateByDaySchedule();
    for (let i = 0; i < 6; i++) await tick();
    assert.deepStrictEqual(a.box.drawn, [ROWS.length]);
    assert.ok(!('F' in table(a.els.byProgramSchedule._h).rows));
  });

  console.log('schedule: ' + passed + ' passed, ' + failed + ' failed');
})();

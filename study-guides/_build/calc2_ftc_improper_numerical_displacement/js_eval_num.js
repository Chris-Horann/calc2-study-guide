// Grade every NUMERIC answer key with the guide's OWN parser and grader (extracted from app.js), the companion of js_eval.js.
// Checks: the key is accepted; each listed wrong value is rejected with its own targeted message; and, where the input
// has data-units, the key + its unit is accepted with no note, the bare key gets the "write the units" reminder, and a
// wrong unit gets the "check the units" note. Output: js_eval_num.json.
'use strict';
const fs = require('fs'), path = require('path');
const B = __dirname;
const app = fs.readFileSync(path.join(B, 'app.js'), 'utf8');
const pick = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
const code = pick('  function fmt(v, d = 4)', '  function sup(n)') +
  pick('  /* ------------------------------------------------------------------ answer parsing (safe; no eval) */', '  /* ------------------------------------------------------------------ copy helper */');
(0, eval)(code + '; global.G = { gradeInput, parseAnswer };');
const keys = JSON.parse(fs.readFileSync(path.join(B, 'answer_keys_full.json'), 'utf8'));
const OTHER_UNIT = { 'J': 'ft-lb', 'ft-lb': 'J', 'kg': 'lb', 'm': 'ft', 'ft': 'm', 'slugs': 'kg', 'N/m': 'lb/ft', 'lb/ft': 'N/m' };
const out = [];
for (const k of keys) {
  if (k.kind !== 'num') continue;
  const grade = value => G.gradeInput({ value, dataset: { answer: k.answer, tol: k.tol, wrong: JSON.stringify(k.wrong || []), units: k.units } });
  const self = grade(k.answer);
  const rec = { vid: k.vid, units: k.units || null, self_ok: !!self.ok, self_note: self.note || '' };
  rec.wrong = (k.wrong || []).filter(w => w.v !== undefined).map(w => { const g = grade(String(w.v)); return { v: w.v, ok: !!g.ok, targeted: g.msg === w.m }; });
  if (k.units && k.answer !== 'diverges') {
    const withU = grade(k.answer + ' ' + k.units), bare = self, other = grade(k.answer + ' ' + (OTHER_UNIT[k.units] || 'kg'));
    rec.units_ok = !!withU.ok && !withU.note && !!bare.ok && /write the units too/.test(bare.note || '') && !!other.ok && /check the units/.test(other.note || '');
    rec.wrong_with_unit = (k.wrong || []).filter(w => w.v !== undefined).every(w => { const g = grade(String(w.v) + ' ' + k.units); return !g.ok && g.msg === w.m; });
  }
  out.push(rec);
}
fs.writeFileSync(path.join(B, 'js_eval_num.json'), JSON.stringify(out));
const nW = out.reduce((s, r) => s + r.wrong.length, 0), nT = out.reduce((s, r) => s + r.wrong.filter(w => !w.ok && w.targeted).length, 0);
const U = out.filter(r => r.units_ok !== undefined);
const bad = out.filter(r => !r.self_ok || (r.units ? false : r.self_note) || r.wrong.some(w => w.ok || !w.targeted) || r.units_ok === false || r.wrong_with_unit === false);
console.log(`numeric keys: ${out.length} | reference accepted: ${out.filter(r => r.self_ok).length} | wrong values rejected with their own message: ${nT}/${nW} | unit handling correct: ${U.filter(r => r.units_ok && r.wrong_with_unit).length}/${U.length}`);
if (bad.length) console.log('PROBLEMS:', JSON.stringify(bad));

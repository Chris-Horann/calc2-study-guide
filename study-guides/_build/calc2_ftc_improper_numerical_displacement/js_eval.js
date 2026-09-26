// Evaluate every expression answer key with the guide's OWN parser and grader (extracted from app.js).
// Output: JSON with sample values (for comparison against SymPy) and grading outcomes.
'use strict';
const fs = require('fs'), path = require('path');
const B = __dirname;
const app = fs.readFileSync(path.join(B, 'app.js'), 'utf8');
const pick = (a, b) => app.slice(app.indexOf(a), app.indexOf(b));
const code = pick('  function fmt(v, d = 4)', '  function sup(n)') +
  pick('  /* ------------------------------------------------------------------ answer parsing (safe; no eval) */', '  /* ------------------------------------------------------------------ copy helper */');
(0, eval)(code + '; global.G = { compileExpr, normMath, gradeInput };');
const keys = JSON.parse(fs.readFileSync(path.join(B, 'answer_keys_full.json'), 'utf8'));
const out = [];
for (const k of keys) {
  if (k.kind !== 'anti' && k.kind !== 'expr') continue;
  const v = k.var, dom = k.dom.split(',').map(Number);
  const pts = Array.from({ length: 9 }, (_, i) => dom[0] + (dom[1] - dom[0]) * (i + 0.5) / 9);
  const val = s => { const f = G.compileExpr(G.normMath(s), [v]); return pts.map(p => f({ [v]: p })); };
  const mk = value => ({ value, dataset: { kind: k.kind, var: v, answer: k.answer, dom: k.dom, wrong: JSON.stringify(k.wrong || []) } });
  const rec = { vid: k.vid, kind: k.kind, var: v, pts, answer: val(k.answer), integrand: k.integrand ? val(k.integrand) : null };
  const self = G.gradeInput(mk(k.answer));
  rec.self_ok = !!self.ok;
  const withC = k.kind === 'anti' ? G.gradeInput(mk(k.answer + ' + C')) : { ok: true };
  rec.withC_ok = !!withC.ok;
  rec.wrong = (k.wrong || []).filter(w => w.f).map(w => { const g = G.gradeInput(mk(w.f)); return { f: w.f, vals: val(w.f), ok: !!g.ok, targeted: g.msg === w.m }; });
  out.push(rec);
}
fs.writeFileSync(path.join(__dirname, 'js_eval.json'), JSON.stringify(out));
const bad = out.filter(r => !r.self_ok || !r.withC_ok || r.wrong.some(w => w.ok || !w.targeted));
console.log(`expression keys: ${out.length} | reference accepted: ${out.filter(r => r.self_ok).length} | with +C accepted: ${out.filter(r => r.withC_ok).length} | wrong answers rejected with their targeted message: ${out.reduce((s, r) => s + r.wrong.filter(w => !w.ok && w.targeted).length, 0)}/${out.reduce((s, r) => s + r.wrong.length, 0)}`);
if (bad.length) console.log('PROBLEMS:', JSON.stringify(bad.map(r => ({ vid: r.vid, self: r.self_ok, withC: r.withC_ok, wrong: r.wrong.map(w => [w.f, w.ok, w.targeted]) }))));

/* Build: pre-render all math with KaTeX, inline fonts/CSS/JS, write one self-contained HTML file.
   Usage (from this folder):  node build.js   (katex must be resolvable: npm install katex, or set NODE_PATH) */
'use strict';
const fs = require('fs');
const path = require('path');
const katex = require('katex');

const SRC = __dirname;
const OUT = path.resolve(SRC, '..', '..', 'calc2_study_guide_1.1-3.3.html');
const PARTS = ['00-head.html', '10-start.html', '12-U.html', '14-P.html', '16-R.html', '20-A.html', '30-B.html', '40-C.html', '50-D.html', '55-E.html', '57-L.html', '58-V.html', '60-mixed.html', '70-final.html', '90-tail.html']
  .filter(p => fs.existsSync(path.join(SRC, 'parts', p)));

let tpl = PARTS.map(p => fs.readFileSync(path.join(SRC, 'parts', p), 'utf8')).join('\n');
// math must never sit inside an attribute value: KaTeX output would break the attribute
const preProblems = [];
{ const re = /\s([a-z-]+)=("[^"]*"|'[^']*')/g; let m; while ((m = re.exec(tpl))) if (m[2].includes('$')) preProblems.push(`attribute ${m[1]} contains $: ${m[2].slice(0, 80)}`); }
const css = fs.readFileSync(path.join(SRC, 'styles.css'), 'utf8');
const js = fs.readFileSync(path.join(SRC, 'app.js'), 'utf8');
const kdir = path.dirname(require.resolve('katex/dist/katex.min.css'));
let kcss = fs.readFileSync(path.join(kdir, 'katex.min.css'), 'utf8');

// Inline only the KaTeX font families this guide uses (woff2 only).
const KEEP = new Set(['KaTeX_AMS', 'KaTeX_Main', 'KaTeX_Math', 'KaTeX_Size1', 'KaTeX_Size2', 'KaTeX_Size3', 'KaTeX_Size4']);
let fontBytes = 0;
kcss = kcss.replace(/@font-face\{[^}]*\}/g, rule => {
  const fam = /font-family:"?(KaTeX_[A-Za-z0-9]+)"?/.exec(rule)[1];
  if (!KEEP.has(fam)) return '';
  const file = /url\(fonts\/([^)]+\.woff2)\)/.exec(rule)[1];
  const buf = fs.readFileSync(path.join(kdir, 'fonts', file));
  fontBytes += buf.length;
  return rule.replace(/src:[^;}]+/, `src:url(data:font/woff2;base64,${buf.toString('base64')}) format("woff2")`);
});

const opts = { throwOnError: true, strict: 'ignore', trust: ctx => ctx.command === '\\htmlClass', output: 'htmlAndMathml' };
let nMath = 0;
function tex(src, display, where) {
  src = src.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');   // math may be written HTML-safe in the template
  try { nMath++; return katex.renderToString(src, Object.assign({ displayMode: display }, opts)); }
  catch (e) { console.error(`KaTeX error in ${where}: ${e.message}\n  source: ${src}`); process.exitCode = 1; return `<code>${src}</code>`; }
}
// render $$...$$ then $...$ (never inside <script>/<style>; \$ is a literal dollar)
tpl = tpl.replace(/\$\$([\s\S]+?)\$\$/g, (m, s) => tex(s.trim(), true, 'display'));
tpl = tpl.replace(/(^|[^\\])\$([^$\n]+?)\$/g, (m, pre, s) => pre + tex(s, false, 'inline'));
tpl = tpl.replace(/\\\$/g, '$');

// ---- integrity checks ----
const problems = [];
const ids = {};
for (const attr of ['data-pid', 'data-qid', 'data-gid', 'data-sid', 'data-eid', 'id']) {
  const re = new RegExp(`\\s${attr}="([^"]+)"`, 'g'); let m;
  while ((m = re.exec(tpl))) { const k = attr + ':' + m[1]; if (ids[k]) problems.push(`duplicate ${attr} "${m[1]}"`); ids[k] = 1; }
}
// quote-aware: attribute values may contain <b> tags
const ansRe = /<input class="ans"((?:[^>"']|"[^"]*"|'[^']*')*)>/g; let a, nAns = 0; const vids = [], full = [];
while ((a = ansRe.exec(tpl))) {
  nAns++;
  const vid = /data-vid="([^"]+)"/.exec(a[1]), ans = /data-answer="([^"]+)"/.exec(a[1]);
  if (!vid || !ans) problems.push('answer input missing data-vid or data-answer: ' + a[1].slice(0, 120));
  else {
    vids.push([vid[1], ans[1]]);
    const g = k => { const r = new RegExp(`data-${k}="([^"]*)"`).exec(a[1]); return r ? r[1] : undefined; };
    const wr0 = /data-wrong='([^']*)'/.exec(a[1]);
    let wl = []; try { wl = wr0 ? JSON.parse(wr0[1]) : []; } catch (e) {}
    const rec = { vid: vid[1], answer: ans[1], kind: g('kind') || 'num', var: g('var'), integrand: g('integrand'), dom: g('dom'), exact: g('exact'), tol: g('tol'), wrong: wl };
    if (rec.kind === 'anti' && !(rec.integrand && rec.dom && rec.var)) problems.push('anti input needs data-integrand, data-dom, data-var: ' + vid[1]);
    if (rec.kind === 'expr' && !(rec.dom && rec.var)) problems.push('expr input needs data-dom, data-var: ' + vid[1]);
    full.push(rec);
  }
  const wr = /data-wrong='([^']*)'/.exec(a[1]);
  if (wr) { try { JSON.parse(wr[1]); } catch (e) { problems.push('bad data-wrong JSON near ' + (vid && vid[1])); } }
}
const stray = tpl.replace(/<script[\s\S]*?<\/script>/g, '').match(/[^\\]\$[^\s]/g);
if (stray) problems.push(`possible unrendered math delimiters: ${stray.slice(0, 5).join(' | ')}`);
fs.writeFileSync(path.join(SRC, 'answer_keys.json'), JSON.stringify(vids, null, 1));
fs.writeFileSync(path.join(SRC, 'answer_keys_full.json'), JSON.stringify(full, null, 1));
problems.push(...preProblems);

const html = tpl
  .replace('/*__KATEX_CSS__*/', () => kcss)
  .replace('/*__STYLES__*/', () => css)
  .replace('/*__APP__*/', () => js);
fs.writeFileSync(OUT, html);
console.log(`math rendered: ${nMath} | answer inputs: ${nAns} | fonts inlined: ${(fontBytes / 1024).toFixed(0)} KB | output: ${(html.length / 1024).toFixed(0)} KB -> ${OUT}`);
if (problems.length) { console.error('INTEGRITY PROBLEMS:\n  ' + problems.join('\n  ')); process.exitCode = 1; }
else console.log('integrity checks passed (unique ids, every answer has a verification id, JSON ok, no stray $)');

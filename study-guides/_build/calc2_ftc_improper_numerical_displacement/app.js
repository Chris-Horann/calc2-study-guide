/* Calc 2 interactive study guide — engine (no external dependencies). */
(() => {
  'use strict';

  /* ------------------------------------------------------------------ utilities */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const PI = Math.PI;

  function svgEl(tag, attrs, parent) {
    const n = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function el(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    if (attrs) for (const k in attrs) {
      const v = attrs[k];
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') n.className = v;
      else if (k === 'text') n.textContent = v;
      else if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids) if (c !== null && c !== undefined) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    return n;
  }
  // Number formatting: fixed decimals for readouts (no jumping), "−" minus sign.
  function fmt(v, d = 4) {
    if (v === Infinity) return '∞';
    if (v === -Infinity) return '−∞';
    if (!isFinite(v)) return '—';
    if (Math.abs(v) < 0.5 * Math.pow(10, -d)) v = 0;
    const a = Math.abs(v);
    let s;
    if (a !== 0 && (a >= 1e6 || a < 1e-4)) s = v.toExponential(3).replace('e+', '×10^').replace('e-', '×10^-');
    else s = v.toFixed(d);
    return s.replace('-', '−');
  }
  function fmtNum(v, maxd = 4) { // trimmed
    if (!isFinite(v)) return fmt(v);
    let s = fmt(v, maxd);
    if (s.includes('.') && !s.includes('×')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  function sup(n) { const m = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }; return String(n).split('').map(c => m[c] ?? c).join(''); }
  function fmtPow10(v) { // 12345 -> 1.23×10⁴ ; small integers plain
    if (v < 1000 && v >= 0.001) return fmtNum(v, v < 1 ? 5 : 2);
    const e = Math.floor(Math.log10(v)), m = v / Math.pow(10, e);
    return (Math.abs(m - 1) < 0.005 ? '' : m.toFixed(2) + '×') + '10' + sup(e);
  }
  function niceStep(range, count) {
    const raw = range / Math.max(1, count), p = Math.pow(10, Math.floor(Math.log10(raw))), r = raw / p;
    return (r < 1.5 ? 1 : r < 2.25 ? 2 : r < 3.5 ? 2.5 : r < 7.5 ? 5 : 10) * p;
  }
  function niceTicks(min, max, count = 6) {
    const step = niceStep(max - min, count), out = [];
    for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v);
    return out;
  }
  function tickLabel(v) { const s = Math.abs(v) >= 1e4 ? v.toExponential(0) : String(+v.toFixed(6)); return s.replace('-', '−'); }

  /* ------------------------------------------------------------------ state */
  const KEY = 'calc2-ftc-improper-numerical-displacement-v1';
  const blank = () => ({ problems: {}, mcq: {}, guided: {}, explain: {}, spot: {}, concept: {}, self: {}, visited: {}, widgets: {}, theme: null });
  let S = blank();
  try { S = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || '{}')); } catch (e) { S = blank(); }
  let saveT = null;
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 120); refreshProgress(); }

  /* ------------------------------------------------------------------ theme */
  function applyTheme() {
    const r = document.documentElement;
    if (S.theme) r.setAttribute('data-theme', S.theme); else r.removeAttribute('data-theme');
    const b = $('#themeBtn');
    if (b) b.textContent = 'Theme: ' + (S.theme ? S.theme[0].toUpperCase() + S.theme.slice(1) : 'Auto');
  }

  /* ------------------------------------------------------------------ answer parsing (safe; no eval) */
  const DIV_RE = /(diverg|dne|does\s*not\s*(exist|converge)|no\s*(finite\s*)?limit|infinit|^\+?-?inf$|^[+-]?∞$|oscillat|undefined)/;
  const SUPS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  // Normalize typed math: unicode operators and superscripts → ASCII, brackets → parentheses.
  function normMath(raw) {
    return (raw || '').trim().toLowerCase()
      .replace(/[−–—]/g, '-').replace(/[×·∙]/g, '*').replace(/÷/g, '/').replace(/π/g, 'pi').replace(/θ/g, 'theta')
      .replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt').replace(/⁻¹/g, '^(-1)')
      .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, m => '^' + [...m].map(c => SUPS.indexOf(c)).join(''))
      .replace(/[{[]/g, '(').replace(/[}\]]/g, ')');
  }
  function parseAnswer(raw) {
    const s = normMath(raw).replace(/,/g, '');
    if (!s) return null;
    if (DIV_RE.test(s)) return { div: true };
    try {
      const v = compileExpr(s, [])({});
      return isFinite(v) ? { value: v } : { err: true };
    } catch (e) { return { err: true }; }
  }
  function evalExpr(src) { return compileExpr(normMath(src), [])({}); }

  const FUNS = {
    sqrt: Math.sqrt, cbrt: Math.cbrt, ln: Math.log, log: Math.log, exp: Math.exp, sin: Math.sin, cos: Math.cos, tan: Math.tan,
    sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x), cot: x => 1 / Math.tan(x),
    arcsin: Math.asin, asin: Math.asin, arccos: Math.acos, acos: Math.acos, arctan: Math.atan, atan: Math.atan, abs: Math.abs,
  };
  const INVF = { sin: Math.asin, cos: Math.acos, tan: Math.atan };
  const CONSTS = { pi: Math.PI, e: Math.E };
  // Compile an expression into a function env => number. `vars` lists the allowed variable names.
  // Letter runs are split into known names (longest first), so "xe^x", "xsin(2x)", "sint" all read naturally.
  // A function without parentheses takes the following number/variable product: "cos 4t" = cos(4t), "sin x cos x" = sin(x)·cos(x).
  function compileExpr(src, vars) {
    const names = [...Object.keys(FUNS), ...Object.keys(CONSTS), ...vars].sort((a, b) => b.length - a.length);
    const toks = [];
    const re = /\s*(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?|[a-z]+|\*\*|[-+*/^()|])/gy;
    let pos = 0;
    while (pos < src.length) {
      re.lastIndex = pos; const m = re.exec(src);
      if (!m) { if (/\s/.test(src[pos])) { pos++; continue; } throw new Error('bad character'); }
      pos = re.lastIndex;
      const t = m[1];
      if (/^[a-z]/.test(t)) {
        let r = t;
        while (r) { const n = names.find(nm => r.startsWith(nm)); if (!n) throw new Error('unknown ' + r); toks.push({ k: 'id', v: n }); r = r.slice(n.length); }
      } else if (/^[\d.]/.test(t)) toks.push({ k: 'num', v: parseFloat(t) });
      else toks.push({ k: 'op', v: t === '**' ? '^' : t });
    }
    let i = 0, absDepth = 0;
    const peek = () => toks[i], next = () => toks[i++];
    const isOp = (t, v) => !!t && t.k === 'op' && t.v === v;
    const isVarOrNum = t => !!t && (t.k === 'num' || (t.k === 'id' && vars.includes(t.v)));
    const startsAtom = t => !!t && (t.k === 'num' || t.k === 'id' || isOp(t, '(') || (isOp(t, '|') && absDepth === 0));
    function expr() {
      let f = term();
      while (isOp(peek(), '+') || isOp(peek(), '-')) { const o = next().v, g = term(), a = f; f = o === '+' ? env => a(env) + g(env) : env => a(env) - g(env); }
      return f;
    }
    function term() {
      let f = unary();
      for (;;) {
        const t = peek();
        if (isOp(t, '*') || isOp(t, '/')) { next(); const g = unary(), a = f; f = t.v === '*' ? env => a(env) * g(env) : env => a(env) / g(env); }
        else if (startsAtom(t)) { const g = power(), a = f; f = env => a(env) * g(env); }
        else break;
      }
      return f;
    }
    function unary() {
      if (isOp(peek(), '-')) { next(); const g = unary(); return env => -g(env); }
      if (isOp(peek(), '+')) { next(); return unary(); }
      return power();
    }
    function power() {
      const b = atom();
      if (isOp(peek(), '^')) { next(); const x = unary(); return env => Math.pow(b(env), x(env)); }
      return b;
    }
    function implicitArg() {
      let f = power();
      while (isVarOrNum(peek())) { const g = power(), a = f; f = env => a(env) * g(env); }
      return f;
    }
    function atom() {
      const t = next();
      if (!t) throw new Error('unexpected end');
      if (t.k === 'num') { const v = t.v; return () => v; }
      if (isOp(t, '(')) { const f = expr(); if (!isOp(next(), ')')) throw new Error('missing )'); return f; }
      if (isOp(t, '|')) { absDepth++; const f = expr(); if (!isOp(next(), '|')) throw new Error('missing |'); absDepth--; return env => Math.abs(f(env)); }
      if (t.k === 'id') {
        if (t.v in CONSTS) { const v = CONSTS[t.v]; return () => v; }
        if (vars.includes(t.v)) { const n = t.v; return env => env[n]; }
        if (t.v in FUNS) {
          let fn = FUNS[t.v], pw = null;
          if (isOp(peek(), '^')) {             // sin^-1 x, tan^(-1)(x): inverse · sin^2(x): a power of the value
            const save = i; next();
            const one = k => toks[k] && toks[k].k === 'num' && toks[k].v === 1;
            if (isOp(peek(), '-') && one(i + 1)) { i += 2; if (!(t.v in INVF)) throw new Error('inverse'); fn = INVF[t.v]; }
            else if (isOp(peek(), '(') && isOp(toks[i + 1], '-') && one(i + 2) && isOp(toks[i + 3], ')')) { i += 4; if (!(t.v in INVF)) throw new Error('inverse'); fn = INVF[t.v]; }
            else if (peek() && peek().k === 'num') { const n = next().v; pw = () => n; }
            else if (isOp(peek(), '(')) { pw = atom(); }
            else i = save;
          }
          const arg = isOp(peek(), '(') ? atom() : implicitArg();
          const g = fn;
          return pw ? env => Math.pow(g(arg(env)), pw(env)) : env => g(arg(env));
        }
      }
      throw new Error('unexpected ' + (t.v ?? ''));
    }
    const f = expr();
    if (i !== toks.length) throw new Error('trailing input');
    return f;
  }
  function close(a, b, tol) { return Math.abs(a - b) <= tol; }

  /* ------------------------------------------------------------------ grading (numbers, antiderivatives, expressions) */
  function fracStr(k) {
    for (let q = 1; q <= 24; q++) { const p = Math.round(k * q); if (p !== 0 && Math.abs(p / q - k) < 1e-7 * Math.max(1, Math.abs(k))) return (q === 1 ? String(p) : `${p}/${q}`).replace('-', '−'); }
    return fmtNum(k, 3);
  }
  // Compare a typed function with the reference on sample points of data-dom.
  // kind "anti": equal up to an additive constant · kind "expr": equal as functions.
  function gradeFn(inp) {
    const kind = inp.dataset.kind, v = inp.dataset.var || 'x';
    const dom = (inp.dataset.dom || '0.3,2.7').split(',').map(Number);
    let s = normMath(inp.value);
    if (!s) return { empty: true };
    let hadC = false;
    if (kind === 'anti') { const m = /\+\s*c\s*$/.exec(s); if (m) { hadC = true; s = s.slice(0, m.index).trim(); } }
    let F;
    try { F = compileExpr(s, [v]); } catch (e) {
      if (v !== 'u' && /(^|[^a-z])u([^a-z]|$)/.test(s)) return { err: true, msg: `Your answer still contains u. Last step of the Key: convert back to ${v}.` };
      return { err: true, msg: `I couldn't read that. Use ${v} as the variable and parentheses for function inputs, like ${kind === 'anti' ? 'x*e^(x) - e^(x) + C, ln(abs(x)), arctan(x)' : '(1/2)*u^3'}.` };
    }
    const R = compileExpr(normMath(inp.dataset.answer), [v]);
    const pts = Array.from({ length: 9 }, (_, k) => dom[0] + (dom[1] - dom[0]) * (k + 0.5) / 9);
    const ev = (G, x) => { try { return G({ [v]: x }); } catch (e) { return NaN; } };
    const fr = pts.map(x => ev(R, x)), fs = pts.map(x => ev(F, x));
    const shift = arr => (kind === 'anti' ? arr.map(y => y - arr[0]) : arr);
    const dr = shift(fr);
    const sameAs = (A, B, tol) => A.every((y, k) => isFinite(y) && isFinite(B[k]) && Math.abs(y - B[k]) <= tol * (1 + Math.abs(B[k])));
    const ds = shift(fs);
    const absNote = /abs\(|\|/.test(inp.dataset.answer) && !/abs|\|/.test(s) ? ' Remember the absolute value, ln|…|: the antiderivative has to work wherever the integrand is defined.' : '';
    if (sameAs(ds, dr, 1e-6)) {
      const show = inp.dataset.show ? `One way to write it: ${inp.dataset.show.replace(/[.\s]+$/, '')}.` : '';
      return { ok: true, note: [show, kind === 'anti' && !hadC ? 'On paper, finish with + C.' : '', absNote.trim()].filter(Boolean).join(' ') };
    }
    const tip = /\^\d+[a-z(]/.test(s) ? ' Tip: write e^(2x) with parentheses; e^2x means e²·x.' : '';
    if (fs.some((y, k) => !isFinite(y) && isFinite(fr[k]))) return { msg: `Your expression is undefined somewhere between ${fmtNum(dom[0], 2)} and ${fmtNum(dom[1], 2)}, where the answer is defined. Check square roots, logs (write ln(abs(…)) for ln|…|), and division.` + tip, specific: true };
    let wrong = [];
    try { wrong = JSON.parse(inp.dataset.wrong || '[]'); } catch (e) {}
    for (const w of wrong) {
      if (!w.f) continue;
      try { const W = compileExpr(normMath(w.f), [v]); if (sameAs(ds, shift(pts.map(x => ev(W, x))), 1e-6)) return { msg: w.m, specific: true }; } catch (e) {}
    }
    // a constant factor or a sign slipped?
    const big = Math.max(...dr.map(Math.abs));
    const ratios = ds.map((y, k) => (Math.abs(dr[k]) > 1e-6 * big ? y / dr[k] : null)).filter(r => r !== null);
    if (ratios.length >= 3) {
      const k0 = ratios[0];
      if (ratios.every(r => Math.abs(r - k0) <= 1e-6 * Math.max(1, Math.abs(k0))) && Math.abs(k0 - 1) > 1e-6 && Math.abs(k0) > 1e-9) {
        if (Math.abs(k0 + 1) < 1e-6) return { msg: 'Your answer is the right one with the opposite sign. Recheck a sign: ∫sin x dx = −cos x + C, du for u = −x³ is −3x² dx, and parts is uv <b>minus</b> ∫v du.' + tip, specific: true };
        return { msg: `Your answer is exactly ${fracStr(k0)} × the right one, so a constant factor is off. Check the factor that comes from du (for u = 4x + 1, dx = ¼ du) or from the power rule.` + tip, specific: true };
      }
    }
    const near = ds.every((y, k) => Math.abs(y - dr[k]) <= 5e-3 * (1 + Math.abs(dr[k])));
    if (near) return { msg: 'Very close. Use exact fractions (1/3, not 0.33) so the answer matches exactly.' };
    return { msg: (kind === 'anti' ? 'Not yet. Differentiate your answer: you should get back the integrand.' : 'Not yet. Recheck the rewrite step by step.') + tip };
  }
  // One grader for every input: returns {empty} | {ok, note} | {msg, specific}
  function gradeInput(inp) {
    if (inp.dataset.kind === 'anti' || inp.dataset.kind === 'expr') return gradeFn(inp);
    const r = parseAnswer(inp.value);
    if (!r) return { empty: true };
    const wantDiv = inp.dataset.answer === 'diverges';
    if (r.err) return { msg: "I couldn't read that. Try forms like 23/3, 2sqrt(3) - 2, pi/4, 0.7546, or the word diverges." };
    const specialFor = val => { let m = null; try { (JSON.parse(inp.dataset.wrong || '[]')).forEach(w => { if (m === null && w.v !== undefined && close(val, w.v, w.t !== undefined ? w.t : Math.max(6e-4, 1e-4 * Math.abs(w.v)))) m = w.m; }); } catch (e) {} return m; };
    if (wantDiv) {
      if (r.div) return { ok: true };
      const sp = specialFor(r.value);
      return { msg: sp || inp.dataset.convmsg || 'You got a finite number, but this integral does <em>not</em> have a finite limit. Recheck each piece: does every limit exist as a finite number?', specific: !!sp };
    }
    if (r.div) return { msg: inp.dataset.divmsg || 'This one actually has a finite value. Recheck your limit: does the troublesome term really blow up?' };
    const ans = parseFloat(inp.dataset.answer);
    const tol = inp.dataset.tol ? parseFloat(inp.dataset.tol) : Math.max(6e-4, 1e-4 * Math.abs(ans));
    if (close(r.value, ans, tol)) return { ok: true };
    const special = specialFor(r.value);
    if (special) return { msg: special, specific: true };
    if (Math.abs(r.value - ans) <= 0.012 * Math.max(1, Math.abs(ans))) return { msg: 'Very close. Check your rounding, or give more decimal places (or an exact value).' };
    return { msg: 'Not yet. Recheck your setup before your arithmetic.' };
  }

  /* ------------------------------------------------------------------ copy helper */
  async function copyText(text, btn) {
    try { await navigator.clipboard.writeText(text); }
    catch (e) { const ta = el('textarea', { style: 'position:fixed;left:-9999px' }); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e2) {} ta.remove(); }
    if (btn) { const t = btn.textContent; btn.textContent = 'Copied!'; setTimeout(() => (btn.textContent = t), 1400); }
  }
  function promptBox(title, getText) {
    const pre = el('pre', { class: 'prompt-text' });
    const btn = el('button', { class: 'btn small', type: 'button', text: 'Copy prompt' });
    btn.addEventListener('click', () => copyText(pre.textContent, btn));
    const box = el('div', { class: 'prompt-box' }, el('div', { class: 'pb-head' }, el('b', { text: title }), btn), pre);
    box.update = () => { pre.textContent = getText(); };
    box.update();
    return box;
  }
  const TUTOR_TAIL = 'Please follow my CLAUDE.md study system: build intuition first, ask me what I know before explaining, and give the smallest useful hint instead of the full answer.';

  /* ------------------------------------------------------------------ feedback */
  function feedback(box, kind, label, html) {
    box.innerHTML = '';
    const icon = kind === 'good' ? '✓' : kind === 'bad' ? '✗' : 'ℹ';
    box.appendChild(el('div', { class: 'fb ' + kind }, el('span', { class: 'fb-label', text: icon + ' ' + label }), el('span', { html })));
  }

  /* ------------------------------------------------------------------ problems */
  function initProblem(p) {
    const pid = p.dataset.pid;
    const st = (S.problems[pid] = S.problems[pid] || { att: 0, ok: false, hints: 0, sol: false, noHelp: false, last: '' });
    const answersBox = $('.answers', p);
    const inputs = $$('input.ans', p);
    const hints = $$(':scope > .hint', p);
    const sol = $(':scope > .solution', p);
    const know = $(':scope > .know', p);
    const reflect = $(':scope > .reflect', p);
    hints.forEach((h, k) => { h.hidden = true; h.insertAdjacentHTML('afterbegin', `<span class="hint-label">Hint ${k + 1} of ${hints.length}</span>`); });
    if (sol) { sol.hidden = true; sol.insertAdjacentHTML('afterbegin', '<span class="sol-label">Full solution</span>'); }
    if (reflect) reflect.hidden = true;

    // header
    const head = el('div', { class: 'p-head' });
    if (p.dataset.title) head.appendChild(el('span', { class: 'badge', text: p.dataset.title }));
    if (p.dataset.src) head.appendChild(el('span', { class: 'badge src', text: p.dataset.src }));
    const status = el('span', { class: 'p-status' });
    head.appendChild(status);
    p.prepend(head);

    // answer row
    const fb = el('div', { class: 'feedback', 'aria-live': 'polite' });
    if (answersBox) {
      inputs.forEach(inp => {
        inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.setAttribute('inputmode', 'text');
        if (!inp.placeholder) inp.placeholder = inp.dataset.kind === 'anti' ? 'e.g. x^3/3 - cos(x) + C' : inp.dataset.kind === 'expr' ? 'an expression in ' + (inp.dataset.var || 'x') : inp.dataset.accept === 'div' ? 'number or "diverges"' : 'e.g. 23/3 or 7.667';
        if (inp.dataset.kind) inp.classList.add('fn');
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
      });
      const btn = el('button', { class: 'btn check', type: 'button', text: 'Check' });
      btn.addEventListener('click', check);
      answersBox.classList.add('ans-row');
      answersBox.appendChild(btn);
      const anyFn = inputs.some(i => i.dataset.kind === 'anti');
      answersBox.appendChild(el('span', { class: 'fmt-help', text: p.dataset.help || (anyFn ? 'Type an antiderivative, e.g. x^3/3 - cos(x) + C. Use ln(abs(x)) for ln|x|, arctan(x) for tan⁻¹x, e^(2x) for e²ˣ.' : 'Exact (e.g. 23/3, 2sqrt(3)-2, pi/4) or a decimal.') }));
      answersBox.after(fb);
    }

    // stuck mode (CLAUDE.md "I'm stuck" sequence)
    let solGate = false;
    if (hints.length || sol) {
      const stuck = el('div', { class: 'stuck' });
      const row = el('div', { class: 'btn-row' });
      const knowBtn = el('button', { class: 'btn ghost small', type: 'button', text: "I'm stuck" });
      const hintBtn = el('button', { class: 'btn ghost small', type: 'button', hidden: true });
      const solBtn = el('button', { class: 'btn ghost small', type: 'button', text: 'Show full solution' });
      row.append(knowBtn, hintBtn, solBtn);
      stuck.appendChild(row);
      const kp = el('div', { class: 'know-panel', hidden: true });
      kp.appendChild(el('strong', { text: 'Before a hint — think it through:' }));
      const ol = el('ol');
      const defaults = ['What do you know? Write down definitions, formulas, and facts that might be relevant.', 'What does the problem actually want (a number? net or total? converge or diverge?)', 'What relationship could connect what you know to what you want?'];
      (know ? $$('li', know).map(li => li.innerHTML) : defaults).forEach(h => ol.appendChild(el('li', { html: h })));
      if (know) know.remove();
      kp.appendChild(ol);
      const ta = el('textarea', { placeholder: 'Optional: jot down what you know. It goes into the tutor prompt below.', 'aria-label': 'What I know' });
      ta.value = st.know || '';
      kp.appendChild(ta);
      stuck.appendChild(kp);
      hints.forEach(h => stuck.appendChild(h));
      const gate = el('p', { class: 'gentle', hidden: true, text: 'Productive struggle helps: try an answer or a hint first. If you really want the solution now, click “Show full solution” again.' });
      stuck.appendChild(gate);
      if (sol) stuck.appendChild(sol);
      const tutor = promptBox('Ask your tutor (paste into Claude)', () => {
        const parts = [`I'm working on this problem from my Calc 2 study guide: ${p.dataset.prompt || ''}`];
        if (st.last) parts.push(`My latest answer was "${st.last}"${st.ok ? ' (marked correct).' : ' (marked not correct yet).'}`);
        else parts.push("I haven't submitted an answer yet.");
        parts.push(st.hints ? `I've looked at ${st.hints} of ${hints.length} hints.` : "I haven't used any hints yet.");
        if ((st.know || '').trim()) parts.push(`Here's what I know so far: ${st.know.trim()}`);
        parts.push(st.ok ? 'Please compare my approach with the standard solution and tell me what clue I should recognize next time.' : "Don't solve it for me. Ask me one question about what I know, or give me the next smallest hint.");
        parts.push(TUTOR_TAIL);
        return parts.join(' ');
      });
      tutor.hidden = true;
      stuck.appendChild(tutor);
      p.appendChild(stuck);
      if (reflect) p.appendChild(reflect);

      const updHint = () => {
        hintBtn.hidden = !(st.hints < hints.length) || kp.hidden;
        hintBtn.textContent = `Show hint ${st.hints + 1} of ${hints.length}`;
        hints.forEach((h, k) => (h.hidden = k >= st.hints));
      };
      knowBtn.addEventListener('click', () => { kp.hidden = !kp.hidden; tutor.hidden = kp.hidden && !st.hints; updHint(); tutor.update(); });
      ta.addEventListener('input', () => { st.know = ta.value; tutor.update(); save(); });
      hintBtn.addEventListener('click', () => { st.hints = Math.min(hints.length, st.hints + 1); st.noHelp = false; updHint(); tutor.hidden = false; tutor.update(); save(); });
      solBtn.addEventListener('click', () => {
        if (!st.att && st.hints < hints.length && !solGate) { solGate = true; gate.hidden = false; return; }
        gate.hidden = true; if (sol) sol.hidden = false; st.sol = true; solBtn.disabled = true; save(); renderStatus();
      });
      if (st.hints) { kp.hidden = false; updHint(); tutor.hidden = false; }
      if (st.sol && sol) { sol.hidden = false; solBtn.disabled = true; }
      p._tutor = tutor;
    }

    function renderStatus() {
      status.className = 'p-status';
      if (st.ok) { status.classList.add('good'); status.textContent = st.noHelp ? '✓ Solved independently' : '✓ Solved (with help)'; p.classList.add('solved'); }
      else if (st.sol) status.textContent = 'Solution viewed';
      else if (st.att) status.textContent = `${st.att} attempt${st.att > 1 ? 's' : ''}`;
      else status.textContent = '';
    }

    function check() {
      let allOk = true, anyEmpty = false; const msgs = [], notes = [], lastParts = [];
      inputs.forEach(inp => {
        inp.classList.remove('ok', 'no');
        const g = gradeInput(inp);
        if (g.empty) { anyEmpty = true; allOk = false; return; }
        lastParts.push(inp.value.trim());
        const label = inp.dataset.label ? `<b>${inp.dataset.label}:</b> ` : '';
        if (g.ok) { inp.classList.add('ok'); if (g.note) notes.push(label + g.note); return; }
        allOk = false; inp.classList.add('no'); msgs.push(label + g.msg);
      });
      if (anyEmpty && !lastParts.length) { feedback(fb, 'info', 'Answer needed', 'Type an answer first.'); return; }
      st.att += 1; st.last = lastParts.join(' ; '); st.vals = inputs.map(i => i.value);
      if (allOk) {
        const first = !st.ok;
        st.ok = true;
        if (first) st.noHelp = st.hints === 0 && !st.sol;
        const ex = inputs.map(i => i.dataset.exact).filter(Boolean);
        feedback(fb, 'good', 'Correct', (ex.length ? 'Exact value' + (ex.length > 1 ? 's' : '') + ': ' + ex.join(' ; ') + '. ' : '') + (notes.length ? notes.join(' ') + ' ' : '') + (st.noHelp ? 'You solved it without hints.' : 'Now make sure you could do the next one without hints.'));
        if (reflect) reflect.hidden = false;
      } else {
        feedback(fb, 'bad', 'Not yet', msgs.join('<br>') + (anyEmpty ? '<br>Fill in every blank.' : ''));
      }
      renderStatus(); if (p._tutor) p._tutor.update(); save();
    }
    renderStatus();
    if (st.ok && reflect) reflect.hidden = false;
    if (Array.isArray(st.vals)) inputs.forEach((inp, k) => { if (st.vals[k] !== undefined) { inp.value = st.vals[k]; if (st.ok) inp.classList.add('ok'); } });

    // Mixed practice: choose the method first; the answer area opens after the classification is answered.
    if (p.dataset.mixed) {
      const cq = $('.mcq', p);
      const gated = [answersBox, fb, $('.stuck', p)].filter(Boolean);
      const open = () => gated.forEach(n => (n.hidden = false));
      const qs = cq && S.mcq[cq.dataset.qid];
      if (cq && !(qs && qs.picked !== null)) {
        gated.forEach(n => (n.hidden = true));
        const note = el('p', { class: 'gentle', text: 'Choose the method first. The answer box opens once you commit.' });
        cq.after(note);
        cq.addEventListener('answered', () => { open(); note.remove(); });
      }
    }
  }

  /* ------------------------------------------------------------------ multiple choice */
  function initMCQ(q) {
    const qid = q.dataset.qid;
    const multi = q.hasAttribute('data-multi');
    const st = (S.mcq[qid] = S.mcq[qid] || { picked: null, ok: null, first: null });
    const opts = $$('.opt', q);
    const why = $(':scope > .why', q);
    if (why) why.hidden = true;
    const fb = el('div', { class: 'feedback', 'aria-live': 'polite' });
    const optsBox = $('.opts', q);
    optsBox.after(fb);
    opts.forEach((o, k) => {
      o.type = 'button';
      const body = el('span', { class: 'opt-body' });            // one flex item, so text + math flow normally
      while (o.firstChild) body.appendChild(o.firstChild);
      o.appendChild(body);
      o.prepend(el('span', { class: 'key', text: String.fromCharCode(65 + k) }));
      if (multi) o.setAttribute('role', 'checkbox'), o.setAttribute('aria-checked', 'false');
    });
    const showWhy = () => { if (why) why.hidden = false; };
    if (!multi) {
      opts.forEach((o, k) => o.addEventListener('click', () => {
        opts.forEach(x => x.classList.remove('picked-good', 'picked-bad', 'reveal-good'));
        const ok = o.hasAttribute('data-correct');
        o.classList.add(ok ? 'picked-good' : 'picked-bad');
        if (st.first === null) st.first = ok;
        st.picked = k; st.ok = ok;
        const oWhy = o.dataset.why;
        if (ok) feedback(fb, 'good', 'Yes', oWhy || '');
        else feedback(fb, 'bad', 'Not quite', (oWhy || 'Think about it again, then try another option.'));
        if (ok) showWhy();
        q.dispatchEvent(new CustomEvent('answered', { bubbles: true, detail: { ok } }));
        save();
      }));
      if (st.picked !== null && opts[st.picked]) { opts[st.picked].classList.add(st.ok ? 'picked-good' : 'picked-bad'); if (st.ok) showWhy(); }
    } else {
      opts.forEach(o => o.addEventListener('click', () => o.setAttribute('aria-checked', o.getAttribute('aria-checked') === 'true' ? 'false' : 'true')));
      const btn = el('button', { class: 'btn small', type: 'button', text: 'Check selection' });
      optsBox.after(el('div', { class: 'btn-row' }, btn));
      btn.addEventListener('click', () => {
        let ok = true;
        opts.forEach(o => { const want = o.hasAttribute('data-correct'), got = o.getAttribute('aria-checked') === 'true'; if (want !== got) ok = false; });
        if (st.first === null) st.first = ok;
        st.ok = ok; st.picked = opts.map(o => o.getAttribute('aria-checked') === 'true');
        if (ok) { feedback(fb, 'good', 'Yes', ''); showWhy(); }
        else feedback(fb, 'bad', 'Not quite', q.dataset.multimsg || 'At least one choice is off. For each option ask: is the integrand continuous on the whole closed interval, and can I write an antiderivative?');
        q.dispatchEvent(new CustomEvent('answered', { bubbles: true, detail: { ok } }));
        save();
      });
      if (Array.isArray(st.picked)) opts.forEach((o, k) => o.setAttribute('aria-checked', st.picked[k] ? 'true' : 'false'));
      if (st.ok) showWhy();
    }
  }

  /* ------------------------------------------------------------------ guided examples */
  function initGuided(g) {
    const gid = g.dataset.gid;
    const st = (S.guided[gid] = S.guided[gid] || { step: 0, done: false });
    const steps = $$(':scope > .gstep', g);
    const take = $(':scope > .takeaway', g);
    const dots = el('div', { class: 'g-dots', 'aria-hidden': 'true' });
    steps.forEach(() => dots.appendChild(el('i')));
    const intro = $(':scope > .g-intro', g) || g.firstElementChild;
    intro.after(dots);
    if (take) take.hidden = true;
    steps.forEach((s, k) => {
      s.hidden = k > st.step;
      const rev = $('.greveal', s);
      rev.hidden = true;
      const nextBtn = el('button', { class: 'btn small', type: 'button', text: k === steps.length - 1 ? 'Finish' : 'Next step →' });
      nextBtn.hidden = true;
      rev.after(el('div', { class: 'btn-row' }, nextBtn));
      const reveal = () => { rev.hidden = false; nextBtn.hidden = false; };
      // numeric step
      const inp = $('input.ans', s);
      if (inp) {
        inp.type = 'text'; inp.autocomplete = 'off'; inp.spellcheck = false; inp.placeholder = inp.placeholder || (inp.dataset.kind === 'anti' ? 'an antiderivative' : inp.dataset.kind === 'expr' ? 'in terms of ' + (inp.dataset.var || 'x') : 'your value');
        if (inp.dataset.kind) inp.classList.add('fn');
        const fb = el('div', { class: 'feedback', 'aria-live': 'polite' });
        const cbtn = el('button', { class: 'btn small', type: 'button', text: 'Check' });
        const show = el('button', { class: 'btn ghost small', type: 'button', text: 'Show me', hidden: true });
        let tries = 0;
        const doCheck = () => {
          const g = gradeInput(inp); if (g.empty) return;
          tries++;
          if (g.ok) { inp.classList.add('ok'); inp.classList.remove('no'); feedback(fb, 'good', 'Yes', g.note || ''); reveal(); }
          else { inp.classList.add('no'); feedback(fb, 'bad', 'Not yet', (g.specific || g.err ? g.msg + ' ' : '') + 'Try again, or click “Show me”.'); show.hidden = false; }
        };
        cbtn.addEventListener('click', doCheck);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doCheck(); } });
        show.addEventListener('click', reveal);
        inp.after(cbtn, show);
        cbtn.parentElement.after(fb);
      }
      // choice step: reveal after any answer
      s.addEventListener('answered', () => reveal());
      nextBtn.addEventListener('click', () => {
        if (k < steps.length - 1) { st.step = Math.max(st.step, k + 1); steps[k + 1].hidden = false; steps[k + 1].scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
        else { st.done = true; if (take) take.hidden = false; }
        nextBtn.hidden = true; paint(); save();
      });
      if (k < st.step || st.done) { reveal(); nextBtn.hidden = true; }
      else if (k === st.step) { const q = $('.mcq', s); if (q && S.mcq[q.dataset.qid] && S.mcq[q.dataset.qid].picked !== null) reveal(); }
    });
    if (st.done && take) take.hidden = false;
    function paint() { $$('i', dots).forEach((d, k) => { d.className = st.done || k < st.step ? 'done' : k === st.step ? 'cur' : ''; }); }
    paint();
  }

  /* ------------------------------------------------------------------ spot the error */
  function initSpot(sp) {
    const sid = sp.dataset.sid;
    const st = (S.spot[sid] = S.spot[sid] || { found: false, tries: 0 });
    const lines = $$('.sline', sp), msg = $('.spot-msg', sp), ex = $('.spot-explain', sp);
    ex.hidden = true;
    lines.forEach((b, k) => {
      b.type = 'button';
      b.addEventListener('click', () => {
        if (b.hasAttribute('data-bad')) { b.classList.add('bad'); ex.hidden = false; msg.textContent = 'Found it. This is where the reasoning breaks.'; st.found = true; }
        else { b.classList.add('fine'); st.tries++; msg.textContent = 'That line is fine. Keep looking.'; if (st.tries >= 2) showBtn.hidden = false; }
        save();
      });
    });
    const showBtn = el('button', { class: 'btn ghost small', type: 'button', text: 'Show me the error', hidden: true });
    showBtn.addEventListener('click', () => { lines.forEach(b => b.hasAttribute('data-bad') && b.classList.add('bad')); ex.hidden = false; });
    msg.after(el('div', { class: 'btn-row' }, showBtn));
    if (st.found) { lines.forEach(b => b.hasAttribute('data-bad') && b.classList.add('bad')); ex.hidden = false; }
  }

  /* ------------------------------------------------------------------ explain prompts (level 7) */
  function initExplain(x) {
    const eid = x.dataset.eid;
    const st = (S.explain[eid] = S.explain[eid] || { text: '', rating: null });
    const ta = $('textarea', x), model = $('.model', x);
    model.hidden = true;
    ta.value = st.text;
    ta.addEventListener('input', () => { st.text = ta.value; save(); });
    const btn = el('button', { class: 'btn small', type: 'button', text: 'Compare with a model explanation' });
    const rate = el('div', { class: 'btn-row', hidden: true },
      el('span', { class: 'small muted', text: 'How did yours compare?' }));
    const lab = { full: 'I explained it fully', part: 'Partly', not: 'Not yet' };
    Object.keys(lab).forEach(k => {
      const b = el('button', { class: 'btn ghost small', type: 'button', text: lab[k] });
      b.addEventListener('click', () => { st.rating = k; paint(); save(); });
      b.dataset.k = k; rate.appendChild(b);
    });
    const gate = el('p', { class: 'gentle', hidden: true, text: 'Write your own explanation first (even two sentences). Click again to see the model anyway.' });
    let gated = false;
    btn.addEventListener('click', () => {
      if (ta.value.trim().length < 20 && !gated) { gated = true; gate.hidden = false; return; }
      gate.hidden = true; model.hidden = false; rate.hidden = false;
    });
    ta.after(el('div', { class: 'btn-row' }, btn), gate);
    model.after(rate);
    function paint() { $$('button', rate).forEach(b => b.classList.toggle('on', b.dataset.k === st.rating)); $$('button', rate).forEach(b => b.style.borderColor = b.dataset.k === st.rating ? 'var(--accent)' : ''); }
    if (st.rating) { model.hidden = false; rate.hidden = false; paint(); }
  }

  /* ------------------------------------------------------------------ formula anatomy chips */
  function initFormula(card) {
    const exp = $('.fp-explain', card);
    const def = exp ? exp.innerHTML : '';
    $$('.fp-chip', card).forEach(ch => {
      ch.type = 'button';
      const on = () => { card.dataset.hl = ch.dataset.part; if (exp) exp.innerHTML = ch.dataset.explain; $$('.fp-chip', card).forEach(c => c.classList.toggle('on', c === ch)); };
      const off = () => { if (card.dataset.pin === ch.dataset.part) return; delete card.dataset.hl; if (exp) exp.innerHTML = def; ch.classList.remove('on'); };
      ch.addEventListener('mouseenter', on); ch.addEventListener('focus', on);
      ch.addEventListener('mouseleave', off); ch.addEventListener('blur', off);
      ch.addEventListener('click', () => { if (card.dataset.pin === ch.dataset.part) { delete card.dataset.pin; off(); } else { card.dataset.pin = ch.dataset.part; on(); } });
    });
  }

  /* ------------------------------------------------------------------ SVG plot helper */
  class Plot {
    constructor(host, o) {
      this.o = Object.assign({ W: 680, H: 320, pad: { l: 50, r: 20, t: 16, b: 36 }, xmin: 0, xmax: 1, ymin: 0, ymax: 1, logx: false, logy: false }, o);
      this.host = host; host.classList.add('plot-wrap');
      // narrow screens: use a smaller drawing width so tick labels and annotations stay readable
      const avail = host.clientWidth || (host.parentElement && host.parentElement.clientWidth) || 0;
      if (avail && avail < this.o.W * 0.85) { const k = Math.max(0.6, avail / this.o.W); this.o.W = Math.round(this.o.W * k); this.o.H = Math.round(this.o.H * Math.max(0.8, k)); }
      const { W, H } = this.o;
      this.svg = svgEl('svg', { class: 'plot', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': o.aria || '' }, host);
      this.id = 'clip' + Math.random().toString(36).slice(2, 8);
      const defs = svgEl('defs', null, this.svg);
      this.clipRect = svgEl('rect', null, svgEl('clipPath', { id: this.id }, defs));
      this.gGrid = svgEl('g', { class: 'grid' }, this.svg);
      this.gAxis = svgEl('g', { class: 'axis' }, this.svg);
      this.gData = svgEl('g', { 'clip-path': `url(#${this.id})` }, this.svg);
      this.gTop = svgEl('g', null, this.svg);
      this.gHover = svgEl('g', null, this.svg);
      this.tip = el('div', { class: 'tip', hidden: true }); host.appendChild(this.tip);
      this.setView(this.o);
    }
    get iw() { return this.o.W - this.o.pad.l - this.o.pad.r; }
    get ih() { return this.o.H - this.o.pad.t - this.o.pad.b; }
    setView(v) {
      Object.assign(this.o, v);
      const { pad } = this.o;
      this.clipRect.setAttribute('x', pad.l - 1); this.clipRect.setAttribute('y', pad.t - 1);
      this.clipRect.setAttribute('width', this.iw + 2); this.clipRect.setAttribute('height', this.ih + 2);
    }
    tx(x) { const o = this.o; return o.logx ? (Math.log10(x) - Math.log10(o.xmin)) / (Math.log10(o.xmax) - Math.log10(o.xmin)) : (x - o.xmin) / (o.xmax - o.xmin); }
    ty(y) { const o = this.o; return o.logy ? (Math.log10(y) - Math.log10(o.ymin)) / (Math.log10(o.ymax) - Math.log10(o.ymin)) : (y - o.ymin) / (o.ymax - o.ymin); }
    sx(x) { return this.o.pad.l + this.tx(x) * this.iw; }
    sy(y) { return this.o.pad.t + (1 - this.ty(y)) * this.ih; }
    invx(px) { const o = this.o, t = (px - o.pad.l) / this.iw; return o.logx ? Math.pow(10, Math.log10(o.xmin) + t * (Math.log10(o.xmax) - Math.log10(o.xmin))) : o.xmin + t * (o.xmax - o.xmin); }
    axes(opt = {}) {
      this.gGrid.replaceChildren(); this.gAxis.replaceChildren();
      const o = this.o, x0 = o.pad.l, x1 = o.pad.l + this.iw, y0 = o.pad.t, y1 = o.pad.t + this.ih;
      const xt = opt.xticks || (o.logx ? logTicks(o.xmin, o.xmax) : niceTicks(o.xmin, o.xmax, opt.nx || 7).map(v => ({ v, l: tickLabel(v) })));
      const yt = opt.yticks || (o.logy ? logTicks(o.ymin, o.ymax) : niceTicks(o.ymin, o.ymax, opt.ny || 5).map(v => ({ v, l: tickLabel(v) })));
      const zeroY = !o.logy && o.ymin < 0 && o.ymax > 0 ? this.sy(0) : null;
      xt.forEach(t => { const X = this.sx(t.v); if (X < x0 - 0.5 || X > x1 + 0.5) return; svgEl('line', { x1: X, x2: X, y1: y0, y2: y1 }, this.gGrid); const T = svgEl('text', { x: X, y: y1 + 16, 'text-anchor': 'middle' }, this.gAxis); T.textContent = t.l; });
      yt.forEach(t => { const Y = this.sy(t.v); if (Y < y0 - 0.5 || Y > y1 + 0.5) return; svgEl('line', { x1: x0, x2: x1, y1: Y, y2: Y }, this.gGrid); const T = svgEl('text', { x: x0 - 7, y: Y + 4, 'text-anchor': 'end' }, this.gAxis); T.textContent = t.l; });
      svgEl('line', { x1: x0, x2: x1, y1: y1, y2: y1 }, this.gAxis);
      svgEl('line', { x1: x0, x2: x0, y1: y0, y2: y1 }, this.gAxis);
      if (zeroY !== null) svgEl('line', { class: 'zero', x1: x0, x2: x1, y1: zeroY, y2: zeroY }, this.gAxis);
      if (!o.logx && o.xmin < 0 && o.xmax > 0) svgEl('line', { class: 'zero', x1: this.sx(0), x2: this.sx(0), y1: y0, y2: y1 }, this.gAxis);
      if (opt.xlabel) { const T = svgEl('text', { class: 'lbl', x: x1, y: y1 + 31, 'text-anchor': 'end' }, this.gAxis); T.textContent = opt.xlabel; }
      if (opt.ylabel) { const T = svgEl('text', { class: 'lbl', x: x0 + 6, y: y0 + 12 }, this.gAxis); T.textContent = opt.ylabel; }
    }
    clear() { this.gData.replaceChildren(); this.gTop.replaceChildren(); }
    samples(f, a, b, n = 360) {
      const pts = [];
      for (let k = 0; k <= n; k++) { const x = a + (b - a) * k / n; let y = f(x); pts.push([x, isFinite(y) ? y : NaN]); }
      return pts;
    }
    d(pts) {
      const o = this.o, lo = o.ymin - (o.ymax - o.ymin) * 3, hi = o.ymax + (o.ymax - o.ymin) * 3;
      let s = '', pen = false;
      for (const [x, y] of pts) {
        if (!isFinite(y)) { pen = false; continue; }
        const Y = this.sy(clamp(y, lo, hi)), X = this.sx(x);
        s += (pen ? 'L' : 'M') + X.toFixed(2) + ' ' + Y.toFixed(2); pen = true;
      }
      return s;
    }
    curve(f, a, b, cls = 'curve', n, layer) { return svgEl('path', { class: cls, d: this.d(this.samples(f, a, b, n)) }, layer || this.gData); }
    line(x1, y1, x2, y2, cls, layer) { return svgEl('line', { class: cls, x1: this.sx(x1), y1: this.sy(y1), x2: this.sx(x2), y2: this.sy(y2) }, layer || this.gData); }
    poly(pts, cls, layer) { return svgEl('polygon', { class: cls, points: pts.map(([x, y]) => this.sx(x).toFixed(2) + ',' + this.sy(y).toFixed(2)).join(' ') }, layer || this.gData); }
    dot(x, y, cls = 'dot ink', r = 4.5, layer) { return svgEl('circle', { class: cls, cx: this.sx(x), cy: this.sy(y), r }, layer || this.gTop); }
    text(x, y, s, cls, anchor = 'middle', dy = 0, layer) { const T = svgEl('text', { class: cls, x: this.sx(x), y: this.sy(y) + dy, 'text-anchor': anchor }, layer || this.gTop); T.textContent = s; return T; }
    // signed area between f and the axis on [a,b]: separate polygons for positive and negative runs
    area(f, a, b, opt = {}) {
      if (!(b > a)) return [];
      const n = opt.n || 400, pts = [];
      for (let k = 0; k <= n; k++) { const x = a + (b - a) * k / n; pts.push([x, f(x)]); }
      const runs = []; let cur = null;
      const push = (sgn, p) => { if (!cur || cur.s !== sgn) { cur = { s: sgn, pts: [] }; runs.push(cur); } cur.pts.push(p); };
      for (let k = 0; k < pts.length; k++) {
        const [x, y] = pts[k];
        const s = y >= 0 ? 1 : -1;
        if (k > 0) {
          const [xp, yp] = pts[k - 1];
          if ((yp >= 0) !== (y >= 0) && isFinite(yp) && isFinite(y)) { const xc = xp + (x - xp) * (yp / (yp - y)); push(yp >= 0 ? 1 : -1, [xc, 0]); push(s, [xc, 0]); }
        }
        push(s, [x, clamp(y, this.o.ymin - 10 * (this.o.ymax - this.o.ymin), this.o.ymax + 10 * (this.o.ymax - this.o.ymin))]);
      }
      const out = [];
      for (const r of runs) {
        if (r.pts.length < 2) continue;
        const poly = [[r.pts[0][0], 0], ...r.pts, [r.pts[r.pts.length - 1][0], 0]];
        const mapped = opt.flip && r.s < 0 ? poly.map(([x, y]) => [x, -y]) : poly;
        const cls = r.s > 0 ? (opt.posCls || 'area-pos') : (opt.flip ? 'area-flip' : (opt.negCls || 'area-neg'));
        out.push(this.poly(mapped, cls));
      }
      return out;
    }
    hover(readout) {
      this.gHover.replaceChildren();
      const o = this.o;
      const hit = svgEl('rect', { class: 'hit', x: o.pad.l, y: o.pad.t, width: this.iw, height: this.ih }, this.gHover);
      const cross = svgEl('line', { class: 'cross', y1: o.pad.t, y2: o.pad.t + this.ih, visibility: 'hidden' }, this.gHover);
      const dots = svgEl('g', null, this.gHover);
      const move = ev => {
        const r = this.svg.getBoundingClientRect(), scale = r.width / o.W;
        const px = (ev.clientX - r.left) / scale;
        const x = this.invx(clamp(px, o.pad.l, o.pad.l + this.iw));
        const res = readout(x);
        if (!res) return hideTip();
        const X = this.sx(res.x);
        cross.setAttribute('x1', X); cross.setAttribute('x2', X); cross.setAttribute('visibility', 'visible');
        dots.replaceChildren();
        (res.points || []).forEach(p => { if (isFinite(p.y) && p.y >= o.ymin && p.y <= o.ymax) svgEl('circle', { class: 'dot ' + (p.cls || 'ink'), cx: X, cy: this.sy(p.y), r: 4.5 }, dots); });
        this.tip.innerHTML = res.html; this.tip.hidden = false;
        const hostR = this.host.getBoundingClientRect();
        const topY = res.points && res.points.length && isFinite(res.points[0].y) ? this.sy(clamp(res.points[0].y, o.ymin, o.ymax)) : o.pad.t + 20;
        this.tip.style.left = clamp(X * scale + (r.left - hostR.left), 70, hostR.width - 70) + 'px';
        this.tip.style.top = Math.max(26, topY * scale + (r.top - hostR.top)) + 'px';
      };
      const hideTip = () => { this.tip.hidden = true; cross.setAttribute('visibility', 'hidden'); dots.replaceChildren(); };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerdown', move);
      hit.addEventListener('pointerleave', hideTip);
    }
  }
  function logTicks(a, b) {
    const out = [];
    for (let e = Math.ceil(Math.log10(a) - 1e-9); e <= Math.floor(Math.log10(b) + 1e-9); e++) out.push({ v: Math.pow(10, e), l: e === 0 ? '1' : e === 1 ? '10' : '10' + sup(e) });
    return out;
  }
  const PI_TICKS = [0, 0.5, 1, 1.5, 2].map(k => ({ v: k * PI, l: k === 0 ? '0' : k === 0.5 ? 'π/2' : k === 1 ? 'π' : k === 1.5 ? '3π/2' : '2π' }));

  // shared little builders for widgets
  function seg(options, value, onPick) {
    const box = el('div', { class: 'seg', role: 'group' });
    options.forEach(([v, label]) => {
      const b = el('button', { type: 'button', 'aria-pressed': String(v === value), text: label });
      b.addEventListener('click', () => { $$('button', box).forEach(x => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); onPick(v); });
      b.dataset.v = v; box.appendChild(b);
    });
    box.set = v => $$('button', box).forEach(x => x.setAttribute('aria-pressed', String(x.dataset.v === String(v))));
    return box;
  }
  function slider(label, min, max, step, value, onInput, show) {
    const out = el('output');
    const inp = el('input', { type: 'range', min, max, step, value, 'aria-label': label });
    const wrap = el('div', { class: 'ctrl' }, el('label', null, el('span', { text: label }), out), inp);
    const paint = () => { out.textContent = show ? show(parseFloat(inp.value)) : inp.value; };
    inp.addEventListener('input', () => { paint(); onInput(parseFloat(inp.value)); });
    wrap.input = inp; wrap.set = v => { inp.value = v; paint(); }; wrap.paint = paint;
    paint();
    return wrap;
  }
  function presetRow(list, onPick) {
    const row = el('div', { class: 'presets', role: 'group', 'aria-label': 'Presets' });
    list.forEach((p, k) => { const b = el('button', { type: 'button', text: p.name }); b.addEventListener('click', () => { $$('button', row).forEach(x => x.classList.remove('on')); b.classList.add('on'); onPick(p, k); }); row.appendChild(b); });
    row.mark = k => $$('button', row).forEach((x, j) => x.classList.toggle('on', j === k));
    return row;
  }
  function stat(label, note) {
    const v = el('div', { class: 's-val tnum' }), n = el('div', { class: 's-note' });
    const box = el('div', { class: 'stat' }, el('div', { class: 's-label', html: label }), v, n);
    box.set = (val, noteTxt) => { v.textContent = val; n.textContent = noteTxt || ''; };
    if (note) n.textContent = note;
    return box;
  }
  function touched(id) { if (!S.widgets[id]) { S.widgets[id] = true; save(); } }

  /* ================================================================== Widget A: signed-area explorer */
  function widgetArea(root) {
    const FN = {
      lin: { label: 'f(x) = 2x − 4', F: x => x * x - 4 * x, f: x => 2 * x - 4, Ftxt: 'F(x) = x² − 4x', zeros: [2], lo: 0, hi: 5, view: { xmin: -0.3, xmax: 5.3, ymin: -5, ymax: 7 } },
      sin: { label: 'f(x) = sin x', F: x => -Math.cos(x), f: Math.sin, Ftxt: 'F(x) = −cos x', zeros: [PI, 2 * PI], lo: 0, hi: 2 * PI, view: { xmin: -0.25, xmax: 2 * PI + 0.25, ymin: -1.35, ymax: 1.35 }, ticks: PI_TICKS },
      quad: { label: 'f(x) = x² − 2x', F: x => x * x * x / 3 - x * x, f: x => x * x - 2 * x, Ftxt: 'F(x) = x³/3 − x²', zeros: [0, 2], lo: -1, hi: 3.5, view: { xmin: -1.2, xmax: 3.7, ymin: -1.6, ymax: 5.2 } },
      cubic: { label: 'f(x) = x³ − 3x', F: x => x ** 4 / 4 - 1.5 * x * x, f: x => x ** 3 - 3 * x, Ftxt: 'F(x) = x⁴/4 − 3x²/2', zeros: [-Math.sqrt(3), 0, Math.sqrt(3)], lo: -2.2, hi: 2.2, view: { xmin: -2.35, xmax: 2.35, ymin: -3.2, ymax: 3.2 } },
    };
    const PRE = [
      { name: 'Notes p. 25: 2x − 4 on [1, 4]', fn: 'lin', a: 1, b: 4, abs: false },
      { name: 'sin x on [0, 2π]', fn: 'sin', a: 0, b: 2 * PI, abs: false },
      { name: 'x² − 2x on [0, 3]', fn: 'quad', a: 0, b: 3, abs: false },
      { name: 'x³ − 3x on [−2, 2]', fn: 'cubic', a: -2, b: 2, abs: false },
      { name: 'Total area of sin x (|f| on)', fn: 'sin', a: 0, b: 2 * PI, abs: true },
    ];
    const st = Object.assign({}, PRE[0]);
    const presets = presetRow(PRE, p => { Object.assign(st, p); syncControls(); render(); touched('A'); });
    presets.mark(0);
    const sa = slider('a (start)', 0, 1, 0.01, st.a, v => { st.a = Math.min(v, st.b - 0.05); if (st.a !== v) sa.set(st.a); presets.mark(-1); render(); touched('A'); }, v => fmtNum(v, 2));
    const sb = slider('b (end)', 0, 1, 0.01, st.b, v => { st.b = Math.max(v, st.a + 0.05); if (st.b !== v) sb.set(st.b); presets.mark(-1); render(); touched('A'); }, v => fmtNum(v, 2));
    const absT = el('label', { class: 'toggle' }, el('input', { type: 'checkbox' }), el('span', { text: 'Show |f(x)| (flip the negative part up)' }));
    const absBox = $('input', absT);
    absBox.addEventListener('change', () => { st.abs = absBox.checked; render(); touched('A'); });
    const plotHost = el('div');
    const legend = el('div', { class: 'legend' },
      el('span', null, el('i', { class: 'sw', style: 'background:var(--pos);opacity:.55' }), 'area above the axis (counts +)'),
      el('span', null, el('i', { class: 'sw', style: 'background:var(--neg);opacity:.55' }), 'area below the axis (counts −)'));
    const sPos = stat('Area above the axis, A<sub>+</sub>'), sNeg = stat('Area below the axis, A<sub>−</sub>'), sNet = stat('Net integral = A<sub>+</sub> − A<sub>−</sub>'), sTot = stat('Total area = A<sub>+</sub> + A<sub>−</sub>');
    sNet.classList.add('hero');
    const ftc = el('div', { class: 'notice tnum' });
    const tbl = el('table', { class: 'data-table' });
    const tblWrap = el('details', { class: 'more' }, el('summary', { text: 'Table view: the pieces between sign changes' }), el('div', { class: 'table-scroll' }, tbl));
    const ctr = el('div', { class: 'controls' }, sa, sb, el('div', { class: 'ctrl' }, absT));
    let lastPieces = [];
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    root.append(presets, ctr, plotHost, legend, el('div', { class: 'stats' }, sPos, sNeg, sNet, sTot), ftc, tblWrap, prompt);
    const plot = new Plot(plotHost, { W: 680, H: 330, aria: 'Graph of f with the area between a and b shaded; blue above the axis, orange below.' });

    function syncControls() {
      const F = FN[st.fn];
      [sa, sb].forEach(s => { s.input.min = F.lo; s.input.max = F.hi; });
      sa.set(st.a); sb.set(st.b); absBox.checked = st.abs;
    }
    function pieces() {
      const F = FN[st.fn];
      const z = F.zeros.filter(q => q > st.a + 1e-9 && q < st.b - 1e-9);
      const cuts = [st.a, ...z, st.b];
      return cuts.slice(0, -1).map((l, k) => { const r = cuts[k + 1]; return { l, r, val: F.F(r) - F.F(l) }; });
    }
    function render() {
      const F = FN[st.fn];
      plot.setView(F.view); plot.clear();
      plot.axes({ xticks: F.ticks, xlabel: 'x', ylabel: 'y' });
      plot.area(F.f, st.a, st.b, { flip: st.abs });
      if (st.abs) plot.curve(x => Math.abs(F.f(x)), st.a, st.b, 'curve s2 faint');
      plot.curve(F.f, F.view.xmin, F.view.xmax, 'curve');
      [['a', st.a], ['b', st.b]].forEach(([n, v]) => { plot.line(v, F.view.ymin, v, F.view.ymax, 'vline'); plot.text(v, F.view.ymin, n + ' = ' + fmtNum(v, 2), 'lbl', 'middle', -6); });
      const ps = (lastPieces = pieces());
      let Ap = 0, An = 0;
      ps.forEach(p => {
        if (p.val >= 0) Ap += p.val; else An -= p.val;
        const xm = (p.l + p.r) / 2, ym = F.f(xm) / 2 * (st.abs && p.val < 0 ? -1 : 1);
        if (Math.abs(plot.sx(p.r) - plot.sx(p.l)) > 26 && Math.abs(p.val) > 1e-6) plot.text(xm, ym, p.val >= 0 ? '+' : (st.abs ? '+' : '−'), 'sign-lbl', 'middle', 5);
      });
      sPos.set(fmt(Ap)); sNeg.set(fmt(An)); sNet.set(fmt(Ap - An), 'can be negative or 0'); sTot.set(fmt(Ap + An), 'always ≥ 0');
      const Fb = F.F(st.b), Fa = F.F(st.a);
      ftc.innerHTML = `<b>FTC check:</b> ${F.Ftxt}, so F(b) − F(a) = F(${fmtNum(st.b, 2)}) − F(${fmtNum(st.a, 2)}) = ${fmt(Fb)} − (${fmt(Fa)}) = <b>${fmt(Fb - Fa)}</b>. This matches the <em>net</em> integral, not the total area${ps.length > 1 ? ' (f changes sign inside [a, b])' : ''}.`;
      tbl.innerHTML = '<thead><tr><th>piece</th><th>sign of f</th><th class="num">∫ over the piece</th><th class="num">|piece|</th></tr></thead>';
      const tb = el('tbody'); ps.forEach(p => tb.appendChild(el('tr', null, el('td', { text: `[${fmtNum(p.l, 3)}, ${fmtNum(p.r, 3)}]` }), el('td', { text: p.val >= 0 ? 'positive (above)' : 'negative (below)' }), el('td', { class: 'num', text: fmt(p.val) }), el('td', { class: 'num', text: fmt(Math.abs(p.val)) }))));
      tbl.appendChild(tb);
      prompt.update();
    }
    function tutorText() {
      const F = FN[st.fn]; const ps = lastPieces;
      let Ap = 0, An = 0; ps.forEach(p => (p.val >= 0 ? (Ap += p.val) : (An -= p.val)));
      const parts = [`I'm using the signed-area explorer with ${F.label} on [${fmtNum(st.a, 3)}, ${fmtNum(st.b, 3)}].`];
      if (ps.length > 1) parts.push(`f changes sign inside the interval (pieces: ${ps.map(p => `[${fmtNum(p.l, 3)}, ${fmtNum(p.r, 3)}] ${p.val >= 0 ? 'above' : 'below'}`).join(', ')}).`);
      parts.push(`The explorer shows net integral ${fmt(Ap - An)} and total area ${fmt(Ap + An)}.`);
      if (Math.abs(Ap - An) < 1e-3 && Ap + An > 0.05) parts.push('Why can the integral be 0 when the graph clearly encloses area? Ask me a question first instead of explaining everything.');
      else if (st.abs) parts.push('Help me see why ∫|f| needs a split where f changes sign. Quiz me on setting up the pieces by hand.');
      else parts.push('Quiz me: have me predict the net and total values for a new interval before I check them.');
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    }
    syncControls(); render();
    plot.hover(x => {
      const F = FN[st.fn]; const y = F.f(x);
      return { x, points: [{ y, cls: y >= 0 ? 's1' : 's2' }], html: `x = <b>${fmt(x, 3)}</b><br>f(x) = <b>${fmt(y, 3)}</b> <span style="opacity:.75">(${y >= 0 ? 'above' : 'below'} the axis)</span>` };
    });
    root._state = st; root._render = render;
  }

  /* ================================================================== Widget B: moving-endpoint explorer */
  function widgetImproper(root) {
    const st = { mode: 'I', fam: 'pow', p: 1.5, s: 1.3, q: 1.3 };
    const PRE = [
      { name: 'Notes p. 28: e^(−x) on [1, b]', mode: 'I', fam: 'exp', s: 1.0 },
      { name: '1/x^1.5 (converges)', mode: 'I', fam: 'pow', p: 1.5, s: 1.3 },
      { name: '1/x (diverges slowly)', mode: 'I', fam: 'pow', p: 1, s: 2 },
      { name: 'Notes p. 32: 1/x^0.8 at ∞', mode: 'I', fam: 'pow', p: 0.8, s: 2 },
      { name: 'Notes p. 32: 1/x^0.8 near 0', mode: 'II', fam: 'pow', p: 0.8, q: 2 },
    ];
    const presets = presetRow(PRE, p => { Object.assign(st, p); sync(); render(); touched('B'); });
    presets.mark(1);
    const modeSeg = seg([['I', 'Type I: b → ∞'], ['II', 'Type II: a → 0⁺']], st.mode, v => { st.mode = v; if (v === 'II' && st.fam === 'exp') st.fam = 'pow'; presets.mark(-1); sync(); render(); touched('B'); });
    const famSeg = seg([['pow', 'y = 1/xᵖ'], ['exp', 'y = e⁻ˣ']], st.fam, v => { st.fam = v; presets.mark(-1); sync(); render(); touched('B'); });
    const sp = slider('p (the power)', 0.2, 2.5, 0.05, st.p, v => { st.p = v; presets.mark(-1); render(); touched('B'); }, v => v.toFixed(2));
    const sEnd = slider('b (upper limit)', 0, 6, 0.01, st.s, v => { if (st.mode === 'I') st.s = v; else st.q = v; presets.mark(-1); render(); touched('B'); }, v => st.mode === 'I' ? 'b = ' + fmtPow10(Math.pow(10, v)) : 'a = ' + fmtPow10(Math.pow(10, -v)));
    const top = el('div'), bottom = el('div');
    const status = el('div', { class: 'status-line' });
    const sArea = stat('Area so far'), sLim = stat('Limit of the areas'), sFrac = stat('Share of the limit');
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: area as the endpoint moves' }), el('div', { class: 'table-scroll' }, tbl));
    const note = el('div', { class: 'notice', hidden: true });
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    const ctr = el('div', { class: 'controls' }, el('div', { class: 'ctrl' }, el('label', null, el('span', { text: 'Which infinity?' })), modeSeg), el('div', { class: 'ctrl' }, el('label', null, el('span', { text: 'Function' })), famSeg), sp, sEnd);
    root.append(presets, ctr, note, top, el('div', { class: 'w-sub', style: 'margin:10px 0 0', html: '<b>Below:</b> the area as a function of how far the endpoint has moved (log scale). Watch whether it levels off.' }), bottom, status, el('div', { class: 'stats' }, sArea, sLim, sFrac), tview, prompt);
    const P1 = new Plot(top, { W: 680, H: 300, aria: 'Graph of the integrand with the area from the fixed end to the moving endpoint shaded.' });
    const P2 = new Plot(bottom, { W: 680, H: 230, logx: true, xmin: 1, xmax: 1e6, aria: 'Area as a function of the moving endpoint on a logarithmic axis.' });
    const isOne = () => Math.abs(st.p - 1) < 1e-6;
    function f(x) { return st.fam === 'exp' ? Math.exp(-x) : Math.pow(x, -st.p); }
    function areaI(b) { // ∫_1^b
      if (st.fam === 'exp') return Math.exp(-1) - Math.exp(-b);
      return isOne() ? Math.log(b) : (Math.pow(b, 1 - st.p) - 1) / (1 - st.p);
    }
    function areaII(a) { // ∫_a^1
      return isOne() ? -Math.log(a) : (1 - Math.pow(a, 1 - st.p)) / (1 - st.p);
    }
    function limit() {
      if (st.mode === 'I') { if (st.fam === 'exp') return Math.exp(-1); return st.p > 1 + 1e-6 ? 1 / (st.p - 1) : Infinity; }
      return st.p < 1 - 1e-6 ? 1 / (1 - st.p) : Infinity;
    }
    function sync() {
      modeSeg.set(st.mode); famSeg.set(st.fam);
      $$('button', famSeg)[1].disabled = st.mode === 'II';
      sp.set(st.p); sp.style.display = st.fam === 'exp' ? 'none' : '';
      $('label span', sEnd).textContent = st.mode === 'I' ? 'Upper limit b (log scale)' : 'Lower limit a (log scale, toward 0)';
      sEnd.set(st.mode === 'I' ? st.s : st.q);
    }
    function render() {
      const L = limit(), I = st.mode === 'I';
      const e = I ? st.s : st.q, endV = I ? Math.pow(10, e) : Math.pow(10, -e);
      const A = I ? areaI(endV) : areaII(endV);
      // top plot
      if (I) {
        P1.setView({ xmin: 0, xmax: 10.5, ymin: 0, ymax: 1.25 }); P1.clear(); P1.axes({ xlabel: 'x', ylabel: 'y' });
        P1.area(f, 1, Math.min(endV, 10.5), { posCls: 'area-pos' });
        P1.curve(f, 0.3, 10.5, 'curve');
        P1.line(1, 0, 1, 1.25, 'vline'); P1.text(1, 0, 'x = 1', 'lbl', 'middle', -6);
        if (endV <= 10.5) { P1.line(endV, 0, endV, 1.25, 'vline'); P1.text(endV, 1.25, 'b', 'lbl', 'middle', 14); }
        else P1.text(10.4, 0.55, '→ shading continues to b = ' + fmtPow10(endV), 'dlbl', 'end');
        P1.text(10.4, 1.1, st.fam === 'exp' ? 'y = e⁻ˣ' : `y = 1/x^${st.p.toFixed(2)}`, 'dlbl', 'end');
      } else {
        const ymax = 8;
        P1.setView({ xmin: 0, xmax: 1.12, ymin: 0, ymax }); P1.clear(); P1.axes({ xlabel: 'x', ylabel: 'y' });
        P1.area(x => Math.min(f(x), 1e6), Math.max(endV, 1e-9), 1, { posCls: 'area-pos', n: 600 });
        P1.curve(f, 0.0008, 1.12, 'curve', 800);
        P1.line(1, 0, 1, ymax, 'vline'); P1.text(1, ymax, 'x = 1', 'lbl', 'middle', 14);
        if (endV > 0.02) { P1.line(endV, 0, endV, ymax, 'vline'); P1.text(endV, ymax, 'a', 'lbl', 'middle', 14); }
        else P1.text(0.03, ymax * 0.93, '← a = ' + fmtPow10(endV) + ' (hugging the y-axis)', 'dlbl', 'start');
        P1.text(1.1, 6.6, `y = 1/x^${st.p.toFixed(2)}`, 'dlbl', 'end');
        P1.text(0.5, ymax * 0.7, 'the curve shoots up as x → 0⁺', 'lbl', 'middle');
      }
      // bottom plot: A vs endpoint on log axis
      const g = I ? (u => areaI(u)) : (u => areaII(1 / u));
      const A6 = g(1e6), yTop = isFinite(L) ? Math.max(L * 1.18, 0.05) : Math.max(A6 * 1.08, 0.05);
      P2.setView({ xmin: 1, xmax: 1e6, ymin: 0, ymax: yTop }); P2.clear();
      P2.axes({ xlabel: I ? 'b' : '1/a', ylabel: 'area', ny: 4 });
      const pts = []; for (let k = 0; k <= 300; k++) { const u = Math.pow(10, 6 * k / 300); pts.push([u, g(u)]); }
      svgEl('path', { class: 'curve s1', d: P2.d(pts) }, P2.gData);
      if (isFinite(L)) { P2.line(1, L, 1e6, L, 'limit'); P2.text(1e6, L, 'limit = ' + fmtNum(L, 4), 'dlbl', 'end', -7); }
      const u0 = I ? endV : 1 / endV;
      P2.dot(u0, g(u0), 'dot s1', 5);
      // readouts
      sArea.set(fmt(A), I ? `∫ from 1 to b = ${fmtPow10(endV)}` : `∫ from a = ${fmtPow10(endV)} to 1`);
      sLim.set(isFinite(L) ? fmt(L) : '∞', isFinite(L) ? (st.fam === 'exp' ? 'e⁻¹' : I ? '1/(p − 1)' : '1/(1 − p)') : 'no finite limit');
      sFrac.set(isFinite(L) ? (100 * A / L).toFixed(2) + '%' : '—', isFinite(L) ? 'of the limit reached so far' : 'there is no limit to reach');
      status.innerHTML = isFinite(L) ? `<span class="p-status good">✓ Converges</span> The areas level off at ${fmtNum(L, 4)}; they get closer but never pass it.` : `<span class="p-status" style="color:var(--bad-text)">✗ Diverges</span> The areas grow without bound${isOne() ? ' (slowly, like ln b)' : ''}.`;
      note.hidden = !(st.fam === 'pow' && isOne());
      note.innerHTML = 'p = 1 is the dividing line: the area is ln b (or ln(1/a)), which grows forever, just very slowly. Even at b = 10⁶ it is only about 13.8.';
      tbl.innerHTML = `<thead><tr><th>${I ? 'b' : 'a'}</th><th class="num">area</th></tr></thead>`;
      const tb = el('tbody');
      [1, 2, 3, 4, 5, 6].forEach(k => { const v = I ? Math.pow(10, k) : Math.pow(10, -k); tb.appendChild(el('tr', null, el('td', { text: fmtPow10(v) }), el('td', { class: 'num', text: fmt(I ? areaI(v) : areaII(v)) }))); });
      tbl.appendChild(tb);
      prompt.update();
      root._last = { A, L, endV };
    }
    function tutorText() {
      const L = limit(), I = st.mode === 'I';
      const fn = st.fam === 'exp' ? 'e^(−x)' : `1/x^${st.p.toFixed(2)}`;
      const parts = [I ? `I'm exploring the improper integral of ${fn} from 1 to ∞ by moving b to the right.` : `I'm exploring the improper integral of ${fn} from 0 to 1 by moving a toward 0.`];
      parts.push(isFinite(L) ? `The areas seem to level off at ${fmtNum(L, 4)}.` : 'The areas keep growing.');
      if (st.fam === 'pow') parts.push(I ? 'Ask me to explain, using the limit definition from my notes, why the dividing line at ∞ is p = 1, and why p = 1 itself diverges.' : 'Ask me why the rule near 0 is the reverse of the rule at ∞ (p < 1 converges here), and quiz me on ∫ from 0 to ∞ of 1/x^p.');
      else parts.push('Have me compute the limit by hand (notes p. 28) and explain why the area is finite even though the region is infinitely long.');
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    }
    sync(); render();
    P2.hover(u => { const I = st.mode === 'I'; const v = I ? areaI(u) : areaII(1 / u); return { x: u, points: [{ y: v, cls: 's1' }], html: `${I ? 'b' : 'a'} = <b>${fmtPow10(I ? u : 1 / u)}</b><br>area = <b>${fmt(v)}</b>` }; });
    P1.hover(x => { const y = f(x); if (x <= 0) return null; return { x, points: [{ y, cls: 's1' }], html: `x = <b>${fmt(x, 3)}</b><br>y = <b>${fmt(y, 3)}</b>` }; });
    root._state = st; root._render = render; root._sync = sync;
  }

  /* ================================================================== Widget C: approximation lab */
  function widgetNumeric(root) {
    const FN = {
      eneg: { label: 'e^(−x²) on [0, 1]', f: x => Math.exp(-x * x), a: 0, b: 1, exact: 0.746824132812427, exactTxt: '(√π/2)·erf(1) ≈ 0.746824', view: { xmin: -0.05, xmax: 1.05, ymin: 0, ymax: 1.12 } },
      circ: { label: '√(1 − x²) on [−1, 1]', f: x => Math.sqrt(Math.max(0, 1 - x * x)), a: -1, b: 1, dom: [-1, 1], exact: Math.PI / 2, exactTxt: 'π/2 ≈ 1.570796 (half of a unit disk)', view: { xmin: -1.1, xmax: 1.1, ymin: 0, ymax: 1.12 } },
      epos: { label: 'e^(x²) on [0, 1]', f: x => Math.exp(x * x), a: 0, b: 1, exact: 1.462651745907181, exactTxt: '≈ 1.462652 (no elementary antiderivative)', view: { xmin: -0.05, xmax: 1.05, ymin: 0, ymax: 2.9 } },
      li: { label: '1/ln x on [2, 14]', f: x => 1 / Math.log(x), a: 2, b: 14, exact: 6.735661815441833, exactTxt: '≈ 6.735662 (no elementary antiderivative)', view: { xmin: 1.5, xmax: 14.5, ymin: 0, ymax: 1.6 } },
    };
    const RULE = { mid: 'Midpoint', trap: 'Trapezoid', simp: "Simpson's" };
    const CLS = { mid: 'm', trap: 't', simp: 's' }, SER = { mid: 's1', trap: 's2', simp: 's3' };
    const PRE = [
      { name: 'Notes p. 35: Midpoint, e^(−x²), n = 2', fn: 'eneg', rule: 'mid', n: 2 },
      { name: 'Notes p. 37: Trapezoid, √(1−x²), n = 4', fn: 'circ', rule: 'trap', n: 4 },
      { name: 'Notes p. 37: Trapezoid, e^(x²), n = 5', fn: 'epos', rule: 'trap', n: 5 },
      { name: 'Notes p. 39: Simpson, 1/ln x, n = 6', fn: 'li', rule: 'simp', n: 6 },
      { name: 'Textbook Ex. 2.6.7: Simpson, e^(−x²), n = 4', fn: 'eneg', rule: 'simp', n: 4 },
    ];
    const st = Object.assign({}, PRE[0]);
    const presets = presetRow(PRE, p => { Object.assign(st, p); sync(); render(); touched('C'); });
    presets.mark(0);
    const fnSel = el('select', { 'aria-label': 'Function' });
    Object.keys(FN).forEach(k => fnSel.appendChild(el('option', { value: k, text: FN[k].label })));
    fnSel.addEventListener('change', () => { st.fn = fnSel.value; presets.mark(-1); render(); touched('C'); });
    const ruleSeg = seg([['mid', 'Midpoint'], ['trap', 'Trapezoid'], ['simp', "Simpson's"]], st.rule, v => { st.rule = v; presets.mark(-1); render(); touched('C'); });
    const sn = slider('n (number of subintervals)', 1, 16, 1, st.n, v => { st.n = v; presets.mark(-1); render(); touched('C'); }, v => 'n = ' + v);
    const plotHost = el('div'), errHost = el('div');
    const warn = el('div', { class: 'notice warn', hidden: true });
    const coef = el('div', { class: 'coef-line' });
    const sApp = stat('Approximation'), sTrue = stat('Actual value'), sErr = stat('Error = approx − actual'), sAbs = stat('|error|');
    sApp.classList.add('hero');
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more', open: true }, el('summary', { text: 'Table view: every term in the sum' }), el('div', { class: 'table-scroll' }, tbl));
    const legend = el('div', { class: 'legend' },
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s1)' }), 'Midpoint'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s2)' }), 'Trapezoid'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s3)' }), "Simpson's"));
    const etbl = el('table', { class: 'data-table' });
    const eview = el('details', { class: 'more' }, el('summary', { text: 'Table view: |error| for n = 2, 4, 8, 16, 32' }), el('div', { class: 'table-scroll' }, etbl));
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    const ctr = el('div', { class: 'controls' }, el('div', { class: 'ctrl' }, el('label', null, el('span', { text: 'Function' })), fnSel), el('div', { class: 'ctrl' }, el('label', null, el('span', { text: 'Rule' })), ruleSeg), sn);
    root.append(presets, ctr, warn, plotHost, coef, el('div', { class: 'stats' }, sApp, sTrue, sErr, sAbs), tview,
      el('h5', { style: 'margin:16px 0 2px', text: 'How fast does each rule improve as n grows?' }), el('div', { class: 'w-sub', text: 'Absolute error versus n on log–log axes, for the function you picked. Lower is better; a steeper line means faster improvement.' }), legend, errHost, eview, prompt);
    const plot = new Plot(plotHost, { W: 680, H: 310, aria: 'The integrand with the approximating shapes of the chosen rule.' });
    const eplot = new Plot(errHost, { W: 680, H: 250, logx: true, logy: true, xmin: 1.6, xmax: 40, ymin: 1e-12, ymax: 1, pad: { l: 58, r: 90, t: 14, b: 36 }, aria: 'Log-log plot of absolute error versus n for the three rules.' });
    function rule(name, F, n) {
      const dx = (F.b - F.a) / n; let sum = 0; const rows = [];
      if (name === 'mid') { for (let i = 1; i <= n; i++) { const m = F.a + (i - 0.5) * dx, y = F.f(m); sum += y; rows.push({ k: i, x: m, y, c: 1 }); } return { val: dx * sum, rows, pre: dx, preTxt: 'Δx' }; }
      if (name === 'trap') { for (let k = 0; k <= n; k++) { const x = F.a + k * dx, y = F.f(x), c = k === 0 || k === n ? 1 : 2; sum += c * y; rows.push({ k, x, y, c }); } return { val: dx / 2 * sum, rows, pre: dx / 2, preTxt: 'Δx/2' }; }
      if (n % 2) return null;
      for (let k = 0; k <= n; k++) { const x = F.a + k * dx, y = F.f(x), c = k === 0 || k === n ? 1 : k % 2 ? 4 : 2; sum += c * y; rows.push({ k, x, y, c }); }
      return { val: dx / 3 * sum, rows, pre: dx / 3, preTxt: 'Δx/3' };
    }
    function sync() { fnSel.value = st.fn; ruleSeg.set(st.rule); sn.set(st.n); }
    function render() {
      const F = FN[st.fn], n = st.n, dx = (F.b - F.a) / n;
      plot.setView(F.view); plot.clear(); plot.axes({ xlabel: 'x', ylabel: 'y' });
      const R = rule(st.rule, F, n);
      warn.hidden = !!R;
      if (!R) warn.innerHTML = `<b>n must be even for Simpson's Rule!</b> (notes p. 38) Simpson fits one parabola over each <em>pair</em> of subintervals. With n = ${n}, one strip is left over. Try n = ${n + 1} or n = ${n - 1 || 2}.`;
      const cls = CLS[st.rule];
      if (R) {
        if (st.rule === 'mid') R.rows.forEach(r => { const x0 = r.x - dx / 2, x1 = r.x + dx / 2; plot.poly([[x0, 0], [x0, r.y], [x1, r.y], [x1, 0]], 'shape m'); });
        if (st.rule === 'trap') for (let k = 1; k <= n; k++) { const A = R.rows[k - 1], B = R.rows[k]; plot.poly([[A.x, 0], [A.x, A.y], [B.x, B.y], [B.x, 0]], 'shape t'); }
        if (st.rule === 'simp') for (let j = 0; j < n / 2; j++) {
          const A = R.rows[2 * j], M = R.rows[2 * j + 1], B = R.rows[2 * j + 2];
          const q = x => A.y * ((x - M.x) * (x - B.x)) / ((A.x - M.x) * (A.x - B.x)) + M.y * ((x - A.x) * (x - B.x)) / ((M.x - A.x) * (M.x - B.x)) + B.y * ((x - A.x) * (x - M.x)) / ((B.x - A.x) * (B.x - M.x));
          const pts = [[A.x, 0]]; for (let k = 0; k <= 30; k++) { const x = A.x + (B.x - A.x) * k / 30; pts.push([x, q(x)]); } pts.push([B.x, 0]);
          plot.poly(pts, 'shape s' + (j % 2 ? ' alt' : ''));
          plot.curve(q, A.x, B.x, 'shape-edge s', 30);
        }
      }
      plot.curve(F.f, F.dom ? F.dom[0] : F.view.xmin, F.dom ? F.dom[1] : F.view.xmax, 'curve');
      if (R) R.rows.forEach(r => plot.dot(r.x, r.y, 'dot ' + SER[st.rule], 4));
      // coefficient pattern
      if (R) {
        const cs = R.rows.map(r => r.c);
        coef.innerHTML = `<b style="background:none;font-family:var(--font)">${RULE[st.rule]} coefficients:</b> ${st.rule === 'mid' ? 'f is evaluated at the <em>midpoints</em>, each with weight' : ''} ${cs.map(c => `<b class="c${c}">${c}</b>`).join(' ')} &nbsp;·&nbsp; prefactor ${R.preTxt} = ${fmtNum(R.pre, 5)}`;
      } else coef.innerHTML = '';
      const err = R ? R.val - F.exact : NaN;
      sApp.set(R ? fmt(R.val, 6) : '—', `${RULE[st.rule]}, n = ${n}`);
      sTrue.set(fmt(F.exact, 6), F.exactTxt);
      sErr.set(R ? fmt(err, 6) : '—', R ? (Math.abs(err) < 1e-12 ? 'exact' : err > 0 ? 'overestimate' : 'underestimate') : '');
      sAbs.set(R ? fmt(Math.abs(err), 6) : '—');
      // table
      if (R) {
        tbl.innerHTML = `<thead><tr><th>${st.rule === 'mid' ? 'i' : 'k'}</th><th class="num">${st.rule === 'mid' ? 'midpoint mᵢ' : 'xₖ'}</th><th class="num">f(·)</th><th class="num">coefficient</th><th class="num">coef × f</th></tr></thead>`;
        const tb = el('tbody'); let tot = 0;
        R.rows.forEach(r => { tot += r.c * r.y; tb.appendChild(el('tr', null, el('td', { text: String(r.k) }), el('td', { class: 'num', text: fmtNum(r.x, 4) }), el('td', { class: 'num', text: fmt(r.y, 6) }), el('td', { class: 'num', text: String(r.c) }), el('td', { class: 'num', text: fmt(r.c * r.y, 6) }))); });
        tb.appendChild(el('tr', null, el('td', { colspan: 4, html: `<b>sum</b> × ${R.preTxt} = ${fmt(tot, 6)} × ${fmtNum(R.pre, 5)}` }), el('td', { class: 'num', html: `<b>${fmt(R.val, 6)}</b>` })));
        tbl.appendChild(tb);
      } else tbl.innerHTML = '<tbody><tr><td>Choose an even n to see the table.</td></tr></tbody>';
      renderErr(F);
      prompt.update();
      root._last = R ? { val: R.val, err } : null;
    }
    function errs(F) { const ns = [2, 4, 8, 16, 32]; return ns.map(n => ({ n, m: Math.abs(rule('mid', F, n).val - F.exact), t: Math.abs(rule('trap', F, n).val - F.exact), s: Math.abs(rule('simp', F, n).val - F.exact) })); }
    function renderErr(F) {
      const E = errs(F);
      const all = E.flatMap(e => [e.m, e.t, e.s]).filter(v => v > 0);
      const lo = Math.pow(10, Math.floor(Math.log10(Math.min(...all)))), hi = Math.pow(10, Math.ceil(Math.log10(Math.max(...all))));
      eplot.setView({ ymin: lo, ymax: hi }); eplot.clear();
      eplot.axes({ xticks: [2, 4, 8, 16, 32].map(v => ({ v, l: String(v) })), yticks: logTicks(lo, hi).filter((t, k, arr) => arr.length < 8 || k % 2 === 0), xlabel: 'n', ylabel: '|error|' });
      const labels = [];
      [['m', 's1', 'Midpoint'], ['t', 's2', 'Trapezoid'], ['s', 's3', "Simpson's"]].forEach(([key, c, name]) => {
        const pts = E.map(e => [e.n, Math.max(e[key], lo)]);
        svgEl('path', { class: 'curve ' + c, d: eplot.d(pts) }, eplot.gData);
        pts.forEach(([x, y]) => eplot.dot(x, y, 'dot ' + c, 3.5));
        const last = pts[pts.length - 1];
        labels.push({ name, c, x: eplot.sx(last[0]), y0: eplot.sy(last[1]), y: eplot.sy(last[1]) });
      });
      // direct end-labels: keep >= 15px apart; if a label had to move, draw a thin leader line to its line end
      labels.sort((p, q) => p.y0 - q.y0);
      for (let pass = 0; pass < 20; pass++) for (let k = 1; k < labels.length; k++) { const gap = labels[k].y - labels[k - 1].y; if (gap < 15) { const push = (15 - gap) / 2; labels[k].y += push; labels[k - 1].y -= push; } }
      labels.forEach(L => {
        if (Math.abs(L.y - L.y0) > 3) svgEl('path', { class: 'cross', d: `M${L.x + 5},${L.y0} L${L.x + 14},${L.y - 1}` }, eplot.gTop);
        const T = svgEl('text', { class: 'dlbl', x: L.x + 16, y: L.y + 4 }, eplot.gTop); T.textContent = L.name;
      });
      if (st.n % 2 === 0 && [2, 4, 8, 16].includes(st.n)) { const e = E.find(q => q.n === st.n); const key = { mid: 'm', trap: 't', simp: 's' }[st.rule]; eplot.dot(st.n, Math.max(e[key], lo), 'dot ink', 6); }
      etbl.innerHTML = '<thead><tr><th>n</th><th class="num">Midpoint</th><th class="num">Trapezoid</th><th class="num">Simpson\'s</th></tr></thead>';
      const tb = el('tbody'); E.forEach(e => tb.appendChild(el('tr', null, el('td', { text: String(e.n) }), el('td', { class: 'num', text: e.m.toExponential(3) }), el('td', { class: 'num', text: e.t.toExponential(3) }), el('td', { class: 'num', text: e.s.toExponential(3) })))); etbl.appendChild(tb);
      eplot._E = E;
    }
    function tutorText() {
      const F = FN[st.fn], R = rule(st.rule, F, st.n);
      const parts = [`I'm using the approximation lab: ${RULE[st.rule]} Rule with n = ${st.n} for ∫ of ${F.label}.`];
      if (!R) parts.push("It won't compute because n is odd. Help me explain in my own words why Simpson's Rule needs an even n.");
      else {
        parts.push(`The approximation is ${fmt(R.val, 6)} and the actual value is about ${fmt(F.exact, 6)} (error ${fmt(R.val - F.exact, 6)}).`);
        parts.push(st.rule === 'trap' ? 'Ask me why the interior coefficients are 2 and whether this should be an over- or underestimate for this curve.' : st.rule === 'simp' ? 'Ask me where the 1, 4, 2, 4, …, 4, 1 pattern comes from, and why Simpson is usually so much more accurate.' : 'Ask me why the Midpoint Rule samples the middle of each strip and how its error compares with the Trapezoid Rule.');
      }
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    }
    sync(); render();
    plot.hover(x => { const F = FN[st.fn]; if (x < F.a - 0.3 || (st.fn === 'li' && x <= 1.01)) return null; const y = F.f(x); return { x, points: [{ y, cls: 'ink' }], html: `x = <b>${fmt(x, 3)}</b><br>f(x) = <b>${fmt(y, 4)}</b>` }; });
    eplot.hover(u => { const E = eplot._E; if (!E) return null; let best = E[0]; E.forEach(e => { if (Math.abs(Math.log(e.n) - Math.log(u)) < Math.abs(Math.log(best.n) - Math.log(u))) best = e; }); return { x: best.n, points: [{ y: best.m, cls: 's1' }, { y: best.t, cls: 's2' }, { y: best.s, cls: 's3' }], html: `n = <b>${best.n}</b><br><span class="k" style="background:var(--s1)"></span><b>${best.m.toExponential(2)}</b> Midpoint<br><span class="k" style="background:var(--s2)"></span><b>${best.t.toExponential(2)}</b> Trapezoid<br><span class="k" style="background:var(--s3)"></span><b>${best.s.toExponential(2)}</b> Simpson's` }; });
    root._state = st; root._render = render; root._sync = sync; root._rule = (r, fnk, n) => rule(r, FN[fnk], n);
  }

  /* ================================================================== Widget D: motion simulator */
  function widgetMotion(root) {
    const PRE = [
      { name: 'Notes p. 41: +10 ft/s, then −10 ft/s', id: 'notes', v: t => (t < 30 ? 10 : -10), P: t => (t < 30 ? 10 * t : 300 - 10 * (t - 30)), a: 0, b: 60, zeros: [30], u: 'ft', vtxt: 'v(t) = 10 for t < 30, −10 for t ≥ 30' },
      { name: 'v = t² − 4t + 3 (guided example)', id: 'guided', v: t => t * t - 4 * t + 3, P: t => t ** 3 / 3 - 2 * t * t + 3 * t, a: 0, b: 4, zeros: [1, 3], u: 'm', vtxt: 'v(t) = t² − 4t + 3' },
      { name: 'Textbook Ex. 3.1.2: v = 3t² − 12t + 8', id: 'tb', v: t => 3 * t * t - 12 * t + 8, P: t => t ** 3 - 6 * t * t + 8 * t, a: 0, b: 4, zeros: [2 - 2 * Math.sqrt(3) / 3, 2 + 2 * Math.sqrt(3) / 3], u: 'm', vtxt: 'v(t) = 3t² − 12t + 8' },
      { name: 'v = cos t on [0, 2π]', id: 'cos', v: Math.cos, P: Math.sin, a: 0, b: 2 * PI, zeros: [PI / 2, 3 * PI / 2], u: 'm', vtxt: 'v(t) = cos t', ticks: PI_TICKS },
      { name: 'New notes p. 1: v = eᵗ − 2', id: 'n1', v: t => Math.exp(t) - 2, P: t => Math.exp(t) - 2 * t, a: 0, b: 1, zeros: [Math.LN2], u: '', vtxt: 'v(t) = eᵗ − 2' },
      { name: 'New notes p. 2: v = t² − t − 2', id: 'n2', v: t => t * t - t - 2, P: t => t ** 3 / 3 - t * t / 2 - 2 * t, a: 0, b: 4, zeros: [2], u: '', vtxt: 'v(t) = t² − t − 2' },
      { name: 'New notes p. 3: v = 1 − 2cos t', id: 'n3', v: t => 1 - 2 * Math.cos(t), P: t => t - 2 * Math.sin(t), a: 0, b: PI, zeros: [PI / 3], u: '', vtxt: 'v(t) = 1 − 2cos t', ticks: [0, 1, 2, 3].map(k => ({ v: k * PI / 3, l: ['0', 'π/3', '2π/3', 'π'][k] })) },
    ];
    const uL = u => (u ? ' ' + u : ''), uR = u => (u ? ' ' + u + '/s' : '');
    let cur = PRE[0];
    const st = { k: 0, t: 0, playing: false };
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.t = p.a; st.playing = false; sync(); render(); touched('D'); });
    presets.mark(0);
    const stime = slider('time t', 0, 1, 0.001, 0, v => { st.t = v; st.playing = false; playBtn.textContent = '▶ Play'; render(); touched('D'); }, v => 't = ' + fmtNum(v, 2));
    const playBtn = el('button', { class: 'btn small', type: 'button', text: '▶ Play' });
    const resetBtn = el('button', { class: 'btn ghost small', type: 'button', text: 'Reset' });
    const vHost = el('div'), tHost = el('div');
    const sT = stat('Velocity v(t)'), sSp = stat('Speed |v(t)|'), sDisp = stat('Displacement so far'), sDist = stat('Distance so far');
    sDisp.classList.add('hero'); sDist.classList.add('hero');
    const dirLine = el('div', { class: 'status-line' });
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: pieces between turning points' }), el('div', { class: 'table-scroll' }, tbl));
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    root.append(presets, el('div', { class: 'controls' }, stime, el('div', { class: 'ctrl btn-row', style: 'margin:0' }, playBtn, resetBtn)), vHost,
      el('div', { class: 'legend' }, el('span', null, el('i', { class: 'sw', style: 'background:var(--pos);opacity:.55' }), 'v > 0: moving forward'), el('span', null, el('i', { class: 'sw', style: 'background:var(--neg);opacity:.55' }), 'v < 0: moving backward')),
      el('div', { class: 'w-sub', style: 'margin:12px 0 0', html: '<b>Below:</b> the object on its line. Position runs left to right and time runs downward, so turning around shows up as a bend in the trail.' }), tHost, dirLine, el('div', { class: 'stats' }, sT, sSp, sDisp, sDist), tview, prompt);
    const VP = new Plot(vHost, { W: 680, H: 250, aria: 'Velocity versus time with the area up to the current time shaded.' });
    const TP = new Plot(tHost, { W: 680, H: 190, pad: { l: 50, r: 20, t: 14, b: 36 }, aria: 'Position of the object on a line, with its trail over time.' });
    function distTo(t) {
      const cuts = [cur.a, ...cur.zeros.filter(z => z > cur.a && z < t), t];
      let d = 0; for (let k = 0; k < cuts.length - 1; k++) d += Math.abs(cur.P(cuts[k + 1]) - cur.P(cuts[k]));
      return d;
    }
    function sync() { stime.input.min = cur.a; stime.input.max = cur.b; stime.input.step = (cur.b - cur.a) / 1000; stime.set(st.t); }
    function render() {
      const t = st.t;
      // velocity plot
      let vmin = Infinity, vmax = -Infinity; for (let k = 0; k <= 400; k++) { const x = cur.a + (cur.b - cur.a) * k / 400, y = cur.v(x); vmin = Math.min(vmin, y); vmax = Math.max(vmax, y); }
      const padv = (vmax - vmin) * 0.12 || 1;
      VP.setView({ xmin: cur.a, xmax: cur.b, ymin: Math.min(0, vmin) - padv, ymax: Math.max(0, vmax) + padv }); VP.clear();
      VP.axes({ xticks: cur.ticks, xlabel: 't', ylabel: 'v' });
      if (t > cur.a) VP.area(cur.v, cur.a, t, { n: 600 });
      if (cur.id === 'notes') { svgEl('path', { class: 'curve', d: VP.d([[0, 10], [30, 10]]) }, VP.gData); svgEl('path', { class: 'curve', d: VP.d([[30, -10], [60, -10]]) }, VP.gData); }
      else VP.curve(cur.v, cur.a, cur.b, 'curve');
      cur.zeros.forEach(z => { VP.dot(z, 0, 'dot ink', 4); VP.text(z, 0, 'turns', 'lbl', 'middle', -9); });
      VP.line(t, VP.o.ymin, t, VP.o.ymax, 'marker');
      // track plot: x = position, y = time (downward)
      let pmin = Infinity, pmax = -Infinity; for (let k = 0; k <= 400; k++) { const x = cur.a + (cur.b - cur.a) * k / 400, p = cur.P(x); pmin = Math.min(pmin, p); pmax = Math.max(pmax, p); }
      const pp = (pmax - pmin) * 0.1 || 1;
      // positions are shown relative to the start, so every preset starts at 0
      const rel = tau => cur.P(tau) - cur.P(cur.a), p0 = cur.P(cur.a), nT = 300;
      TP.setView({ xmin: pmin - p0 - pp, xmax: pmax - p0 + pp, ymin: -(cur.b - cur.a) * 0.08, ymax: (cur.b - cur.a) * 1.02 }); TP.clear();
      TP.axes({ xlabel: 'position relative to the start' + (cur.u ? ', ' + cur.u : ''), yticks: [], nx: 7 });
      const trailRel = []; for (let k = 0; k <= nT; k++) { const tau = cur.a + (t - cur.a) * k / nT; trailRel.push([rel(tau), (cur.b - cur.a) - (tau - cur.a)]); }
      svgEl('path', { class: 'trail', d: TP.d(trailRel) }, TP.gData);
      TP.dot(0, cur.b - cur.a, 'dot ink', 4); TP.text(0, cur.b - cur.a, 'start', 'lbl', 'middle', -9);
      const nowY = (cur.b - cur.a) - (t - cur.a);
      TP.dot(rel(t), nowY, 'dot s1', 7);
      const vt = cur.v(t);
      if (Math.abs(vt) > 1e-9) TP.text(rel(t) + (vt > 0 ? 1 : -1) * (TP.o.xmax - TP.o.xmin) * 0.035, nowY, vt > 0 ? '→' : '←', 'big', 'middle', 5);
      // readouts
      const disp = cur.P(t) - cur.P(cur.a), dist = distTo(t);
      sT.set(fmt(vt, 3) + uR(cur.u), `at t = ${fmtNum(t, 3)}`);
      sSp.set(fmt(Math.abs(vt), 3) + uR(cur.u));
      sDisp.set(fmt(disp, 3) + uL(cur.u), '∫ v dt from the start (can shrink)');
      sDist.set(fmt(dist, 3) + uL(cur.u), '∫ |v| dt from the start (never shrinks)');
      dirLine.innerHTML = Math.abs(vt) < 1e-9 ? '⏸ Momentarily stopped (v = 0): a possible turning point.' : vt > 0 ? '→ Moving forward (v > 0): displacement and distance both grow.' : '← Moving backward (v < 0): displacement shrinks while distance still grows.';
      // table
      const cuts = [cur.a, ...cur.zeros, cur.b];
      tbl.innerHTML = '<thead><tr><th>time piece</th><th>sign of v</th><th class="num">∫ v dt</th><th class="num">distance</th></tr></thead>';
      const tb = el('tbody'); let D = 0, Dp = 0;
      for (let k = 0; k < cuts.length - 1; k++) { const dv = cur.P(cuts[k + 1]) - cur.P(cuts[k]); D += Math.abs(dv); Dp += dv; tb.appendChild(el('tr', null, el('td', { text: `[${fmtNum(cuts[k], 3)}, ${fmtNum(cuts[k + 1], 3)}]` }), el('td', { text: dv >= 0 ? '+ (forward)' : '− (backward)' }), el('td', { class: 'num', text: fmt(dv, 4) }), el('td', { class: 'num', text: fmt(Math.abs(dv), 4) }))); }
      tb.appendChild(el('tr', null, el('td', { colspan: 2, html: '<b>whole trip</b>' }), el('td', { class: 'num', html: `<b>${fmt(Dp, 4)}</b> displacement` }), el('td', { class: 'num', html: `<b>${fmt(D, 4)}</b> distance` })));
      tbl.appendChild(tb);
      prompt.update();
      root._last = { disp, dist, t };
    }
    let raf = null, lastTs = 0;
    function loop(ts) {
      if (!st.playing) return;
      const dt = lastTs ? (ts - lastTs) / 1000 : 0; lastTs = ts;
      st.t = Math.min(cur.b, st.t + dt * (cur.b - cur.a) / 9);
      stime.set(st.t); render();
      if (st.t >= cur.b) { st.playing = false; playBtn.textContent = '▶ Play'; return; }
      raf = requestAnimationFrame(loop);
    }
    playBtn.addEventListener('click', () => {
      touched('D');
      if (st.playing) { st.playing = false; playBtn.textContent = '▶ Play'; return; }
      if (st.t >= cur.b - 1e-9) st.t = cur.a;
      st.playing = true; playBtn.textContent = '❚❚ Pause'; lastTs = 0; raf = requestAnimationFrame(loop);
    });
    resetBtn.addEventListener('click', () => { st.playing = false; playBtn.textContent = '▶ Play'; st.t = cur.a; stime.set(st.t); render(); });
    function tutorText() {
      const disp = cur.P(st.t) - cur.P(cur.a), dist = distTo(st.t);
      const parts = [`I'm using the motion simulator with ${cur.vtxt} on [${fmtNum(cur.a, 3)}, ${fmtNum(cur.b, 3)}], paused at t = ${fmtNum(st.t, 3)}.`, `So far the displacement is ${fmt(disp, 3)}${uL(cur.u)} and the distance traveled is ${fmt(dist, 3)}${uL(cur.u)}.`];
      parts.push('Ask me to predict where the object turns around and to set up the distance integral by hand before you confirm anything.');
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    }
    sync(); render();
    VP.hover(x => { const y = cur.v(x); return { x, points: [{ y, cls: y >= 0 ? 's1' : 's2' }], html: `t = <b>${fmt(x, 3)}</b><br>v(t) = <b>${fmt(y, 3)}</b>${uR(cur.u)}` }; });
    root._set = (k, t) => { cur = PRE[k]; st.k = k; st.t = t; sync(); render(); };
  }

  /* ------------------------------------------------------------------ shared widget helpers (new topics) */
  // Pull the per-preset .w-formula blocks (pre-rendered KaTeX) out of a widget mount; show one at a time.
  function formulaBox(root) {
    const forms = $$('.w-formula', root); forms.forEach(f => f.remove());
    const box = el('div', { class: 'w-formulas' });
    box.show = k => { box.replaceChildren(); if (forms[k]) box.appendChild(forms[k]); box.hidden = !forms[k]; };
    return box;
  }
  // Arrow drawn in screen space so the head keeps its size at any scale.
  function arrow(P, x1, y1, x2, y2, cls, layer) {
    const X1 = P.sx(x1), Y1 = P.sy(y1), X2 = P.sx(x2), Y2 = P.sy(y2);
    const g = svgEl('g', { class: 'arrow ' + (cls || '') }, layer || P.gTop);
    const L = Math.hypot(X2 - X1, Y2 - Y1);
    if (!(L > 1)) return g;
    const ux = (X2 - X1) / L, uy = (Y2 - Y1) / L, h = Math.min(10, L * 0.45);
    svgEl('line', { x1: X1, y1: Y1, x2: X2 - ux * h * 0.7, y2: Y2 - uy * h * 0.7 }, g);
    svgEl('polygon', { points: `${X2},${Y2} ${X2 - ux * h - uy * h * 0.5},${Y2 - uy * h + ux * h * 0.5} ${X2 - ux * h + uy * h * 0.5},${Y2 - uy * h - ux * h * 0.5}` }, g);
    return g;
  }
  // Curve that lifts the pen at vertical asymptotes.
  function segCurve(P, f, x0, x1, poles, cls) {
    const eps = (x1 - x0) * 0.003, cuts = [x0, ...poles.filter(p => p > x0 && p < x1).sort((a, b) => a - b), x1];
    for (let k = 0; k < cuts.length - 1; k++) { const a = cuts[k] + (k > 0 ? eps : 0), b = cuts[k + 1] - (k < cuts.length - 2 ? eps : 0); if (b > a) P.curve(f, a, b, cls, 320); }
  }
  function piTicks(a, b) {
    const out = [];
    for (let n = Math.ceil(a / (PI / 2) - 1e-9); n * PI / 2 <= b + 1e-9; n++) {
      const s = n < 0 ? '−' : '', m = Math.abs(n);
      out.push({ v: n * PI / 2, l: n === 0 ? '0' : m % 2 === 0 ? s + (m === 2 ? '' : m / 2) + 'π' : s + (m === 1 ? '' : m) + 'π/2' });
    }
    return out;
  }
  const numDeriv = (G, x) => { const h = 1e-5 * Math.max(1, Math.abs(x)); return (G(x + h) - G(x - h)) / (2 * h); };
  const simpsonN = (g, a, b, n = 400) => { const h = (b - a) / n; let s = g(a) + g(b); for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * g(a + i * h); return s * h / 3; };
  function checkToggle(text, checked, onChange) {
    const cb = el('input', { type: 'checkbox' }); cb.checked = checked;
    cb.addEventListener('change', () => onChange(cb.checked));
    const lb = el('label', { class: 'toggle inline-toggle' }, cb, el('span', { html: text }));
    lb.input = cb; return lb;
  }

  /* ------------------------------------------------------------------ tryouts: "try a choice and see what happens" */
  function initTryout(tr) {
    const opts = $$('.try-opt', tr), res = $$(':scope > .try-res', tr);
    res.forEach((r, k) => { r.hidden = true; r.insertAdjacentHTML('afterbegin', `<span class="try-lbl">${String.fromCharCode(65 + k)}</span>`); });
    opts.forEach((o, k) => {
      o.type = 'button'; o.setAttribute('aria-expanded', 'false');
      const body = el('span', { class: 'opt-body' });
      while (o.firstChild) body.appendChild(o.firstChild);
      o.append(el('span', { class: 'key', text: String.fromCharCode(65 + k) }), body);
      o.addEventListener('click', () => {
        const r = res[k]; if (!r) return;
        const open = r.hidden; r.hidden = !open;
        o.classList.toggle('on', open); o.setAttribute('aria-expanded', String(open));
        if (tr.dataset.topic) touched(tr.dataset.topic);
      });
    });
  }

  /* ================================================================== Widget U: antiderivative family & derivative check */
  function widgetAnti(root) {
    const fbox = formulaBox(root);
    const PRE = [
      { name: 'Notes p. 2: 10x⁹', v: 'x', f: x => 10 * x ** 9, F: x => x ** 10, a: -1.15, b: 1.15, x0: 0.8, cs: 1 },
      { name: 'Notes p. 2: 3 sin t − 5/(t² + 1)', v: 't', f: t => 3 * Math.sin(t) - 5 / (t * t + 1), F: t => -3 * Math.cos(t) - 5 * Math.atan(t), a: -2 * PI, b: 2 * PI, x0: 1.2, cs: 4, pi: true },
      { name: 'Notes p. 4: √(1 + ln x)/(3x)', v: 'x', f: x => Math.sqrt(1 + Math.log(x)) / (3 * x), F: x => (2 / 9) * Math.pow(1 + Math.log(x), 1.5), a: Math.exp(-1) + 1e-9, b: 5, x0: 2, cs: 0.4 },
      { name: 'Notes p. 5: 2t⁷ cos(t⁸ + 1)', v: 't', f: t => 2 * t ** 7 * Math.cos(t ** 8 + 1), F: t => 0.25 * Math.sin(t ** 8 + 1), a: -1.25, b: 1.25, x0: 0.9, cs: 0.3 },
      { name: 'Notes p. 6: x² e^(−x³)', v: 'x', f: x => x * x * Math.exp(-(x ** 3)), F: x => -Math.exp(-(x ** 3)) / 3, a: -0.9, b: 2.2, x0: 0.7, cs: 0.3 },
    ];
    let cur = PRE[0];
    const st = { k: 0, C: 0, x0: cur.x0, fam: true, user: null };
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.C = 0; st.x0 = p.x0; st.user = null; userIn.value = ''; userOut.innerHTML = ''; sync(); render(); touched('U'); });
    presets.mark(0);
    const sC = slider('C: which antiderivative', -2, 2, 0.01, 0, v => { st.C = v; render(); touched('U'); }, v => 'C = ' + fmtNum(v, 2));
    const sX = slider('tangent point', 0, 1, 0.001, 0, v => { st.x0 = v; render(); touched('U'); }, v => cur.v + '₀ = ' + fmtNum(v, 2));
    const fam = checkToggle('show five members of the family', true, v => { st.fam = v; render(); touched('U'); });
    const userIn = el('input', { type: 'text', class: 'w-input', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Your antiderivative' });
    const userBtn = el('button', { class: 'btn small', type: 'button', text: 'Check by differentiating' });
    const userLbl = el('div', { class: 'small', style: 'font-weight:600;margin-bottom:4px' });
    const userOut = el('div', { class: 'w-line', 'aria-live': 'polite' });
    const fHost = el('div'), dHost = el('div');
    const sSlope = stat('Slope of every member at the tangent point'), sH = stat('Height of the bold member there'), sGap = stat('Gap between neighboring members');
    sSlope.classList.add('hero');
    const line = el('div', { class: 'w-line' });
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    root.append(presets, fbox, el('div', { class: 'controls' }, sC, sX), fam, fHost,
      el('div', { class: 'legend' }, el('span', null, el('i', { class: 'ln', style: 'background:var(--s1);height:3px' }), 'F + C for your C'), el('span', null, el('i', { class: 'ln', style: 'background:var(--ink-2);opacity:.45' }), 'other members'), el('span', null, el('i', { class: 'ln', style: 'background:var(--s2)' }), 'tangent lines')),
      el('div', { class: 'w-sub', style: 'margin:10px 0 0', html: '<b>Below:</b> the integrand f. Its <em>height</em> at the tangent point is the <em>slope</em> of every member above.' }), dHost, line,
      el('div', { class: 'stats' }, sSlope, sH, sGap),
      el('div', { class: 'w-check' }, userLbl, el('div', { class: 'btn-row', style: 'margin:0' }, userIn, userBtn), userOut), prompt);
    const FP = new Plot(fHost, { W: 680, H: 260, aria: 'A family of antiderivatives F plus C, with parallel tangent lines at one point.' });
    const DP = new Plot(dHost, { W: 680, H: 200, pad: { l: 50, r: 20, t: 12, b: 36 }, aria: 'The integrand f. Its height is the slope of each antiderivative.' });
    function sync() {
      const { a, b, cs } = cur;
      sC.input.min = -2 * cs; sC.input.max = 2 * cs; sC.input.step = cs / 50; sC.set(st.C);
      sX.input.min = a; sX.input.max = b; sX.input.step = (b - a) / 500; sX.set(st.x0);
      userLbl.textContent = `Check your own antiderivative: type F(${cur.v}) and compare F′ with f.`;
      userIn.placeholder = cur.v === 'x' ? 'e.g. x^10 + C' : 'e.g. -3cos(t) - 5arctan(t)';
      fbox.show(st.k);
    }
    function render() {
      const { a, b, cs } = cur, x0 = st.x0, m = cur.f(x0), ticks = cur.pi ? piTicks(a, b) : undefined;
      let lo = Infinity, hi = -Infinity;
      for (let k = 0; k <= 300; k++) { const y = cur.F(a + (b - a) * k / 300); if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }
      const offs = st.fam ? [-2, -1, 0, 1, 2].map(k => k * cs) : [];
      const cLo = Math.min(st.C, ...offs), cHi = Math.max(st.C, ...offs), pad = (hi - lo + cHi - cLo) * 0.08 || 1;
      FP.setView({ xmin: a, xmax: b, ymin: lo + cLo - pad, ymax: hi + cHi + pad }); FP.clear();
      FP.axes({ xticks: ticks, xlabel: cur.v, ylabel: `F(${cur.v}) + C` });
      const dx = (b - a) * 0.075, others = offs.filter(C => Math.abs(C - st.C) > 1e-9);
      others.forEach(C => FP.curve(x => cur.F(x) + C, a, b, 'curve faint'));
      [...others, st.C].forEach(C => { const y0 = cur.F(x0) + C; FP.line(x0 - dx, y0 - m * dx, x0 + dx, y0 + m * dx, 'tangent'); });
      FP.curve(x => cur.F(x) + st.C, a, b, 'curve s1');
      FP.line(x0, FP.o.ymin, x0, FP.o.ymax, 'vline');
      others.forEach(C => FP.dot(x0, cur.F(x0) + C, 'dot s2', 3.5));
      FP.dot(x0, cur.F(x0) + st.C, 'dot s1', 5.5);
      // integrand
      let flo = Infinity, fhi = -Infinity;
      for (let k = 0; k <= 400; k++) { const y = cur.f(a + (b - a) * k / 400); if (isFinite(y)) { flo = Math.min(flo, y); fhi = Math.max(fhi, y); } }
      const fp = (fhi - flo) * 0.1 || 1;
      DP.setView({ xmin: a, xmax: b, ymin: Math.min(0, flo) - fp, ymax: Math.max(0, fhi) + fp }); DP.clear();
      DP.axes({ xticks: ticks, xlabel: cur.v, ylabel: `f(${cur.v})` });
      DP.curve(cur.f, a, b, 'curve', 500);
      if (st.user) DP.curve(x => numDeriv(st.user, x), a, b, 'curve s2 dash', 500);
      DP.line(x0, DP.o.ymin, x0, DP.o.ymax, 'vline');
      DP.line(x0, 0, x0, m, 'marker');
      DP.dot(x0, m, 'dot s1', 5.5);
      sSlope.set(fmt(m, 3), `f(${fmtNum(x0, 2)}), the height below`);
      sH.set(fmt(cur.F(x0) + st.C, 3), `F(${fmtNum(x0, 2)}) + C`);
      sGap.set(fmtNum(cs, 2), 'the same at every point: a vertical shift');
      line.innerHTML = `At ${cur.v} = ${fmtNum(x0, 2)} every member has slope <b>${fmt(m, 3)}</b>, so the tangent lines are parallel. Changing C slides a curve up or down without changing any slope, which is why an antiderivative always carries <b>+ C</b>.`;
      prompt.update();
      root._last = { slope: m, height: cur.F(x0) + st.C };
    }
    function runCheck() {
      const src = normMath(userIn.value).replace(/\+\s*c\s*$/, '').trim();
      if (!src) { st.user = null; userOut.innerHTML = ''; render(); return; }
      let G;
      try { const c = compileExpr(src, [cur.v]); G = x => c({ [cur.v]: x }); }
      catch (e) { st.user = null; userOut.innerHTML = `I couldn't read that. Write it in terms of ${cur.v}, for example ${cur.v === 'x' ? 'x^10 or -(1/3)e^(-x^3)' : '-3cos(t) - 5arctan(t)'}.`; render(); return; }
      st.user = G;
      const xs = []; for (let k = 1; k < 80; k++) xs.push(cur.a + (cur.b - cur.a) * k / 80);
      const rows = xs.map(x => [x, numDeriv(G, x), cur.f(x)]).filter(([, g, f]) => isFinite(g) && isFinite(f));
      if (rows.length < 30) userOut.innerHTML = '✗ Your F is undefined on much of this window. Check logs and square roots.';
      else if (rows.every(([, g, f]) => Math.abs(g - f) <= 1e-4 * (1 + Math.abs(f)))) userOut.innerHTML = '✓ <b>F′ matches f everywhere in the window.</b> The dashed curve sits exactly on f, so your F is an antiderivative. Any other one differs from it by a constant.';
      else {
        const rs = rows.filter(([, , f]) => Math.abs(f) > 1e-3).map(([, g, f]) => g / f), k0 = rs[0];
        if (rs.length > 5 && rs.every(r => Math.abs(r - k0) <= 1e-3 * Math.max(1, Math.abs(k0))) && Math.abs(k0 - 1) > 1e-3) userOut.innerHTML = Math.abs(k0 + 1) < 1e-3 ? '✗ Your F′ is exactly <b>−f</b>: the sign is flipped. Check the sign that comes from du.' : `✗ Your F′ is exactly <b>${fracStr(Math.round(k0 * 1e6) / 1e6)} × f</b>, so a constant factor is off. Fix the factor and check again.`;
        else { const bad = rows.find(([, g, f]) => Math.abs(g - f) > 1e-4 * (1 + Math.abs(f))); userOut.innerHTML = `✗ Not yet. At ${cur.v} = ${fmtNum(bad[0], 2)} your F′ is ${fmt(bad[1], 3)}, but f is ${fmt(bad[2], 3)}. The dashed curve shows where they part ways.`; }
      }
      render(); touched('U');
    }
    userBtn.addEventListener('click', runCheck);
    userIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); runCheck(); } });
    function tutorText() {
      const parts = [`I'm using the antiderivative explorer with the integrand from "${cur.name}". The tangent point is ${cur.v} = ${fmtNum(st.x0, 2)} and I chose C = ${fmtNum(st.C, 2)}.`];
      if (userIn.value.trim()) parts.push(`I tested my own antiderivative F = ${userIn.value.trim()}, and the checker said: ${userOut.textContent || '(not checked yet)'}`);
      parts.push('Ask me to explain why all the tangent lines are parallel and what + C means, before telling me anything.');
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    }
    sync(); render();
    DP.hover(x => { const y = cur.f(x), pts = [{ y, cls: 'ink' }]; let h = `${cur.v} = <b>${fmt(x, 3)}</b><br>f = <b>${fmt(y, 4)}</b>`; if (st.user) { const g = numDeriv(st.user, x); pts.push({ y: g, cls: 's2' }); h += `<br>your F′ = <b>${fmt(g, 4)}</b>`; } return { x, points: pts, html: h }; });
    root._set = (k, x0, C) => { presets.mark(k); cur = PRE[k]; st.k = k; st.x0 = x0; st.C = C || 0; sync(); render(); };
    root._check = s => { userIn.value = s; runCheck(); return userOut.textContent; };
  }

  /* ================================================================== Widget P: integration by parts as area */
  function widgetParts(root) {
    const fbox = formulaBox(root);
    const PRE = [
      { name: 'Notes p. 8: ∫x eˣ dx', xv: 'x', u: x => x, du: () => 1, v: Math.exp, dv: Math.exp, lo: 0, hi: 2, a: 0, b: 1 },
      { name: 'Notes p. 9: ∫x⁴ ln x dx', xv: 'x', u: Math.log, du: x => 1 / x, v: x => x ** 5 / 5, dv: x => x ** 4, lo: 1, hi: 2, a: 1, b: 1.6 },
      { name: 'Notes p. 10: ∫2p tan⁻¹p dp', xv: 'p', u: Math.atan, du: p => 1 / (1 + p * p), v: p => p * p, dv: p => 2 * p, lo: 0, hi: 2, a: 0, b: 1.5 },
      { name: 'Notes p. 11: ∫sin⁻¹x dx', xv: 'x', u: Math.asin, du: x => 1 / Math.sqrt(1 - x * x), v: x => x, dv: () => 1, lo: 0, hi: 0.95, a: 0, b: 0.8 },
    ];
    let cur = PRE[0];
    const st = { k: 0, a: cur.a, b: cur.b };
    const gap = () => (cur.hi - cur.lo) * 0.04;
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.a = p.a; st.b = p.b; sync(); render(); touched('P'); });
    presets.mark(0);
    const sa = slider('a (start)', 0, 1, 0.001, 0, v => { st.a = Math.min(v, st.b - gap()); if (st.a !== v) sa.set(st.a); render(); touched('P'); }, v => cur.xv + ' = ' + fmtNum(v, 2));
    const sb = slider('b (end)', 0, 1, 0.001, 1, v => { st.b = Math.max(v, st.a + gap()); if (st.b !== v) sb.set(st.b); render(); touched('P'); }, v => cur.xv + ' = ' + fmtNum(v, 2));
    const host = el('div');
    const s1 = stat('∫ v du <span class="k" style="background:var(--s1)"></span> under the curve'), s2 = stat('∫ u dv <span class="k" style="background:var(--s2)"></span> left of the curve'), s3 = stat('Their sum'), s4 = stat('[uv] from a to b');
    s4.classList.add('hero');
    const line = el('div', { class: 'w-line' });
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: the four numbers' }), el('div', { class: 'table-scroll' }, tbl));
    const prompt = promptBox('Ask your tutor about what you see', () => { const L = root._last || { vdu: 0, udv: 0, uv: 0 }; return `I'm using the integration-by-parts area picture for "${cur.name}" from ${cur.xv} = ${fmtNum(st.a, 2)} to ${fmtNum(st.b, 2)}. The blue region (∫v du) is ${fmt(L.vdu, 4)}, the orange region (∫u dv) is ${fmt(L.udv, 4)}, and u(b)v(b) − u(a)v(a) = ${fmt(L.uv, 4)}. Ask me why the two regions always fill the rectangle, and how that turns into ∫u dv = uv − ∫v du, before explaining. ${TUTOR_TAIL}`; });
    root.append(presets, fbox, el('div', { class: 'controls' }, sa, sb), host,
      el('div', { class: 'legend' }, el('span', null, el('i', { class: 'sw', style: 'background:var(--s1);opacity:.55' }), '∫ v du: vertical strips v·du'), el('span', null, el('i', { class: 'sw', style: 'background:var(--s2);opacity:.55' }), '∫ u dv: horizontal strips u·dv'), el('span', null, el('i', { class: 'sw', style: 'background:var(--surface-3);border:1px solid var(--axis)' }), 'u(a)v(a): the corner left out')),
      line, el('div', { class: 'stats' }, s1, s2, s3, s4), tview, prompt);
    const PP = new Plot(host, { W: 680, H: 340, aria: 'The curve (u, v) in the u-v plane. The region under it is the integral of v du and the region to its left is the integral of u dv.' });
    function sync() {
      [sa, sb].forEach(s => { s.input.min = cur.lo; s.input.max = cur.hi; s.input.step = (cur.hi - cur.lo) / 500; });
      sa.set(st.a); sb.set(st.b); fbox.show(st.k);
    }
    function render() {
      const { u, v, du, dv, lo, hi } = cur, a = st.a, b = st.b;
      const vdu = simpsonN(x => v(x) * du(x), a, b, 2000), udv = simpsonN(x => u(x) * dv(x), a, b, 2000), uv = u(b) * v(b) - u(a) * v(a);
      const umin = Math.min(0, u(lo)), vmin = Math.min(0, v(lo)), umax = u(hi), vmax = v(hi);
      PP.setView({ xmin: umin, xmax: umax + (umax - umin) * 0.08, ymin: vmin, ymax: vmax + (vmax - vmin) * 0.1 }); PP.clear();
      PP.axes({ xlabel: 'u', ylabel: 'v', nx: 6, ny: 5 });
      const pts = []; for (let k = 0; k <= 240; k++) { const x = a + (b - a) * k / 240; pts.push([u(x), v(x)]); }
      PP.poly([[u(a), 0], ...pts, [u(b), 0]], 'reg1');
      PP.poly([[0, v(a)], ...pts, [0, v(b)]], 'reg2');
      if (u(a) * v(a) > 1e-9) PP.poly([[0, 0], [u(a), 0], [u(a), v(a)], [0, v(a)]], 'reg0');
      PP.poly([[0, 0], [u(b), 0], [u(b), v(b)], [0, v(b)]], 'rect-outline');
      const full = []; for (let k = 0; k <= 240; k++) { const x = lo + (hi - lo) * k / 240; full.push([u(x), v(x)]); }
      svgEl('path', { class: 'curve faint', d: PP.d(full) }, PP.gData);
      svgEl('path', { class: 'curve', d: PP.d(pts) }, PP.gData);
      PP.dot(u(a), v(a), 'dot ink', 4); PP.dot(u(b), v(b), 'dot ink', 5);
      const xm = a + (b - a) * 0.62;
      PP.text(u(xm), v(xm) * 0.42, '∫ v du', 'dlbl');
      PP.text(u(xm) * 0.45, (v(xm) + v(b)) / 2, '∫ u dv', 'dlbl');
      PP.text(u(b), v(b), `(u(b), v(b))`, 'lbl', 'end', -10);
      s1.set(fmt(vdu, 4)); s2.set(fmt(udv, 4)); s3.set(fmt(vdu + udv, 4));
      s4.set(fmt(uv, 4), `${fmt(u(b), 3)}·${fmt(v(b), 3)} − ${fmt(u(a), 3)}·${fmt(v(a), 3)}`);
      line.innerHTML = `The two regions always fill the big rectangle minus the corner, so <b>∫u dv = [uv] − ∫v du</b>: ${fmt(udv, 4)} = ${fmt(uv, 4)} − ${fmt(vdu, 4)} ✓. Integration by parts trades the orange region for the blue one.`;
      tbl.innerHTML = '<thead><tr><th>quantity</th><th class="num">value</th></tr></thead>';
      const tb = el('tbody');
      [['∫ v du (blue region)', vdu], ['∫ u dv (orange region)', udv], ['sum of the two regions', vdu + udv], ['u(b)v(b) − u(a)v(a)', uv]].forEach(([n, x]) => tb.appendChild(el('tr', null, el('td', { text: n }), el('td', { class: 'num', text: fmt(x, 6) }))));
      tbl.appendChild(tb);
      root._last = { vdu, udv, uv };
      prompt.update();
    }
    const invU = U => { let l = cur.lo, h = cur.hi; for (let k = 0; k < 60; k++) { const m = (l + h) / 2; if (cur.u(m) < U) l = m; else h = m; } return (l + h) / 2; };
    sync(); render();
    PP.hover(U => { if (U < cur.u(cur.lo) || U > cur.u(cur.hi)) return null; const x = invU(U); return { x: U, points: [{ y: cur.v(x), cls: 'ink' }], html: `${cur.xv} = <b>${fmt(x, 3)}</b><br>u = <b>${fmt(cur.u(x), 3)}</b>, v = <b>${fmt(cur.v(x), 3)}</b>` }; });
    root._set = (k, a, b) => { presets.mark(k); cur = PRE[k]; st.k = k; st.a = a; st.b = b; sync(); render(); };
  }

  /* ================================================================== Widget R: partial fractions, the pieces add up */
  function widgetPF(root) {
    const fbox = formulaBox(root);
    const PRE = [
      { name: 'Notes p. 13: (x − 7)/(x² − 2x − 3)', f: x => (x - 7) / (x * x - 2 * x - 3), pcs: [['2/(x + 1)', x => 2 / (x + 1)], ['−1/(x − 3)', x => -1 / (x - 3)]], poles: [-1, 3], xr: [-4, 6], yr: 6 },
      { name: 'Notes p. 14: (5x + 5)/(x² − x − 6)', f: x => (5 * x + 5) / (x * x - x - 6), pcs: [['4/(x − 3)', x => 4 / (x - 3)], ['1/(x + 2)', x => 1 / (x + 2)]], poles: [-2, 3], xr: [-5, 6], yr: 8 },
      { name: 'Notes p. 15: repeated factor x(x + 2)²', f: x => (x * x - 3 * x - 8) / (x ** 3 + 4 * x * x + 4 * x), pcs: [['−2/x', x => -2 / x], ['3/(x + 2)', x => 3 / (x + 2)], ['−1/(x + 2)²', x => -1 / (x + 2) ** 2]], poles: [-2, 0], xr: [-5, 3], yr: 8 },
      { name: 'Notes p. 16: irreducible x² + 4', f: x => (x * x + 5 * x - 4) / (x ** 3 + 4 * x), pcs: [['−1/x', x => -1 / x], ['(2x + 5)/(x² + 4)', x => (2 * x + 5) / (x * x + 4)]], poles: [0], xr: [-6, 6], yr: 5 },
      { name: 'Notes p. 20: long division first', f: x => (-2 * x ** 3 + 4 * x * x + 6 * x - 2) / (x * x - 1), pcs: [['−2x + 4 (the quotient)', x => -2 * x + 4], ['1/(x + 1)', x => 1 / (x + 1)], ['3/(x − 1)', x => 3 / (x - 1)]], poles: [-1, 1], xr: [-4, 4], yr: 16 },
    ];
    let cur = PRE[0];
    const st = { k: 0, on: [true, true, true], sum: true };
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.on = [true, true, true]; syncToggles(); render(); touched('R'); });
    presets.mark(0);
    const togs = el('div', { class: 'toggle-row' });
    const host = el('div'), line = el('div', { class: 'w-line' });
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: f and the pieces at a few points' }), el('div', { class: 'table-scroll' }, tbl));
    const prompt = promptBox('Ask your tutor about what you see', () => `I'm using the partial-fractions explorer on "${cur.name}". Its pieces are ${cur.pcs.map(p => p[0]).join(', ')}. ${st.on.slice(0, cur.pcs.length).every(Boolean) ? 'With every piece switched on, the sum matches f.' : 'I switched off: ' + cur.pcs.filter((p, j) => !st.on[j]).map(p => p[0]).join(', ') + '.'} Ask me which factor of the denominator produces each piece and how I would find the coefficients by matching, before explaining. ${TUTOR_TAIL}`);
    const legend = el('div', { class: 'legend' });
    root.append(presets, fbox, togs, host, legend, line, tview, prompt);
    const PP = new Plot(host, { W: 680, H: 330, aria: 'A rational function and the simple fractions it splits into.' });
    const sumOf = x => cur.pcs.reduce((s, [, g], j) => s + (st.on[j] ? g(x) : 0), 0);
    function syncToggles() {
      togs.replaceChildren();
      cur.pcs.forEach(([lab], j) => togs.appendChild(checkToggle(`<i class="sw-line s${j + 1}"></i>${lab}`, st.on[j], v => { st.on[j] = v; render(); touched('R'); })));
      togs.appendChild(checkToggle('<i class="sw-line sum"></i>sum of the checked pieces', st.sum, v => { st.sum = v; render(); touched('R'); }));
      legend.replaceChildren(el('span', null, el('i', { class: 'ln', style: 'background:var(--axis);height:6px' }), 'f, the original fraction (wide gray)'), ...cur.pcs.map(([lab], j) => el('span', null, el('i', { class: 'ln', style: `background:var(--s${j + 1})` }), lab)), el('span', null, el('i', { class: 'ln dashed-ln' }), 'sum of the checked pieces'));
      fbox.show(st.k);
    }
    function render() {
      const [x0, x1] = cur.xr, yr = cur.yr;
      PP.setView({ xmin: x0, xmax: x1, ymin: -yr, ymax: yr }); PP.clear();
      PP.axes({ xlabel: 'x', ylabel: 'y', nx: 10, ny: 6 });
      cur.poles.forEach(p => { PP.line(p, -yr, p, yr, 'vline'); PP.text(p, yr, 'x = ' + tickLabel(p), 'lbl', 'middle', 14); });
      segCurve(PP, cur.f, x0, x1, cur.poles, 'curve thick');
      cur.pcs.forEach(([, g], j) => { if (st.on[j]) segCurve(PP, g, x0, x1, cur.poles, 'curve s' + (j + 1)); });
      if (st.sum) segCurve(PP, sumOf, x0, x1, cur.poles, 'curve sum');
      const allOn = cur.pcs.every((p, j) => st.on[j]);
      const xs = []; for (let k = 1; k < 60; k++) { const x = x0 + (x1 - x0) * k / 60; if (cur.poles.every(p => Math.abs(x - p) > 0.05)) xs.push(x); }
      const match = xs.every(x => Math.abs(sumOf(x) - cur.f(x)) <= 1e-9 * (1 + Math.abs(cur.f(x))));
      line.innerHTML = allOn && match ? '✓ <b>The pieces add up to f exactly</b>: the dashed sum lies on the wide gray curve everywhere. A decomposition is an identity, not an approximation. Near each asymptote, one piece does all the blowing up.' : '✗ With a piece switched off, the dashed sum no longer matches f. Every term in the template is needed.';
      tbl.innerHTML = `<thead><tr><th>x</th><th class="num">f(x)</th>${cur.pcs.map(p => `<th class="num">${p[0]}</th>`).join('')}<th class="num">sum</th></tr></thead>`;
      const tb = el('tbody');
      [x0 + (x1 - x0) * 0.13, x0 + (x1 - x0) * 0.41, x0 + (x1 - x0) * 0.69, x0 + (x1 - x0) * 0.93].forEach(x => { const all = cur.pcs.reduce((s, [, g]) => s + g(x), 0); tb.appendChild(el('tr', null, el('td', { text: fmtNum(x, 2) }), el('td', { class: 'num', text: fmt(cur.f(x), 4) }), ...cur.pcs.map(([, g]) => el('td', { class: 'num', text: fmt(g(x), 4) })), el('td', { class: 'num', text: fmt(all, 4) }))); });
      tbl.appendChild(tb);
      root._last = { match: allOn && match };
      prompt.update();
    }
    syncToggles(); render();
    PP.hover(x => { if (cur.poles.some(p => Math.abs(x - p) < (cur.xr[1] - cur.xr[0]) * 0.004)) return null; const y = cur.f(x); return { x, points: [{ y, cls: 'ink' }, ...cur.pcs.map(([, g], j) => (st.on[j] ? { y: g(x), cls: 's' + (j + 1) } : null)).filter(Boolean)], html: `x = <b>${fmt(x, 3)}</b><br>f = <b>${fmt(y, 4)}</b><br>${cur.pcs.map(([lab, g]) => `${lab}: ${fmt(g(x), 4)}`).join('<br>')}<br>sum = <b>${fmt(cur.pcs.reduce((s, [, g]) => s + g(x), 0), 4)}</b>` }; });
    root._set = (k, on) => { presets.mark(k); cur = PRE[k]; st.k = k; st.on = on || [true, true, true]; syncToggles(); render(); };
  }

  /* ================================================================== Widget E: path explorer (2D and 3D motion) */
  function widgetPath(root) {
    const fbox = formulaBox(root);
    const PRE = [
      { name: 'Notes p. 6: helix', d: 3, a: 0, b: 2 * PI, p: t => [Math.cos(4 * t), Math.sin(4 * t), 3 * t], v: t => [-4 * Math.sin(4 * t), 4 * Math.cos(4 * t), 3], dist: t => 5 * t, ticks: true },
      { name: 'Notes p. 7: (12t, 8t^(3/2), 3t²)', d: 3, a: 0, b: 1, u: 'ft', p: t => [12 * t, 8 * t ** 1.5, 3 * t * t], v: t => [12, 12 * Math.sqrt(t), 6 * t], dist: t => 3 * t * t + 12 * t },
      { name: 'Notes p. 7: v = (3t², t, 0)', d: 2, a: 0, b: 3, p: t => [t ** 3, t * t / 2, 0], v: t => [3 * t * t, t, 0], dist: t => (Math.pow(9 * t * t + 1, 1.5) - 1) / 27 },
      { name: 'Textbook Ex. 3.3.7: semicircle, fast ends', d: 2, a: -1, b: 1, p: t => [t, Math.sqrt(Math.max(0, 1 - t * t)), 0], v: t => [1, -t / Math.sqrt(1 - t * t), 0], dist: t => Math.asin(clamp(t, -1, 1)) + PI / 2, smax: 6 },
      { name: 'Textbook Ex. 3.3.8: semicircle, steady', d: 2, a: 0, b: PI, p: t => [-Math.cos(t), Math.sin(t), 0], v: t => [Math.sin(t), Math.cos(t), 0], dist: t => t, ticks: true },
      { name: '1D inside 2D: back and forth on a line', d: 2, a: 0, b: 3, p: t => { const s = t * t - 2 * t; return [0.6 * s, 0.8 * s, 0]; }, v: t => { const w = 2 * t - 2; return [0.6 * w, 0.8 * w, 0]; }, dist: t => (t <= 1 ? 2 * t - t * t : 1 + (t - 1) ** 2) },
      // 3.3–3.5 notes p. 1: v = (t + 3, √(2t), √7); p is the antiderivative with p(0) = 0; |v| = t + 4, so distance from t = 1 is t²/2 + 4t − 9/2
      { name: '3.3–3.5 notes p. 1: v = (t + 3, √(2t), √7)', d: 3, a: 1, b: 5, u: 'm', p: t => [t * t / 2 + 3 * t, (2 * Math.SQRT2 / 3) * Math.pow(t, 1.5), Math.sqrt(7) * t], v: t => [t + 3, Math.sqrt(2 * t), Math.sqrt(7)], dist: t => t * t / 2 + 4 * t - 4.5 },
    ];
    let cur = PRE[0];
    const st = { k: 0, t: cur.a, playing: false, phi: 35 };
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.t = p.a; st.playing = false; playBtn.textContent = '▶ Play'; sync(); render(); touched('E'); });
    presets.mark(0);
    const stime = slider('time t', 0, 1, 0.001, 0, v => { st.t = v; st.playing = false; playBtn.textContent = '▶ Play'; render(); touched('E'); }, v => 't = ' + fmtNum(v, 3));
    const srot = slider('turn the 3D view', 0, 360, 1, st.phi, v => { st.phi = v; render(); touched('E'); }, v => v + '°');
    const playBtn = el('button', { class: 'btn small', type: 'button', text: '▶ Play' });
    const resetBtn = el('button', { class: 'btn ghost small', type: 'button', text: 'Reset' });
    const pHost = el('div'), sHost = el('div'), note = el('div', { class: 'small muted' });
    const sV = stat('Velocity <b>v</b>(t)'), sSp = stat('Speed |<b>v</b>(t)|'), sDisp = stat('Displacement so far'), sDist = stat('Distance so far'), sGap = stat('Distance − |displacement|');
    sDist.classList.add('hero'); sDisp.classList.add('hero');
    const line = el('div', { class: 'w-line' });
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: the whole trip' }), el('div', { class: 'table-scroll' }, tbl));
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    root.append(presets, fbox, el('div', { class: 'controls' }, stime, srot, el('div', { class: 'ctrl btn-row', style: 'margin:0' }, playBtn, resetBtn)), pHost, note,
      el('div', { class: 'legend' }, el('span', null, el('i', { class: 'ln', style: 'background:var(--s1);height:3px' }), 'path so far'), el('span', null, el('i', { class: 'ln', style: 'background:var(--s2);height:3px' }), el('span', { html: 'velocity <b>v</b> (tangent to the path)' })), el('span', null, el('i', { class: 'ln dashed-ln' }), 'displacement: start → now')),
      el('div', { class: 'w-sub', style: 'margin:12px 0 0', html: '<b>Below:</b> the speed |<b>v</b>(t)|. The shaded area up to now is the distance traveled so far.' }), sHost, line,
      el('div', { class: 'stats' }, sV, sSp, sDisp, sDist, sGap), tview, prompt);
    const PP = new Plot(pHost, { W: 680, H: 330, aria: 'The path of the particle, with its velocity arrow and the displacement arrow from the start.' });
    const SP = new Plot(sHost, { W: 680, H: 190, pad: { l: 50, r: 20, t: 14, b: 36 }, aria: 'Speed versus time; the shaded area is the distance traveled so far.' });
    const speed = t => { const w = cur.v(t); return Math.hypot(w[0], w[1], w[2]); };
    let box = null;   // 3D normalization box
    function sync() {
      stime.input.min = cur.a; stime.input.max = cur.b; stime.input.step = (cur.b - cur.a) / 1000; stime.set(st.t);
      srot.hidden = cur.d !== 3;
      if (cur.d === 3) {
        const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
        for (let k = 0; k <= 400; k++) { const q = cur.p(cur.a + (cur.b - cur.a) * k / 400); for (let j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], q[j]); mx[j] = Math.max(mx[j], q[j]); } }
        box = { c: mn.map((m, j) => (m + mx[j]) / 2), h: mn.map((m, j) => Math.max(1e-6, (mx[j] - m) / 2)), mn, mx };
        note.textContent = `3D view, turned by the slider. Each axis is scaled separately to fit the box (x from ${fmtNum(mn[0], 2)} to ${fmtNum(mx[0], 2)}, y from ${fmtNum(mn[1], 2)} to ${fmtNum(mx[1], 2)}, z from ${fmtNum(mn[2], 2)} to ${fmtNum(mx[2], 2)}), so read lengths from the numbers, not the picture.`;
      } else { box = null; note.textContent = 'The xy-plane, drawn to scale.'; }
      fbox.show(st.k);
    }
    const E = 22 * PI / 180;
    function proj(q) {           // world point -> view coordinates
      if (cur.d !== 3) return [q[0], q[1]];
      const n = q.map((x, j) => (x - box.c[j]) / box.h[j]), f = st.phi * PI / 180;
      return [n[0] * Math.cos(f) - n[1] * Math.sin(f), n[2] * Math.cos(E) + (n[0] * Math.sin(f) + n[1] * Math.cos(f)) * Math.sin(E)];
    }
    function projDir(w) {        // world direction -> view direction
      if (cur.d !== 3) return [w[0], w[1]];
      const n = w.map((x, j) => x / box.h[j]), f = st.phi * PI / 180;
      return [n[0] * Math.cos(f) - n[1] * Math.sin(f), n[2] * Math.cos(E) + (n[0] * Math.sin(f) + n[1] * Math.cos(f)) * Math.sin(E)];
    }
    function render() {
      const t = st.t, { a, b } = cur;
      // ---- path view
      const path = []; for (let k = 0; k <= 400; k++) path.push(proj(cur.p(a + (b - a) * k / 400)));
      let pts = cur.d === 3 ? [[-1, -1, -1], [1, -1, -1], [-1, 1, -1], [1, 1, -1], [-1, -1, 1], [1, -1, 1], [-1, 1, 1], [1, 1, 1]].map(n => proj(n.map((x, j) => box.c[j] + x * box.h[j]))) : path;
      let xmn = Math.min(...pts.map(p => p[0])), xmx = Math.max(...pts.map(p => p[0])), ymn = Math.min(...pts.map(p => p[1])), ymx = Math.max(...pts.map(p => p[1]));
      const pd = Math.max(xmx - xmn, ymx - ymn) * 0.1 || 1; xmn -= pd; xmx += pd; ymn -= pd; ymx += pd;
      const pad = cur.d === 3 ? { l: 16, r: 16, t: 14, b: 14 } : { l: 44, r: 16, t: 14, b: 34 };
      PP.setView({ pad });
      const iw = PP.iw, ih = PP.ih, want = iw / ih;                 // equal scale on both screen axes
      if ((xmx - xmn) / (ymx - ymn) < want) { const c = (xmn + xmx) / 2, h = (ymx - ymn) * want / 2; xmn = c - h; xmx = c + h; }
      else { const c = (ymn + ymx) / 2, h = (xmx - xmn) / want / 2; ymn = c - h; ymx = c + h; }
      PP.setView({ xmin: xmn, xmax: xmx, ymin: ymn, ymax: ymx }); PP.clear();
      if (cur.d === 3) {
        PP.gGrid.replaceChildren(); PP.gAxis.replaceChildren();
        const corner = n => proj(n.map((x, j) => box.c[j] + x * box.h[j]));
        [[[-1, -1, -1], [1, -1, -1], 'x'], [[-1, -1, -1], [-1, 1, -1], 'y'], [[-1, -1, -1], [-1, -1, 1], 'z']].forEach(([p0, p1, lab]) => { const A = corner(p0), B = corner(p1); arrow(PP, A[0], A[1], B[0], B[1], 'axis3', PP.gData); PP.text(B[0], B[1], lab, 'lbl', 'middle', -6); });
        [[[1, -1, -1], [1, 1, -1]], [[-1, 1, -1], [1, 1, -1]], [[1, 1, -1], [1, 1, 1]], [[-1, -1, 1], [1, -1, 1]], [[-1, -1, 1], [-1, 1, 1]], [[1, -1, 1], [1, 1, 1]], [[-1, 1, 1], [1, 1, 1]], [[1, -1, -1], [1, -1, 1]], [[-1, 1, -1], [-1, 1, 1]]].forEach(([p0, p1]) => { const A = corner(p0), B = corner(p1); PP.line(A[0], A[1], B[0], B[1], 'box3'); });
      } else PP.axes({ xlabel: 'x', ylabel: 'y', nx: 7, ny: 5 });
      svgEl('path', { class: 'curve faint', d: PP.d(path) }, PP.gData);
      const done = []; for (let k = 0; k <= 300; k++) done.push(proj(cur.p(a + (t - a) * k / 300)));
      svgEl('path', { class: 'trail', d: PP.d(done) }, PP.gData);
      const P0 = proj(cur.p(a)), Pt = proj(cur.p(t));
      PP.dot(P0[0], P0[1], 'dot ink', 4.5); PP.text(P0[0], P0[1], 'start', 'lbl', 'middle', 18);
      arrow(PP, P0[0], P0[1], Pt[0], Pt[1], 'disp');
      let vmax = 0; for (let k = 0; k <= 200; k++) { const w = projDir(cur.v(a + (b - a) * (k + 0.5) / 201)); const L = Math.hypot(w[0], w[1]); if (isFinite(L)) vmax = Math.max(vmax, L); }
      if (cur.smax) vmax = Math.min(vmax, cur.smax);
      const w = projDir(cur.v(t)), Lw = Math.hypot(w[0], w[1]), span = Math.max(xmx - xmn, ymx - ymn);
      if (isFinite(Lw) && Lw > 1e-12) { const s = Math.min(span * 0.22 * Lw / (vmax || 1), span * 0.22) / Lw; arrow(PP, Pt[0], Pt[1], Pt[0] + w[0] * s, Pt[1] + w[1] * s, 'vel'); }
      else if (!isFinite(Lw)) PP.text(Pt[0], Pt[1], 'speed → ∞', 'lbl', 'middle', -12);
      PP.dot(Pt[0], Pt[1], 'dot s1', 6.5);
      // ---- speed view
      let smx = 0; for (let k = 0; k <= 400; k++) { const s = speed(a + (b - a) * k / 400); if (isFinite(s)) smx = Math.max(smx, s); }
      const top = cur.smax || smx * 1.3 || 1;
      SP.setView({ xmin: a, xmax: b, ymin: 0, ymax: top }); SP.clear();
      SP.axes({ xticks: cur.ticks ? piTicks(a, b) : undefined, xlabel: 't', ylabel: 'speed', ny: 4 });
      if (t > a) SP.area(speed, a, t, { n: 600 });
      SP.curve(speed, a, b, 'curve', 600);
      SP.line(t, 0, t, top, 'marker');
      // ---- numbers
      const q0 = cur.p(a), qt = cur.p(t), vt = cur.v(t), n = cur.d === 3 ? 3 : 2, uL = cur.u ? ' ' + cur.u : '';
      const disp = qt.map((x, j) => x - q0[j]), len = Math.hypot(...disp), dist = cur.dist(t), sp = speed(t);
      const vec = arr => '(' + arr.slice(0, n).map(x => fmt(x, 2)).join(', ') + ')';
      sV.set(isFinite(sp) ? vec(vt) : '(1, ∓∞)', `at t = ${fmtNum(t, 3)}`);
      sSp.set(isFinite(sp) ? fmt(sp, 3) : '∞', 'a number, never negative');
      sDisp.set(vec(disp), `a vector · length ${fmt(len, 3)}${uL}`);
      sDist.set(fmt(dist, 3) + uL, '∫ speed dt so far · never shrinks');
      sGap.set(fmt(Math.max(0, dist - len), 3) + uL, dist - len < 1e-6 ? 'equal so far' : 'the path curved or turned back');
      line.innerHTML = `|displacement| = <b>${fmt(len, 3)}</b> ≤ distance = <b>${fmt(dist, 3)}</b>. ` + (dist - len < 1e-6 ? 'They are equal so far: the particle has moved in one straight direction.' : 'Distance is bigger because the path curved or doubled back. The displacement arrow takes the shortcut.');
      const qb = cur.p(b), db = qb.map((x, j) => x - q0[j]);
      tbl.innerHTML = '<thead><tr><th>whole trip, t from ' + fmtNum(a, 3) + ' to ' + fmtNum(b, 3) + '</th><th class="num">value</th></tr></thead>';
      const tb = el('tbody');
      [['displacement p(b) − p(a)', vec(db)], ['length of the displacement', fmt(Math.hypot(...db), 4)], ['distance traveled ∫ speed dt', fmt(cur.dist(b), 4)]].forEach(([k, x]) => tb.appendChild(el('tr', null, el('td', { text: k }), el('td', { class: 'num', text: x }))));
      tbl.appendChild(tb);
      root._last = { disp, len, dist, sp };
      prompt.update();
    }
    let lastTs = 0;
    function loop(ts) {
      if (!st.playing) return;
      const dt = lastTs ? (ts - lastTs) / 1000 : 0; lastTs = ts;
      st.t = Math.min(cur.b, st.t + dt * (cur.b - cur.a) / 9);
      stime.set(st.t); render();
      if (st.t >= cur.b) { st.playing = false; playBtn.textContent = '▶ Play'; return; }
      requestAnimationFrame(loop);
    }
    playBtn.addEventListener('click', () => {
      touched('E');
      if (st.playing) { st.playing = false; playBtn.textContent = '▶ Play'; return; }
      if (st.t >= cur.b - 1e-9) st.t = cur.a;
      st.playing = true; playBtn.textContent = '❚❚ Pause'; lastTs = 0; requestAnimationFrame(loop);
    });
    resetBtn.addEventListener('click', () => { st.playing = false; playBtn.textContent = '▶ Play'; st.t = cur.a; stime.set(st.t); render(); });
    function tutorText() {
      const L = root._last || {};
      return `I'm using the path explorer with "${cur.name}", paused at t = ${fmtNum(st.t, 3)}. So far the displacement has length ${fmt(L.len || 0, 3)} and the distance traveled is ${fmt(L.dist || 0, 3)}. Ask me why the displacement is a vector but the distance is a number, and why |displacement| ≤ distance, before explaining. ${TUTOR_TAIL}`;
    }
    sync(); render();
    SP.hover(x => { const s = speed(x); return { x, points: [{ y: Math.min(s, SP.o.ymax), cls: 's1' }], html: `t = <b>${fmt(x, 3)}</b><br>speed = <b>${isFinite(s) ? fmt(s, 3) : '∞'}</b>` }; });
    root._set = (k, t) => { presets.mark(k); cur = PRE[k]; st.k = k; st.t = t; sync(); render(); };
  }

  /* ================================================================== Widget L: arc length explorer (chords → integral) */
  function widgetArc(root) {
    const fbox = formulaBox(root);
    const PRE = [
      { name: '3.3–3.5 notes p. 3: g(x) = (2/3)(x + 4)^(3/2)', kind: 'graph', a: 4, b: 11, f: x => (2 / 3) * Math.pow(x + 4, 1.5), df: x => Math.sqrt(x + 4), exact: 74 / 3, exactTxt: '74/3 (notes p. 3)' },
      { name: '3.3–3.5 notes p. 3: semicircle (cos t, sin t)', kind: 'param', a: 0, b: PI, X: Math.cos, Y: Math.sin, dX: t => -Math.sin(t), dY: Math.cos, exact: PI, exactTxt: 'π (notes p. 3)', ticks: true },
      { name: '3.3–3.5 notes p. 4: y = sin x on [0, 2π]', kind: 'graph', a: 0, b: 2 * PI, f: Math.sin, df: Math.cos, exact: 7.640395578055424, exactTxt: '≈ 7.640396 (no elementary antiderivative)', ticks: true, n0: 4, over0: 'trap' },
      { name: 'Textbook Ex. 3.3.15: y = (2/3)x^(3/2)', kind: 'graph', a: 0, b: 8, f: x => (2 / 3) * Math.pow(x, 1.5), df: x => Math.sqrt(x), exact: 52 / 3, exactTxt: '52/3' },
      { name: 'Textbook Suggested Ex. 7: y = x³/12 + 1/x', kind: 'graph', a: 1, b: 2, f: x => x ** 3 / 12 + 1 / x, df: x => x * x / 4 - 1 / (x * x), exact: 13 / 12, exactTxt: '13/12' },
      { name: 'Circle traced twice: 0 ≤ t ≤ 4π', kind: 'param', a: 0, b: 4 * PI, X: Math.cos, Y: Math.sin, dX: t => -Math.sin(t), dY: Math.cos, exact: 4 * PI, exactTxt: '4π: the distance traveled', ticks: true, curveLen: 2 * PI },
    ];
    let cur = PRE[0];
    const st = { k: 0, n: 4, piece: 1, over: 'bars' };
    const P = u => (cur.kind === 'graph' ? [u, cur.f(u)] : [cur.X(u), cur.Y(u)]);
    const g = u => (cur.kind === 'graph' ? Math.sqrt(1 + cur.df(u) ** 2) : Math.hypot(cur.dX(u), cur.dY(u)));   // speed of the particle tracing the curve
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.n = p.n0 || 4; st.over = p.over0 || 'bars'; st.piece = 1; sync(); render(); touched('L'); });
    presets.mark(0);
    const sn = slider('n (number of chords)', 1, 48, 1, st.n, v => { st.n = v; st.piece = Math.min(st.piece, v); presets.mark(st.k); sync(); render(); touched('L'); }, v => 'n = ' + v);
    const sk = slider('highlighted piece', 1, 4, 1, 1, v => { st.piece = v; render(); touched('L'); }, v => 'piece ' + v);
    const overSeg = seg([['bars', 'Chord bars'], ['trap', 'Trapezoid Rule']], st.over, v => { st.over = v; render(); touched('L'); });
    const cHost = el('div'), iHost = el('div');
    const note = el('div', { class: 'notice warn', hidden: true });
    const bsub = el('div', { class: 'w-sub', style: 'margin:12px 0 0' });
    const sPoly = stat('Polygon: n chords'), sTrap = stat('Trapezoid Rule T<sub>n</sub>'), sExact = stat('Arc length (the integral)'), sGap = stat('Arc length − polygon');
    sPoly.classList.add('hero'); sExact.classList.add('hero');
    const line = el('div', { class: 'w-line' });
    const tbl = el('table', { class: 'data-table' });
    const tview = el('details', { class: 'more' }, el('summary', { text: 'Table view: every chord' }), el('div', { class: 'table-scroll' }, tbl));
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    const legend = el('div', { class: 'legend' },
      el('span', null, el('i', { class: 'ln', style: 'background:var(--ink);height:3px' }), 'the curve'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s1);height:3px' }), 'polygon of n chords'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s2);height:3px' }), 'highlighted chord, with its legs Δx and Δy'));
    root.append(presets, fbox, el('div', { class: 'controls' }, sn, sk, el('div', { class: 'ctrl' }, el('label', null, el('span', { text: 'Bottom graph shows' })), overSeg)), note, cHost, legend, bsub, iHost, line,
      el('div', { class: 'stats' }, sPoly, sTrap, sExact, sGap), tview, prompt);
    const CP = new Plot(cHost, { W: 680, H: 300, aria: 'The curve with an inscribed polygon of chords. One chord is highlighted with its horizontal and vertical legs.' });
    const IP = new Plot(iHost, { W: 680, H: 210, pad: { l: 50, r: 20, t: 14, b: 36 }, aria: 'The arc-length integrand. The shaded area under it is the arc length; bars or trapezoids show an approximation.' });
    function nodes(n) { const out = []; for (let i = 0; i <= n; i++) { const u = cur.a + (cur.b - cur.a) * i / n; out.push({ u, p: P(u) }); } return out; }
    function polyLen(n) { const q = nodes(n); let L = 0; for (let i = 1; i <= n; i++) L += Math.hypot(q[i].p[0] - q[i - 1].p[0], q[i].p[1] - q[i - 1].p[1]); return L; }
    function trap(n) { const h = (cur.b - cur.a) / n; let s = g(cur.a) + g(cur.b); for (let i = 1; i < n; i++) s += 2 * g(cur.a + i * h); return s * h / 2; }
    function sync() { sn.set(st.n); sk.input.max = st.n; st.piece = Math.min(st.piece, st.n); sk.set(st.piece); overSeg.set(st.over); fbox.show(st.k); }
    function render() {
      const n = st.n, k = st.piece, q = nodes(n), du = (cur.b - cur.a) / n, G = cur.kind === 'graph';
      // ---- curve view (equal scale on both axes, so chord lengths are honest)
      const pts = []; for (let i = 0; i <= 400; i++) pts.push(P(cur.a + (cur.b - cur.a) * i / 400));
      let xmn = Math.min(...pts.map(p => p[0])), xmx = Math.max(...pts.map(p => p[0])), ymn = Math.min(...pts.map(p => p[1])), ymx = Math.max(...pts.map(p => p[1]));
      const pd = Math.max(xmx - xmn, ymx - ymn) * 0.08 || 1; xmn -= pd; xmx += pd; ymn -= pd; ymx += pd;
      CP.setView({ pad: { l: 46, r: 16, t: 14, b: 34 } });
      const want = CP.iw / CP.ih;
      if ((xmx - xmn) / (ymx - ymn) < want) { const c = (xmn + xmx) / 2, h = (ymx - ymn) * want / 2; xmn = c - h; xmx = c + h; }
      else { const c = (ymn + ymx) / 2, h = (xmx - xmn) / want / 2; ymn = c - h; ymx = c + h; }
      CP.setView({ xmin: xmn, xmax: xmx, ymin: ymn, ymax: ymx }); CP.clear();
      CP.axes({ xlabel: 'x', ylabel: 'y', nx: 7, ny: 5 });
      svgEl('path', { class: 'curve', d: CP.d(pts) }, CP.gData);
      svgEl('path', { class: 'chord', d: CP.d(q.map(o => o.p)) }, CP.gData);
      const A = q[k - 1].p, B = q[k].p, dxs = B[0] - A[0], dys = B[1] - A[1], chord = Math.hypot(dxs, dys);
      CP.line(A[0], A[1], B[0], A[1], 'leg'); CP.line(B[0], A[1], B[0], B[1], 'leg'); CP.line(A[0], A[1], B[0], B[1], 'hyp');
      const nudge = (xmx - xmn) * 0.012;
      if (Math.abs(CP.sx(B[0]) - CP.sx(A[0])) > 24) CP.text((A[0] + B[0]) / 2, A[1], 'Δx', 'lbl', 'middle', dys >= 0 ? 15 : -7);
      if (Math.abs(CP.sy(B[1]) - CP.sy(A[1])) > 18) CP.text(B[0] + (dxs >= 0 ? nudge : -nudge), (A[1] + B[1]) / 2, 'Δy', 'lbl', dxs >= 0 ? 'start' : 'end', 4);
      q.forEach(o => CP.dot(o.p[0], o.p[1], 'dot s1', n > 24 ? 2.5 : 3.5));
      CP.dot(pts[0][0], pts[0][1], 'dot ink', 4.5); CP.text(pts[0][0], pts[0][1], 'start', 'lbl', 'middle', 18);
      // ---- integrand view
      let gm = 0; for (let i = 0; i <= 400; i++) { const v = g(cur.a + (cur.b - cur.a) * i / 400); if (isFinite(v)) gm = Math.max(gm, v); }
      const bars = []; for (let i = 1; i <= n; i++) bars.push(Math.hypot(q[i].p[0] - q[i - 1].p[0], q[i].p[1] - q[i - 1].p[1]) / du);
      const top = Math.max(gm, ...bars) * 1.18;
      IP.setView({ xmin: cur.a, xmax: cur.b, ymin: 0, ymax: top }); IP.clear();
      IP.axes({ xticks: cur.ticks ? piTicks(cur.a, cur.b) : undefined, xlabel: G ? 'x' : 't', ylabel: G ? '√(1 + f′(x)²)' : 'speed', ny: 4 });
      IP.area(g, cur.a, cur.b, { n: 600 });
      if (st.over === 'bars') bars.forEach((h, i) => { const u0 = cur.a + i * du; IP.poly([[u0, 0], [u0, h], [u0 + du, h], [u0 + du, 0]], 'shape m' + (i === k - 1 ? ' hi' : '')); });
      else for (let i = 0; i < n; i++) { const u0 = cur.a + i * du, u1 = u0 + du; IP.poly([[u0, 0], [u0, g(u0)], [u1, g(u1)], [u1, 0]], 'shape t'); }
      if (G) { IP.line(cur.a, 1, cur.b, 1, 'one-line'); IP.text(cur.b, 1, 'height 1', 'lbl', 'end', -5); }
      IP.curve(g, cur.a, cur.b, 'curve', 600);
      bsub.innerHTML = (G ? '<b>Below:</b> the integrand √(1 + f′(x)²), never below 1. ' : '<b>Below:</b> the speed √(x′(t)² + y′(t)²). ') + (st.over === 'bars' ? 'Each bar is one chord’s length ÷ its width, so the bars’ total area is the polygon’s length.' : 'Trapezoids: the Trapezoid Rule applied to the integral (notes p. 36), as on 3.3–3.5 notes p. 4.');
      // ---- numbers
      const L = polyLen(n), T = trap(n), E = cur.exact, um = cur.a + (k - 0.5) * du;
      sPoly.set(fmt(L, 5), n === 1 ? 'n = 1: the straight chord' : `${n} chords`);
      sTrap.set(fmt(T, 5), `on the integrand, n = ${n}`);
      sExact.set(fmt(E, 5), cur.exactTxt);
      sGap.set(fmt(E - L, 5), 'never negative; shrinks as n grows');
      line.innerHTML = G
        ? `Piece ${k}: Δx = <b>${fmt(dxs, 4)}</b>, Δy = <b>${fmt(dys, 4)}</b>, so the chord is √(Δx² + Δy²) = <b>${fmt(chord, 4)}</b>. Its bar height is chord ÷ Δx = <b>${fmt(chord / du, 4)}</b>. At the middle of the piece, √(1 + f′(x)²) = <b>${fmt(g(um), 4)}</b>.`
        : `Piece ${k}: Δt = <b>${fmt(du, 4)}</b>, Δx = <b>${fmt(dxs, 4)}</b>, Δy = <b>${fmt(dys, 4)}</b>, so the chord is <b>${fmt(chord, 4)}</b>. Chord ÷ Δt = <b>${fmt(chord / du, 4)}</b>; the speed at the middle of the piece is <b>${fmt(g(um), 4)}</b>.`;
      note.hidden = !cur.curveLen;
      if (cur.curveLen) note.innerHTML = `<b>This parametrization goes around twice.</b> The integral, 4π ≈ ${fmt(E, 4)}, is the distance the particle travels. The circle itself is only 2π ≈ ${fmt(cur.curveLen, 4)} long. Arc length needs a parametrization that traces the curve once, like the notes' semicircle.`;
      tbl.innerHTML = `<thead><tr><th>piece</th>${G ? '' : '<th class="num">Δt</th>'}<th class="num">Δx</th><th class="num">Δy</th><th class="num">chord √(Δx² + Δy²)</th><th class="num">running total</th></tr></thead>`;
      const tb = el('tbody'); let run = 0;
      for (let i = 1; i <= n; i++) { const a0 = q[i - 1].p, b0 = q[i].p, c0 = Math.hypot(b0[0] - a0[0], b0[1] - a0[1]); run += c0; tb.appendChild(el('tr', null, el('td', { text: String(i) }), G ? null : el('td', { class: 'num', text: fmt(du, 4) }), el('td', { class: 'num', text: fmt(b0[0] - a0[0], 4) }), el('td', { class: 'num', text: fmt(b0[1] - a0[1], 4) }), el('td', { class: 'num', text: fmt(c0, 5) }), el('td', { class: 'num', text: fmt(run, 5) }))); }
      tbl.appendChild(tb);
      root._last = { poly: L, trap: T, exact: E, chord1: polyLen(1), piece: { dx: dxs, dy: dys, len: chord } };
      prompt.update();
    }
    function tutorText() {
      const Ls = root._last || {};
      return `I'm using the arc length explorer with "${cur.name}" and n = ${st.n}. The polygon of ${st.n} chords has length ${fmt(Ls.poly || 0, 5)}, the Trapezoid Rule on the integrand gives ${fmt(Ls.trap || 0, 5)}, and the arc length is ${fmt(cur.exact, 5)}. Ask me why the polygon is always a little shorter than the curve, and where ${cur.kind === 'graph' ? '√(1 + f′(x)²)' : 'the speed √(x′(t)² + y′(t)²)'} comes from, before explaining anything. ${TUTOR_TAIL}`;
    }
    sync(); render();
    IP.hover(u => { const v = g(u); return { x: u, points: [{ y: v, cls: 'ink' }], html: `${cur.kind === 'graph' ? 'x' : 't'} = <b>${fmt(u, 3)}</b><br>${cur.kind === 'graph' ? '√(1 + f′²)' : 'speed'} = <b>${fmt(v, 4)}</b>` }; });
    root._set = (k, n, piece, over) => { cur = PRE[k]; st.k = k; st.n = n; st.piece = piece || 1; st.over = over || 'bars'; presets.mark(k); sync(); render(); };
  }

  /* ================================================================== Widget V: volume by slicing (disks & washers) */
  // Oblique view of a solid of revolution: each slab is a short cylinder whose circular faces appear as ellipses.
  const KAPPA = 0.3;
  function slabRadii(sp, c, s) { const a = Math.abs(sp.up(s) - c), b = Math.abs(sp.lo(s) - c); return [Math.max(a, b), Math.min(a, b)]; }
  function drawSolid(P, sp, c, n) {
    const ds = (sp.b - sp.a) / n, kx = P.iw / (P.o.xmax - P.o.xmin), ky = P.ih / (P.o.ymax - P.o.ymin);
    const ell = (cx, cy, rx, ry, cls) => svgEl('ellipse', { class: cls, cx: P.sx(cx), cy: P.sy(cy), rx: Math.max(0.2, rx * kx), ry: Math.max(0.2, ry * ky) }, P.gData);
    for (let i = 1; i <= n; i++) {
      const s0 = sp.a + (i - 1) * ds, s1 = sp.a + i * ds, [R, r] = slabRadii(sp, c, s1);   // right endpoint, as on 3.3–3.5 notes p. 5
      if (sp.ax === 'h') {        // axis horizontal, viewer slightly to the right: draw left to right
        ell(s0, c, R * KAPPA, R, 'slab-back');
        P.poly([[s0, c - R], [s1, c - R], [s1, c + R], [s0, c + R]], 'slab-band');
        P.line(s0, c + R, s1, c + R, 'slab-edge'); P.line(s0, c - R, s1, c - R, 'slab-edge');
        ell(s1, c, R * KAPPA, R, 'slab-face');
        if (r > 1e-9) ell(s1, c, r * KAPPA, r, 'slab-hole');
      } else {                    // axis vertical, viewer slightly above: draw bottom to top
        ell(c, s0, R, R * KAPPA, 'slab-back');
        P.poly([[c - R, s0], [c + R, s0], [c + R, s1], [c - R, s1]], 'slab-band');
        P.line(c - R, s0, c - R, s1, 'slab-edge'); P.line(c + R, s0, c + R, s1, 'slab-edge');
        ell(c, s1, R, R * KAPPA, 'slab-face');
        if (r > 1e-9) ell(c, s1, r, r * KAPPA, 'slab-hole');
      }
    }
  }
  // Fit a view around a list of points with equal scale on both screen axes.
  function fitEqual(P, pts, padFrac) {
    let xmn = Math.min(...pts.map(p => p[0])), xmx = Math.max(...pts.map(p => p[0])), ymn = Math.min(...pts.map(p => p[1])), ymx = Math.max(...pts.map(p => p[1]));
    const pd = Math.max(xmx - xmn, ymx - ymn) * (padFrac || 0.08) || 1; xmn -= pd; xmx += pd; ymn -= pd; ymx += pd;
    const want = P.iw / P.ih;
    if ((xmx - xmn) / (ymx - ymn) < want) { const c = (xmn + xmx) / 2, h = (ymx - ymn) * want / 2; xmn = c - h; xmx = c + h; }
    else { const c = (ymn + ymx) / 2, h = (xmx - xmn) / want / 2; ymn = c - h; ymx = c + h; }
    P.setView({ xmin: xmn, xmax: xmx, ymin: ymn, ymax: ymx });
  }
  function widgetVolume(root) {
    const fbox = formulaBox(root);
    // Slicing variable s in [a, b]. The region's cross-section at s is the segment between lo(s) and up(s):
    // y-values for a horizontal axis y = c, x-values for a vertical axis x = c. With I1 = ∫(up − lo) ds and I2 = ∫(up² − lo²) ds,
    // V(c) = π|I2 − 2c·I1| for any axis outside the region. The tests check this against direct quadrature of π(R² − r²).
    const PRE = [
      { name: '3.3–3.5 notes p. 6: y = 2x, y = 0, x = 2', ax: 'h', c: 0, a: 0, b: 2, up: x => 2 * x, lo: x => 0, upT: '2x', loT: '0', I1: 4, I2: 32 / 3 },
      { name: '3.3–3.5 notes p. 7: between y = 2x and y = x', ax: 'h', c: 0, a: 0, b: 2, up: x => 2 * x, lo: x => x, upT: '2x', loT: 'x', I1: 2, I2: 8 },
      { name: 'Textbook Ex. 3.5.7: y = x² on [0, 2]', ax: 'h', c: 0, a: 0, b: 2, up: x => x * x, lo: x => 0, upT: 'x²', loT: '0', I1: 8 / 3, I2: 32 / 5 },
      { name: 'Textbook Ex. 3.5.8: between y = x and y = x²', ax: 'h', c: 0, a: 0, b: 1, up: x => x, lo: x => x * x, upT: 'x', loT: 'x²', I1: 1 / 6, I2: 2 / 15 },
      { name: 'Textbook Ex. 3.5.9: same region, axis y = 2', ax: 'h', c: 2, a: 0, b: 1, up: x => x, lo: x => x * x, upT: 'x', loT: 'x²', I1: 1 / 6, I2: 2 / 15 },
      { name: 'Textbook Ex. 3.5.10: same region, the y-axis', ax: 'v', c: 0, a: 0, b: 1, up: y => Math.sqrt(y), lo: y => y, upT: '√y', loT: 'y', I1: 1 / 6, I2: 1 / 6 },
    ];
    let cur = PRE[0];
    const st = { k: 0, c: 0, n: 6, s: 1.2 };
    const ext = sp => { let m = Infinity, M = -Infinity; for (let i = 0; i <= 400; i++) { const s = sp.a + (sp.b - sp.a) * i / 400; m = Math.min(m, sp.lo(s)); M = Math.max(M, sp.up(s)); } return [m, M]; };
    const valid = () => { const [m, M] = ext(cur); return st.c <= m + 1e-9 || st.c >= M - 1e-9; };
    const exactV = () => PI * Math.abs(cur.I2 - 2 * st.c * cur.I1);
    const Aof = s => { const [R, r] = slabRadii(cur, st.c, s); return PI * (R * R - r * r); };
    const fracPi = v => { const w = v / PI; for (let q = 1; q <= 240; q++) { const p = Math.round(w * q); if (Math.abs(w * q - p) < 1e-9) return p === 0 ? '0' : (q === 1 ? (p === 1 ? 'π' : p + 'π') : (p === 1 ? '' : p) + 'π/' + q); } return null; };
    const numT = v => fmtNum(v, 2);
    const presets = presetRow(PRE, (p, k) => { cur = p; st.k = k; st.c = p.c; st.s = p.a + 0.6 * (p.b - p.a); sync(); render(); touched('V'); });
    presets.mark(0);
    const sc = slider('axis position', -3, 7, 0.5, 0, v => { st.c = v; presets.mark(st.c === cur.c ? st.k : -1); render(); touched('V'); }, v => (cur.ax === 'h' ? 'y = ' : 'x = ') + fmtNum(v, 1));
    const sn = slider('n (number of slabs)', 1, 40, 1, st.n, v => { st.n = v; render(); touched('V'); }, v => 'n = ' + v);
    const ss = slider('slice position', 0, 1, 0.005, st.s, v => { st.s = v; render(); touched('V'); }, v => (cur.ax === 'h' ? 'x = ' : 'y = ') + fmtNum(v, 2));
    const rHost = el('div'), sHost = el('div'), aHost = el('div');
    const warn = el('div', { class: 'notice warn', hidden: true });
    const custom = el('div', { class: 'w-line', hidden: true });
    const status = el('div', { class: 'status-line' });
    const sR = stat('R: to the far edge'), sr = stat('r: to the near edge'), sA = stat('Slice area π(R² − r²)'), sSum = stat('Stack of n slabs'), sV = stat('Exact volume');
    sV.classList.add('hero'); sSum.classList.add('hero');
    const prompt = promptBox('Ask your tutor about what you see', () => tutorText());
    const legend = el('div', { class: 'legend' },
      el('span', null, el('i', { class: 'sw', style: 'background:var(--s1);opacity:.35' }), 'the region'),
      el('span', null, el('i', { class: 'ln dashed-ln' }), 'axis of rotation'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s2);height:3px' }), 'R (far edge)'),
      el('span', null, el('i', { class: 'ln', style: 'background:var(--s3);height:3px' }), 'r (near edge)'));
    root.append(presets, fbox, custom, el('div', { class: 'controls' }, sc, sn, ss), warn,
      el('div', { class: 'grid-2' }, el('div', null, el('div', { class: 'small muted', text: 'The region and one slice' }), rHost), el('div', null, el('div', { class: 'small muted', text: 'The solid as a stack of n slabs (oblique view)' }), sHost)),
      legend, status, el('div', { class: 'w-sub', style: 'margin:12px 0 0', html: '<b>Below:</b> the slice area A = π(R² − r²) along the axis. Bars: the n slabs, each A(right endpoint) × thickness, as on notes p. 5. The shaded area is the exact volume.' }), aHost,
      el('div', { class: 'stats' }, sR, sr, sA, sSum, sV), prompt);
    const RP = new Plot(rHost, { W: 420, H: 300, pad: { l: 36, r: 12, t: 12, b: 30 }, aria: 'The flat region, the axis of rotation, and one slice with its outer radius R and inner radius r.' });
    const SP = new Plot(sHost, { W: 420, H: 300, pad: { l: 12, r: 12, t: 12, b: 12 }, aria: 'The solid of revolution drawn as a stack of disks or washers.' });
    const AP = new Plot(aHost, { W: 680, H: 210, pad: { l: 50, r: 20, t: 14, b: 36 }, aria: 'The slice area as a function of position; the area under it is the volume.' });
    function minus(A, B) {   // text for A − B, where A and B are expression strings or numbers
      const isN = v => typeof v === 'number';
      if ((isN(B) && Math.abs(B) < 1e-12) || B === '0') return isN(A) ? numT(A) : A;
      if (A === '0') return isN(B) ? numT(-B) : '−' + B;
      if (isN(B)) return B < 0 ? `${A} + ${numT(-B)}` : `${A} − ${numT(B)}`;
      if (isN(A)) return `${numT(A)} − ${B}`;
      return `${A} − ${B}`;
    }
    function sync() {
      const [m, M] = ext(cur);
      sc.input.min = Math.floor(m - 3); sc.input.max = Math.ceil(M + 3); sc.set(st.c);
      $('label span', sc).textContent = cur.ax === 'h' ? 'axis: the line y = …' : 'axis: the line x = …';
      ss.input.min = cur.a; ss.input.max = cur.b; ss.input.step = (cur.b - cur.a) / 200; ss.set(st.s);
      $('label span', ss).textContent = cur.ax === 'h' ? 'slice position (x)' : 'slice position (y)';
      sn.set(st.n);
    }
    function render() {
      const ok = valid(), H = cur.ax === 'h', s = st.s, n = st.n, v = H ? 'x' : 'y';
      const at = w => (H ? [s, w] : [w, s]);           // a point on the slice line at "height" w (y for H, x for V)
      // ---- region view
      const N = 160, regP = [], mirP = [];
      for (let i = 0; i <= N; i++) { const t = cur.a + (cur.b - cur.a) * i / N; regP.push(H ? [t, cur.up(t)] : [cur.up(t), t]); }
      for (let i = N; i >= 0; i--) { const t = cur.a + (cur.b - cur.a) * i / N; regP.push(H ? [t, cur.lo(t)] : [cur.lo(t), t]); }
      regP.forEach(([x, y]) => mirP.push(H ? [x, 2 * st.c - y] : [2 * st.c - x, y]));
      const axisPts = H ? [[cur.a, st.c], [cur.b, st.c]] : [[st.c, cur.a], [st.c, cur.b]];
      // the region view needn't be to scale (only the solid view is), so let it fill the plot
      const allP = [...regP, ...(ok ? mirP : []), ...axisPts, [0, 0]];
      let xmn = Math.min(...allP.map(p => p[0])), xmx = Math.max(...allP.map(p => p[0])), ymn = Math.min(...allP.map(p => p[1])), ymx = Math.max(...allP.map(p => p[1]));
      const px = (xmx - xmn) * 0.08 || 0.5, py = (ymx - ymn) * 0.08 || 0.5;
      RP.setView({ xmin: xmn - px, xmax: xmx + px, ymin: ymn - py, ymax: ymx + py }); RP.clear();
      RP.axes({ xlabel: 'x', ylabel: 'y', nx: 5, ny: 5 });
      if (ok) RP.poly(mirP, 'reg-mirror');
      RP.poly(regP, 'reg1');
      if (H) RP.line(RP.o.xmin, st.c, RP.o.xmax, st.c, 'axis-rot'); else RP.line(st.c, RP.o.ymin, st.c, RP.o.ymax, 'axis-rot');
      const lo = cur.lo(s), up = cur.up(s);
      const [p0, p1] = [at(lo), at(up)];
      RP.line(p0[0], p0[1], p1[0], p1[1], 'hyp');
      let R = NaN, r = NaN;
      if (ok) {
        [R, r] = slabRadii(cur, st.c, s);
        const far = Math.abs(up - st.c) >= Math.abs(lo - st.c) ? up : lo, near = far === up ? lo : up;
        const off = (H ? RP.o.xmax - RP.o.xmin : RP.o.ymax - RP.o.ymin) * 0.018;
        const shift = (pt, d) => (H ? [pt[0] + d, pt[1]] : [pt[0], pt[1] + d]);
        const c0 = at(st.c);
        const a1 = shift(c0, off), a2 = shift(at(far), off);
        arrow(RP, a1[0], a1[1], a2[0], a2[1], 'rad-R');
        RP.text((a1[0] + a2[0]) / 2 + (H ? off * 1.2 : 0), (a1[1] + a2[1]) / 2 + (H ? 0 : off * 1.2), 'R', 'lbl', H ? 'start' : 'middle', H ? 4 : -4);
        if (r > 1e-9) { const b1 = shift(c0, -off), b2 = shift(at(near), -off); arrow(RP, b1[0], b1[1], b2[0], b2[1], 'rad-r'); RP.text((b1[0] + b2[0]) / 2 - (H ? off * 1.2 : 0), (b1[1] + b2[1]) / 2 - (H ? 0 : off * 1.2), 'r', 'lbl', H ? 'end' : 'middle', H ? 4 : 14); }
      }
      RP.text(H ? RP.o.xmax : st.c, H ? st.c : RP.o.ymax, H ? `axis y = ${numT(st.c)}` : `axis x = ${numT(st.c)}`, 'dlbl', H ? 'end' : 'middle', H ? -6 : 14);
      // ---- solid view
      SP.clear(); SP.gGrid.replaceChildren(); SP.gAxis.replaceChildren();
      if (ok) {
        let Rm = 0; for (let i = 0; i <= 200; i++) Rm = Math.max(Rm, slabRadii(cur, st.c, cur.a + (cur.b - cur.a) * i / 200)[0]);
        const box = H ? [[cur.a - Rm * KAPPA, st.c - Rm], [cur.b + Rm * KAPPA, st.c + Rm]] : [[st.c - Rm, cur.a - Rm * KAPPA], [st.c + Rm, cur.b + Rm * KAPPA]];
        fitEqual(SP, box, 0.05);
        drawSolid(SP, cur, st.c, n);
        if (H) SP.line(SP.o.xmin, st.c, SP.o.xmax, st.c, 'axis-rot'); else SP.line(st.c, SP.o.ymin, st.c, SP.o.ymax, 'axis-rot');
      } else { SP.setView({ xmin: 0, xmax: 1, ymin: 0, ymax: 1 }); SP.text(0.5, 0.5, 'no solid: the axis cuts the region', 'lbl', 'middle'); }
      // ---- slice-area view
      const ds = (cur.b - cur.a) / n;
      let sum = 0; const bars = [];
      if (ok) for (let i = 1; i <= n; i++) { const Ai = Aof(cur.a + i * ds); bars.push(Ai); sum += Ai * ds; }
      let Am = 0; if (ok) for (let i = 0; i <= 300; i++) Am = Math.max(Am, Aof(cur.a + (cur.b - cur.a) * i / 300));
      AP.setView({ xmin: cur.a, xmax: cur.b, ymin: 0, ymax: ok ? Math.max(Am, ...bars) * 1.15 : 1 }); AP.clear();
      AP.axes({ xlabel: v, ylabel: `A(${v})`, ny: 4 });
      if (ok) {
        bars.forEach((h, i) => { const u0 = cur.a + i * ds; AP.poly([[u0, 0], [u0, h], [u0 + ds, h], [u0 + ds, 0]], 'shape m'); });
        AP.area(Aof, cur.a, cur.b, { n: 400 });
        AP.curve(Aof, cur.a, cur.b, 'curve', 400);
        AP.line(s, 0, s, AP.o.ymax, 'marker'); AP.dot(s, Aof(s), 'dot s2', 5);
      }
      // ---- numbers and text
      warn.hidden = ok;
      if (!ok) { const [m, M] = ext(cur); warn.innerHTML = `<b>The axis cuts through the region.</b> Then a slice would sit on both sides of the axis, and it would not sweep out a washer. Move the axis to ${H ? 'y' : 'x'} ≤ ${numT(m)} or ${H ? 'y' : 'x'} ≥ ${numT(M)} (below or above the region${H ? '' : ', to its left or right'}).`; }
      const E = ok ? exactV() : NaN, isDefault = st.c === cur.c;
      fbox.hidden = !isDefault; if (isDefault) fbox.show(st.k);
      custom.hidden = isDefault || !ok;
      if (!isDefault && ok) {
        const [m] = ext(cur), below = st.c <= m + 1e-9;
        const Rt = below ? minus(cur.upT, st.c) : minus(st.c, cur.loT), rt = below ? minus(cur.loT, st.c) : minus(st.c, cur.upT);
        custom.innerHTML = `Axis <b>${H ? 'y' : 'x'} = ${numT(st.c)}</b> (${below ? (H ? 'below' : 'left of') : (H ? 'above' : 'right of')} the region): R = <b>${Rt}</b>, r = <b>${rt === '0' ? '0 (a disk)' : rt}</b>, so V = π∫(R² − r²) d${v} = <b>${fracPi(E) || fmt(E, 4)}</b> ≈ ${fmt(E, 4)}.`;
      }
      sR.set(ok ? fmt(R, 4) : '—', ok ? `at ${v} = ${fmtNum(s, 3)}` : '');
      sr.set(ok ? fmt(r, 4) : '—', ok ? (r < 1e-9 ? 'r = 0: a disk' : 'a washer (hole)') : '');
      sA.set(ok ? fmt(PI * (R * R - r * r), 4) : '—', ok ? 'the face of that slice' : '');
      sSum.set(ok ? fmt(sum, 5) : '—', ok ? `Σ A(${v}ᵢ)Δ${v}, right endpoints, n = ${n}` : '');
      sV.set(ok ? fmt(E, 5) : '—', ok ? `= ${fracPi(E) || '…'}` : 'undefined for this axis');
      status.innerHTML = !ok ? '' : r < 1e-9 ? `<span>● <b>Disk</b> at this slice: the region reaches the axis, so there is no hole (r = 0).</span>` : `<span>◎ <b>Washer</b> at this slice: a gap of ${fmt(r, 3)} between the axis and the region makes a hole.</span>`;
      root._last = { valid: ok, R, r, A: ok ? PI * (R * R - r * r) : NaN, sum: ok ? sum : NaN, exact: E };
      prompt.update();
    }
    function tutorText() {
      const Lr = root._last || {};
      const ax = (cur.ax === 'h' ? 'y = ' : 'x = ') + numT(st.c);
      return Lr.valid
        ? `I'm using the volume explorer with "${cur.name}", spun about the line ${ax}, with n = ${st.n} slabs. At my slice R = ${fmt(Lr.R, 3)} and r = ${fmt(Lr.r, 3)}; the stack of slabs gives ${fmt(Lr.sum, 4)} and the exact volume is ${fmt(Lr.exact, 4)}. Ask me how to find R and r for this axis, and why a washer's area is π(R² − r²), before explaining anything. ${TUTOR_TAIL}`
        : `I'm using the volume explorer with "${cur.name}" and I put the axis at ${ax}, inside the region. Ask me why an axis through the region doesn't give washers. ${TUTOR_TAIL}`;
    }
    st.s = cur.a + 0.6 * (cur.b - cur.a);
    sync(); render();
    AP.hover(x => { if (!valid()) return null; const Ax = Aof(x); return { x, points: [{ y: Ax, cls: 'ink' }], html: `${cur.ax === 'h' ? 'x' : 'y'} = <b>${fmt(x, 3)}</b><br>A = <b>${fmt(Ax, 4)}</b>` }; });
    root._set = (k, c, n, s) => { cur = PRE[k]; st.k = k; st.c = c === undefined ? cur.c : c; st.n = n || 6; st.s = s === undefined ? cur.a + 0.6 * (cur.b - cur.a) : s; presets.mark(st.c === cur.c ? k : -1); sync(); render(); };
  }

  /* ================================================================== concept map */
  function conceptMap(root) {
    const N = [
      // prerequisites for finding antiderivatives (left)
      { id: 'pd', x: 85, y: 50, w: 150, label: 'Derivative rules', pre: true, href: '#U-understand', desc: 'Every antiderivative rule is a derivative rule read backwards (notes p. 1).' },
      { id: 'pc', x: 85, y: 120, w: 150, label: 'Chain rule', pre: true, href: '#U-understand', desc: 'd/dx f(g(x)) = f′(g(x))·g′(x). Substitution runs it backwards (notes p. 3).' },
      { id: 'pp', x: 85, y: 190, w: 150, label: 'Product rule', pre: true, href: '#P-understand', desc: '(fg)′ = fg′ + gf′. Integrating both sides gives integration by parts (notes p. 7).' },
      { id: 'pa', x: 85, y: 260, w: 150, label: 'Factoring & division', pre: true, href: '#R-understand', desc: 'Factor the denominator; divide first when deg P ≥ deg Q (notes pp. 13, 19).' },
      // techniques (§1.1, §1.3)
      { id: 'u0', x: 265, y: 50, w: 180, label: 'Antiderivatives & +C', href: '#U-learn', desc: 'F′ = f. Antiderivatives come in families F + C (§1.1, notes pp. 1–2).' },
      { id: 'u1', x: 265, y: 120, w: 180, label: 'u-substitution', href: '#U-understand', desc: 'Undo the chain rule: u = the inner function, du = u′ dx (§1.1, notes pp. 3–6).' },
      { id: 'pb', x: 265, y: 190, w: 180, label: 'Integration by parts', href: '#P-learn', desc: '∫u dv = uv − ∫v du, with LIATE to choose u (§1.1, notes pp. 7–12).' },
      { id: 'r', x: 265, y: 260, w: 180, label: 'Partial fractions', href: '#R-learn', desc: 'Split P/Q into simple fractions, then integrate each piece (§1.3, notes pp. 13–20).' },
      // the FTC and what it gives directly (center)
      { id: 'a2', x: 500, y: 50, w: 190, label: 'Definite substitution', href: '#A-understand', desc: 'Change the limits to u-values and never convert back (§2.4, notes p. 26).' },
      { id: 'hub', x: 500, y: 155, w: 196, label: 'FTC: ∫ₐᵇ f = F(b) − F(a)', hub: true, href: '#A-learn', desc: 'The Fundamental Theorem of Calculus (§2.4, notes p. 25). An antiderivative from §1.1 or §1.3 turns into a definite integral.' },
      { id: 'a1', x: 500, y: 260, w: 190, label: 'Net vs total area', href: '#A-explore', desc: '∫f is net (signed) area; ∫|f| is total area. Split where f changes sign (§2.4).' },
      // when the FTC's conditions fail, and motion (right)
      { id: 'b', x: 715, y: 50, w: 170, label: 'Improper integrals', href: '#B-learn', desc: 'An infinite limit or a blow-up: replace the problem by a variable and take a limit. Split at each problem point (§2.5).' },
      { id: 'c', x: 715, y: 125, w: 170, label: 'Numerical rules', href: '#C-learn', desc: 'No usable antiderivative: Midpoint, Trapezoid, Simpson (§2.6).' },
      { id: 'd', x: 715, y: 200, w: 170, label: 'Displacement & distance', href: '#D-learn', desc: '∫v dt = displacement (net); ∫|v| dt = distance. Split where v = 0 (§3.1).' },
      { id: 'e', x: 715, y: 275, w: 170, label: 'Motion in 2D & 3D', href: '#E-learn', desc: 'Vectors: displacement ∫v dt is a vector; distance ∫|v| dt is a number (§3.3).' },
      // prerequisites for the applications (far right)
      { id: 'p3', x: 895, y: 50, w: 150, label: 'Limits: ∞, one-sided', pre: true, href: '#B-understand', desc: 'lim as b → ∞, and one-sided limits. Needed for improper integrals.' },
      { id: 'p2', x: 895, y: 125, w: 150, label: 'Riemann sums', pre: true, href: '#C-understand', desc: 'Area as a sum of thin strips f(x)Δx (notes p. 34), the idea behind the numerical rules.' },
      { id: 'p4', x: 895, y: 200, w: 150, label: 'v = p′ (rates)', pre: true, href: '#D-understand', desc: 'Velocity is the derivative of position; its sign is the direction of motion.' },
      { id: 'pv', x: 895, y: 275, w: 150, label: 'Vectors & length', pre: true, href: '#E-understand', desc: 'A vector has components and a length √(x² + y² + z²) (new notes p. 4).' },
      // geometric applications (bottom right)
      { id: 'l', x: 715, y: 350, w: 170, label: 'Arc length', href: '#L-learn', desc: 'The length of a curve is the distance a particle travels along it: ∫√(x′² + y′²) dt, or ∫√(1 + f′²) dx for a graph (§3.3, 3.3–3.5 notes pp. 2–4).' },
      { id: 'v', x: 715, y: 425, w: 170, label: 'Volume: disks & washers', href: '#V-learn', desc: 'Slice perpendicular to the axis: V = ∫A(x) dx, and for a solid of revolution A = π(R² − r²) (§3.5, 3.3–3.5 notes pp. 5–7).' },
      { id: 'pl', x: 895, y: 350, w: 150, label: 'Pythagoras: ds', pre: true, href: '#L-understand', desc: 'A tiny piece of curve is a hypotenuse: (ds)² = (dx)² + (dy)² (textbook Figure 3.14).' },
      { id: 'pw', x: 895, y: 425, w: 150, label: 'Area of a disk, πr²', pre: true, href: '#V-understand', desc: 'A washer is a big disk minus a hole: π(R² − r²), not π(R − r)².' },
    ];
    const E = [['pd', 'u0', 'pre'], ['pc', 'u1', 'pre'], ['pp', 'pb', 'pre'], ['pa', 'r', 'pre'], ['p3', 'b', 'pre'], ['p2', 'c', 'pre'], ['p4', 'd', 'pre'], ['pv', 'e', 'pre'], ['pl', 'l', 'pre'], ['pw', 'v', 'pre'],
      ['u0', 'hub'], ['u1', 'hub'], ['pb', 'hub'], ['r', 'hub'], ['u1', 'a2'], ['hub', 'a2'], ['hub', 'a1'], ['hub', 'b'], ['hub', 'c'], ['hub', 'd'], ['d', 'e'], ['e', 'l'], ['hub', 'v']];
    const LV = ['fuzzy', 'know', 'unknown'];
    const LVtxt = { know: '● I know this', fuzzy: '◐ Fuzzy', unknown: '○ Not yet' };
    N.forEach(n => { if (!S.concept[n.id]) S.concept[n.id] = 'fuzzy'; });
    const W = 980, H = 470;
    const svg = svgEl('svg', { viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': 'Concept map of the topics in this guide. Click a concept to mark how well you know it.' });
    const byId = Object.fromEntries(N.map(n => [n.id, n]));
    const gE = svgEl('g', null, svg), gN = svgEl('g', null, svg);
    E.forEach(([a, b, kind]) => {
      const A = byId[a], B = byId[b];
      let d;
      if (Math.abs(A.x - B.x) < 30) {           // stacked: connect bottom/top edges
        const down = B.y > A.y, y1 = A.y + (down ? 20 : -20), y2 = B.y + (down ? -20 : 20);
        d = `M${A.x},${y1} L${B.x},${y2}`;
      } else {
        const right = B.x > A.x, x1 = A.x + (right ? A.w / 2 : -A.w / 2), x2 = B.x + (right ? -B.w / 2 : B.w / 2);
        d = `M${x1},${A.y} C${(x1 + x2) / 2},${A.y} ${(x1 + x2) / 2},${B.y} ${x2},${B.y}`;
      }
      svgEl('path', { class: 'edge' + (kind === 'pre' ? ' prereq' : ''), d }, gE);
    });
    // the recurring move: split where something changes (§2.4 net vs total ↔ §3.1 distance)
    const a1 = byId.a1, dd = byId.d;
    svgEl('path', { class: 'edge link', d: `M${a1.x + a1.w / 2},${a1.y + 8} C${a1.x + a1.w / 2 + 60},${a1.y + 8} ${dd.x - 30},${dd.y + 40} ${dd.x - 10},${dd.y + 20}` }, gE);
    const lt = svgEl('text', { class: 'edge-lbl', x: 612, y: 303, 'text-anchor': 'middle' }, gE);
    lt.textContent = 'the same split idea';
    const nodeEls = {};
    N.forEach(n => {
      const g = svgEl('g', { class: 'node' + (n.hub ? ' hub' : '') + (n.pre ? ' pre' : ''), tabindex: 0, role: 'button', 'aria-label': n.label }, gN);
      svgEl('rect', { x: n.x - n.w / 2, y: n.y - 20, width: n.w, height: 40, rx: 11 }, g);
      const t1 = svgEl('text', { x: n.x, y: n.y - 2, 'text-anchor': 'middle' }, g); t1.textContent = n.label;
      const t2 = svgEl('text', { class: 'lv', x: n.x, y: n.y + 13, 'text-anchor': 'middle' }, g);
      const tt = svgEl('title', null, g); tt.textContent = n.desc + ' (click to change how well you know it)';
      const cycle = () => { S.concept[n.id] = LV[(LV.indexOf(S.concept[n.id]) + 1) % 3]; paint(); save(); };
      g.addEventListener('click', cycle);
      g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycle(); } });
      nodeEls[n.id] = { g, t2 };
    });
    const list = el('div', { class: 'klist' });
    N.forEach(n => {
      const b = el('button', { type: 'button' });
      b.addEventListener('click', () => { S.concept[n.id] = LV[(LV.indexOf(S.concept[n.id]) + 1) % 3]; paint(); save(); });
      const row = el('div', { class: 'krow' }, el('a', { href: n.href, text: n.label }), b);
      list.appendChild(row); nodeEls[n.id].btn = b;
    });
    const prompt = promptBox('Ask your tutor, based on your map', () => {
      const by = lv => N.filter(n => S.concept[n.id] === lv).map(n => n.label);
      const k = by('know'), f = by('fuzzy'), u = by('unknown');
      const parts = ["I'm studying my Calc 2 notes: antiderivatives, u-substitution, integration by parts and partial fractions (§1.1, §1.3); the FTC and signed area, improper integrals and numerical integration (§2.4–2.6); displacement and distance in 1D, 2D and 3D (§3.1, §3.3); arc length (§3.3); and volume by disks and washers (§3.5)."];
      if (k.length) parts.push(`I already understand: ${k.join('; ')}.`);
      if (f.length) parts.push(`I'm fuzzy on: ${f.join('; ')}.`);
      if (u.length) parts.push(`I don't understand yet: ${u.join('; ')}.`);
      parts.push('Please start with the most basic concept I marked fuzzy or not-yet, ask me what I already know about it, and connect it to the derivative rule it comes from or to the FTC.');
      parts.push(TUTOR_TAIL);
      return parts.join(' ');
    });
    function paint() {
      N.forEach(n => { const lv = S.concept[n.id]; const o = nodeEls[n.id]; o.g.classList.remove('know', 'fuzzy', 'unknown'); o.g.classList.add(lv); o.t2.textContent = LVtxt[lv]; o.btn.textContent = LVtxt[lv]; });
      prompt.update();
    }
    root.append(el('div', { class: 'cmap-wrap' }, el('div', { class: 'cmap' }, svg), el('div', { class: 'small muted', style: 'margin-top:8px', text: 'Click a concept (on the map or in the list) to cycle: Fuzzy → Know → Not yet. The links jump to that part of the guide.' }), list), prompt);
    paint();
  }

  /* ================================================================== diagnostic */
  function diagnostic(root) {
    const qs = $$('.mcq', root);
    const out = el('div', { class: 'diag-result' });
    root.appendChild(out);
    const map = Object.fromEntries(Object.keys(TOPICS).map(T => [T, ['#' + T + '-learn', TOPICS[T]]]));
    function paint() {
      const done = qs.filter(q => S.mcq[q.dataset.qid] && S.mcq[q.dataset.qid].first !== null);
      if (done.length < qs.length) { out.innerHTML = `<p class="muted small">${done.length} of ${qs.length} answered. Your results and a suggested starting point appear when you finish.</p>`; return; }
      const miss = qs.filter(q => !S.mcq[q.dataset.qid].first).map(q => q.dataset.topic);
      const right = qs.length - miss.length;
      const topics = [...new Set(miss)];
      out.innerHTML = '';
      out.appendChild(el('div', { class: 'callout ' + (topics.length ? 'warn' : 'why') },
        el('div', { class: 'label', text: 'Your diagnostic' }),
        el('p', { html: `You recognized <b>${right} of ${qs.length}</b> on the first try.` }),
        el('p', { html: topics.length ? 'Suggested starting point: ' + topics.map(t => `<a href="${map[t][0]}">${map[t][1]}</a>`).join(', ') + '. Start with the Learn stage there, and don\'t skip the prerequisite boxes.' : 'Nice. Work through the topics in order anyway: recognizing a problem is Level 1; the goal is Levels 5–6 (choosing the method in mixed practice, and handling unfamiliar problems).' })));
    }
    root.addEventListener('answered', () => setTimeout(paint, 0));
    paint();
  }

  /* ================================================================== mastery report */
  const TOPICS = { U: '§1.1 Antiderivatives & substitution', P: '§1.1 Integration by parts', R: '§1.3 Partial fractions', A: '§2.4 FTC & signed area', B: '§2.5 Improper integrals', C: '§2.6 Numerical integration', D: '§3.1 Displacement & distance', E: '§3.3 Motion in 2D & 3D', L: '§3.3 Arc length', V: '§3.5 Volume (disks & washers)' };
  const LEVELS = ['Recognize', 'Understand', 'Reproduce', 'Solve alone', 'Choose method', 'Unfamiliar', 'Explain why'];
  function evidence(T) {
    const mc = id => S.mcq[id] || {};
    const pr = id => S.problems[id] || {};
    const has = [];
    // L1 recognize: diagnostic item OR topic recognition item correct on first try
    has[1] = $$(`.mcq[data-topic="${T}"][data-level="1"]`).some(q => mc(q.dataset.qid).first === true);
    // L2 understand: self-check box
    has[2] = !!S.self[T];
    // L3 reproduce: guided example completed
    has[3] = !!(S.guided[T + '-guided'] && S.guided[T + '-guided'].done);
    // L4 solve alone: independent problem solved with no hints and no solution
    has[4] = !!(pr(T + '-indep').ok && pr(T + '-indep').noHelp);
    // L5 choose method: a mixed-practice item for this topic, method chosen correctly on the first try AND solved
    has[5] = $$(`.problem[data-mixed="${T}"]`).some(p => { const q = $('.mcq', p); return q && mc(q.dataset.qid).first === true && pr(p.dataset.pid).ok; });
    // L6 unfamiliar: a level-6 problem for this topic solved without viewing the solution
    has[6] = $$(`.problem[data-topic="${T}"][data-level="6"]`).some(p => pr(p.dataset.pid).ok && !pr(p.dataset.pid).sol);
    // L7 explain: an explanation self-rated "fully"
    has[7] = $$(`.explain[data-topic="${T}"]`).some(x => (S.explain[x.dataset.eid] || {}).rating === 'full');
    let level = 0; for (let k = 1; k <= 7; k++) { if (has[k]) level = k; else break; }
    return { has, level };
  }
  function masteryReport(root) {
    const grid = el('div', { class: 'mastery-grid', role: 'table', 'aria-label': 'Mastery by topic and level' });
    const summary = el('div');
    const prompt = promptBox('Ask your tutor for a study plan', () => {
      const lines = Object.keys(TOPICS).map(T => { const e = evidence(T); const missing = LEVELS.map((n, k) => (!e.has[k + 1] ? n.toLowerCase() : null)).filter(Boolean); return `${TOPICS[T]}: level ${e.level}/7${missing.length ? ' (missing: ' + missing.join(', ') + ')' : ''}`; });
      const weakest = Object.keys(TOPICS).sort((a, b) => evidence(a).level - evidence(b).level)[0];
      return `Here is my mastery report from my Calc 2 study guide (§1.1 and §1.3 integration techniques, §2.4–2.6, §3.1, §3.3 and §3.5):\n${lines.join('\n')}\nMy weakest topic is ${TOPICS[weakest]}. Please build me a short session on it that targets the first missing level, starting by asking what I know. Then give me one mixed-practice problem where I have to choose the method myself. ${TUTOR_TAIL}`;
    });
    root.append(grid, summary, prompt);
    function paint() {
      grid.innerHTML = '';
      grid.appendChild(el('div', { class: 'h', role: 'columnheader', text: 'Topic' }));
      LEVELS.forEach((n, k) => grid.appendChild(el('div', { class: 'h', role: 'columnheader', text: `${k + 1}. ${n}` })));
      Object.keys(TOPICS).forEach(T => {
        const e = evidence(T);
        grid.appendChild(el('div', { class: 't', role: 'rowheader', html: `${TOPICS[T]}<br><span class="level-pill">Level ${e.level}</span>` }));
        for (let k = 1; k <= 7; k++) grid.appendChild(el('div', { class: 'c' + (e.has[k] ? ' yes' : ''), role: 'cell', text: e.has[k] ? '✓' : '·', title: LEVELS[k - 1] + (e.has[k] ? ': shown' : ': not shown yet') }));
      });
      const lv = Object.keys(TOPICS).map(T => evidence(T).level);
      summary.innerHTML = `<p class="small muted" style="margin-top:10px">A level counts only when every level below it is also shown. That's the point of CLAUDE.md §17: understanding a worked example is <em>not</em> mastery. Lowest current level: <b>${Math.min(...lv)}</b>. Target: levels 5–6 in every topic before the exam.</p>`;
      prompt.update();
    }
    root._paint = paint;
    paint();
  }

  /* ================================================================== progress + nav */
  function refreshProgress() {
    const items = [];
    $$('.problem').forEach(p => items.push(!!(S.problems[p.dataset.pid] || {}).ok));
    $$('.guided').forEach(g => items.push(!!(S.guided[g.dataset.gid] || {}).done));
    $$('.mcq[data-count]').forEach(q => items.push((S.mcq[q.dataset.qid] || {}).ok === true));
    $$('.spot').forEach(s => items.push(!!(S.spot[s.dataset.sid] || {}).found));
    $$('.explain').forEach(x => items.push(!!(S.explain[x.dataset.eid] || {}).rating));
    Object.keys(TOPICS).forEach(w => { if (document.getElementById(w + '-explore')) items.push(!!S.widgets[w]); });
    const done = items.filter(Boolean).length, pct = items.length ? Math.round(100 * done / items.length) : 0;
    const m = $('#meterFill'); if (m) m.style.width = pct + '%';
    const t = $('#meterText'); if (t) t.textContent = pct + '%';
    const d = $('#meterDetail'); if (d) d.textContent = `${done} of ${items.length} activities`;
    Object.keys(TOPICS).forEach(T => {
      const e = evidence(T);
      const tick = $(`#tick-${T}`); if (tick) tick.classList.toggle('done', e.level >= 4);
      const lv = $(`#lvl-${T}`); if (lv) lv.textContent = 'L' + e.level;
      const stages = { learn: !!S.visited[T + '-learn'], understand: !!S.self[T], explore: !!S.widgets[T], attempt: !!(S.problems[T + '-indep'] || {}).ok, compare: $$(`#${T}-compare .spot`).every(s => (S.spot[s.dataset.sid] || {}).found), practice: (() => { const ps = $$(`#${T}-practice .problem`); return ps.length && ps.filter(p => (S.problems[p.dataset.pid] || {}).ok).length >= Math.ceil(ps.length / 2); })(), master: $$(`#${T}-master .problem, #${T}-master .mcq`).every(q => q.classList.contains('problem') ? (S.problems[q.dataset.pid] || {}).ok : (S.mcq[q.dataset.qid] || {}).ok) };
      Object.keys(stages).forEach(k => { const a = $(`.stagebar a[href="#${T}-${k}"]`); if (a) a.classList.toggle('done', !!stages[k]); });
    });
    const mr = $('#masteryReport'); if (mr && mr._paint) mr._paint();
  }
  function initNav() {
    const links = $$('.nav a[href^="#"]');
    const targets = links.map(a => document.getElementById(a.getAttribute('href').slice(1))).filter(Boolean);
    const obs = new IntersectionObserver(ents => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        links.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
      });
    }, { rootMargin: '-15% 0px -70% 0px' });
    targets.forEach(t => obs.observe(t));
    const stageObs = new IntersectionObserver(ents => {
      ents.forEach(en => {
        if (!en.isIntersecting) return;
        const id = en.target.id; const T = id.split('-')[0];
        $$(`.stagebar[data-topic="${T}"] a`).forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + id));
        if (!S.visited[id]) { S.visited[id] = true; save(); }
      });
    }, { rootMargin: '-20% 0px -65% 0px' });
    $$('.stage').forEach(s => stageObs.observe(s));
    $('#menuBtn') && $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $$('.sidebar a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('nav-open')));
  }

  /* ================================================================== static teaching figures (Learn stages) */
  function figures() {
    $$('[data-fig]').forEach(host => {
      const kind = host.dataset.fig;
      if (kind === 'strips') {
        const f = x => 1.1 * Math.sin(1.25 * x) + 0.25;
        const P = new Plot(host, { W: 680, H: 240, xmin: 0, xmax: 5, ymin: -1.1, ymax: 1.5, aria: 'Thin strips between a curve and the x-axis. Strips above the axis count as positive, strips below as negative.' });
        P.axes({ xlabel: 'x', ylabel: 'y', nx: 6, ny: 4 });
        const n = 20, a = 0.2, b = 4.8, dx = (b - a) / n;
        for (let i = 0; i < n; i++) { const x0 = a + i * dx, y = f(x0 + dx / 2); P.poly([[x0, 0], [x0, y], [x0 + dx, y], [x0 + dx, 0]], 'shape ' + (y >= 0 ? 'm' : 't')); }
        P.curve(f, 0, 5, 'curve');
        P.text(1.3, 0.55, '+ strips add', 'dlbl'); P.text(3.75, -0.55, '− strips subtract', 'dlbl');
        P.line(a, -1.1, a, 1.5, 'vline'); P.text(a, 1.5, 'a', 'lbl', 'middle', 14);
        P.line(b, -1.1, b, 1.5, 'vline'); P.text(b, 1.5, 'b', 'lbl', 'middle', 14);
      }
      if (kind === 'infinite') {
        const g = el('div', { class: 'grid-2' }); host.appendChild(g);
        const h1 = el('div'), h2 = el('div'); g.append(h1, h2);
        const P1 = new Plot(h1, { W: 420, H: 230, xmin: 0, xmax: 8, ymin: 0, ymax: 1.1, pad: { l: 40, r: 12, t: 14, b: 34 }, aria: 'The region under e to the minus x from 1 to infinity.' });
        P1.axes({ xlabel: 'x', nx: 4, ny: 3 });
        P1.area(x => Math.exp(-x), 1, 8, { posCls: 'area-pos' }); P1.curve(x => Math.exp(-x), 0, 8, 'curve');
        P1.text(7.8, 0.62, 'Type I: runs on forever →', 'dlbl', 'end'); P1.text(7.8, 0.47, 'area from 1 to ∞ = e⁻¹ ≈ 0.368', 'lbl', 'end'); P1.text(7.8, 0.34, '(notes p. 28)', 'lbl', 'end');
        const P2 = new Plot(h2, { W: 420, H: 230, xmin: 0, xmax: 1.1, ymin: 0, ymax: 7, pad: { l: 40, r: 12, t: 14, b: 34 }, aria: 'The region under 1 over square root of x from 0 to 1.' });
        P2.axes({ xlabel: 'x', nx: 4, ny: 3 });
        P2.area(x => 1 / Math.sqrt(x), 0.0004, 1, { posCls: 'area-pos', n: 800 }); P2.curve(x => 1 / Math.sqrt(x), 0.004, 1.1, 'curve', 600);
        P2.text(1.08, 5.6, '↑ Type II: unbounded near 0', 'dlbl', 'end'); P2.text(1.08, 4.6, 'area from 0 to 1 = 2', 'lbl', 'end'); P2.text(1.08, 3.8, '(textbook Ex. 2.5.5)', 'lbl', 'end');
      }
      if (kind === 'rules3') {
        const g = el('div', { class: 'grid-3' }); host.appendChild(g);
        const f = Math.sin, a = 0, b = PI;
        [['m', 'Midpoint: flat tops', 'M₂ ≈ 2.2214 (error +0.221)'], ['t', 'Trapezoid: straight tops', 'T₂ ≈ 1.5708 (error −0.429)'], ['s', "Simpson's: parabolic top", 'S₂ ≈ 2.0944 (error +0.094)']].forEach(([k, title, note]) => {
          const h = el('div'); g.appendChild(h);
          h.appendChild(el('div', { class: 'small', style: 'font-weight:650;margin-bottom:2px', text: title }));
          const P = new Plot(h, { W: 300, H: 190, xmin: 0, xmax: PI, ymin: 0, ymax: 1.25, pad: { l: 30, r: 10, t: 10, b: 28 }, aria: title + ' approximation of the area under sin x on [0, π] with n = 2.' });
          P.axes({ xticks: [{ v: 0, l: '0' }, { v: PI / 2, l: 'π/2' }, { v: PI, l: 'π' }], ny: 2 });
          if (k === 'm') [[0, PI / 2], [PI / 2, PI]].forEach(([x0, x1]) => { const y = f((x0 + x1) / 2); P.poly([[x0, 0], [x0, y], [x1, y], [x1, 0]], 'shape m'); P.dot((x0 + x1) / 2, y, 'dot s1', 3.5); });
          if (k === 't') { P.poly([[0, 0], [0, 0], [PI / 2, 1], [PI / 2, 0]], 'shape t'); P.poly([[PI / 2, 0], [PI / 2, 1], [PI, 0], [PI, 0]], 'shape t'); [0, PI / 2, PI].forEach(x => P.dot(x, f(x), 'dot s2', 3.5)); }
          if (k === 's') { const q = x => 1 - Math.pow((x - PI / 2) / (PI / 2), 2); const pts = [[0, 0]]; for (let j = 0; j <= 40; j++) { const x = PI * j / 40; pts.push([x, q(x)]); } pts.push([PI, 0]); P.poly(pts, 'shape s'); [0, PI / 2, PI].forEach(x => P.dot(x, f(x), 'dot s3', 3.5)); }
          P.curve(f, 0, PI, 'curve');
          h.appendChild(el('div', { class: 'small muted tnum', text: note }));
        });
        host.appendChild(el('div', { class: 'small muted', style: 'margin-top:4px', text: 'f(x) = sin x on [0, π], exact area 2, with n = 2 strips. Values checked with Python and Wolfram.' }));
      }
      if (kind === 'motion41') {
        const P = new Plot(host, { W: 680, H: 230, xmin: 0, xmax: 62, ymin: -13, ymax: 13, aria: 'Velocity 10 ft/s for 30 s, then −10 ft/s for 30 s.' });
        P.axes({ xticks: [0, 10, 20, 30, 40, 50, 60].map(v => ({ v, l: String(v) })), yticks: [-10, 0, 10].map(v => ({ v, l: String(v) })), xlabel: 't (s)', ylabel: 'v (ft/s)' });
        P.poly([[0, 0], [0, 10], [30, 10], [30, 0]], 'area-pos'); P.poly([[30, 0], [30, -10], [60, -10], [60, 0]], 'area-neg');
        svgEl('path', { class: 'curve', d: P.d([[0, 10], [30, 10]]) }, P.gData); svgEl('path', { class: 'curve', d: P.d([[30, -10], [60, -10]]) }, P.gData);
        P.text(15, 5, '+300 ft (forward)', 'dlbl'); P.text(45, -5, '−300 ft (backward)', 'dlbl', 'middle', 4);
        host.appendChild(el('div', { class: 'notice tnum', html: '<b>Displacement</b> = ∫v dt = 300 − 300 = <b>0 ft</b> &nbsp;·&nbsp; <b>Distance</b> = ∫|v| dt = 300 + 300 = <b>600 ft</b> (notes p. 41)' }));
      }
      if (kind === 'arcpieces') {
        // a smooth curve, 4 chords, and one chord's right triangle (equal scale, so lengths are honest)
        const f = x => 0.6 + 0.45 * Math.sin(1.2 * x - 0.6) + 0.12 * x;
        const P = new Plot(host, { W: 680, H: 250, aria: 'A curve approximated by four straight chords. One chord is the hypotenuse of a right triangle with legs delta x and delta y.' });
        fitEqual(P, [[0, 0], [5.2, 1.45]], 0.02);
        P.axes({ xlabel: 'x', ylabel: 'y', nx: 6, ny: 3 });
        const xs = [0.2, 1.35, 2.5, 3.65, 4.8], q = xs.map(x => [x, f(x)]);
        P.curve(f, 0.2, 4.8, 'curve');
        svgEl('path', { class: 'chord', d: P.d(q) }, P.gData);
        const [A, B] = [q[0], q[1]];
        P.line(A[0], A[1], B[0], A[1], 'leg'); P.line(B[0], A[1], B[0], B[1], 'leg'); P.line(A[0], A[1], B[0], B[1], 'hyp');
        P.text((A[0] + B[0]) / 2, A[1], 'Δx', 'lbl', 'middle', 15); P.text(B[0] + 0.06, (A[1] + B[1]) / 2, 'Δy', 'lbl', 'start', 4);
        P.text((A[0] + B[0]) / 2 - 0.05, (A[1] + B[1]) / 2, '√(Δx² + Δy²)', 'dlbl', 'end', -8);
        q.forEach(p => P.dot(p[0], p[1], 'dot s1', 3.5));
        P.text(4.8, 0.2, 'more chords → closer to the curve’s length', 'lbl', 'end');
      }
      if (kind === 'coneslices') {
        // 3.3–3.5 notes p. 6: the triangle under y = 2x on [0, 2] and the cone it sweeps out, as a stack of disks
        const g2 = el('div', { class: 'grid-2' }); host.appendChild(g2);
        const h1 = el('div'), h2 = el('div'); g2.append(h1, h2);
        const P1 = new Plot(h1, { W: 420, H: 250, pad: { l: 34, r: 12, t: 12, b: 30 }, aria: 'The triangle under y = 2x from x = 0 to 2, with a thin vertical strip at x = 1.3 and its radius 2x.' });
        P1.setView({ xmin: -0.35, xmax: 2.5, ymin: -0.6, ymax: 4.4 });
        P1.axes({ xlabel: 'x', ylabel: 'y', nx: 4, ny: 4 });
        P1.poly([[0, 0], [2, 4], [2, 0]], 'reg1');
        P1.line(P1.o.xmin, 0, P1.o.xmax, 0, 'axis-rot');
        P1.poly([[1.24, 0], [1.24, 2.6], [1.36, 2.6], [1.36, 0]], 'shape m hi');
        arrow(P1, 1.47, 0, 1.47, 2.6, 'rad-R'); P1.text(1.52, 1.3, 'R = 2x', 'lbl', 'start', 4);
        P1.text(0.35, 3.3, 'y = 2x', 'dlbl', 'start');
        const P2 = new Plot(h2, { W: 420, H: 250, pad: { l: 12, r: 12, t: 12, b: 12 }, aria: 'The cone from spinning the triangle about the x-axis, drawn as a stack of eight disks.' });
        fitEqual(P2, [[-4 * KAPPA, -4], [2 + 4 * KAPPA, 4]], 0.04);
        drawSolid(P2, { ax: 'h', a: 0, b: 2, up: x => 2 * x, lo: () => 0 }, 0, 8);
        P2.line(P2.o.xmin, 0, P2.o.xmax, 0, 'axis-rot');
        P2.text(P2.o.xmax, -3.6, '8 disks: V ≈ Σ π(2xᵢ)² Δx', 'lbl', 'end');
        host.appendChild(el('div', { class: 'small muted', style: 'margin-top:4px', text: 'Exact volume: ∫₀² π(2x)² dx = 32π/3 ≈ 33.51, the volume of a cone with radius 4 and height 2. Checked with Python and Wolfram.' }));
      }
    });
  }

  /* ================================================================== boot */
  // Flex labels that mix text, math and an input: group the text+math into one span so it flows as a sentence.
  function wrapLabels() {
    $$('label.toggle, .reflect label, .answers label, label.inline').forEach(lb => {
      const kids = Array.from(lb.childNodes);
      const inputs = kids.filter(c => c.nodeType === 1 && c.tagName === 'INPUT');
      const rest = kids.filter(c => !inputs.includes(c));
      if (!rest.length || !inputs.length) return;
      const span = el('span', { class: 'lbl-text' });
      rest.forEach(c => span.appendChild(c));
      if (kids[0] === inputs[0] || (kids[0].nodeType === 3 && !kids[0].textContent.trim() && kids[1] === inputs[0])) lb.append(...inputs, span);
      else lb.append(span, ...inputs);
    });
  }

  function boot() {
    applyTheme();
    wrapLabels();
    $('#themeBtn') && $('#themeBtn').addEventListener('click', () => { S.theme = S.theme === null ? 'light' : S.theme === 'light' ? 'dark' : null; applyTheme(); save(); });
    $('#resetBtn') && $('#resetBtn').addEventListener('click', () => { if (confirm('Reset all progress, answers, and notes in this guide?')) { localStorage.removeItem(KEY); location.reload(); } });
    $$('.term').forEach(t => t.setAttribute('tabindex', '0'));
    $$('.formula-card').forEach(initFormula);
    $$('.mcq').forEach(initMCQ);
    $$('.problem').forEach(initProblem);
    $$('.guided').forEach(initGuided);
    $$('.spot').forEach(initSpot);
    $$('.explain').forEach(initExplain);
    $$('.tryout').forEach(initTryout);
    $$('input[data-self]').forEach(cb => { const T = cb.dataset.self; cb.checked = !!S.self[T]; cb.addEventListener('change', () => { S.self[T] = cb.checked; save(); }); });
    figures();
    const wa = $('#widget-area'); if (wa) widgetArea(wa);
    const wb = $('#widget-improper'); if (wb) widgetImproper(wb);
    const wc = $('#widget-numeric'); if (wc) widgetNumeric(wc);
    const wd = $('#widget-motion'); if (wd) widgetMotion(wd);
    const wu = $('#widget-anti'); if (wu) widgetAnti(wu);
    const wp = $('#widget-parts'); if (wp) widgetParts(wp);
    const wr = $('#widget-pf'); if (wr) widgetPF(wr);
    const we = $('#widget-path'); if (we) widgetPath(we);
    const wl = $('#widget-arc'); if (wl) widgetArc(wl);
    const wv = $('#widget-volume'); if (wv) widgetVolume(wv);
    const cm = $('#concept-map'); if (cm) conceptMap(cm);
    const dg = $('#diagnostic'); if (dg) diagnostic(dg);
    const mr = $('#masteryReport'); if (mr) masteryReport(mr);
    initNav();
    refreshProgress();
    // expose for automated verification (read-only helpers)
    window.__guide = { parseAnswer, gradeInput, compileExpr: (s, v) => compileExpr(normMath(s), v || []), state: () => S, widgets: { area: wa, improper: wb, numeric: wc, motion: wd, anti: wu, parts: wp, pf: wr, path: we, arc: wl, volume: wv } };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();

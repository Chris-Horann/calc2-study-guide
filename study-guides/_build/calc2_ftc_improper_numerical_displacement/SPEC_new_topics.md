# Spec: adding §1.1, §1.3 and §3.3 to the Calc 2 guide

Build folder: `study-guides/_build/calc2_ftc_improper_numerical_displacement/` (the folder name stays).
Output (built by the coordinator): `study-guides/calc2_study_guide_1.1-3.3.html`.

## Topics, in the order they appear

| id | badge | title | notes | textbook |
|---|---|---|---|---|
| U | 1.1 | Antiderivatives & u-substitution | pp. 1–6 (+ extra practice pp. 21–23) | §1.1, PDF pp. 14–27 + exercises pp. 33–37 |
| P | 1.1 | Integration by parts | pp. 7–12 (+ pp. 21, 24) | §1.1, PDF pp. 27–33 + exercises pp. 33–37 |
| R | 1.3 | Partial fractions | pp. 13–20 (+ p. 23) | §1.3, PDF pp. 48–62 |
| A | 2.4 | FTC & signed area (exists) | pp. 25–26 | §2.4 |
| B | 2.5 | Improper integrals (exists) | pp. 27–33 | §2.5 |
| C | 2.6 | Numerical integration (exists) | pp. 34–39 | §2.6 |
| D | 3.1 | Displacement & distance (exists, extended) | pp. 40–41 + **new notes pp. 1–3** | §3.1 |
| E | 3.3 | Motion in the plane and in space | **new notes pp. 4–7** | §3.3, PDF pp. 245–255 + exercises pp. 265–266 |

"Notes p. N" means `1.1-3.1(some).pdf` (images: `materials/notes/calc2_notes_pages/page-00N.png`).
"New notes p. N" means `3.1rest-3.3.pdf` (images: `materials/notes/3.1rest-3.3_pages/page-00N.png`).
Textbook text extracts are in the session scratchpad: `tb_1.1_Basic.txt`, `tb_1.3_PartialFractions.txt`, `tb_3.3_Arclength.txt`.
The cumulative notes index is `materials/notes/NOTES_INDEX.md`.

Cross-reference other topics by section number, e.g. "(§2.5)", "→ §2.6". For the two §1.1 topics, name them: "u-substitution (§1.1)", "integration by parts (§1.1)". Links like `<a href="#U-learn">` are fine.

## Scope rules (the user's rules)

- The lecture notes define the scope. Use only textbook sections that match notes content.
- Priority for sources: notes, then the matching textbook section, then general knowledge (only for clarification).
- Use the professor's methods and notation. Examples: the red "Key:" procedures, LIATE, du = (du/dx) dx, solving for the leftover piece, back-substitution x = u + 4, long division first. For partial fractions, teach matching coefficients and solving by elimination; the professor never uses the plug-in-roots/Heaviside shortcut, so don't teach it.
- Excluded:
  - §1.2 (trig integrals, trig substitution), §1.4 (hyperbolic), §3.2
  - initial-value problems (textbook Examples 1.1.6, 1.1.10, 1.1.12)
  - cyclic integration by parts (textbook Example 1.1.22, eˣ sin x)
  - arc length of graphs y = f(x) / x = f(y), parameterization by arc length, rectifiable curves, polar, ℝ⁴
  - any exercise that needs an excluded technique
- Errors in the notes must be flagged with a `callout discrepancy` wherever the example is used:
  - Notes p. 10: the final line reads −4t^{−t}; it should be −4e^{−t}.
  - Notes p. 18 has cosmetic slips: the numerators are labeled Ax+B and Cx+D instead of Ar+B and Cr+D, and "④−②" should be "④−③".

## Files each worker writes (only these)

- Topic file: `parts/12-U.html`, `parts/14-P.html`, `parts/16-R.html`, or `parts/55-E.html`.
- `parts/snippets/<T>-mixed.html`, `parts/snippets/<T>-final.html`, `parts/snippets/<T>-diag.html`.
- `manifests/<T>.json`, the verification manifest (format below).
- Worker E only: edits to `parts/50-D.html` (the D additions below).
- Do **not** edit `app.js`, `styles.css`, `build.js`, other parts, `test_guide.py`, or the notebook. If you need something from the engine or CSS, say so in your report.

## Page structure: copy parts/20-A.html exactly

```
<section id="U" class="topic">
  <div class="topic-banner"><div class="topic-letter sec" aria-hidden="true">1.1</div>
    <div><h2>…title…</h2><div class="sources">Notes pp. … · Textbook §1.1 (Theorem 1.1.15, …)</div></div></div>
  <nav class="stagebar" data-topic="U" aria-label="Stages in §1.1 (substitution)"> 7 links #U-learn … #U-master </nav>
  7 stages: <div class="stage" id="U-learn|U-understand|U-explore|U-attempt|U-compare|U-practice|U-master">
```

**1. Learn**
- A big-idea callout that builds intuition before any formula.
- An everyday or visual version of the idea.
- A "questions to ask every time" callout.
- The self-check toggle: `<label class="toggle"><input type="checkbox" data-self="U"> I can explain…</label>`.

**2. Understand**
- A prerequisite map: `.tree` with `<span class="qc">` quick checks using `details.qcheck`.
- `callout prereq` reminders.
- A "why it works" derivation card.
- `.formula-card`s:
  - use `\htmlClass{fp fp-N}{…}` inside the math;
  - add `.fp-chip` buttons with `data-part` and `data-explain`;
  - include an `.fp-explain` div and a `.fc-meta` section with "When it applies" / "When it fails".
- A recognition table ("You notice… / So you…") plus a `callout warn` titled "Tempting alternative, and why to reject it".

**3. Explore**
- A `.widget` block containing:
  - `.w-head` with an h4 and a small muted line;
  - `.w-sub`;
  - the mount div, holding the per-preset `.w-formula` blocks (see Widgets);
  - `.try` with an h5 "What to notice" and an ol that names the presets.
- 1–3 `.tryout` blocks (spec below).

**4. Attempt**
- The guided example: `.guided data-gid="U-guided"` with `.g-intro` and 5–7 `.gstep`s.
  - Each step has `span.g-label`, then either an `.mcq` (data-qid "U-g1", …) or a `p` containing `label.inline` with an `input.ans`, then a `.greveal`.
  - End with a `.takeaway`.
- The independent problem: `.problem data-pid="U-indep" data-topic="U" data-level="4" data-title="Independent attempt" data-src="Your turn: try it before any hint" data-prompt="…"`. It contains:
  - `.p-body`
  - `.answers` with a `label` and an `input.ans`
  - `ol.know` with 3 items
  - 3 `.hint`s
  - `.solution`
  - `.reflect` with an h5 "Compare your approach", 3 checkbox labels, and a "clue to recognize next time".

**5. Compare**
- A `.vs` block with `.tempt`, `.right` and `.clue`.
- 2 `.spot`s (data-sid "U-spot1", "U-spot2"). Each has 4–5 `button.sline` with `span.ln` and a span; exactly one has `data-bad`. Then `.spot-msg`, then `.spot-explain callout warn`.
- Then `<h4>Common mistakes: why they happen and how to prevent them</h4>` and 4–6 `details.mistake`, each with a "Why it happens" part and a "Prevent it" part.

**6. Practice**
- 6–8 `.problem`s with ids "U-p1", …, `data-topic="U"`, `data-title="Practice n"`, `data-src` (e.g. "Notes p. 5 · redo it", "Textbook §1.1 Suggested Ex. 7", "New variant") and `data-prompt`.
- Mix answer types: antiderivatives (expression inputs) and definite values (numeric).
- Include:
  - some professor examples to redo (a solution the student can check against the notes)
  - the textbook's in-scope exercises
  - new variants

**7. Master**
- `.mcq data-qid="U-m1" data-topic="U" data-level="1" data-count` (recognition; `data-multi` is allowed).
- `.mcq data-qid="U-m2" data-level="2" data-count` (understanding).
- 1–2 `.problem data-level="6"` (unfamiliar or combined ideas).
- `.explain card data-eid="U-explain" data-topic="U"` with an h4 "Explain why (Level 7)", a prompt `p`, a `textarea`, and `.model callout why`.

Keep the tone and density of 20-A.html: short paragraphs, plain English, no walls of text, and every graph or figure has a "what to notice".

## Math and attribute rules

- KaTeX is rendered at build time: `$…$` inline, `$$…$$` display. `\htmlClass` is allowed. Inside math, write `&lt;` and `&gt;` for < and >. A literal dollar sign is `\$`.
- **Never put `$` inside an attribute value.** This covers data-why, data-explain, data-exact, data-show, data-prompt, data-src, data-title, data-help and data-wrong. Attributes are plain text with unicode math (x², √, π, e^(4x+1), tan⁻¹).
- data-prompt is a plain-text statement for the tutor prompt (write < as &lt;).
- `data-wrong` uses single quotes around JSON: `data-wrong='[{"v":2,"m":"…"}]'`. Don't use an apostrophe inside it; use ’ (U+2019) instead.

## Answer inputs

**Numeric (existing):**
`<input class="ans" data-vid="U-p5" data-answer="0.859140914230" data-exact="(e − 1)/2" data-wrong='[{"v":1.718281828459,"m":"…"}]'>`
- `data-tol` is optional; the default is max(6e-4, 1e-4·|answer|).
- Give data-answer to at least 12 significant digits.

**Expression (new engine feature):**
```
<input class="ans" data-vid="U-p2" data-kind="anti" data-var="x" data-integrand="x*e^(x^2)"
       data-answer="(1/2)*e^(x^2)" data-dom="0.2,1.5" data-show="½e^(x²) + C"
       data-wrong='[{"f":"e^(x^2)","m":"…"}]'>
```

Kinds:
- `data-kind="anti"`: the answer is an antiderivative. It's accepted if it differs from data-answer by a constant, sampled on data-dom. A typed "+ C" is stripped. If it's missing, the success message reminds the student to write + C.
- `data-kind="expr"`: the answer must equal data-answer as a function on data-dom. Use it for steps like "rewrite the integrand in terms of u" (data-var="u") or "du = ? (type the factor)".

Other attributes:
- `data-integrand` is required for kind anti. It's used for verification.
- `data-dom="a,b"` is an interval where the integrand and the answer are real and continuous.
  - If the answer has ln|…|, choose it so every log argument is positive there. Then ln(x−3) and ln|x−3| both pass, and the checker reminds about the absolute value.
  - Avoid intervals where the functions get huge.
- `data-show` (optional) is the plain-text form shown after a correct answer.

Syntax for data-answer, data-integrand and "f":
- ASCII only: `+ - * / ^ ( )`.
- Functions: `sqrt cbrt ln exp sin cos tan sec csc cot arcsin arccos arctan abs`.
- Constants: `pi e`.
- Write an explicit `*` in reference strings, and use `abs(…)` for |…|.

The engine detects these generically, so you don't need data-wrong entries for them:
- constant-multiple mistakes ("your answer is exactly 8 × the right one")
- a flipped overall sign

Use data-wrong for specific named mistakes, e.g.:
- not converting back to x
- leaving a stray x
- the power rule on 1/x
- choosing u = eˣ in ∫x eˣ dx
- the wrong sign in uv − ∫v du
- dropping the polynomial part after long division

Help text:
- For expression problems, put `data-help="Type an antiderivative, e.g. x^3/3 - cos(x) + C. Use ln(abs(x)) for ln|x|, arctan(x) for tan⁻¹x, e^(2x) for e²ˣ."` on the `.problem`. Adapt it to the problem.
- Use a placeholder like `placeholder="e.g. (1/2)e^(x^2) + C"`.
- Expression inputs work in guided steps too.

## Tryout component (new; no scoring)

```html
<div class="tryout" data-topic="U">
  <div class="q">For $\int x e^{x^2}\,dx$, try a choice of $u$:</div>
  <div class="try-opts">
    <button class="try-opt">$u=x^2$</button>
    <button class="try-opt">$u=x$</button>
    <button class="try-opt">$u=e^{x^2}$</button>
  </div>
  <div class="try-res" data-verdict="good">…what the integral becomes and why that's good…</div>
  <div class="try-res" data-verdict="bad">…</div>
  <div class="try-res" data-verdict="ok">…</div>
</div>
```

Result i belongs to option i. Clicking a choice reveals its result, and several can be open at once for comparison. The verdict is one of `good`, `ok`, `bad`.

## Widgets

The coordinator writes the JS. You write:
- the mount div;
- inside it, one `<div class="w-formula">…$$…$$…</div>` per preset, in preset order. Keep each one short: the key formulas for that preset.
- the "What to notice" list, which must name presets exactly as below.

**U: `<div id="widget-anti">`, "Antiderivative family & derivative check"**
- Presets:
  1. "Notes p. 2: 10x⁹" (F = x¹⁰)
  2. "Notes p. 2: 3 sin t − 5/(t² + 1)" (F = −3cos t − 5tan⁻¹t)
  3. "Notes p. 4: √(1 + ln x)/(3x)" (F = (2/9)(1 + ln x)^{3/2}, x ≥ 1/e)
  4. "Notes p. 5: 2t⁷ cos(t⁸ + 1)" (F = ¼ sin(t⁸ + 1))
  5. "Notes p. 6: x² e^(−x³)" (F = −⅓e^{−x³})
- Top plot:
  - the family F + C, with faint members at C = −2…2 and the chosen C in bold;
  - parallel tangent segments at the tangent point x₀.
- Bottom plot: f with the point (x₀, f(x₀)). A readout says "slope of every member at x₀ = f(x₀) = …".
- Controls: a C slider (−3…3), an x₀ slider, and a "show the family" toggle.
- A "Check your own F" box: the student types an antiderivative, and its numerical derivative is plotted dashed over f.
  - The readout says whether they match.
  - A constant-multiple mismatch is reported as such.

**P: `<div id="widget-parts">`, "Integration by parts as area"**
- Presets:
  1. "Notes p. 8: ∫x eˣ dx" (u = x, v = eˣ, x in [0, 2])
  2. "Notes p. 9: ∫x⁴ ln x dx" (u = ln x, v = x⁵/5, x in [1, 2])
  3. "Notes p. 10: ∫2p tan⁻¹p dp" (u = tan⁻¹p, v = p², p in [0, 2])
  4. "Notes p. 11: ∫sin⁻¹x dx" (u = sin⁻¹x, v = x, x in [0, 0.95])
- The picture is the u–v plane, with the curve (u(x), v(x)) for x from a to b.
  - "∫v du" is the region under the curve (vertical strips).
  - "∫u dv" is the region to the left of the curve (horizontal strips).
  - Together they fill the big rectangle minus the small one, so ∫u dv + ∫v du = u(b)v(b) − u(a)v(a).
- Sliders: a and b.
- Readouts: ∫v du, ∫u dv, their sum, and [uv] from a to b.

**R: `<div id="widget-pf">`, "Partial fractions: the pieces add up"**
- Presets:
  1. "Notes p. 13: (x − 7)/(x² − 2x − 3)" = 2/(x+1) − 1/(x−3)
  2. "Notes p. 14: (5x + 5)/(x² − x − 6)" = 4/(x−3) + 1/(x+2)
  3. "Notes p. 15: repeated factor x(x + 2)²" (x² − 3x − 8)/(x³ + 4x² + 4x) = −2/x + 3/(x+2) − 1/(x+2)²
  4. "Notes p. 16: irreducible x² + 4" (x² + 5x − 4)/(x³ + 4x) = −1/x + (2x+5)/(x²+4)
  5. "Notes p. 20: long division first" (−2x³ + 4x² + 6x − 2)/(x² − 1) = (−2x + 4) + 1/(x+1) + 3/(x−1)
- Display:
  - f in ink;
  - each piece in a series color, with a toggle per piece;
  - a dashed "sum of the pieces" overlay;
  - dashed asymptote lines at the real roots;
  - a hover readout.
- Each `.w-formula` should show the decomposition and the resulting antiderivative.

**E: `<div id="widget-path">`, "Path explorer"**
- Presets:
  1. "Notes p. 6: helix" (cos 4t, sin 4t, 3t), t ∈ [0, 2π]
  2. "Notes p. 7: (12t, 8t^(3/2), 3t²)", t ∈ [0, 1]
  3. "Notes p. 7: v = (3t², t, 0)" (p = (t³, t²/2, 0) starting at the origin), t ∈ [0, 3]
  4. "Textbook Ex. 3.3.7: semicircle, fast ends" (t, √(1−t²)), t ∈ [−1, 1]
  5. "Textbook Ex. 3.3.8: semicircle, steady" (−cos t, sin t), t ∈ [0, π]
  6. "1D inside 2D: back and forth on a line" p = (t² − 2t)(0.6, 0.8), t ∈ [0, 3]
- Views:
  - the path (2D, or an oblique 3D view with a rotate slider), with a moving point and trail;
  - the velocity arrow;
  - a dashed displacement arrow from the start;
  - below, speed vs. t with the area up to t shaded (the distance so far).
- Readouts:
  - v⃗(t) and the speed;
  - the displacement vector so far and its length;
  - the distance so far, and the gap between displacement length and distance.

**D (existing motion simulator)** gets three new presets:
- "New notes p. 1: v = eᵗ − 2" on [0, 1]
- "New notes p. 2: v = t² − t − 2" on [0, 4]
- "New notes p. 3: v = 1 − 2cos t" on [0, π]

## D additions (worker E only; edit `parts/50-D.html` in place)

- **Sources line:** add "new notes pp. 1–3" to the D sources line.
- **Explore:** add three bullets to D's "What to notice" list, one for each new simulator preset. Use the preset names exactly.
- **Practice:** in D-practice, add three "Redo your professor's example" problems, one each for new notes p. 1 (eᵗ − 2 on [0, 1]), p. 2 (t² − t − 2 on [0, 4]) and p. 3 (1 − 2cos t on [0, π]).
  - Each has two numeric inputs: displacement and distance.
  - Give each hints that follow the professor's moves: solve v = 0, check the root is inside the interval, draw a sign line, use test points.
  - The solution is the notes' own work; cite the page.
  - Note that the professor's answers were verified: e − 3 and 4 ln 2 + e − 5; 16/3 and 12; π and 2√3 + π/3.
- **Root outside the interval:** add one problem, v(t) = eᵗ − 3 on [0, 1].
  - ln 3 ≈ 1.0986 > 1, so there is no turning point inside. Distance = |displacement| = 4 − e.
  - Place it in D-practice, or in D-master as data-level="6".
- **Guided example:** optionally, add one new `.gstep` or MCQ to D's guided example on "is the root inside [a, b]?". Keep existing ids unchanged.
- **Existing items:** do not renumber or rename them. New ids are D-p7, D-p8, …

Worker E also writes E-mixed with a combined E + §2.6 item. It is textbook §3.3 Suggested Ex. 8, reworded as motion: the position is p⃗(t) = (t, t + t³) for 0 ≤ t ≤ 2. Set up the distance integral and estimate it with Simpson's Rule, n = 4. Its method MCQ should make the student recognize that there is no usable antiderivative.

## Snippets (the coordinator merges and renumbers them)

**`parts/snippets/<T>-mixed.html`**: 2–3 items in the 60-mixed.html format.
- Attributes: `.problem data-pid="mixed-U1" data-mixed="U" data-topic="mixed" data-title="Mixed" data-prompt="…"`.
- Order inside: `.p-body`, then `.mcq data-qid="mixed-U1-class"` ("What kind of problem is this?", 3 options, data-why on each), then `.answers`, hints and `.solution`.
- Method options come from: basic rules / u-substitution / integration by parts / partial fractions (after long division if needed) / plain FTC / improper / numerical / etc.
- The wording must **not** reveal the method.

**`parts/snippets/<T>-final.html`**: 3 items.
1. `.mcq data-qid="F-U1" data-topic="U" data-level="1" data-count` (recognition).
2. `.problem data-pid="F-U2" data-topic="U" data-level="4" data-title="§1.1" data-src="Solve alone"`.
3. `.problem data-pid="F-U3" data-topic="U" data-level="6" data-title="§1.1" data-src="Unfamiliar"`.

Don't write question numbers; the coordinator numbers them.

**`parts/snippets/<T>-diag.html`**: one `.mcq data-qid="diag-U" data-topic="U" data-level="1"`. It tests recognition and needs no calculation. Don't number it.

## Verification manifest: `manifests/<T>.json`

A JSON array with one entry per `input.ans` (every data-vid in your files, snippets included). Use SymPy syntax: `E pi exp log sqrt atan asin Abs`.

```json
{"vid":"U-p2","kind":"anti","var":"x","integrand":"x*exp(x**2)","answer":"exp(x**2)/2","js_answer":"(1/2)*e^(x^2)",
 "dom":[0.2,1.5],"source":"Notes p. 6","hand":"u = x^2, du = 2x dx, so x dx = du/2 ...",
 "wrong":[{"f":"exp(x**2)","mistake":"forgot the 1/2 from du","mistake_sympy":"2*exp(x**2)/2"}]}
{"vid":"U-p5","kind":"num","sympy":"integrate(x*exp(x**2),(x,0,1))","answer":0.859140914230,"exact":"(E-1)/2",
 "source":"...","hand":"...","wrong":[{"v":1.718281828459,"mistake":"...","mistake_sympy":"E-1"}]}
{"vid":"U-g2","kind":"expr","var":"u","answer":"u**3/2","js_answer":"u^3/2","dom":[0.5,2],"hand":"..."}
```

Rules for the entries:
- "sympy" must compute the value **from the problem statement**, independent of your answer.
- "mistake_sympy" must compute what the described mistake produces.
- Derive every answer by hand first, and put a brief derivation in "hand".

Before you finish, run a SymPy script with `C:\Users\chris\AppData\Local\Programs\Python\Python311\python.exe`. Save it as `manifests/check_<T>.py`. It must check that:
- for anti: simplify(diff(answer) − integrand) == 0, plus numeric spot checks on dom;
- for num: the SymPy value matches the answer to 1e-9;
- for expr: the answer matches the intended expression;
- every wrong answer is not equivalent to the right one, and equals its mistake_sympy;
- every js_answer, parsed with sympy's parse_expr using `^`→`**`, `e`→E, ln→log, arctan→atan, arcsin→asin and abs→Abs, equals the SymPy answer;
- every data-answer / data-vid in your HTML appears in the manifest and matches it.

Fix anything that fails.

## Report back (short)

- The files written.
- Counts of problems, answer inputs, MCQs, spots and tryouts.
- The SymPy check summary (pass/fail counts).
- Any disagreement between the notes, the textbook and computation. Report it; don't silently resolve it.
- Anything you need from the engine, CSS or widgets.

---

# Update 2026-09-25: `rest3.3-3.5.pdf` (§3.3 arc length, §3.5 volume)

## New topics

| id | badge | title | notes | textbook |
|---|---|---|---|---|
| L | 3.3 | Arc length | 3.3–3.5 notes pp. 2–4 | §3.3, PDF pp. 255–266 (Prop. 3.3.11–3.3.13, Ex. 3.3.8, 3.3.15, 3.3.17; Suggested Ex. 6–8; Additional Ex. 6) |
| V | 3.5 | Volume by slicing: disks and washers | 3.3–3.5 notes pp. 5–7 | §3.5, PDF pp. 285–309, disks and washers only |

- The parts are `parts/57-L.html` and `parts/58-V.html`, listed in `build.js` after `55-E.html`. The output file keeps its name.
- **Citation convention:** "3.3–3.5 notes p. N" means `rest3.3-3.5.pdf`; "new notes p. N" still means `3.1rest-3.3.pdf`.
- **E additions:** a practice problem `E-p11` (notes p. 1), a path-explorer preset (index 6) with its `.w-formula`, and a "What to notice" bullet.
- **Excluded:**
  - cylindrical shells;
  - arc length for x = f(y), parameterization by arc length, and polar arc length;
  - §3.4 and §3.6.

## Engine additions (`app.js`)

- `data-multimsg` on a `.mcq[data-multi]` replaces the generic wrong-selection message. The old default was about improper integrals.
- `widgetArc` (`#widget-arc`) takes 6 presets. It draws a chord polygon and highlights one piece with its legs Δx and Δy. The bottom graph shows either chord bars (chord ÷ Δx, whose total area is the polygon length) or the Trapezoid Rule. `_set(k, n, piece, over)` sets it; `_last = {poly, trap, exact, chord1, piece}`.
- `widgetVolume` (`#widget-volume`) takes 6 presets, and its axis position is draggable. The exact volume uses V(c) = π|I₂ − 2c·I₁| for any axis outside the region, and the notebook checks this against direct integration. `_set(k, c, n, s)` sets it; `_last = {valid, R, r, A, sum, exact}`.
- Helpers:
  - `drawSolid(P, spec, c, n)` draws an oblique stack of slabs using right endpoints, as on notes p. 5;
  - `fitEqual(P, pts, pad)` sets an equal-scale view.
- Static figures: `data-fig="arcpieces"` (L Learn) and `data-fig="coneslices"` (V Learn).
- CSS: see the "additions: §3.3 arc length, §3.5 volume" block in `styles.css`.

## Verification

- `study-guides/verification/verify_arclength_volume.ipynb`, executed with nbconvert, covers:
  - SymPy/mpmath and pasted Wolfram output;
  - distractors, quoted numbers and identities;
  - the explorers' exact values;
  - an audit of the built HTML against `guide_state_before_2026-09-25.json`: old answers unchanged, nothing lost.
- `test_guide.py` includes Widget L and Widget V checks against mpmath, plus the new answer, gating and guided-step checks.

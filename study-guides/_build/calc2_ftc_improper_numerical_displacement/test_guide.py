"""Headless-browser verification of the study guide (Edge via Playwright).
Checks: no JS/console errors, KaTeX rendered, widget math vs independent mpmath references,
interactive behaviour (answer checking, hints, gating, guided steps, persistence), screenshots."""
import json, math, os, sys, pathlib
import mpmath as mp
from playwright.sync_api import sync_playwright

mp.mp.dps = 30
HTML = pathlib.Path(r"C:\Users\chris\MathStudy\study-guides\calc2_study_guide_1.1-3.3.html")
SHOTS = pathlib.Path(__file__).with_name("test_output"); SHOTS.mkdir(exist_ok=True)
URL = HTML.as_uri()
results, fails = [], []

def ok(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    if not cond: fails.append((name, detail))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail else ""))

def num(s):
    s = s.replace("−", "-").split(" ")[0]
    if "×10^" in s:
        m, e = s.split("×10^"); return float(m) * 10 ** float(e)
    return float(s)

with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge", headless=True)
    ctx = browser.new_context(viewport={"width": 1400, "height": 1000}, device_scale_factor=1)
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.goto(URL); page.wait_for_load_state("load"); page.wait_for_timeout(800)

    # ---------------------------------------------------------------- health
    ok("no page/console errors on load", not errors, "; ".join(errors[:5]))
    ok("KaTeX: no render errors", page.locator(".katex-error").count() == 0, str(page.locator(".katex-error").count()))
    ok("KaTeX: math present", page.locator(".katex").count() > 2500, str(page.locator(".katex").count()))
    ok("10 topics in the navigation", page.locator(".nav a .letter.sec").count() == 10, str(page.locator(".nav a .letter.sec").count()))
    ok("11 diagnostic questions", page.locator("#diagnostic .mcq").count() == 11)
    ok("concept map: 23 concepts", page.locator("#concept-map .node").count() == 23, str(page.locator("#concept-map .node").count()))
    ok("every nav link has a target", page.evaluate("() => [...document.querySelectorAll('.nav a[href^=\"#\"]')].every(a => document.getElementById(a.getAttribute('href').slice(1)))"))
    ok("every in-page link has a target", page.evaluate("() => [...document.querySelectorAll('main a[href^=\"#\"]')].filter(a => !document.getElementById(a.getAttribute('href').slice(1))).map(a => a.getAttribute('href'))") == [])
    n_prob = page.locator(".problem").count()
    ok("every problem initialised (header added)", page.locator(".problem > .p-head").count() == n_prob, f"{n_prob} problems")
    ok("hints hidden initially", page.locator(".problem .hint:visible").count() == 0)
    ok("solutions hidden initially", page.locator(".problem .solution:visible").count() == 0)
    ok("KaTeX fonts embedded (no external URLs)", "url(fonts/" not in HTML.read_text(encoding="utf-8"))
    ok("no external http(s) resources", page.evaluate("""() => [...document.querySelectorAll('[src],link[href],script[src]')].filter(n => /^https?:/.test(n.getAttribute('src')||n.getAttribute('href')||'')).length""") == 0)

    # ---------------------------------------------------------------- parser
    cases = {"23/3": 23/3, "2sqrt(3)-2": 2*math.sqrt(3)-2, "pi/4": math.pi/4, "3cbrt(2)": 3*2**(1/3), "1/ln(3)": 1/math.log(3),
             "e^-1": math.exp(-1), "2√2": 2*math.sqrt(2), "pi^2/8": math.pi**2/8, "−10/3": -10/3, "6√3 − 6": 6*math.sqrt(3)-6,
             "0.7546": 0.7546, "3 + 3cbrt(2)": 3+3*2**(1/3), "18 + 2ln(7)": 18+2*math.log(7), "(1+2sqrt(3))/3": (1+2*math.sqrt(3))/3,
             "4-4sqrt(2)+12atan(1/sqrt(2))-3pi/2": 4-4*math.sqrt(2)+12*math.atan(1/math.sqrt(2))-3*math.pi/2, "π/3": math.pi/3, "π²/8": math.pi**2/8}
    for s, v in cases.items():
        r = page.evaluate("s => window.__guide.parseAnswer(s)", s)
        ok(f"parse {s!r}", r and "value" in r and abs(r["value"] - v) < 1e-12, str(r))
    for s in ["diverges", "DNE", "∞", "infinity", "Diverges to infinity", "does not converge"]:
        r = page.evaluate("s => window.__guide.parseAnswer(s)", s)
        ok(f"parse {s!r} as divergent", r and r.get("div") is True, str(r))
    r = page.evaluate("s => window.__guide.parseAnswer(s)", "2x+1")
    ok("parse rejects unknown symbols", r and r.get("err") is True, str(r))

    # ---------------------------------------------------------------- widget A
    refA = {0: (4, 1, 3, 5), 1: (2, 2, 0, 4), 2: (4/3, 4/3, 0, 8/3), 3: (2.5, 2.5, 0, 5), 4: (2, 2, 0, 4)}
    btns = page.locator("#widget-area .presets button")
    for k, (Ap, An, net, tot) in refA.items():
        btns.nth(k).click(); page.wait_for_timeout(60)
        vals = [num(t) for t in page.locator("#widget-area .stat .s-val").all_inner_texts()]
        ok(f"Widget A preset {k}: A+, A-, net, total", all(abs(a - b) < 1e-4 for a, b in zip(vals, (Ap, An, net, tot))), f"{vals} vs {(Ap, An, net, tot)}")
    ftc = page.locator("#widget-area .notice").inner_text()
    ok("Widget A FTC line matches net", "F(b) − F(a)" in ftc)

    # ---------------------------------------------------------------- widget B (vs mpmath quadrature)
    def refB(mode, fam, pp, e):
        if mode == "I":
            b = mp.mpf(10) ** e
            A = mp.quad(lambda x: mp.e ** (-x), [1, b]) if fam == "exp" else mp.quad(lambda x: x ** (-mp.mpf(pp)), mp.linspace(1, b, 2) if b < 10 else [1] + [mp.mpf(10) ** j for j in range(1, int(e) + 1)] + ([b] if b > mp.mpf(10) ** int(e) else []))
            L = mp.e ** -1 if fam == "exp" else (1 / (mp.mpf(pp) - 1) if pp > 1 + 1e-9 else mp.inf)
        else:
            a = mp.mpf(10) ** (-e)
            A = mp.quad(lambda x: x ** (-mp.mpf(pp)), [a, 1] if a > 0.1 else [a] + [mp.mpf(10) ** (-j) for j in range(int(e), 0, -1)] + [1])
            L = 1 / (1 - mp.mpf(pp)) if pp < 1 - 1e-9 else mp.inf
        return float(A), float(L)
    grid = [("I", "exp", 1.5, 1.0), ("I", "exp", 1.5, 3.2), ("I", "pow", 1.5, 1.3), ("I", "pow", 1.5, 6), ("I", "pow", 1.0, 2), ("I", "pow", 1.0, 6),
            ("I", "pow", 0.8, 2), ("I", "pow", 2.0, 4.5), ("I", "pow", 0.3, 3), ("II", "pow", 0.8, 2), ("II", "pow", 0.8, 6), ("II", "pow", 0.5, 4),
            ("II", "pow", 1.0, 3), ("II", "pow", 1.5, 2), ("II", "pow", 0.35, 5)]
    for mode, fam, pp, e in grid:
        last = page.evaluate("""([mode,fam,p,e]) => { const r = document.querySelector('#widget-improper'); Object.assign(r._state, {mode, fam, p, s: e, q: e}); r._sync(); r._render(); return r._last; }""", [mode, fam, pp, e])
        A, L = refB(mode, fam, pp, e)
        okA = abs(last["A"] - A) <= 1e-7 * max(1, abs(A))
        gotL = last["L"]
        okL = (L == float("inf") and (gotL is None or gotL == float("inf"))) or (L != float("inf") and gotL is not None and gotL != float("inf") and abs(gotL - L) < 1e-9)
        ok(f"Widget B {mode}/{fam}/p={pp}/10^{e}: area & limit", okA and okL, f"A={last['A']} ref={A}; L={last['L']} ref={L}")
    status = page.locator("#widget-improper .status-line").inner_text()
    ok("Widget B status text present", "Converges" in status or "Diverges" in status, status[:60])

    # ---------------------------------------------------------------- widget C (every function x rule x n vs mpmath)
    F = {"eneg": (lambda x: mp.e ** (-x * x), 0, 1), "circ": (lambda x: mp.sqrt(max(0, 1 - x * x)), -1, 1), "epos": (lambda x: mp.e ** (x * x), 0, 1), "li": (lambda x: 1 / mp.log(x), 2, 14)}
    def rule(r, f, a, b, n):
        a, b = mp.mpf(a), mp.mpf(b); dx = (b - a) / n
        if r == "mid": return dx * mp.fsum(f(a + (k - mp.mpf(1) / 2) * dx) for k in range(1, n + 1))
        if r == "trap": return dx / 2 * (f(a) + f(b) + 2 * mp.fsum(f(a + k * dx) for k in range(1, n)))
        return dx / 3 * (f(a) + f(b) + mp.fsum((4 if k % 2 else 2) * f(a + k * dx) for k in range(1, n)))
    worst, count = 0.0, 0
    for fk, (f, a, b) in F.items():
        for r in ("mid", "trap", "simp"):
            for n in range(1, 17):
                if r == "simp" and n % 2: continue
                js = page.evaluate("([r,f,n]) => { const R = document.querySelector('#widget-numeric')._rule(r,f,n); return R ? R.val : null; }", [r, fk, n])
                ref = float(rule(r, f, a, b, n)); worst = max(worst, abs(js - ref)); count += 1
    ok(f"Widget C: {count} rule/function/n combinations match mpmath", worst < 1e-12, f"worst abs diff {worst:.2e}")
    oddS = page.evaluate("() => document.querySelector('#widget-numeric')._rule('simp','eneg',5)")
    ok("Widget C: Simpson refuses odd n", oddS is None)
    trueVals = {"eneg": mp.quad(lambda x: mp.e ** (-x * x), [0, 1]), "circ": mp.pi / 2, "epos": mp.quad(lambda x: mp.e ** (x * x), [0, 1]), "li": mp.quad(lambda x: 1 / mp.log(x), [2, 14])}
    pb = page.locator("#widget-numeric .presets button")
    expected = [("eneg", "mid", 2), ("circ", "trap", 4), ("epos", "trap", 5), ("li", "simp", 6), ("eneg", "simp", 4)]
    for k, (fk, r, n) in enumerate(expected):
        pb.nth(k).click(); page.wait_for_timeout(60)
        shown = num(page.locator("#widget-numeric .stat .s-val").nth(0).inner_text())
        actual = num(page.locator("#widget-numeric .stat .s-val").nth(1).inner_text())
        ref = float(rule(r, *F[fk], n))
        ok(f"Widget C preset {k} ({fk},{r},n={n}) display", abs(shown - ref) < 1e-6 and abs(actual - float(trueVals[fk])) < 1e-6, f"shown {shown} ref {ref}; actual {actual} vs {float(trueVals[fk])}")
    # the notes p.37 preset must show the CORRECTED value 1/2 + sqrt(3)/2
    pb.nth(1).click(); page.wait_for_timeout(60)
    ok("Widget C notes p.37 preset shows 1.366025 (corrected value)", abs(num(page.locator("#widget-numeric .stat .s-val").nth(0).inner_text()) - (0.5 + math.sqrt(3) / 2)) < 1e-6)
    # odd n for Simpson -> warning visible
    page.evaluate("() => { const r = document.querySelector('#widget-numeric'); Object.assign(r._state, {fn:'eneg', rule:'simp', n:5}); r._sync(); r._render(); }")
    ok("Widget C odd-n warning shown", page.locator("#widget-numeric .notice.warn:visible").count() == 1)

    # ---------------------------------------------------------------- widget D (vs mpmath)
    pres = [(lambda t: 10 if t < 30 else -10, lambda t: 10 * t if t < 30 else 300 - 10 * (t - 30), 0, 60, [30]),
            (lambda t: t * t - 4 * t + 3, None, 0, 4, [1, 3]), (lambda t: 3 * t * t - 12 * t + 8, None, 0, 4, [2 - 2 * math.sqrt(3) / 3, 2 + 2 * math.sqrt(3) / 3]),
            (lambda t: math.cos(t), None, 0, 2 * math.pi, [math.pi / 2, 3 * math.pi / 2]),
            (lambda t: math.exp(t) - 2, None, 0, 1, [math.log(2)]), (lambda t: t * t - t - 2, None, 0, 4, [2]),
            (lambda t: 1 - 2 * math.cos(t), None, 0, math.pi, [math.pi / 3])]
    for k, (v, P, a, b, zs) in enumerate(pres):
        for frac in (0.13, 0.37, 0.5, 0.81, 1.0):
            t = a + (b - a) * frac
            last = page.evaluate("([k,t]) => { const r = document.querySelector('#widget-motion'); r._set(k,t); return r._last; }", [k, t])
            pts = [a] + [z for z in zs if a < z < t] + [t]
            disp = float(mp.fsum(mp.quad(lambda s: v(float(s)), [pts[i], pts[i + 1]]) for i in range(len(pts) - 1)))
            dist = float(mp.fsum(abs(mp.quad(lambda s: v(float(s)), [pts[i], pts[i + 1]])) for i in range(len(pts) - 1)))
            ok(f"Widget D preset {k} at t={t:.3f}: displacement & distance", abs(last["disp"] - disp) < 1e-6 and abs(last["dist"] - dist) < 1e-6, f"{last} vs disp {disp} dist {dist}")


    # ---------------------------------------------------------------- widget U: antiderivative family & derivative check
    FU = [(lambda x: 10 * x ** 9, 0.8), (lambda t: 3 * math.sin(t) - 5 / (t * t + 1), 1.2), (lambda x: math.sqrt(1 + math.log(x)) / (3 * x), 2.0),
          (lambda t: 2 * t ** 7 * math.cos(t ** 8 + 1), 0.9), (lambda x: x * x * math.exp(-(x ** 3)), 0.7)]
    for k, (f, x0) in enumerate(FU):
        last = page.evaluate("([k,x0]) => { const r = document.querySelector('#widget-anti'); r._set(k, x0, 0); return r._last; }", [k, x0])
        ok(f"Widget U preset {k}: slope at x0 = f(x0)", abs(last["slope"] - f(x0)) < 1e-9, f"{last} vs {f(x0)}")
    page.evaluate("() => document.querySelector('#widget-anti')._set(3, 0.9, 0)")
    msg = page.evaluate("() => document.querySelector('#widget-anti')._check('sin(t^8+1)')")
    ok("Widget U check: sin(t^8+1) -> exactly 4 × f", "4 × f" in msg, msg[:80])
    msg = page.evaluate("() => document.querySelector('#widget-anti')._check('(1/4)sin(t^8+1) + C')")
    ok("Widget U check: correct antiderivative -> matches", "matches f everywhere" in msg, msg[:80])
    page.evaluate("() => document.querySelector('#widget-anti')._set(4, 0.7, 0)")
    msg = page.evaluate("() => document.querySelector('#widget-anti')._check('(1/3)e^(-x^3)')")
    ok("Widget U check: sign slip -> 'the sign is flipped'", "sign is flipped" in msg, msg[:80])

    # ---------------------------------------------------------------- widget P: parts as area (vs mpmath)
    PP = [(lambda x: x, lambda x: mp.e ** x, lambda x: 1, lambda x: mp.e ** x, 0, 2), (mp.log, lambda x: x ** 5 / 5, lambda x: 1 / x, lambda x: x ** 4, 1, 2),
          (mp.atan, lambda p: p * p, lambda p: 1 / (1 + p * p), lambda p: 2 * p, 0, 2), (mp.asin, lambda x: x, lambda x: 1 / mp.sqrt(1 - x * x), lambda x: 1, 0, 0.95)]
    for k, (u, v, du, dv, lo, hi) in enumerate(PP):
        for fa, fb in ((0.0, 0.5), (0.2, 0.9), (0.0, 1.0)):
            a, b = lo + (hi - lo) * fa, lo + (hi - lo) * fb
            last = page.evaluate("([k,a,b]) => { const r = document.querySelector('#widget-parts'); r._set(k, a, b); return r._last; }", [k, a, b])
            vdu = float(mp.quad(lambda x: v(x) * du(x), [a, b])); udv = float(mp.quad(lambda x: u(x) * dv(x), [a, b])); uv = float(u(b) * v(b) - u(a) * v(a))
            ok(f"Widget P preset {k} on [{a:.3g},{b:.3g}]: ∫v du, ∫u dv, [uv]", abs(last["vdu"] - vdu) < 1e-9 and abs(last["udv"] - udv) < 1e-9 and abs(last["uv"] - uv) < 1e-12 and abs(vdu + udv - uv) < 1e-9, f"{last} vs {vdu}, {udv}, {uv}")
    page.evaluate("() => document.querySelector('#widget-parts')._set(0, 0, 1)")
    ok("Widget P notes p.8 on [0,1]: e − 1, 1, e (the What-to-notice numbers)", abs(page.evaluate("() => document.querySelector('#widget-parts')._last.vdu") - (math.e - 1)) < 1e-9)

    # ---------------------------------------------------------------- widget R: partial fractions identities
    for k in range(5):
        ok(f"Widget R preset {k}: pieces add up to f", page.evaluate("k => { const r = document.querySelector('#widget-pf'); r._set(k); return r._last.match; }", k) is True)
    ok("Widget R: switching a piece off breaks the match", page.evaluate("() => { const r = document.querySelector('#widget-pf'); r._set(2, [true, true, false]); return r._last.match; }") is False)
    page.evaluate("() => document.querySelector('#widget-pf')._set(0)")

    # ---------------------------------------------------------------- widget E: path explorer (vs mpmath)
    def spd(vf): return lambda t: mp.sqrt(sum(c * c for c in vf(t)))
    PE = [(lambda t: [-4 * mp.sin(4 * t), 4 * mp.cos(4 * t), 3], lambda t: [mp.cos(4 * t), mp.sin(4 * t), 3 * t], 0, 2 * mp.pi),
          (lambda t: [12, 12 * mp.sqrt(t), 6 * t], lambda t: [12 * t, 8 * t ** 1.5, 3 * t * t], 0, 1),
          (lambda t: [3 * t * t, t, 0], lambda t: [t ** 3, t * t / 2, 0], 0, 3),
          (lambda t: [1, -t / mp.sqrt(1 - t * t), 0], lambda t: [t, mp.sqrt(1 - t * t), 0], -1, 1),
          (lambda t: [mp.sin(t), mp.cos(t), 0], lambda t: [-mp.cos(t), mp.sin(t), 0], 0, mp.pi),
          (lambda t: [0.6 * (2 * t - 2), 0.8 * (2 * t - 2), 0], lambda t: [0.6 * (t * t - 2 * t), 0.8 * (t * t - 2 * t), 0], 0, 3),
          (lambda t: [t + 3, mp.sqrt(2 * t), mp.sqrt(7)], lambda t: [t * t / 2 + 3 * t, (2 * mp.sqrt(2) / 3) * t ** 1.5, mp.sqrt(7) * t], 1, 5)]   # 3.3–3.5 notes p. 1
    for k, (vf, pf, a, b) in enumerate(PE):
        for frac in (0.3, 0.7, 1.0):
            t = a + (b - a) * frac
            last = page.evaluate("([k,t]) => { const r = document.querySelector('#widget-path'); r._set(k, t); return r._last; }", [k, float(t)])
            s_ = spd(vf); brk = [a, 0, t] if (k == 5 and t > 1) else ([a, (a + t) / 2, t] if k == 3 else [a, t])
            if k == 5 and t > 1: brk = [a, 1, t]
            dist = float(mp.quad(s_, brk)); P0, Pt = pf(a), pf(t); ln = float(mp.sqrt(sum((x1 - x0) ** 2 for x0, x1 in zip(P0, Pt))))
            ok(f"Widget E preset {k} at t={float(t):.3f}: distance & |displacement|", abs(last["dist"] - dist) < 1e-6 and abs(last["len"] - ln) < 1e-9 and last["len"] <= last["dist"] + 1e-9, f"{last['dist']},{last['len']} vs {dist},{ln}")
    page.evaluate("() => document.querySelector('#widget-path')._set(0, 2 * Math.PI)")
    L = page.evaluate("() => document.querySelector('#widget-path')._last")
    ok("Widget E helix at 2π: distance 10π, |displacement| 6π", abs(L["dist"] - 10 * math.pi) < 1e-9 and abs(L["len"] - 6 * math.pi) < 1e-9, str(L))
    page.evaluate("() => document.querySelector('#widget-path')._set(5, 3)")
    L = page.evaluate("() => document.querySelector('#widget-path')._last")
    ok("Widget E line preset at t=3: distance 5, |displacement| 3", abs(L["dist"] - 5) < 1e-9 and abs(L["len"] - 3) < 1e-9, str(L))
    page.evaluate("() => document.querySelector('#widget-path')._set(6, 5)")
    L = page.evaluate("() => document.querySelector('#widget-path')._last")
    ok("Widget E notes p.1 preset at t=5: distance 28, |displacement| 27.9307", abs(L["dist"] - 28) < 1e-9 and abs(L["len"] - 27.930697094774) < 1e-9, str(L))

    # ---------------------------------------------------------------- widget L: arc length explorer (vs mpmath)
    AL = [("graph", lambda x: mp.mpf(2) / 3 * (x + 4) ** 1.5, lambda x: mp.sqrt(x + 4), 4, 11, mp.mpf(74) / 3),
          ("param", (mp.cos, mp.sin), (lambda t: -mp.sin(t), mp.cos), 0, mp.pi, mp.pi),
          ("graph", mp.sin, mp.cos, 0, 2 * mp.pi, None),
          ("graph", lambda x: mp.mpf(2) / 3 * x ** 1.5, mp.sqrt, 0, 8, mp.mpf(52) / 3),
          ("graph", lambda x: x ** 3 / 12 + 1 / x, lambda x: x * x / 4 - 1 / (x * x), 1, 2, mp.mpf(13) / 12),
          ("param", (mp.cos, mp.sin), (lambda t: -mp.sin(t), mp.cos), 0, 4 * mp.pi, 4 * mp.pi)]
    worstL, nL = 0.0, 0
    for k, (kind, f, df, a, b, ex) in enumerate(AL):
        P = (lambda u: (u, f(u))) if kind == "graph" else (lambda u: (f[0](u), f[1](u)))
        gI = (lambda u: mp.sqrt(1 + df(u) ** 2)) if kind == "graph" else (lambda u: mp.sqrt(df[0](u) ** 2 + df[1](u) ** 2))
        exact = ex if ex is not None else mp.quad(gI, [0, mp.pi / 2, mp.pi, 3 * mp.pi / 2, 2 * mp.pi])
        for n in (1, 2, 4, 7, 16, 48):
            last = page.evaluate("([k,n]) => { const r = document.querySelector('#widget-arc'); r._set(k, n, 1, 'bars'); return r._last; }", [k, n])
            nodes = [P(a + (b - a) * mp.mpf(i) / n) for i in range(n + 1)]
            poly = mp.fsum(mp.sqrt((nodes[i][0] - nodes[i - 1][0]) ** 2 + (nodes[i][1] - nodes[i - 1][1]) ** 2) for i in range(1, n + 1))
            h = (b - a) / n; trap = h / 2 * (gI(a) + gI(b) + 2 * mp.fsum(gI(a + i * h) for i in range(1, n)))
            worstL = max(worstL, abs(last["poly"] - float(poly)), abs(last["trap"] - float(trap)), abs(last["exact"] - float(exact))); nL += 1
            if last["poly"] > last["exact"] + 1e-12: worstL = max(worstL, 1.0)   # the polygon can never be longer than the curve
    ok(f"Widget L: polygon, Trapezoid and exact values match mpmath ({nL} preset/n combinations; polygon ≤ arc length)", worstL < 1e-9, f"worst {worstL:.2e}")
    last = page.evaluate("() => { const r = document.querySelector('#widget-arc'); r._set(2, 4, 1, 'trap'); return r._last; }")
    ok("Widget L notes p.4 preset: T4 = π(√2 + 1) (the notes' answer)", abs(last["trap"] - math.pi * (math.sqrt(2) + 1)) < 1e-12, str(last["trap"]))
    last = page.evaluate("() => { const r = document.querySelector('#widget-arc'); r._set(0, 1, 1, 'bars'); return r._last; }")
    ok("Widget L notes p.3 preset: the n = 1 chord is within 0.01 of 74/3", 0 < 74 / 3 - last["poly"] < 0.01, str(last["poly"]))
    ok("Widget L retrace preset shows the 'goes around twice' warning", page.evaluate("() => { const r = document.querySelector('#widget-arc'); r._set(5, 12, 1, 'bars'); return !r.querySelector('.notice.warn').hidden; }") is True)

    # ---------------------------------------------------------------- widget V: volume explorer (vs mpmath)
    VP = [("h", lambda s: 2 * s, lambda s: 0 * s, 0, 2, 0, 4), ("h", lambda s: 2 * s, lambda s: s, 0, 2, 0, 4), ("h", lambda s: s * s, lambda s: 0 * s, 0, 2, 0, 4),
          ("h", lambda s: s, lambda s: s * s, 0, 1, 0, 1), ("h", lambda s: s, lambda s: s * s, 0, 1, 0, 1), ("v", mp.sqrt, lambda s: s, 0, 1, 0, 1)]
    worstV, nV = 0.0, 0
    for k, (ax, up, lo, a, b, m, M) in enumerate(VP):
        for c in (m - 2, m - 1, m - 0.5, m, M, M + 1, M + 2.5):
            for n in (1, 3, 8, 40):
                cc = mp.mpf(c)
                Rr = lambda s: (max(abs(up(s) - cc), abs(lo(s) - cc)), min(abs(up(s) - cc), abs(lo(s) - cc)))
                A = lambda s: mp.pi * (Rr(s)[0] ** 2 - Rr(s)[1] ** 2)
                ref_sum = mp.fsum(A(a + (b - a) * mp.mpf(i) / n) * (b - a) / n for i in range(1, n + 1))
                ref_exact = mp.quad(A, [a, (a + b) / 2, b])
                sv = a + 0.37 * (b - a)
                last = page.evaluate("([k,c,n,s]) => { const r = document.querySelector('#widget-volume'); r._set(k, c, n, s); return r._last; }", [k, c, n, sv])
                R0, r0 = Rr(mp.mpf(sv))
                worstV = max(worstV, abs(last["sum"] - float(ref_sum)), abs(last["exact"] - float(ref_exact)), abs(last["R"] - float(R0)), abs(last["r"] - float(r0))); nV += 1
                if not last["valid"]: worstV = 1.0
    ok(f"Widget V: slab sums, exact volumes and R, r match mpmath ({nV} preset/axis/n combinations)", worstV < 1e-9, f"worst {worstV:.2e}")
    last = page.evaluate("() => { const r = document.querySelector('#widget-volume'); r._set(1, 2, 6); return r._last; }")
    ok("Widget V refuses an axis through the region (notes p.7 region, y = 2)", last["valid"] is False and page.locator("#widget-volume .notice.warn:visible").count() == 1)
    exp = {0: 32 * math.pi / 3, 1: 8 * math.pi, 2: 32 * math.pi / 5, 3: 2 * math.pi / 15, 4: 8 * math.pi / 15, 5: math.pi / 6}
    for k, v in exp.items():
        last = page.evaluate("k => { const r = document.querySelector('#widget-volume'); r._set(k); return r._last; }", k)
        ok(f"Widget V preset {k}: default-axis volume = the guide's answer", abs(last["exact"] - v) < 1e-12, f"{last['exact']} vs {v}")
    page.evaluate("() => document.querySelector('#widget-volume')._set(1, -1, 10)")
    ok("Widget V moved axis: the R, r description says 2x + 1 and x + 1, and 12π", all(s in page.locator("#widget-volume .w-line").first.inner_text() for s in ("2x + 1", "x + 1", "12π")), page.locator("#widget-volume .w-line").first.inner_text()[:120])

    # ---------------------------------------------------------------- typed antiderivatives (browser end-to-end)
    def answer1(pid, value):
        prob = page.locator(f'.problem[data-pid="{pid}"]')
        prob.locator("input.ans").first.fill(value); prob.locator("button.check").click(); page.wait_for_timeout(40)
        return prob.locator(".feedback .fb").first
    fb = answer1("U-indep", "(11 + sin x)^(11/8)"); ok("U-indep missing 8/11 -> 'exactly 11/8 ×' message", "11/8" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("U-indep", "(8/11)u^(11/8)"); ok("U-indep answer still in u -> 'convert back' message", "convert back" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("U-indep", "(8/11)(11+sin(x))^(11/8) + C"); ok("U-indep correct antiderivative accepted", "good" in (fb.get_attribute("class") or ""), fb.inner_text()[:60])
    fb = answer1("P-indep", "-(t/2)cos(2t) - (1/4)sin(2t)"); ok("P-indep sign slip -> targeted message", "signs" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("P-indep", "-(t/2)cos(2t)+(1/4)sin(2t)"); ok("P-indep correct (no +C) -> accepted with a +C reminder", "good" in (fb.get_attribute("class") or "") and "+ C" in fb.inner_text(), fb.inner_text()[:120])
    fb = answer1("R-indep", "6ln|t+8| - 5ln|t-2|"); ok("R-indep swapped coefficients -> targeted message", "swapped" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("R-indep", "-5ln(t+8) + 6ln(t-2)"); ok("R-indep correct without |·| -> accepted with an absolute-value reminder", "good" in (fb.get_attribute("class") or "") and "absolute value" in fb.inner_text(), fb.inner_text()[:160])
    fb = answer1("E-indep", "sqrt(217)"); ok("E-indep |p(1) − p(0)| -> 'length of the displacement' message", "length of the displacement" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("E-indep", "15"); ok("E-indep 15 -> correct", "good" in (fb.get_attribute("class") or ""))
    mu = page.locator('.problem[data-pid="mixed-U1"]')
    ok("mixed-U1: answer box hidden until the method is chosen", not mu.locator(".answers").is_visible())
    mu.locator(".mcq .opt").first.click(); page.wait_for_timeout(40)
    fb = answer1("mixed-U1", "-ln|cos θ| + C"); ok("mixed-U1 θ answer accepted", "good" in (fb.get_attribute("class") or ""), fb.inner_text()[:80])

    # guided step with an expression input
    g = page.locator('.guided[data-gid="U-guided"]')
    g.locator(".gstep").nth(0).locator(".opt").first.click(); page.wait_for_timeout(40)
    g.locator(".gstep").nth(0).get_by_role("button", name="Next step →").click(); page.wait_for_timeout(60)
    st2 = g.locator(".gstep").nth(1); st2.locator("input.ans").fill("5t^4"); st2.get_by_role("button", name="Check").click(); page.wait_for_timeout(40)
    ok("guided U step 2: du = 5t^4 dt accepted", st2.locator(".greveal").is_visible())

    # tryouts
    tr = page.locator("#U-explore .tryout").first
    ok("tryout: results hidden initially", tr.locator(".try-res:visible").count() == 0)
    tr.locator(".try-opt").nth(1).click(); page.wait_for_timeout(30)
    ok("tryout: clicking a choice reveals its result", tr.locator(".try-res").nth(1).is_visible() and tr.locator(".try-res:visible").count() == 1)
    ok("tryouts present in every new topic", all(page.locator(f"#{T}-explore .tryout").count() >= 1 for T in "UPRELV"))

    # ---------------------------------------------------------------- new topics L and V: answers, gating, guided steps, custom multi-select message
    fb = answer1("L-indep", "196/3"); ok("L-indep 4× too big -> 'du = 4 dx' message", "4 times too big" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("L-indep", "49/3"); ok("L-indep 49/3 -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer1("V-indep", "9pi/70"); ok("V-indep π(R − r)² value -> targeted message", "(R − r)" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("V-indep", "-3pi/10"); ok("V-indep negative -> 'R and r are swapped'", "swapped" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("V-indep", "3pi/10"); ok("V-indep 3π/10 -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer1("E-p11", "27.9307"); ok("E-p11 |displacement| -> targeted message", "length of the displacement" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer1("E-p11", "28"); ok("E-p11 28 -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer1("F-V3", "diverges"); ok("F-V3 'diverges' -> told the volume is finite", "finite" in fb.inner_text().lower() or "converge" in fb.inner_text().lower(), fb.inner_text()[:90])
    fb = answer1("F-V3", "2pi"); ok("F-V3 2π -> correct", "good" in (fb.get_attribute("class") or ""))
    ml = page.locator('.problem[data-pid="mixed-L1"]')
    ok("mixed-L1: answer box hidden until the method is chosen", not ml.locator(".answers").is_visible())
    ml.locator(".mcq .opt").first.click(); page.wait_for_timeout(40)
    fb = answer1("mixed-L1", "12"); ok("mixed-L1 answer 12 accepted after choosing the method", "good" in (fb.get_attribute("class") or ""))
    gv = page.locator('.guided[data-gid="V-guided"]')
    for i in range(2):
        gv.locator(".gstep").nth(i).locator(".opt").first.click(); page.wait_for_timeout(30)
        gv.locator(".gstep").nth(i).get_by_role("button", name="Next step →").click(); page.wait_for_timeout(50)
    for i, (val, name) in enumerate([("2x", "R"), ("x", "r")], start=2):
        st_ = gv.locator(".gstep").nth(i); st_.locator("input.ans").fill(val); st_.get_by_role("button", name="Check").click(); page.wait_for_timeout(30)
        st_.get_by_role("button", name="Next step →").click(); page.wait_for_timeout(50)
    st5 = gv.locator(".gstep").nth(4)
    st5.locator("input.ans").fill("pi x^2"); st5.get_by_role("button", name="Check").click(); page.wait_for_timeout(30)
    ok("guided V step 5: π(R − r)² expression -> targeted message", "(R − r)" in st5.locator(".feedback").inner_text(), st5.locator(".feedback").inner_text()[:90])
    st5.locator("input.ans").fill("pi(4x^2 - x^2)"); st5.get_by_role("button", name="Check").click(); page.wait_for_timeout(30)
    ok("guided V step 5: π(4x² − x²) accepted", st5.locator(".greveal").is_visible())
    gl = page.locator('.guided[data-gid="L-guided"]')
    gl.locator(".gstep").nth(0).locator(".opt").first.click(); page.wait_for_timeout(30)
    gl.locator(".gstep").nth(0).get_by_role("button", name="Next step →").click(); page.wait_for_timeout(50)
    s2 = gl.locator(".gstep").nth(1); s2.locator("input.ans").fill("sqrt(x+4)"); s2.get_by_role("button", name="Check").click(); page.wait_for_timeout(30)
    ok("guided L step 2: g′(x) = sqrt(x + 4) accepted", s2.locator(".greveal").is_visible())
    q = page.locator('.mcq[data-qid="L-m1"]')
    q.locator(".opt").nth(1).click(); q.get_by_role("button", name="Check selection").click(); page.wait_for_timeout(30)
    ok("multi-select L-m1 wrong selection -> the topic's own hint (not the improper-integral one)", "√(1 + f′²)" in q.locator(".feedback").inner_text(), q.locator(".feedback").inner_text()[:100])
    q.locator(".opt").nth(1).click(); q.locator(".opt").nth(0).click(); q.locator(".opt").nth(2).click(); q.get_by_role("button", name="Check selection").click(); page.wait_for_timeout(30)
    ok("multi-select L-m1 right selection -> correct", "good" in (q.locator(".feedback .fb").first.get_attribute("class") or ""))

    # ---------------------------------------------------------------- problems: answer checking + targeted feedback
    def answer(pid, values):
        prob = page.locator(f'.problem[data-pid="{pid}"]')
        ins = prob.locator("input.ans")
        for i, val in enumerate(values): ins.nth(i).fill(val)
        prob.locator("button.check").click(); page.wait_for_timeout(40)
        return prob.locator(".feedback .fb").first
    fb = answer("A-indep", ["-3"]); ok("A-indep wrong -3 -> targeted message", "net integral" in fb.inner_text(), fb.inner_text()[:80])
    fb = answer("A-indep", ["23/3"]); ok("A-indep 23/3 -> correct", "good" in (fb.get_attribute("class") or ""), fb.inner_text()[:60])
    ok("A-indep status 'Solved independently' (no hints used)", "independently" in page.locator('.problem[data-pid="A-indep"] .p-status').inner_text())
    ok("A-indep reflection panel appears", page.locator('.problem[data-pid="A-indep"] .reflect:visible').count() == 1)
    fb = answer("B-indep", ["-2"]); ok("B-indep -2 -> 'F(2) − F(0)' message", "F(2) − F(0)" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("B-indep", ["diverges"]); ok("B-indep 'diverges' -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer("B-p2", ["diverges"]); ok("B-p2 'diverges' -> told it converges", "finite value" in fb.inner_text(), fb.inner_text()[:80])
    fb = answer("C-indep", ["1.366"]); ok("C-indep Trapezoid value -> targeted message", "Trapezoid" in fb.inner_text(), fb.inner_text()[:80])
    fb = answer("C-p5", ["0.6932"]); ok("C-p5 0.6932 -> 'very close' (not the ln 2 message)", "close" in fb.inner_text().lower() and "ln 2 itself" not in fb.inner_text(), fb.inner_text()[:80])
    fb = answer("C-p5", ["0.693147"]); ok("C-p5 ln 2 -> 'That is ln 2 itself'", "ln 2 itself" in fb.inner_text(), fb.inner_text()[:80])
    fb = answer("C-p5", ["14411/20790"]); ok("C-p5 exact fraction -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer("D-indep", ["5", "5"]); ok("D-indep distance=5 -> 'That is the displacement'", "displacement" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("D-indep", ["5", "13"]); ok("D-indep 5 and 13 -> correct", "good" in (fb.get_attribute("class") or ""))
    fb = answer("A-p2", ["0", "0"]); ok("A-p2 total=0 -> 'net integral' message", "net integral" in fb.inner_text())

    # hint flow on a fresh problem
    prob = page.locator('.problem[data-pid="A-p4"]')
    prob.get_by_role("button", name="I'm stuck").click(); page.wait_for_timeout(40)
    ok("stuck: 'what do you know' panel opens", prob.locator(".know-panel:visible").count() == 1)
    prob.get_by_role("button", name="Show hint 1 of 3").click(); page.wait_for_timeout(40)
    ok("stuck: hint 1 revealed, hint 2 still hidden", prob.locator(".hint").nth(0).is_visible() and not prob.locator(".hint").nth(1).is_visible())
    prob.get_by_role("button", name="Show full solution").click(); page.wait_for_timeout(40)
    ok("solution gated before an attempt (gentle note shown)", prob.locator(".solution:visible").count() == 0 and prob.locator(".gentle:visible").count() >= 1)
    prob.get_by_role("button", name="Show full solution").click(); page.wait_for_timeout(40)
    ok("solution revealed on second request", prob.locator(".solution:visible").count() == 1)
    fb = answer("A-p4", ["78"]); ok("A-p4 solved after help -> 'with help' status", "with help" in prob.locator(".p-status").inner_text())
    ok("tutor prompt mentions hints used", "hints" in prob.locator(".prompt-text").inner_text())

    # mixed gating
    m1 = page.locator('.problem[data-pid="mixed-1"]')
    ok("mixed: answer box hidden until method chosen", not m1.locator(".answers").is_visible())
    m1.locator(".mcq .opt").first.click(); page.wait_for_timeout(40)
    ok("mixed: answer box opens after choosing", m1.locator(".answers").is_visible())
    fb = answer("mixed-1", ["18+2ln(7)"]); ok("mixed-1 exact answer accepted", "good" in (fb.get_attribute("class") or ""))

    # guided stepper
    g = page.locator('.guided[data-gid="A-guided"]')
    ok("guided: only step 1 visible initially", g.locator(".gstep:visible").count() == 1)
    g.locator(".gstep").nth(0).locator(".opt").first.click(); page.wait_for_timeout(40)
    ok("guided: explanation revealed after answering", g.locator(".gstep").nth(0).locator(".greveal").is_visible())
    g.locator(".gstep").nth(0).get_by_role("button", name="Next step →").click(); page.wait_for_timeout(60)
    ok("guided: step 2 appears", g.locator(".gstep:visible").count() == 2)

    # spot the error
    s = page.locator('.spot[data-sid="A-spot1"]')
    s.locator(".sline").nth(0).click(); ok("spot: fine line marked fine", "fine" in (s.locator(".sline").nth(0).get_attribute("class") or ""))
    s.locator(".sline[data-bad]").click(); page.wait_for_timeout(30)
    ok("spot: explanation shown after finding the error", s.locator(".spot-explain").is_visible())

    # multi-select MCQ
    q = page.locator('.mcq[data-qid="A-m1"]')
    q.locator(".opt").nth(0).click(); q.locator(".opt").nth(3).click(); q.get_by_role("button", name="Check selection").click(); page.wait_for_timeout(30)
    ok("multi-select MCQ graded correct", "good" in (q.locator(".feedback .fb").first.get_attribute("class") or ""))

    # mastery report reflects L4 for topic A (A-indep solved alone); level needs L1..L3 too so just check the cell
    cells = page.locator("#masteryReport .c")
    ok("mastery report rendered 70 cells (10 topics × 7 levels)", cells.count() == 70, str(cells.count()))
    ok("mastery report: §2.4 (4th row) 'Solve alone' ✓", cells.nth(24).inner_text().strip() == "✓", cells.nth(24).inner_text())
    ok("mastery report: §1.1 substitution 'Solve alone' ✓ (U-indep solved without hints)", cells.nth(3).inner_text().strip() == "✓", cells.nth(3).inner_text())

    # progress persists across reload
    before = page.locator("#meterText").inner_text()
    page.reload(); page.wait_for_load_state("load"); page.wait_for_timeout(600)
    ok("progress persisted after reload", page.locator("#meterText").inner_text() == before and before != "0%", f"{before}")
    ok("solved state persisted after reload", "independently" in page.locator('.problem[data-pid="A-indep"] .p-status').inner_text())

    # theme toggle
    page.click("#themeBtn"); page.wait_for_timeout(50)
    t1 = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    page.click("#themeBtn"); page.wait_for_timeout(50)
    t2 = page.evaluate("() => document.documentElement.getAttribute('data-theme')")
    ok("theme toggle cycles light -> dark", t1 == "light" and t2 == "dark", f"{t1},{t2}")

    ok("no page/console errors after interaction", not errors, "; ".join(errors[:5]))

    # ---------------------------------------------------------------- screenshots (dark then light)
    def shot(sel, name):
        loc = page.locator(sel).first; loc.scroll_into_view_if_needed(); page.wait_for_timeout(120)
        loc.screenshot(path=str(SHOTS / name))
    shot("#widget-area", "dark_widgetA.png")
    page.click("#themeBtn"); page.wait_for_timeout(80)   # -> auto (headless default = light)
    page.evaluate("() => { document.documentElement.setAttribute('data-theme','light'); }")
    page.evaluate("() => window.scrollTo(0,0)"); page.wait_for_timeout(100)
    page.screenshot(path=str(SHOTS / "light_top.png"))
    shot("#concepts", "light_concepts.png")
    shot("#A-learn", "light_A_learn.png")
    shot("#A-understand .formula-card", "light_formula.png")
    shot("#widget-area", "light_widgetA.png")
    page.locator("#widget-improper .presets button").nth(1).click(); shot("#widget-improper", "light_widgetB.png")
    page.locator("#widget-numeric .presets button").nth(1).click(); shot("#widget-numeric", "light_widgetC.png")
    page.locator("#widget-motion .presets button").nth(1).click()
    page.evaluate("() => document.querySelector('#widget-motion')._set(1, 2.2)"); shot("#widget-motion", "light_widgetD.png")
    shot('.guided[data-gid="A-guided"]', "light_guided.png")
    shot('.problem[data-pid="A-indep"]', "light_problem_solved.png")
    shot('.problem[data-pid="A-p4"]', "light_problem_hints.png")
    shot("#C-learn", "light_C_learn.png")
    shot("#B-learn", "light_B_learn.png")
    shot("#D-learn", "light_D_learn.png")
    shot("#report", "light_report.png")
    for T in "UPRE":
        shot(f"#{T}-learn", f"light_{T}_learn.png"); shot(f"#{T}-understand", f"light_{T}_understand.png")
    page.evaluate("() => document.querySelector('#widget-anti')._set(0, 0.8, 0)"); shot("#widget-anti", "light_widgetU.png")
    page.evaluate("() => document.querySelector('#widget-parts')._set(0, 0.3, 1.2)"); shot("#widget-parts", "light_widgetP.png")
    page.evaluate("() => document.querySelector('#widget-pf')._set(4)"); shot("#widget-pf", "light_widgetR.png")
    page.evaluate("() => document.querySelector('#widget-path')._set(0, 3.5)"); shot("#widget-path", "light_widgetE.png")
    page.evaluate("() => document.querySelector('#widget-path')._set(3, 0.5)"); shot("#widget-path", "light_widgetE_semicircle.png")
    shot('.guided[data-gid="U-guided"]', "light_guided_U.png")
    shot('.problem[data-pid="R-indep"]', "light_problem_R.png")
    shot("#concepts", "light_concepts_8.png")
    shot("#final", "light_final_top.png")
    shot('.problem[data-pid="mixed-2"]', "light_mixed_gated.png")
    for T in "LV":
        shot(f"#{T}-learn", f"light_{T}_learn.png"); shot(f"#{T}-understand", f"light_{T}_understand.png"); shot(f"#{T}-compare", f"light_{T}_compare.png")
    page.evaluate("() => document.querySelector('#widget-arc')._set(2, 4, 2, 'trap')"); shot("#widget-arc", "light_widgetL.png")
    page.evaluate("() => document.querySelector('#widget-volume')._set(1, 0, 8)"); shot("#widget-volume", "light_widgetV.png")
    page.evaluate("() => document.querySelector('#widget-volume')._set(5, 0, 8)"); shot("#widget-volume", "light_widgetV_yaxis.png")
    shot("#report", "light_report_10.png")
    # mobile
    m = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2).new_page()
    m.goto(URL); m.wait_for_timeout(600); m.screenshot(path=str(SHOTS / "mobile_top.png"))
    m.locator("#widget-numeric").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-numeric").screenshot(path=str(SHOTS / "mobile_widgetC.png"))
    m.locator("#widget-path").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-path").screenshot(path=str(SHOTS / "mobile_widgetE.png"))
    m.locator("#widget-parts").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-parts").screenshot(path=str(SHOTS / "mobile_widgetP.png"))
    m.locator("#widget-arc").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-arc").screenshot(path=str(SHOTS / "mobile_widgetL.png"))
    m.locator("#widget-volume").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-volume").screenshot(path=str(SHOTS / "mobile_widgetV.png"))
    browser.close()

print(f"\n{sum(1 for r in results if r[1])}/{len(results)} checks passed")
json.dump({"passed": sum(1 for r in results if r[1]), "total": len(results), "fails": fails}, open(SHOTS / "results.json", "w"), indent=1)
sys.exit(1 if fails else 0)

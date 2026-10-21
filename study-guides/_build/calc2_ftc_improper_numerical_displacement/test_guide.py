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
    # reduced motion: the guide's smooth scrolling otherwise fights Playwright's scroll-into-view and makes clicks flaky
    ctx = browser.new_context(viewport={"width": 1400, "height": 1000}, device_scale_factor=1, reduced_motion="reduce")
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append("pageerror: " + str(e)))
    page.on("console", lambda m: errors.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
    page.goto(URL); page.wait_for_load_state("load"); page.wait_for_timeout(800)

    # ---------------------------------------------------------------- health
    ok("no page/console errors on load", not errors, "; ".join(errors[:5]))
    ok("KaTeX: no render errors", page.locator(".katex-error").count() == 0, str(page.locator(".katex-error").count()))
    ok("KaTeX: math present", page.locator(".katex").count() > 2500, str(page.locator(".katex").count()))
    ok("14 topics in the navigation", page.locator(".nav a .letter.sec").count() == 14, str(page.locator(".nav a .letter.sec").count()))
    ok("15 diagnostic questions", page.locator("#diagnostic .mcq").count() == 15)
    ok("concept map: 31 concepts", page.locator("#concept-map .node").count() == 31, str(page.locator("#concept-map .node").count()))
    ok("every topic has a nav level tag and tick that the app updates", all(page.locator(f"#lvl-{T}").count() == 1 and page.locator(f"#tick-{T}").count() == 1 for T in "UPRABCDELVSKGW"))
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

    # ---------------------------------------------------------------- widget S: cylindrical shells (vs mpmath; direct quadrature, not the widget's J0/J1 shortcut)
    def rel(js, ref, scale=None): return abs(js - float(ref)) / max(1.0, abs(float(ref if scale is None else scale)))   # relative to the size of the quantity (or of the object)
    SPre = [(0, 0, 1, lambda x: x - x * x, lambda x: 0 * x), (1, 1, 3, lambda x: 4 * x - x * x, lambda x: 3 + 0 * x), (4, 1, 3, lambda x: 4 * x - x * x, lambda x: 3 + 0 * x),
            (5, -2, 1, lambda x: 3 - x, lambda x: x * x + 1), (-2, 0, 2, lambda x: mp.sqrt(8 * x) + 1, lambda x: x * x + 1), (0, 0, 1, lambda x: 2 - x, mp.sqrt)]
    worstS, nS = 0.0, 0
    for k, (c0, a, b, up, lo) in enumerate(SPre):
        h = lambda x: up(x) - lo(x)
        for c in sorted({c0, a - 2, a - 0.5, a, b, b + 1.5}):
            for n in (1, 3, 8, 40):
                sv = a + 0.37 * (b - a)
                last = page.evaluate("([k,c,n,s]) => { const r = document.querySelector('#widget-shell'); r._set(k, c, n, s); return r._last; }", [k, c, n, sv])
                cc = mp.mpf(c); g = lambda x: 2 * mp.pi * abs(x - cc) * h(x); ds = mp.mpf(b - a) / n
                ref_sum = mp.fsum(g(a + j * ds) * ds for j in range(1, n + 1)); ref_exact = mp.quad(g, [a, (a + b) / 2, b])
                i = min(max(int(math.floor((sv - a) / float(ds) + 0.5)), 1), n); xs = a + i * ds
                worstS = max(worstS, rel(last["sum"], ref_sum), rel(last["exact"], ref_exact), abs(last["r"] - float(abs(xs - cc))), abs(last["h"] - float(h(xs)))); nS += 1
                if not last["valid"]: worstS = 1.0
    ok(f"Widget S: shell sums, exact volumes, r and h match mpmath ({nS} preset/axis/n combinations)", worstS < 1e-9, f"worst {worstS:.2e}")
    expS = {0: math.pi / 6, 1: 8 * math.pi / 3, 2: 16 * math.pi / 3, 3: 99 * math.pi / 2, 4: 232 * math.pi / 15, 5: 8 * math.pi / 15}
    for k, v in expS.items():
        last = page.evaluate("k => { const r = document.querySelector('#widget-shell'); r._set(k); return r._last; }", k)
        ok(f"Widget S preset {k}: default-axis volume = the guide's answer", abs(last["exact"] - v) < 1e-12, f"{last['exact']} vs {v}")
    last = page.evaluate("() => { const r = document.querySelector('#widget-shell'); r._set(1, 2, 6); return r._last; }")
    ok("Widget S refuses an axis through the region (x = 2 inside [1, 3])", last["valid"] is False and page.locator("#widget-shell .notice.warn:visible").count() == 1)
    page.evaluate("() => document.querySelector('#widget-shell')._set(0)")

    # ---------------------------------------------------------------- widget K: mass (vs mpmath)
    KPre = [("wire", 0, 2, lambda x: 3 * x * x, None, None), ("wire", 0, 4, lambda x: mp.e ** (-x), None, None), ("wire", 3, 4, lambda x: 2 * mp.e ** (3 * x), None, None),
            ("plate", 0, 2, lambda x: x, lambda x: x - x * x, lambda x: -x), ("plate", -1, 1, lambda x: mp.mpf(3) ** x, lambda x: 2 - x * x, lambda x: x * x),
            ("plate", 0, 3, lambda x: x * x + 1, lambda x: 0 * x, lambda x: 2 * x - 6)]
    worstK, nK = 0.0, 0
    for k, (kind, a, b, d, up, lo) in enumerate(KPre):
        lam = d if kind == "wire" else (lambda d, up, lo: (lambda x: d(x) * (up(x) - lo(x))))(d, up, lo)
        M = mp.quad(lam, [a, (a + b) / 2, b])
        xm = mp.findroot(lambda t: mp.quad(lam, [a, t]) - M / 2, (a + b) / 2)
        for n in (1, 5, 8, 40):
            dx = mp.mpf(b - a) / n; ref_sum = mp.fsum(lam(a + j * dx) * dx for j in range(1, n + 1))
            for fc in (0.0, 0.3, 0.5, 0.77, 1.0):
                c = a + fc * (b - a)
                last = page.evaluate("([k,n,c]) => { const r = document.querySelector('#widget-mass'); r._set(k, n, c); return r._last; }", [k, n, c])
                left = mp.quad(lam, [a, c]) if c > a else mp.mpf(0)
                i = min(max(math.ceil((c - a) / float(dx) - 1e-9), 1), n); xi = a + i * dx
                pm = d(xi) * dx * (1 if kind == "wire" else (up(xi) - lo(xi)))
                worstK = max(worstK, rel(last["sum"], ref_sum), rel(last["exact"], M), rel(last["left"], left, M), rel(last["right"], M - left, M), abs(last["xm"] - float(xm)), rel(last["pieceMass"], pm)); nK += 1
    ok(f"Widget K: piece sums, exact mass, mass left/right of the cut, xₘ and one piece's mass match mpmath ({nK} preset/n/cut combinations)", worstK < 1e-8, f"worst {worstK:.2e}")
    expK = {0: (8, 4 ** (1 / 3)), 1: (1 - math.exp(-4), math.log(2 / (1 + math.exp(-4)))), 2: (2 / 3 * (math.exp(12) - math.exp(9)), math.log((math.exp(12) + math.exp(9)) / 2) / 3), 3: (4 / 3, None), 5: (22.5, None)}
    for k, (Mv, xv) in expK.items():
        last = page.evaluate("k => { const r = document.querySelector('#widget-mass'); r._set(k); return r._last; }", k)
        ok(f"Widget K preset {k}: mass (and xₘ) = the guide's answer", rel(last["exact"], Mv) < 1e-12 and (xv is None or abs(last["xm"] - xv) < 1e-12), f"{last['exact']}, {last['xm']}")
    last = page.evaluate("() => { const r = document.querySelector('#widget-mass'); r._set(0, 8, 1); return r._last; }")
    ok("Widget K notes p. 2 cut at x = 1: 1 of the 8 units on the left (the What-to-notice numbers)", abs(last["left"] - 1) < 1e-9 and abs(last["right"] - 7) < 1e-9, str(last))
    last = page.evaluate("() => { const r = document.querySelector('#widget-mass'); r._set(1, 8, 2); return r._last; }")
    ok("Widget K textbook Ex. 3.7.6 cut at x = 2: 1 − e⁻² and e⁻² − e⁻⁴", abs(last["left"] - (1 - math.exp(-2))) < 1e-9 and abs(last["right"] - (math.exp(-2) - math.exp(-4))) < 1e-9, str(last))
    page.evaluate("() => document.querySelector('#widget-mass')._set(0)")

    # ---------------------------------------------------------------- widget G: balance / center of mass (vs mpmath)
    GPre = [("points", [(0, 30), (3, 60)], 0, 3), ("wire", lambda x: 4 * x * x + 2, 0, 3), ("wire", lambda x: 2 * mp.e ** (3 * x), 3, 4), ("wire", lambda x: mp.e ** (-x), 0, 4),
            ("plate", (lambda x: x * x, lambda x: 2 / (x * x), lambda x: 0 * x), 1, 2), ("plate", (lambda x: x, lambda x: x * x, lambda x: 1 + 0 * x), 1, 2),
            ("plate", (lambda x: mp.mpf(2) ** x, lambda x: 2 * x + 3, lambda x: x * x), -1, 3), ("plate", (lambda x: 1 + 0 * x, lambda x: 2 * x, lambda x: 0 * x), 0, 3)]
    worstG, nG, verdicts = 0.0, 0, []
    for k, (kind, spec, a, b) in enumerate(GPre):
        if kind == "points":
            M = mp.fsum(m for _, m in spec); Mx = mp.fsum(x * m for x, m in spec); My = mp.mpf(0); xm = None
        else:
            if kind == "wire": lam = spec; mid = lambda x: 0 * x
            else:
                d, up, lo = spec; lam = (lambda d, up, lo: (lambda x: d(x) * (up(x) - lo(x))))(d, up, lo); mid = (lambda up, lo: (lambda x: (up(x) + lo(x)) / 2))(up, lo)
            br = [a, (a + b) / 2, b]
            M = mp.quad(lam, br); Mx = mp.quad(lambda x: x * lam(x), br); My = mp.quad(lambda x: mid(x) * lam(x), br) if kind == "plate" else mp.mpf(0)
            xm = mp.findroot(lambda t: mp.quad(spec, [a, t]) - M / 2, (a + b) / 2) if kind == "wire" else None
        xbar, ybar = Mx / M, My / M
        for c in (a, a + 0.3 * (b - a), float(xbar), b):
            for dd in ((float(ybar), float(ybar) + 0.4) if kind == "plate" else (0,)):
                last = page.evaluate("([k,c,d]) => { const r = document.querySelector('#widget-balance'); r._set(k, c, d); return r._last; }", [k, c, dd])
                errs = [rel(last["M"], M), rel(last["Mx"], Mx), rel(last["xbar"], xbar), rel(last["net"], Mx - c * M, abs(Mx) + abs(c * M))]
                if kind == "plate": errs += [rel(last["My"], My), rel(last["ybar"], ybar), rel(last["netY"], My - dd * M, abs(My) + abs(dd * M))]
                if xm is not None: errs.append(abs(last["xm"] - float(xm)))
                worstG = max(worstG, *errs); nG += 1
                want = "balanced" if abs(c - float(xbar)) < 1e-12 else ("tips right" if c < float(xbar) else "tips left")
                verdicts.append(last["verdict"] == want)
    ok(f"Widget G: M, x̄M, ȳM, x̄, ȳ, both moments about the knife edges and xₘ match mpmath ({nG} preset/edge combinations)", worstG < 1e-8, f"worst {worstG:.2e}")
    ok("Widget G: balanced exactly at x̄, tips toward the heavy side elsewhere", all(verdicts), f"{verdicts.count(False)} wrong verdicts")
    expG = {0: (2, None), 1: (15 / 7, None), 2: ((11 * math.exp(12) - 8 * math.exp(9)) / (3 * (math.exp(12) - math.exp(9))), None), 3: ((1 - 5 * math.exp(-4)) / (1 - math.exp(-4)), None),
            4: (1.5, 0.5), 5: (232 / 135, 2), 7: (2, 2)}
    for k, (xv, yv) in expG.items():
        last = page.evaluate("k => { const r = document.querySelector('#widget-balance'); r._set(k); return r._last; }", k)
        ok(f"Widget G preset {k}: center of mass = the guide's answer", abs(last["xbar"] - xv) < 1e-12 and (yv is None or abs(last["ybar"] - yv) < 1e-12), f"{last['xbar']}, {last['ybar']}")
    page.evaluate("() => document.querySelector('#widget-balance')._set(0)")

    # ---------------------------------------------------------------- widget W: work (vs mpmath); slicing presets also checked as weight × rise of the center of mass
    g98 = mp.mpf("9.8")
    WPre = [("heli", lambda y: 2 + 0 * y, None, 50, 0, 50), ("rope", lambda y: 2 + 0 * y, None, 50, 0, 50),
            ("box", lambda y: 1000 * g98 * 25 + 0 * y, 12, 9, 2, None), ("down", lambda y: 1000 * g98 * mp.pi * (5 * y / 12) ** 2, 12, 12, 0, None),
            ("up", lambda y: 75 * mp.pi * ((100 - y) / 5) ** 2, 100, 80, 0, None), ("box", lambda y: mp.mpf("62.4") * 64 * mp.pi + 0 * y, 30, 10, 0, None),
            ("spring", lambda x: 30 * x, None, (0, 0.5), None, None), ("bucket", lambda y: 32 - y / 10, None, (0, 100), None, None)]
    worstW, nW = 0.0, 0
    for k, (shape, w, H, lvl, ex0, top) in enumerate(WPre):
        if shape in ("spring", "bucket"):
            a, b = lvl
            for n in (1, 4, 10, 40):
                last = page.evaluate("([k,n]) => { const r = document.querySelector('#widget-work'); r._set(k, n); return r._last; }", [k, n])
                dx = mp.mpf(b - a) / n
                worstW = max(worstW, rel(last["exact"], mp.quad(w, [a, b])), rel(last["sum"], mp.fsum(w(a + j * dx) * dx for j in range(1, n + 1)))); nW += 1
            continue
        combos = [(lvl, ex0)] if shape in ("heli", "rope") else [(lvl, ex0), (H / 2, ex0), (H, 0), (lvl, H / 8)]
        for L_, E_ in combos:
            dest = 50 if shape == "rope" else (None if shape == "heli" else H + E_)
            dist = (lambda y: 50 + 0 * y) if shape == "heli" else (lambda dest: (lambda y: dest - y))(dest)
            om = (lambda w, dist: (lambda y: w(y) * dist(y)))(w, dist)
            exact = mp.quad(om, [0, L_ / 2, L_]); wt = mp.quad(w, [0, L_]); yb = mp.quad(lambda y: y * w(y), [0, L_]) / wt
            for n in (1, 6, 25):
                last = page.evaluate("([k,n,l,e]) => { const r = document.querySelector('#widget-work'); r._set(k, n, 0.6, l, e); return r._last; }", [k, n, L_, E_])
                dy = mp.mpf(L_) / n; ref_sum = mp.fsum(om(j * dy) * dy for j in range(1, n + 1))
                worstW = max(worstW, rel(last["exact"], exact), rel(last["sum"], ref_sum), rel(last["weight"], wt), abs(last["ybar"] - float(yb)), rel(last["cm"], exact)); nW += 1
    ok(f"Widget W: exact work, Riemann sums, weight, center-of-mass height and the weight × rise check match mpmath ({nW} preset/depth/spout/n combinations)", worstW < 1e-8, f"worst {worstW:.2e}")
    expW = {0: 5000, 1: 2500, 2: 20947500, 3: 2940000 * math.pi, 4: 74880000 * math.pi, 5: 998400 * math.pi, 6: 3.75, 7: 2700}
    for k, v in expW.items():
        last = page.evaluate("k => { const r = document.querySelector('#widget-work'); r._set(k); return r._last; }", k)
        ok(f"Widget W preset {k}: default work = the guide's answer", rel(last["exact"], v) < 1e-12, f"{last['exact']} vs {v}")
    last = page.evaluate("() => { const r = document.querySelector('#widget-work'); r._set(7, 10); return r._last; }")
    ok("Widget W leaky bucket, n = 10: the bars give 2700 − 500/n = 2650 (the What-to-notice formula)", abs(last["sum"] - 2650) < 1e-9, str(last["sum"]))
    page.evaluate("() => document.querySelector('#widget-work')._set(0)")

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

    # ---------------------------------------------------------------- new topics S, K, G, W: answers, units, gating, guided steps, multi-selects
    good = lambda fb: "good" in (fb.get_attribute("class") or "")
    fb = answer("S-indep", ["2pi/3"]); ok("S-indep h = x -> 'the top curve only' message", "top curve only" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("S-indep", ["pi/6"]); ok("S-indep π/6 -> correct", good(fb))
    fb = answer("K-indep", ["9"]); ok("K-indep 9 -> 'that is the triangle’s area'", "area" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("K-indep", ["-22.5"]); ok("K-indep −22.5 -> 'the strip height has the wrong sign'", "wrong sign" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("K-indep", ["22.5"]); ok("K-indep 22.5 with no unit -> correct, with a 'write the units too' reminder", good(fb) and "write the units too" in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("K-indep", ["45/2 kg"]); ok("K-indep '45/2 kg' -> correct, no unit reminder", good(fb) and "units" not in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("K-indep", ["22.5 lb"]); ok("K-indep '22.5 lb' -> the number is accepted, but told the unit is kg", good(fb) and "check the units" in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("G-indep", ["1/3", "11/20", "0.9"]); ok("G-indep ȳ without the ½ -> targeted message", "½ is missing" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("G-indep", ["1/3", "11/20", "9/20"]); ok("G-indep (1/3, 11/20, 9/20) -> correct", good(fb))
    fb = answer("G-p1", ["(2/3)(e^12-e^9)", "(2/9)(11e^12-8e^9)", "11.157"]); ok("G-p1 x̄ ≈ 11.16 (the notes' p. 9 slip) -> 'not on the wire'", "not on the wire" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("G-p1", ["(2/3)(e^12-e^9)", "(2/9)(11e^12-8e^9)", "(11e^12-8e^9)/(3(e^12-e^9))"]); ok("G-p1 exact forms in e^12, e^9 -> correct", good(fb))
    fb = answer("W-indep", ["24460800"]); ok("W-indep × 9.8 -> 'already a weight' message", "already a weight" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("W-indep", ["2,496,000 ft-lb"]); ok("W-indep '2,496,000 ft-lb' (commas and a unit) -> correct", good(fb) and "units" not in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("W-p4", ["2.5", "45"]); ok("W-p4 k and W left in inches -> both targeted messages", "lb per inch" in fb.inner_text() and "inch-pounds" in fb.inner_text(), fb.inner_text()[:160])
    fb = answer("W-p4", ["30 lb/ft", "15/4 ft·lb"]); ok("W-p4 '30 lb/ft' and '15/4 ft·lb' -> correct, no unit reminder", good(fb) and "units" not in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("W-p8", ["180 N·m"]); ok("W-p8 '180 N·m' -> correct (N·m counts as J)", good(fb) and "check the units" not in fb.inner_text(), fb.inner_text()[:140])
    fb = answer("W-p7", ["1350"]); ok("W-p7 ∫F dt = 1350 -> 'change variables with y = 2t'", "y = 2t" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("F-W3", ["6860"]); ok("F-W3 whole cable lifted 10 m -> targeted message", "10 − y" in fb.inner_text(), fb.inner_text()[:90])
    fb = answer("F-W3", ["5880 J"]); ok("F-W3 '5880 J' -> correct", good(fb))
    mk = page.locator('.problem[data-pid="mixed-K1"]')
    ok("mixed-K1: answer box hidden until the method is chosen", not mk.locator(".answers").is_visible())
    mk.locator(".mcq .opt").first.click(); page.wait_for_timeout(40)
    fb = answer("mixed-K1", ["14/3 kg"]); ok("mixed-K1 '14/3 kg' accepted after choosing the method", good(fb))
    ok("tryouts present in S, K, G and W", all(page.locator(f"#{T}-explore .tryout").count() >= 1 for T in "SKGW"))

    def gnext(G, i): G.locator(".gstep").nth(i).get_by_role("button", name="Next step →").click(); page.wait_for_timeout(50)
    def gmcq(G, i): G.locator(".gstep").nth(i).locator(".opt").first.click(); page.wait_for_timeout(30); gnext(G, i)
    def ginput(G, i, val):
        s_ = G.locator(".gstep").nth(i); s_.locator("input.ans").fill(val); s_.get_by_role("button", name="Check").click(); page.wait_for_timeout(30); return s_
    gk = page.locator('.guided[data-gid="K-guided"]')
    s_ = ginput(gk, 0, "2"); ok("guided K step 1: upper limit 2 accepted", s_.locator(".greveal").is_visible()); gnext(gk, 0)
    gmcq(gk, 1)
    s_ = ginput(gk, 2, "x - x^2"); ok("guided K step 3: top curve only -> targeted message", "only the top curve" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gk, 2, "2x - x^2"); ok("guided K step 3: 2x − x² accepted", s_.locator(".greveal").is_visible()); gnext(gk, 2)
    s_ = ginput(gk, 3, "x(2x-x^2)"); ok("guided K step 4: x(2x − x²) accepted", s_.locator(".greveal").is_visible()); gnext(gk, 3)
    s_ = ginput(gk, 4, "-4/3"); ok("guided K step 5: −4/3 -> 'a negative mass' message", "negative mass" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gk, 4, "4/3"); ok("guided K step 5: 4/3 accepted", s_.locator(".greveal").is_visible())
    gg = page.locator('.guided[data-gid="G-guided"]')
    ginput(gg, 0, "42"); gnext(gg, 0)
    s_ = ginput(gg, 1, "4x^2+2"); ok("guided G step 2: the mass integrand -> 'times its position x' message", "position x" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gg, 1, "4x^3+2x"); ok("guided G step 2: 4x³ + 2x accepted", s_.locator(".greveal").is_visible()); gnext(gg, 1)
    ginput(gg, 2, "90"); gnext(gg, 2)
    s_ = ginput(gg, 3, "42/90"); ok("guided G step 4: M/x̄M -> 'Upside down'", "Upside down" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gg, 3, "15/7"); ok("guided G step 4: 15/7 accepted", s_.locator(".greveal").is_visible())
    gw = page.locator('.guided[data-gid="W-guided"]')
    gmcq(gw, 0)
    s_ = ginput(gw, 1, "12y/5"); ok("guided W step 2: 12y/5 -> 'the ratio is upside down'", "upside down" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gw, 1, "5y/12"); ok("guided W step 2: r = 5y/12 accepted", s_.locator(".greveal").is_visible()); gnext(gw, 1)
    s_ = ginput(gw, 2, "1000pi(5y/12)^2"); ok("guided W step 3: the slice's mass -> 'mass × 9.8' message", "9.8" in s_.locator(".feedback").inner_text(), s_.locator(".feedback").inner_text()[:90])
    s_ = ginput(gw, 2, "1000*pi*(5y/12)^2*9.8"); ok("guided W step 3: weight 1000·π(5y/12)²·9.8 accepted", s_.locator(".greveal").is_visible()); gnext(gw, 2)
    s_ = ginput(gw, 3, "12-y"); ok("guided W step 4: distance 12 − y accepted", s_.locator(".greveal").is_visible()); gnext(gw, 3)
    s_ = ginput(gw, 4, "2940000pi J"); ok("guided W step 5: '2940000pi J' accepted", s_.locator(".greveal").is_visible())

    for qid, right, wrong, frag in (("G-m1", (0, 1, 2), 3, "constant density or a symmetry"), ("W-m1", (0, 2, 3, 5), 1, "different pieces move different distances")):
        q = page.locator(f'.mcq[data-qid="{qid}"]')
        q.locator(".opt").nth(wrong).click(); q.get_by_role("button", name="Check selection").click(); page.wait_for_timeout(30)
        ok(f"multi-select {qid} wrong selection -> the topic's own message", frag in q.locator(".feedback").inner_text(), q.locator(".feedback").inner_text()[:100])
        q.locator(".opt").nth(wrong).click()
        for i in right: q.locator(".opt").nth(i).click()
        q.get_by_role("button", name="Check selection").click(); page.wait_for_timeout(30)
        ok(f"multi-select {qid} right selection -> correct", "good" in (q.locator(".feedback .fb").first.get_attribute("class") or ""))
    s = page.locator('.spot[data-sid="K-spot1"]')
    s.locator(".sline[data-bad]").click(); page.wait_for_timeout(30)
    ok("spot K-spot1: explanation shown after finding the error", s.locator(".spot-explain").is_visible())

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
    ok("mastery report rendered 98 cells (14 topics × 7 levels)", cells.count() == 98, str(cells.count()))
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
    for wid in ("widget-shell", "widget-mass", "widget-balance", "widget-work"): shot(f"#{wid}", f"dark_{wid}.png")
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
    for T in "SKGW":
        shot(f"#{T}-learn", f"light_{T}_learn.png"); shot(f"#{T}-understand", f"light_{T}_understand.png"); shot(f"#{T}-compare", f"light_{T}_compare.png")
    page.evaluate("() => document.querySelector('#widget-shell')._set(3)"); shot("#widget-shell", "light_widgetS.png")
    page.evaluate("() => document.querySelector('#widget-mass')._set(2, 8, 3.785)"); shot("#widget-mass", "light_widgetK.png")
    page.evaluate("() => document.querySelector('#widget-mass')._set(4, 12)"); shot("#widget-mass", "light_widgetK_plate.png")
    page.evaluate("() => document.querySelector('#widget-balance')._set(1, 1.5)"); shot("#widget-balance", "light_widgetG.png")
    page.evaluate("() => document.querySelector('#widget-balance')._set(6)"); shot("#widget-balance", "light_widgetG_plate.png")
    page.evaluate("() => document.querySelector('#widget-work')._set(4, 10)"); shot("#widget-work", "light_widgetW.png")
    page.evaluate("() => document.querySelector('#widget-work')._set(7, 10)"); shot("#widget-work", "light_widgetW_bucket.png")
    page.evaluate("() => document.querySelector('#widget-work')._set(6, 10)"); shot("#widget-work", "light_widgetW_spring.png")
    shot('.guided[data-gid="W-guided"]', "light_guided_W.png")
    shot('.problem[data-pid="K-indep"]', "light_problem_K.png")
    shot("#report", "light_report_14.png")
    # mobile
    m = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, reduced_motion="reduce").new_page()
    m.goto(URL); m.wait_for_timeout(600); m.screenshot(path=str(SHOTS / "mobile_top.png"))
    m.locator("#widget-numeric").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-numeric").screenshot(path=str(SHOTS / "mobile_widgetC.png"))
    m.locator("#widget-path").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-path").screenshot(path=str(SHOTS / "mobile_widgetE.png"))
    m.locator("#widget-parts").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-parts").screenshot(path=str(SHOTS / "mobile_widgetP.png"))
    m.locator("#widget-arc").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-arc").screenshot(path=str(SHOTS / "mobile_widgetL.png"))
    m.locator("#widget-volume").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator("#widget-volume").screenshot(path=str(SHOTS / "mobile_widgetV.png"))
    for wid in ("widget-shell", "widget-mass", "widget-balance", "widget-work"):
        m.locator(f"#{wid}").scroll_into_view_if_needed(); m.wait_for_timeout(200); m.locator(f"#{wid}").screenshot(path=str(SHOTS / f"mobile_{wid}.png"))
    ok("mobile: no horizontal page scroll at 390 px", m.evaluate("() => document.documentElement.scrollWidth <= window.innerWidth + 1"), str(m.evaluate("() => [document.documentElement.scrollWidth, window.innerWidth]")))
    browser.close()

print(f"\n{sum(1 for r in results if r[1])}/{len(results)} checks passed")
json.dump({"passed": sum(1 for r in results if r[1]), "total": len(results), "fails": fails}, open(SHOTS / "results.json", "w"), indent=1)
sys.exit(1 if fails else 0)

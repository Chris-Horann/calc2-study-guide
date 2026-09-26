# Notes Index

Cumulative index of lecture notes in `materials/notes/`, organized by topic.
Page numbers are original PDF page numbers.

## Sources processed

| Source | Pages | Type | Rendered images |
|---|---|---|---|
| `1.1-3.1(some).pdf` | 41 | Image-based (handwritten tablet notes on grid paper; no usable embedded text) | `calc2_notes_pages/page-001.png` … `page-041.png` (300 DPI) |
| `3.1rest-3.3.pdf` (added 2026-09-23) | 7 | Image-based (same format; no embedded text) | `3.1rest-3.3_pages/page-001.png` … `page-007.png` (300 DPI) |
| `rest3.3-3.5.pdf` (added 2026-09-25) | 7 | Image-based (same format; no embedded text). Page 5 also has two printed textbook figures pasted in. | `rest3.3-3.5_pages/page-001.png` … `page-007.png` (300 DPI; crops checked at 500–700 DPI) |

Sections covered:
- `1.1-3.1(some).pdf`: §1.1, §1.3, §2.4, §2.5, §2.6, §3.1 (start).
- `3.1rest-3.3.pdf`: the rest of §3.1 (pages 1–3) and §3.3 (pages 4–7).
- `rest3.3-3.5.pdf`: the rest of §3.3 (page 1 is one more motion example; pages 2–4 are **arc length**) and **§3.5 Volume** (pages 5–7).

Section numbers that do **not** appear in any notes so far: §1.2, §2.1–§2.3, **§3.2**, **§3.4**. The notes go straight from §3.3 to §3.5; in the textbook §3.4 is "Area Swept Out and Polar Coordinates". The first filename says "(some)", so that file may be a partial set. What the missing sections contain is unknown from the notes alone.

Page references below are to `1.1-3.1(some).pdf` unless marked:
- **new notes p. N**, which means `3.1rest-3.3.pdf`;
- **3.3–3.5 notes p. N**, which means `rest3.3-3.5.pdf`.

### Professor's visual conventions (consistent across pages)
- **Red**: section titles, definitions, general rules, "Key:" procedures.
- **Black**: worked examples.
- **Green**: supplementary formulas, reminders ("Note the coefficients!"), and bracket groupings.
- **Yellow**: course logistics (page 13).
- "e.g." underlined marks the start of each worked example.
- Side calculations (u, du, v, partial-fraction coefficients) are worked in the right-hand column. Constants in side work are often written as "(+C)" in parentheses.
- "Final answer" in red with an underline marks the answer when the work runs across the page (pages 20, 23).
- The same conventions hold in `rest3.3-3.5.pdf`: red for the arc-length and volume definitions, black for examples, green for the "view the curve as a trajectory" remark (p. 2) and the axis-of-rotation note (p. 7).
- New in `rest3.3-3.5.pdf`: 3.3–3.5 notes p. 5 pastes two printed textbook figures (textbook Figures 3.29 and 3.30) between the handwritten lines.
- Examples are sometimes stated with blank space and **no solution** (new notes pp. 6–7; 3.3–3.5 notes pp. 6–7). They look like in-class exercises.

---

## Course logistics

- **Page 13 (yellow annotation):** "Quiz Thursday 9/17: §1.1, §1.3". Also "TA Office Hour (check 'Syllabus' page on Canvas)".

---

## 1. Basic Antiderivative Rules (Review)

Sources:
- `1.1-3.1(some).pdf`, pages 1–2

Topic: §1.1 Review: Antiderivatives, Indefinite Integrals

Formulas (page 1, "Basic Rules"):
- ∫xⁿ dx = xⁿ⁺¹/(n+1) + C  (n ≠ −1)
- ∫eˣ dx = eˣ + C;  ∫aˣ dx = aˣ/ln a + C
- ∫(1/x) dx = ln|x| + C
- ∫sin x dx = −cos x + C;  ∫cos x dx = sin x + C
- ∫sec²x dx = tan x + C;  ∫sec x tan x dx = sec x + C
- ∫csc²x dx = −cot x + C;  ∫csc x cot x dx = −csc x + C
- ∫1/(1+x²) dx = tan⁻¹x + C;  ∫1/√(1−x²) dx = sin⁻¹x + C
- ∫1/(a²+x²) dx = (1/a)tan⁻¹(x/a) + C;  ∫1/√(a²−x²) dx = sin⁻¹(x/a) + C

Professor annotations:
- Green brackets group the power, exponential, log and sin/cos rules together, and separately group the four inverse-trig rules. The inverse-trig group comes back repeatedly in partial fractions (pages 16–19).

Worked examples (page 2):
- ∫10x⁹ dx = x¹⁰ + C (a constant pulls out, then the power rule)
- ∫(3 sin t − 5/(t²+1)) dt = −3cos t − 5tan⁻¹t + C
- ∫(3x+√x)/x² dx: split the fraction into 3/x + 1/x^{3/2} first, giving 3ln|x| − 2x^{−1/2} + C

Techniques:
- Rewrite before integrating: split fractions term by term and convert roots to fractional exponents.

Prerequisites: derivative rules (including inverse trig), exponent laws.

---

## 2. u-Substitution

Sources:
- `1.1-3.1(some).pdf`, pages 3–6 (indefinite), 22–23 (extra practice), 26 (definite integrals with changed limits)
- Used as a sub-step on pages 9–12, 16–17, 21, 24, 28–31

Topic: §1.1 Substitution

Core idea (page 3):
- Recall the Chain Rule: d/dx f(g(x)) = f′(g(x))·g′(x).
- Substitution "undoes" the chain rule: f(g(x)) = ∫f′(g(x))·g′(x) dx. Labeling u = g(x) and du = g′(x)dx gives f(u) = ∫f′(u) du.

Procedure (page 3, red "Key:"):
1. Find u.
2. du = (du/dx) dx.
3. Convert the integral in x to an integral in u.
4. Integrate (in u).
5. Convert back to x.

Definite-integral version (page 26, green):
- ∫_{x=a}^{x=b} f′(g(x))g′(x) dx = ∫_{u=g(a)}^{u=g(b)} f′(u) du. Change the limits and don't convert back.

Worked examples:
- Page 4: ∫(e^{4x+1} + 2/x²) dx = ¼e^{4x+1} − 2x⁻¹ + C. The two pieces are done separately with constants C₁ and C₂; u = 4x+1 gives dx = ¼du.
- Page 4: ∫√(1+ln x)/(3x) dx = (2/9)(1+ln x)^{3/2} + C, with u = 1+ln x.
- Page 5: ∫e^{5t}/(e^{5t}+13) dt = (1/5)ln|e^{5t}+13| + C, with u = e^{5t}+13 (the denominator).
- Page 5: ∫2t⁷cos(t⁸+1) dt = ¼sin(t⁸+1) + C, with u = t⁸+1.
- Page 6: ∫(x−4)⁶x dx = (1/8)(x−4)⁸ + (4/7)(x−4)⁷ + C, with u = x−4 **and back-substitution x = u+4** for the leftover x.
- Page 6: ∫x²e^{−x³} dx = −⅓e^{−x³} + C, with u = −x³.
- Page 21: ∫tan θ dθ = −ln|cos θ| + C (rewrite as sin θ/cos θ, u = cos θ).
- Page 22: ∫(ln t)^{2/5}/(3t) dt = (5/21)(ln t)^{7/5} + C.
- Page 22: ∫₄⁹ e^{√x}/√x dx = 2e³ − 2e² (u = √x, and (1/√x)dx = 2du).
- Page 23: ∫₀^{ln 3} eˣ(eˣ−1)⁵ dx = 32/3 (the antiderivative is found first, then evaluated with x-limits).
- Page 26: ∫₁³ x/√(3+x²) dx = 2√3 − 2 (u = 3+x², limits changed to u = 4 and u = 12).

Techniques and patterns:
- Look for an inner function whose derivative (up to a constant) is also present: e^{4x+1}; 1+ln x with 1/x; t⁸+1 with t⁷; −x³ with x².
- Solve for the leftover piece (e.g. t⁷dt = ⅛du, x²dx = −⅓du) rather than for dx alone.
- When a stray x remains, express it in terms of u (page 6, x = u+4).
- For definite integrals there are two approaches: change the limits (page 26), or find the antiderivative in x and use the original limits (pages 22–23).

Notation note:
- Page 4: one intermediate line reads "∫eᵘ dx" before dx is replaced by ¼du on the next line. It's a transitional step, not the final form.

Connections: chain rule; basic rules (Section 1). Substitution is also the tool for computing v in integration by parts (pages 9–12) and for the x/(x²+a²) terms in partial fractions (pages 16–17). Later it finishes arc-length integrals: 3.3–3.5 notes p. 3 uses u = x + 5 with changed limits (u from 9 to 16).

---

## 3. Integration by Parts

Sources:
- `1.1-3.1(some).pdf`, pages 7–12; also pages 21 and 24 (extra practice)

Topic: §1.1 Integration by Parts

Derivation (page 7):
- Product rule: d/dx(f(x)g(x)) = f(x)g′(x) + g(x)f′(x).
- Integrate both sides: f(x)g(x) = ∫f(x)g′(x)dx + ∫g(x)f′(x)dx.
- Rearrange: ∫f(x)g′(x)dx = f(x)g(x) − ∫g(x)f′(x)dx. The professor labels f = u, g′dx = dv, g = v and f′dx = du.
- **Formula: ∫u dv = uv − ∫v du**

Professor emphasis (page 7, red "Key:"):
- Find u that is easy to differentiate "(and differentiation is making it simpler, not harder)".
- Find dv that is easy to integrate "(and integration is making it simpler, not harder)".

Choosing u (page 8): **"LIATE"**, with a red downward arrow showing priority:
- L = log, I = inverse trig, A = algebraic, T = trig, E = exponential.
- "Once u is selected, everything else (including dx) is dv."

Worked examples:
- Page 8: ∫xeˣ dx = xeˣ − eˣ + C (u = x, dv = eˣdx). This is the first example.
- Page 9: ∫x⁴ln x dx = (1/5)x⁵ln x − (1/25)x⁵ + C (u = ln x, because log beats algebraic).
- Page 9: ∫(x+6)sin(2x) dx = −½(x+6)cos(2x) + ¼sin(2x) + C. Here v is found by a side substitution w = 2x.
- Page 10: ∫2t²e^{−t} dt uses **repeated** integration by parts. The inner ∫te^{−t}dt is done in the side column. See the ERROR note below.
- Page 10: ∫2p tan⁻¹p dp = p²tan⁻¹p − p + tan⁻¹p + C (u = tan⁻¹p). The algebra trick p²/(1+p²) = (1+p²−1)/(1+p²) = 1 − 1/(1+p²) is shown on the side.
- Page 11: ∫sin⁻¹x dx = x sin⁻¹x + √(1−x²) + C. The **"multiply by 1" trick**: u = sin⁻¹x, dv = 1·dx. The leftover integral uses the substitution w = 1−x².
- Page 11: ∫(x−4)⁶x dx = (1/7)x(x−4)⁷ − (1/56)(x−4)⁸ + C (u = x). **This is the same integral as page 6**, which was solved by substitution.
- Page 12: ∫e^{√x} dx = 2√x e^{√x} − 2e^{√x} + C. **Substitution first** (t = √x, dx = 2t dt), then parts on 2∫teᵗdt.
- Page 21: ∫x√(x+1) dx is solved **two ways**:
  - ① parts gives (2/3)x(x+1)^{3/2} − (4/15)(x+1)^{5/2} + C
  - ② substitution u = x+1, x = u−1 gives (2/5)(x+1)^{5/2} − (2/3)(x+1)^{3/2} + C, which is green-labeled "(simpler)"
  - A green note shows that the difference between the two answers simplifies to 0, "so they agree".
- Page 24: ∫e^{1/x}/x³ dx = −(1/x)e^{1/x} + e^{1/x} + C. Substitution w = 1/x (splitting 1/x³ = (1/x)·(1/x²)) turns it into −∫weʷdw, then parts.

Techniques and patterns:
- Polynomial × exponential or trig: u = polynomial (pages 8–10).
- Log or inverse trig alone: u = that function, dv = dx (page 11).
- A polynomial of degree n needs n rounds of parts (page 10).
- Combine methods: substitute first to expose a product, then use parts (pages 12, 24).
- The same integral can have different-looking but equivalent answers (pages 6 & 11, page 21).

Common mistake visible in the notes:
- **ERROR on page 10:** the final line reads −2t²e^{−t} − 4te^{−t} − **4t^{−t}** + C. The last term should be **−4e^{−t}**. The side work on the same page correctly gives ∫te^{−t}dt = −te^{−t} − e^{−t}, and SymPy confirms the full answer −2(t²+2t+2)e^{−t} + C.

Connections: product rule; substitution (used to find v and for leftover integrals); basic inverse-trig derivatives.

---

## 4. Partial Fractions

Sources:
- `1.1-3.1(some).pdf`, pages 13–20; also page 23 (extra practice)

Topic: §1.3 Integration by Partial Fractions

Motivating example (page 13):
- ∫(x−7)/(x²−2x−3) dx. The professor factors (x+1)(x−3) and "notices" that (x−7)/((x+1)(x−3)) = 2/(x+1) − 1/(x−3). Result: 2ln|x+1| − ln|x−3| + C.

Definition (page 13, red):
- Partial fractions decomposition: "write a complicated fraction as a sum of simpler fractions."
- f(x) = P(x)/Q(x) with **degree of P < degree of Q**.
- Step 1: factorize Q(x).

Decomposition table (page 14, green): factors of Q(x) and the terms they produce:
- Linear (distinct): ax+b gives A/(ax+b).
- Linear (repeated): (ax+b)² gives A/(ax+b) + B/(ax+b)²; (ax+b)³ gives A/(ax+b) + B/(ax+b)² + C/(ax+b)³.
  - Side example: 1/((x−1)(x+2)²) gives A/(x−1) + B/(x+2) + C/(x+2)².
- Irreducible quadratic (distinct): ax²+bx+c gives (Ax+B)/(ax²+bx+c).
  - Red annotation: irreducible means **b²−4ac < 0**.
  - Side note: x²−1 = (x+1)(x−1) factors, but x²+1 is irreducible.

Improper case (page 19, red):
- "What if degree of P(x) ≥ degree of Q(x)? → Do long division first."

Worked examples:
- Page 14: ∫(5x+5)/(x²−x−6) dx = 4ln|x−3| + ln|x+2| + C. Distinct linear factors; coefficients by matching and elimination (①×3 + ②).
- Page 15: ∫(x²−3x−8)/(x³+4x²+4x) dx = −2ln|x| + 3ln|x+2| + 1/(x+2) + C. **Repeated linear** factor x(x+2)²; A = −2, B = 3, C = −1.
- Page 16: ∫(x²+5x−4)/(x³+4x) dx = −ln|x| + ln|x²+4| + (5/2)tan⁻¹(x/2) + C. **Irreducible quadratic** x²+4; the x/(x²+4) term uses substitution and the 1/(x²+4) term uses the arctan rule.
- Page 17: ∫(3x²+x−5)/((x+2)(x²+1)) dx = ln|x+2| + ln|x²+1| − 3tan⁻¹x + C (A = 1, B = 2, C = −3).
- Page 18: ∫3r/(r⁴+5r²+4) dr = ½ln|r²+1| − ½ln|r²+4| + C. Treat r⁴+5r²+4 as a **quadratic in r²**, which factors as (r²+1)(r²+4). There are two irreducible quadratics, and B = D = 0.
- Page 19: ∫(t⁴+6t²+11)/(t²+4) dt = ⅓t³ + 2t + (3/2)tan⁻¹(t/2) + C. **Long division first**: quotient t²+2, remainder 3.
- Page 20: ∫(−2x³+4x²+6x−2)/(x²−1) dx = −x² + 4x + ln|x+1| + 3ln|x−1| + C (red "Final answer"). Long division, then distinct linear factors.
- Page 23: ∫2x²/(x²−9) dx = 2x − 3ln|x+3| + 3ln|x−3| + C (red "Final answer"). The note says "deg of top = deg of bottom", so long division comes first.

Techniques:
- Solve for coefficients by **expanding and matching coefficients** of like powers, then solving the linear system by elimination. Equations are numbered ①② and combined; a curved arrow shows back-substitution. The professor never uses the plug-in-roots (Heaviside) shortcut in these notes.
- After decomposing, each piece is one of: ln|linear|; −1/(linear) for a repeated factor; ½ln(quadratic) by substitution; or (1/a)tan⁻¹(x/a).

Notation and labeling slips (page 18), not affecting the answer:
- The numerators are written "Ax+B" and "Cx+D" though the variable is r (they should be Ar+B and Cr+D).
- "④ − ②: B = 0" should read "④ − ③". The equations B+D=0 (③) and 4B+D=0 (④) give B = D = 0, as the page states.

Connections: factoring and the discriminant; polynomial long division; substitution; inverse-trig rules from page 1 (1/(a²+x²)).

---

## 5. Extra Practice: Integration (mixed techniques)

Sources:
- `1.1-3.1(some).pdf`, pages 21–24

The page 21 title is "Extra Practice: Integration". **No method is labeled in advance**, which makes these the closest thing to mixed practice in the notes. The examples themselves are indexed under their techniques above:
- Page 21: tan θ (substitution); x√(x+1) (parts vs. substitution; substitution is "(simpler)")
- Page 22: (ln t)^{2/5}/(3t) (substitution); definite e^{√x}/√x (substitution)
- Page 23: 2x²/(x²−9) (long division + partial fractions); definite eˣ(eˣ−1)⁵ (substitution)
- Page 24: e^{1/x}/x³ (substitution + parts)

Professor emphasis: compare methods and prefer the simpler one; check that different-looking answers agree (page 21, green).

---

## 6. Fundamental Theorem of Calculus (Review) and Definite Integrals

Sources:
- `1.1-3.1(some).pdf`, pages 25–26; applied on pages 22–23 and 40–41

Topic: §2.4 Fundamental Theorem of Calculus (Review). "FTC" is annotated above the title.

Definitions and formulas (page 25):
- If f(x) is continuous on [a, b], then ∫ₐᵇ f(x)dx = (area above x-axis) − (area below x-axis).
- **FTC:** ∫ₐᵇ f(x)dx = F(b) − F(a), where F′(x) = f(x) (F is an antiderivative of f).

Diagrams:
- Page 25: a graph of y = f(x) crossing the x-axis between a and b. The positive area is shaded green with "+" and the negative area purple with "−". This illustrates signed (net) area.
- Page 25: a graph of y = 2x−4 crossing zero at x = 2.

Worked examples:
- Page 25: ∫₁⁴ |2x−4| dx = 5. **Split at the zero x = 2**: on 1<x<2, 2x−4<0, so |2x−4| = 4−2x; on 2<x<4, 2x−4>0. Then evaluate each piece.
- Page 26: definite substitution with changed limits (see Section 2).

Techniques: for absolute values, find where the inside changes sign and split the integral there.

Connections: antiderivatives (Section 1); total distance traveled (Section 9) uses the same absolute-value splitting idea.

---

## 7. Improper Integrals

Sources:
- `1.1-3.1(some).pdf`, pages 27–33

Topic: §2.5 Improper Integrals

Motivating question (page 27): "What if we have some 'infinity' in the area under the curve?"

**Type I:** infinity in the horizontal direction; the domain of integration is unbounded (page 27).
- ∫ₐ^{+∞} f(x)dx = lim_{b→∞} ∫ₐᵇ f(x)dx
- ∫_{−∞}ᵇ f(x)dx = lim_{a→−∞} ∫ₐᵇ f(x)dx
- Diagrams: a decaying curve shaded from a to a moving b; a growing curve shaded from a moving a to b.

**Definition** (page 28, red): an improper integral **converges** (is convergent) if the limit exists as a finite number. It **diverges** (is divergent) if the limit does not exist as a finite number.

**Type II:** infinity in the vertical direction; the integrand is unbounded, with an infinite discontinuity at x = c (page 30).
- ∫ₐᶜ f(x)dx = lim_{b→c⁻} ∫ₐᵇ f(x)dx
- ∫_cᵇ f(x)dx = lim_{a→c⁺} ∫ₐᵇ f(x)dx
- Diagrams: a vertical asymptote at the right endpoint c, and one at the left endpoint c.

**Multiple problematic points** (page 32, red):
- "Isolate them by splitting the integral into multiple parts."
- "The integral converges if and only if all these parts converge (diverges as long as one of these parts diverges)."

Worked examples:
- Page 28: ∫₁^∞ e^{−x} dx = e⁻¹, converges (substitution u = −x with changed limits).
- Page 29: ∫₃^∞ 1/√((x−2)³) dx = 2, converges (u = x−2, integrate u^{−3/2}).
- Page 29: ∫₀^∞ 3/(2t+1) dt diverges to ∞ ((3/2)ln|2b+1| → ∞, written "(DNE)").
- Page 30: ∫₉¹⁰ 3(x−9)^{−1/3} dx = 9/2, converges (Type II at x = 9, a → 9⁺).
- Page 31: ∫₀¹ x/(x²−1)² dx diverges to +∞ (Type II at x = 1, b → 1⁻). The sign reasoning b²−1 → 0⁻ ⇒ (b²−1)⁻¹ → −∞ is written out.
- Page 32: ∫₀^∞ 1/x^{0.8} dx **diverges**. Split at 1: ① ∫₁^∞ diverges (b^{0.2} → ∞); ② ∫₀¹ = 1/0.2 = 5 converges. One divergent part makes the whole integral diverge.
- Page 33: ∫₂^∞ (x+1)/(x−1) dx diverges to ∞. Rewrite (x+1)/(x−1) = 1 + 2/(x−1) first.

Techniques:
- Always rewrite as a limit **before** integrating, then take the limit last.
- Identify every problematic point (infinite endpoints and vertical asymptotes) and split so each piece has only one.
- Track one-sided limits (c⁻ vs. c⁺) and the sign of quantities approaching 0.
- Pages 32 and 29 together show the behavior of x^{−p}: p = 0.8 < 1 diverges at ∞ but converges near 0; p = 3/2 > 1 converges at ∞. The notes don't state the general p-test explicitly.

Connections: limits at infinity and one-sided limits; FTC; substitution with changed limits; algebraic rewriting (page 33, like long division).

---

## 8. Numerical Integration

Sources:
- `1.1-3.1(some).pdf`, pages 34–39

Topic: §2.6 Numerical Integration: "Approximate definite integrals (area under the curve) by Riemann Sums."

Riemann sum (page 34, green): Δx = (b−a)/n, and Σᵢ₌₁ⁿ f(xᵢ)Δx → ∫ₐᵇ f(x)dx. There's a small sketch of rectangles above and below the x-axis.

Common setup, repeated on pages 34, 36 and 38: a = x₀ < x₁ < … < xₙ₋₁ < xₙ = b, Δx = xᵢ − xᵢ₋₁ = (b−a)/n, xᵢ = a + iΔx.

**1) Midpoint Rule** (page 34):
- Area of rectangle i = (Δx)·f((xᵢ₋₁+xᵢ)/2).
- ∫ₐᵇ f(x)dx ≈ Δx[f((x₀+x₁)/2) + f((x₁+x₂)/2) + … + f((xₙ₋₁+xₙ)/2)].
- Diagram: a printed figure with 4 rectangles whose heights are taken at the midpoints.

**2) Trapezoid Rule** (page 36):
- Area of trapezoid i = ½(Δx)(f(xᵢ₋₁) + f(xᵢ)).
- ∫ₐᵇ f(x)dx ≈ (Δx/2)[f(x₀) + 2f(x₁) + 2f(x₂) + … + 2f(xₙ₋₁) + f(xₙ)].
- Green emphasis: **"(Note the coefficients!)"**, i.e. 1, 2, 2, …, 2, 1.
- Diagram: a printed figure with 4 trapezoids.

**3) Simpson's Rule** (page 38):
- Area of piece i = (Δx/3)(f(xᵢ₋₁) + 4f(xᵢ) + f(xᵢ₊₁)).
- ∫ₐᵇ f(x)dx ≈ (Δx/3)[f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + … + 4f(xₙ₋₁) + f(xₙ)].
- Green emphasis: **"(Note the coefficients!)"** (1, 4, 2, 4, …, 4, 1) and **"n must be even for the Simpson's Rule!"**
- Diagram: a printed figure with parabolic arcs over [x₀, x₂] (green) and [x₂, x₄] (blue).

Worked examples:
- Page 35: Midpoint Rule for ∫₀¹ e^{−x²} dx.
  - n = 2: ½(e^{−(1/4)²} + e^{−(3/4)²})
  - n = 4: ¼(e^{−(1/8)²} + e^{−(3/8)²} + e^{−(5/8)²} + e^{−(7/8)²})
  - Answers are left in exact form, not evaluated numerically.
- Page 37: Trapezoid Rule, n = 4, for ∫₋₁¹ √(1−x²) dx. See the ERROR note below.
- Page 37: Trapezoid Rule, n = 5, for ∫₀¹ e^{x²} dx = (1/10)(1 + 2e^{1/25} + 2e^{4/25} + 2e^{9/25} + 2e^{16/25} + e).
- Page 39: Simpson's Rule with n = 4 for ∫₋₁¹ √(1−x²) dx, and with n = 6 for ∫₂¹⁴ 1/ln x dx. **Both are stated only, with blank space and no solution.** They look like in-class exercises.

Techniques:
- List Δx and every xᵢ explicitly before substituting into the rule.
- For the Midpoint Rule, the evaluation points are midpoints (e.g. 1/8, 3/8, …), not the grid points.
- The examples use integrands with no elementary antiderivative (e^{−x²}, e^{x²}, 1/ln x). This is why numerical methods are needed.

Common mistake visible in the notes:
- **ERROR on page 37:** the n = 4 Trapezoid result is written as ½ + √15/4 ≈ 1.468. With f(±½) = √(3/4) = √3/2, the correct value is ¼[0 + 2(√3/2) + 2(1) + 2(√3/2) + 0] = **½ + √3/2 ≈ 1.366**. This was checked numerically.

Connections: Riemann sums and the definition of the definite integral; FTC (the exact value of ∫₋₁¹ √(1−x²) dx is the half-disk area π/2 ≈ 1.571, which gives a reference value; the notes don't mention this).

Later use:
- **3.3–3.5 notes p. 4** applies the Trapezoid Rule with n = 4 to an arc-length integral, ∫₀^{2π} √(1 + cos²x) dx, which has no elementary antiderivative (see Topic 10).
- The Riemann-sum setup (Δx = (b − a)/n, sum over i = 1…n) is reused for volume on 3.3–3.5 notes p. 5 (Topic 11).

---

## 9. Displacement and Distance Traveled

Sources:
- `1.1-3.1(some).pdf`, pages 40–41
- `3.1rest-3.3.pdf`, pages 1–3 (three more worked examples)

Topic: §3.1 Displacement and Distance Traveled

Definitions (page 40):
- 1D motion along a straight line. t is time, p(t) is position, v(t) is velocity, and v(t) = p′(t).
- "v(t) could be +, − or 0."
- By FTC: ∫ₐᵇ v(t)dt = p(b) − p(a).
- **Displacement** (shift in position) from time a to b: ∫ₐᵇ v(t)dt = p(b) − p(a).

Worked example (page 41, "How about total distance traveled?"):
- An object moves at a constant 10 ft/sec for 30 seconds, then in the opposite direction at 10 ft/sec for 30 seconds.
- Diagrams: a velocity graph (v = 10 on [0, 30], v = −10 on [30, 60], both regions shaded green) and a position-line sketch with arrows in both directions.
- Displacement: ∫₀⁶⁰ v(t)dt = ∫₃₀⁶⁰(−10)dt + ∫₀³⁰10 dt = 0 ft.
- Total distance traveled: 30×10 + 30×10 = 600 ft.

General formulas (page 41, red):
- v(t) is velocity; |v(t)| is speed.
- **Total distance traveled from time a to b: ∫ₐᵇ |v(t)| dt.**

Emphasized idea: displacement is signed (motions in opposite directions cancel); distance uses |v| (nothing cancels).

More worked examples (new notes pp. 1–3). Each has the same two parts, "1) Displacement" and "2) Total distance traveled":
- **New notes p. 1:** v(t) = eᵗ − 2 on 0 ≤ t ≤ 1.
  - Displacement = (eᵗ − 2t)|₀¹ = (e − 2) − (1 − 0) = **e − 3**.
  - Distance: set eᵗ − 2 = 0, so t = ln 2. The professor checks e⁰ = 1 < 2 < e¹, so 0 < ln 2 < 1 (the turning point is inside the interval).
  - Sign line: − on (0, ln 2), + on (ln 2, 1).
  - ∫₀^{ln2}(−eᵗ + 2)dt + ∫_{ln2}^{1}(eᵗ − 2)dt = **4 ln 2 + e − 5** (≈ 0.4909).
- **New notes p. 2:** v(t) = t² − t − 2 on [0, 4].
  - Displacement = (t³/3 − t²/2 − 2t)|₀⁴ = **16/3**.
  - Distance: (t − 2)(t + 1) = 0, so t = 2 or −1 (only 2 is in [0, 4]). Test points t = 1 (negative) and t = 3 (positive). Total = **12**.
- **New notes p. 3:** v(t) = 1 − 2cos t on [0, π].
  - Displacement = (t − 2sin t)|₀^π = **π** (sin π = sin 0 = 0).
  - Distance: cos t = ½, so t = π/3 in [0, π]; negative on (0, π/3), positive on (π/3, π). Total = 2sin(π/3) − π/3 + π − π/3 + 2sin(π/3) = **2√3 + π/3** (≈ 4.5113).

Techniques emphasized in the new pages:
- Solve v(t) = 0 and **check the root is inside the interval** (the e⁰ < 2 < e¹ argument; discarding t = −1).
- Draw a **sign line** with − / + labels.
- Confirm signs with **test points**.
- Split the integral of |v| at the turning points.

All six written answers on new notes pp. 1–3 were verified by hand, with SymPy/mpmath, and with Wolfram. No errors were found.

Connections: FTC (page 25). The signed-area picture on page 25 (area above minus area below) is exactly displacement. The |2x−4| split on page 25 is the same technique needed to compute ∫|v(t)|dt. §3.3 (next topic) extends everything here to motion in the plane and in space.

---

## 10. Distance Traveled in Space and Arc Length (§3.3)

Sources:
- `3.1rest-3.3.pdf`, pages 4–7 (**new notes**): motion in 2D and 3D
- `rest3.3-3.5.pdf`, page 1 (one more motion example) and pages 2–4 (**arc length**)

Topic: §3.3 Distance Traveled in Space and Arc Length. The new notes (pp. 4–7) cover the motion part. The arc-length part follows in 3.3–3.5 notes pp. 2–4 (subsection 10b).

### 10a. Motion in 2D and 3D

Definitions and setup (new notes p. 4; the table and remarks are in green, the speed formula in red):

| | Position | Velocity |
|---|---|---|
| 1D (ℝ), (−∞, +∞) | p(t) | p′(t) |
| 2D (ℝ²), xy-plane | p⃗(t) = (x(t), y(t)) | v⃗(t) = (x′(t), y′(t)) |
| 3D (ℝ³), xyz-space | p⃗(t) = (x(t), y(t), z(t)) | v⃗(t) = (x′(t), y′(t), z′(t)) |

- "In 2D and 3D, p⃗(t) and v⃗(t) are **vectors** (have length and direction)."
- "When working with vectors, we differentiate / integrate / add / subtract **componentwisely**."
- **Speed** = |v⃗(t)| = √(x′(t)² + y′(t)²) in 2D, or √(x′(t)² + y′(t)² + z′(t)²) in 3D. It is the "length of velocity vector."
- Emphasized in green: "* Speed is a non-negative number, **not a vector**."

Formulas (new notes p. 5; the formulas are in red, the side notes in green):
- **Displacement** (shift in position), with the side note "This is a vector!":
  ∫ₐᵇ v⃗(t) dt = ∫ₐᵇ (x′(t), y′(t)) dt in 2D, or ∫ₐᵇ (x′(t), y′(t), z′(t)) dt in 3D, and this equals **p⃗(b) − p⃗(a)**.
- **Total Distance Traveled**, with the side note "This is a non-negative number!":
  ∫ₐᵇ |v⃗(t)| dt = ∫ₐᵇ √(x′² + y′²) dt in 2D, or ∫ₐᵇ √(x′² + y′² + z′²) dt in 3D.
- **Inequality:** |∫ₐᵇ v⃗(t) dt| ≤ ∫ₐᵇ |v⃗(t)| dt, written out as "length of displacement vector ≤ total distance traveled."

Examples stated but **left blank** in the notes (new notes pp. 6–7). My answers below were verified by hand, SymPy/mpmath, and Wolfram:
- **New notes p. 6:** total distance for p⃗(t) = (cos 4t, sin 4t, 3t), 0 ≤ t ≤ 2π. The notes begin "v⃗(t) =".
  - v⃗ = (−4 sin 4t, 4 cos 4t, 3), so the speed is 5 and the distance is **10π**.
  - For comparison, the displacement vector is (0, 0, 6π), with length 6π ≤ 10π.
- **New notes p. 6:** v⃗(t) = (cos(2t − 1) + 1/(t² + 1), 3/t + 3t²) m/s. Find the displacement over [2, 4] s.
  - Displacement = ((sin 7 − sin 3)/2 + tan⁻¹4 − tan⁻¹2, 56 + 3 ln 2) ≈ **(0.4766, 58.0794) m**.
- **New notes p. 7:** v⃗(t) = (3t², t, 0) for 0 ≤ t ≤ 3. Find the total distance.
  - |v⃗| = √(9t⁴ + t²) = t√(9t² + 1), so the distance is **(82√82 − 1)/27 ≈ 27.46** (substitute u = 9t² + 1).
- **New notes p. 7:** p⃗(t) = (12t, 8t^{3/2}, 3t²) ft for 0 ≤ t ≤ 1 s. Find the total distance.
  - |v⃗|² = 144 + 144t + 36t² = 36(t + 2)², so the distance is **15 ft**.

One more example, worked in full (3.3–3.5 notes p. 1):
- Total distance from t = 1 to t = 5 seconds for v⃗(t) = (t + 3, √(2t), √7) (m/sec).
  - |v⃗(t)| = √((t + 3)² + 2t + 7) = √(t² + 6t + 9 + 2t + 7) = √(t² + 8t + 16) = √((t + 4)²) = t + 4 (m/sec).
  - Total distance traveled = ∫₁⁵ (t + 4) dt = (½t² + 4t)|₁⁵ = **28 (m)**.
- This is another perfect square under the root. Strictly, √((t + 4)²) = |t + 4|. It equals t + 4 because t + 4 > 0 on [1, 5]. The notes skip the absolute value, which is fine here.
- Verified by hand, SymPy/mpmath and Wolfram.
- For comparison, the displacement is (24, (10√10 − 2√2)/3, 4√7) ≈ (24, 9.598, 10.583). Its length, ≈ 27.93, is just under 28: the path is almost straight.

Techniques:
- Differentiate the position componentwise, remembering the chain rule (cos 4t → −4 sin 4t).
- Square and add the components under the square root. Look for a constant or a perfect square: sin² + cos² = 1 (the helix), or 36(t + 2)².
- Keep the displacement as a vector, one integral per component.
- The distance needs **no sign splitting** in 2D and 3D, because the square root is already ≥ 0. The 1D |v| = √(v²) is the special case.

Connections:
- §3.1 (Topic 9), which is the same pair of formulas in 1D.
- The FTC applied to each component.
- u-substitution (prerequisite from §1.1) for the √ integrals.
- Numerical rules (Topic 8): the textbook notes that distance and arc-length integrals are often only approximable with Simpson's Rule.
- Improper integrals (Topic 7): textbook Example 3.3.7, the semicircle (t, √(1 − t²)), has an improper speed integral.

Prerequisite concepts: vectors (components; length via the Pythagorean theorem), derivatives, the FTC, 1D displacement and distance.

### 10b. Arc length

Sources:
- `rest3.3-3.5.pdf`, pages 2–4 (**3.3–3.5 notes**)

Definition (p. 2, red):
- "Consider a curve (x(t), y(t)), a ≤ t ≤ b." A red arrow labels the curve "parametrized".
- **Arclength = ∫ₐᵇ √(x′(t)² + y′(t)²) dt.**
- Green note: "View the curve as the trajectory of a moving particle with position vector (x(t), y(t))." So arc length is the §3.3 distance-traveled integral ∫|v⃗| dt, reinterpreted.

Special case (p. 2, red, "In particular"):
- The curve is given by y = f(x), a ≤ x ≤ b.
- Take t = x, so x′(t) = 1, y′(t) = dy/dx, and dt = dx.
- **Arclength = ∫ₐᵇ √(1 + (dy/dx)²) dx = ∫ₐᵇ √(1 + f′(x)²) dx.**

Worked examples:
- **p. 3:** the length of g(x) = (2/3)(x + 4)^{3/2} for 4 ≤ x ≤ 11.
  - g′(x) = (2/3)·(3/2)(x + 4)^{1/2} = (x + 4)^{1/2}.
  - ∫₄¹¹ √(1 + g′(x)²) dx = ∫₄¹¹ √(1 + x + 4) dx = ∫₄¹¹ √(x + 5) dx.
  - With u = x + 5 and du = dx (worked in the side column): ∫₉¹⁶ u^{1/2} du = (2/3)u^{3/2}|₉¹⁶ = **74/3**.
- **p. 3:** the arc length of (cos t, sin t), 0 ≤ t ≤ π. The notes label x(t) = cos t and y(t) = sin t under the components.
  - ∫₀^π √((−sin t)² + cos²t) dt = ∫₀^π 1 dt = **π**.
  - Diagram: the upper half of the unit circle, from 1 to −1 on the x-axis, with an arrow showing counterclockwise motion.
- **p. 4:** y = sin x on [0, 2π]. Part 1 says "**Set up** an integral for the arclength" ("Set up" is underlined). Part 2 says "Use the Trapezoid Rule with n = 4 to approximate the arclength."
  - 1) Arclength = ∫₀^{2π} √(1 + cos²x) dx.
  - 2) Δx = 2π/4 = π/2, with P = {0, π/2, π, 3π/2, 2π}.
  - With f(x) = √(1 + cos²x), the estimate is (Δx/2)[f(0) + 2f(π/2) + 2f(π) + 2f(3π/2) + f(2π)] = (π/4)(√2 + 2·1 + 2·√2 + 2·1 + √2) = **π(√2 + 1)** ≈ 7.5845.
  - The true value is ≈ 7.640396 (mpmath and Wolfram; the notes don't give it). √(1 + cos²x) has no elementary antiderivative; the integral is the elliptic integral 4√2·E(1/2). That is why the notes switch to a numerical rule.
  - Notation: P = {…} is the professor's name for the set of partition points. It's new in these notes.

Techniques and emphasis:
- Differentiate, square, add (1 + f′², or x′² + y′²), and **simplify before integrating**.
  - On p. 3, squaring undoes the root: ((x + 4)^{1/2})² = x + 4.
- Finish with u-substitution and changed limits (p. 3), or notice a constant speed. The p. 3 semicircle has speed 1, so its length is the time elapsed.
- With no usable antiderivative, set up the integral and estimate it with a numerical rule (p. 4 uses the Trapezoid Rule from notes p. 36).
- A cue in the wording: "Set up" (underlined) means the answer to part 1 is an integral, not a number.

Textbook material that matches (used for depth, not to widen the scope):
- Textbook §3.3: Propositions 3.3.11–3.3.13; Figure 3.14 (ds² = dx² + dy²); Examples 3.3.8, 3.3.15, 3.3.17; Suggested Exercises 6–8; Additional Exercise 6.
- Not in the notes, so left out: x = f(y) (Proposition 3.3.14, Example 3.3.16), parameterization by arc length, rectifiable curves, and the polar exercises.

Common mistakes to anticipate (none of these appear in the notes):
- Integrating f instead of √(1 + f′²).
- Splitting the root: √(1 + f′²) ≠ 1 + f′.
- A parametrization that retraces part of the curve measures the distance traveled, not the curve's length. For example, (cos t, sin t) for 0 ≤ t ≤ 4π gives 4π, but the circle is only 2π long. The textbook requires a one-to-one parametrization; the notes' semicircle is traced once.

All four written answers on 3.3–3.5 notes pp. 1–4 (28; 74/3; π; π(√2 + 1)) were verified by hand, SymPy/mpmath and Wolfram. No errors were found.

Connections:
- 10a: arc length is the distance-traveled integral for a particle that traces the curve once.
- The Pythagorean theorem (a tiny piece of curve has length ≈ √(Δx² + Δy²)).
- u-substitution with changed limits (Topic 2).
- Numerical rules (Topic 8): the Trapezoid Rule on p. 4.
- Improper integrals (Topic 7): textbook Example 3.3.7.

Prerequisite concepts: derivatives and the chain rule, the Pythagorean theorem, the distance-traveled formula, u-substitution, the Trapezoid Rule.

---

## 11. Volume by Slicing: Disks and Washers (§3.5)

Sources:
- `rest3.3-3.5.pdf`, pages 5–7 (**3.3–3.5 notes**)

Topic: §3.5 Volume. The title on p. 5 is in red.

Slicing (p. 5, red):
- "Solid lying between x = a and x = b. Suppose cross-section perpendicular to the x-axis has area A(x)."
- "Subdivide [a, b] into n subintervals, each of length Δx = (b − a)/n."
- "Volume of slice i ≈ A(xᵢ)Δx."
- → Total Volume of Solid ≈ Σᵢ₌₁ⁿ A(xᵢ)Δx.
- → **Total Volume of Solid = ∫ₐᵇ A(x) dx.**

Diagrams (p. 5): two printed textbook figures.
- Left (textbook Figure 3.29): a solid cut by a plane at x. The cross-section is labeled A(x).
- Right (textbook Figure 3.30): one slice between xᵢ₋₁ and xᵢ, with sample point sᵢ and width Δxᵢ.
- A red handwritten mark is drawn over the printed "x" in "Δxᵢ" (see UNCERTAIN readings). It doesn't affect the math.
- The handwritten formulas use a uniform Δx and the right endpoint xᵢ; the printed figure uses a general sample point sᵢ. Any sample point gives the same limit.

Examples stated but **left blank** (pp. 6–7). My answers below were verified by hand, SymPy/mpmath and Wolfram:
- **p. 6:** "Let S be the region bounded by y = 2x, y = 0, x = 2. Find the volume of the solid obtained by rotating S about the x-axis."
  - Each slice is a disk of radius 2x, so A(x) = π(2x)² and V = ∫₀² 4πx² dx = **32π/3** ≈ 33.51.
  - Check: the solid is a cone of radius 4 and height 2, and (1/3)π(4²)(2) = 32π/3.
- **p. 7:** "Let S be the region between y = 2x and y = x for 0 ≤ x ≤ 2. Find the volume of the solid obtained by rotating S about the x-axis."
  - Washers with R = 2x and r = x: V = ∫₀² π(4x² − x²) dx = **8π** ≈ 25.13.
  - Check: it's the p. 6 cone minus an inner cone of radius 2 and height 2: 32π/3 − 8π/3 = 8π.

Washer method (p. 7, red, written below the blank example):
- "Washer method: slice perpendicular to axis of rotation (say, x-axis)."
- Diagram: a washer labeled "slice", with green arrows marking the inner radius r and the outer radius R.
- **V_slice ≈ π(R² − r²)Δx.**
- **Total Volume V = ∫ₐᵇ π(R² − r²) dx.**
- Green note: "The axis of rotation need not to be the x-axis. (Could be any horizontal/vertical lines). We need to check on the the relation between the region and the axis of rotation when determining R and r."
- The notes never use the word "disk". p. 6 is the r = 0 case of p. 7's washer formula; the textbook calls it the disk method.

Techniques and emphasis:
- Slice **perpendicular** to the axis of rotation.
- R is the distance from the axis to the far edge of the region, and r is the distance to the near edge (0 if the region touches the axis).
- For a horizontal axis y = k, the distances are |y − k|. For a vertical axis, slice horizontally and integrate in y.
- The limits come from the region: the given interval, or where the curves meet.
- The step from Riemann sum to integral is the notes p. 34 idea (§2.6): slabs of volume A(xᵢ)Δx instead of strips of area f(xᵢ)Δx.

Textbook material that matches (used for depth, not to widen the scope):
- Textbook §3.5: Proposition 3.5.1 and Remark 3.5.2 (dV = A(x) dx).
- Examples:
  - 3.5.3: pyramid, V = BH/3
  - 3.5.6: sphere
  - 3.5.7: disks
  - 3.5.8: washers
  - 3.5.9: the axis y = 2
  - 3.5.10: the y-axis, slicing in y
  - 3.5.13: disks
  - 3.5.14: Gabriel's horn, which also uses §2.5
- Exercises: Suggested 1, 2, 4, 7(b), 8(a), 9; Additional 1–6, 9(c), 13, 14, 16, 18(a).
- The textbook warns: "It is a common, but terrible, mistake to write that the area of a washer is π(R−r)², instead of π(R²−r²)."
- Not in the notes, so left out: the **cylindrical shell method** (textbook Examples 3.5.11–3.5.13 and every exercise that needs shells), the general-cone discussion (Definition 3.5.4, Proposition 3.5.5), and §3.6 surface area.

Common mistakes to anticipate:
- Using π(R − r)² instead of π(R² − r²).
- Measuring R and r from the x-axis when the axis is some other line. This is exactly what the p. 7 green note warns about.
- Swapping R and r, which gives a negative volume.
- Slicing parallel to the axis, or integrating in x when the axis is vertical.

Connections:
- Riemann sums (notes p. 34) and the FTC (notes p. 25).
- A region between two curves: find where they meet and which one is on top. Area between curves (§3.2) isn't in the notes; only the picture of the region is needed.
- Improper integrals (Topic 7) for solids that go out to infinity (textbook Example 3.5.14).
- u-substitution for some A(x).

Prerequisite concepts: the area of a circle (πr²), the distance from a point to a horizontal or vertical line, reading a region from its boundary curves, Riemann sums, the FTC.

---

## Cross-topic connections and dependency map

```
Derivative rules ──► Basic antiderivatives (p1–2)
      │
      ├─ Chain rule ──► u-Substitution (p3–6, 26)
      │                    │
      └─ Product rule ──► Integration by Parts (p7–12)
                           │   (uses substitution to find v)
Factoring / discriminant ──┤
Polynomial long division ──┴► Partial Fractions (p13–20)
                               (uses ln, substitution, arctan rules)

FTC (p25) ──► Definite substitution (p26)
   ├──► Improper integrals (p27–33)  [+ limits, one-sided limits]
   ├──► Numerical integration (p34–39) [+ Riemann sums]
   └──► Displacement & distance (p40–41; new notes p1–3) [+ |v| splitting from p25]
            └──► Motion in 2D/3D (new notes p4–7; 3.3–3.5 notes p1) [+ vectors: componentwise FTC, speed = |v⃗|]
                     └──► Arc length (3.3–3.5 notes p2–4) [+ Pythagoras; y = f(x) as the path (x, f(x));
                                                           u-substitution; Trapezoid Rule when no antiderivative]

Riemann sums (p34) ──► Volume by slicing, V = ∫A(x)dx (3.3–3.5 notes p5)
                            └──► Disks & washers, V = ∫π(R² − r²)dx (3.3–3.5 notes p6–7)
                                  [+ area of a circle; distances to the axis; region between curves;
                                   improper integrals for infinite solids]
```

Recurring themes:
- **Rewrite before integrating** (pages 2, 10, 19–21, 23, 33).
- **Combine techniques** (pages 12, 16–17, 24).
- **The same integral can be done more than one way** (pages 6 vs 11; page 21).
- **Split at problem points**: sign changes (page 25), infinite discontinuities and infinite limits (page 32), direction changes (page 41).
- **Look for a perfect square under the root** (new notes p. 7; 3.3–3.5 notes p. 1). Squaring can also undo a root (3.3–3.5 notes p. 3).
- **Set up first, then estimate if needed** (3.3–3.5 notes p. 4: an arc-length integral finished with the Trapezoid Rule).
- **Slice, sum, take the limit**: area strips f(xᵢ)Δx (p. 34), then volume slabs A(xᵢ)Δx (3.3–3.5 notes p. 5).

---

## Flagged items

### Errors in the notes (verified computationally)
| Page | Written | Correct |
|---|---|---|
| 10 | −2t²e^{−t} − 4te^{−t} − 4t^{−t} + C | −2t²e^{−t} − 4te^{−t} − **4e^{−t}** + C |
| 37 | ½ + √15/4 | **½ + √3/2** ≈ 1.366 |

### Minor labeling slips (answers unaffected)
- Page 18: "Ax+B", "Cx+D" should be Ar+B, Cr+D; "④ − ②" should be "④ − ③".
- Page 4: intermediate "∫eᵘ dx" before dx is replaced.

### UNCERTAIN readings
- None that affect the math. Every worked-example final answer on pages 2–33 (indefinite and definite) was checked with SymPy by differentiating or evaluating, and all match except the page 10 item above.
- Page 19: the numerator coefficient "6t²" is overwritten in the handwriting. It reads as 6, and the long division on the page (remainder 2t² + 11 after subtracting t⁴ + 4t²) confirms it.
- **New notes p. 7:** in v⃗(t) = (3t², t, 0), the t's crossbar runs through the 3, so the digit looks overwritten.
  - It reads as **3t²**. The same overlap appears in "3t²" in the next example, and the digit has the same flat top as the "3" in "0 ≤ t ≤ 3" on the same line. It does not look like the professor's looped 8 in "8t^{3/2}".
  - If it were meant as 8t², the distance would be (577^{3/2} − 1)/192 ≈ 72.18 (checked with SymPy and mpmath). The guide uses 3t².
- **New notes p. 6:** "cos(2t − 1)" is cramped but reads clearly as 2t − 1 at 400 DPI.
- **3.3–3.5 notes p. 5:** a red handwritten stroke crosses the printed "x" in the figure label "Δxᵢ", and the subscript i is still visible.
  - It could be a cross-out or a relabeling to the uniform Δx that the handwritten formulas use. The intent is **UNCERTAIN**.
  - It has no effect on any formula: the handwritten lines use Δx = (b − a)/n.
- **3.3–3.5 notes p. 3:** the function's letter is a looped cursive "g" in both g(x) and g′(x), and it is read as g. Nothing depends on the letter.
- **3.3–3.5 notes p. 3:** in "(0 ≤ t ≤ π)" the 0 is drawn narrow, almost like σ. The integral limits 0 and π on the same page confirm the reading.
- **3.3–3.5 notes p. 1:** "√(2t)" reads clearly at 500 DPI: the radical covers 2t, which matches the "+ 2t" on the next line.

### Unsolved exercises in the notes (candidates for practice)
- Page 39: Simpson's Rule n = 4 for ∫₋₁¹ √(1−x²) dx; Simpson's Rule n = 6 for ∫₂¹⁴ 1/ln x dx.
- Page 35: the Midpoint answers are left unevaluated (numerical values not computed).
- **New notes pp. 6–7:** four §3.3 examples are stated without solutions (listed under Topic 10, with verified answers).
- **3.3–3.5 notes pp. 6–7:** two §3.5 volume examples are stated without solutions. Verified answers: 32π/3 and 8π (listed under Topic 11).

### New notes check
- `3.1rest-3.3.pdf`: all six worked answers (new notes pp. 1–3) are correct. No errors found.
- `rest3.3-3.5.pdf`: all four worked answers (3.3–3.5 notes pp. 1, 3, 3 and 4: 28 m, 74/3, π, π(√2 + 1)) are correct. No errors found.
  - One small omission, not an error: on p. 1, √((t + 4)²) is written as t + 4 without the absolute value. That's valid because t + 4 > 0 on [1, 5].
  - One notation slip: p. 7's green note has a doubled word, "check on the the relation".

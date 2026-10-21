# Course Map: Calc 2 (Integral Calculus)

Last updated: 2026-10-19, after `3.7_3.9.pdf` was added: **§3.7 mass and density**, **§3.8 center of mass and moments**, and **§3.9 work**.
(Previous update: 2026-10-14, `MATH1342_Fall 2026_Section 12_0.pdf`, the full §3.5 handout including cylindrical shells.)

This is the big-picture map of the course as the lecture notes define it:
- what has been covered, in lecture order;
- what each topic depends on;
- how the topics connect.

The detailed, page-by-page record is `materials/notes/NOTES_INDEX.md`. The interactive guide is `study-guides/calc2_study_guide_1.1-3.3.html`; the filename is historical, and the guide now runs through §3.9.

---

## 1. Progression (lecture order)

| # | Textbook section | Topic | Lecture notes | Guide section |
|---|---|---|---|---|
| 1 | §1.1 | Basic antiderivatives, u-substitution | `1.1-3.1(some).pdf` pp. 1–6, 21–23, 26 | U |
| 2 | §1.1 | Integration by parts | `1.1-3.1(some).pdf` pp. 7–12, 21, 24 | P |
| 3 | §1.3 | Partial fractions | `1.1-3.1(some).pdf` pp. 13–20, 23 | R |
| 4 | §2.4 | FTC review, signed area, definite substitution | `1.1-3.1(some).pdf` pp. 25–26 | A |
| 5 | §2.5 | Improper integrals (Type I, Type II, splitting) | `1.1-3.1(some).pdf` pp. 27–33 | B |
| 6 | §2.6 | Numerical integration (Midpoint, Trapezoid, Simpson) | `1.1-3.1(some).pdf` pp. 34–39 | C |
| 7 | §3.1 | Displacement and distance traveled (1D) | `1.1-3.1(some).pdf` pp. 40–41; `3.1rest-3.3.pdf` pp. 1–3 | D |
| 8 | §3.3 | Motion in 2D and 3D: displacement vector, speed, distance | `3.1rest-3.3.pdf` pp. 4–7; `rest3.3-3.5.pdf` p. 1 | E |
| 9 | §3.3 | Arc length (parametric curves; graphs y = f(x); numerical estimate) | `rest3.3-3.5.pdf` pp. 2–4 | L |
| 10 | §3.5 | Volume by slicing; disks and washers (any horizontal or vertical axis) | `rest3.3-3.5.pdf` pp. 5–7; `MATH1342_Fall 2026_Section 12_0.pdf` pp. 1–4, and the washer parts of pp. 8–9 | V (extended 2026-10-14) |
| 11 | §3.5 | Cylindrical shells (slice parallel to the axis; "set up only" examples) | `MATH1342_Fall 2026_Section 12_0.pdf` pp. 5–9 | S |
| 12 | §3.7 | **Mass and density**: thin wire (1D), metal plate (2D), mass midpoint | `3.7_3.9.pdf` pp. 1–5 | **K (new)** |
| 13 | §3.8 | **Center of mass and moments**: seesaw, point masses, wire x̄, plate (x̄, ȳ) | `3.7_3.9.pdf` pp. 6–13 | **G (new)** |
| 14 | §3.9 | **Work**: constant force, ropes, pumping tanks, variable force, Hooke's law, leaky bucket, work = Δ kinetic energy | `3.7_3.9.pdf` pp. 14–24 | **W (new)** |

Quizzes noted in the lectures:
- "Quiz Thursday 9/17: §1.1, §1.3" (`1.1-3.1(some).pdf` p. 13).
- "Quiz 2, Thursday 10/1: §2.4, §2.5, §2.6" (`MATH1342_Fall 2026_Section 12_0.pdf` p. 1).
- "Quiz 3, Thursday 10/15: §3.1, §3.3, §3.5" (`3.7_3.9.pdf` p. 14, yellow, read at 600 DPI). That date is before the 2026-10-19 update.
- The notes don't say what Quiz 4 or the exam covers. Each quiz so far has covered the sections lectured since the previous one, so §3.7–§3.9 look like the next quiz's material. That is an inference, not something the notes say.

### Textbook sections the lectures skipped (so far)
| Section | Textbook title | Status |
|---|---|---|
| §1.2 | Special Trig. Integrals and Trig. Substitutions | not in the notes |
| §1.4 | Integration using Hyperbolic Sine and Cosine | not in the notes |
| §2.1–§2.3 | Sums and Differences; Prelude to the Definite Integral; The Definite Integral | not in the notes |
| §3.2 | Area in the Plane | not in the notes |
| §3.4 | Area Swept Out and Polar Coordinates | **not in the notes** (the lectures go straight from §3.3 to §3.5) |
| §3.6 | Surface Area | **not in the notes** (the lectures go straight from §3.5 to §3.7) |

§3.5 is now covered in full, apart from the textbook's general-cone discussion (Definition 3.5.4, Proposition 3.5.5). Cylindrical shells moved from "skipped" to covered on 2026-10-14.

Likely next in the textbook: §3.10 Hydrostatic Pressure (the last section of Chapter 3), or Chapter 4, "Polynomials and Power Series" (§4.1 Approximating Polynomials). This is a guess from the table of contents, not from the notes.

---

## 2. Prerequisite structure

```
Derivative rules ─► Basic antiderivatives (§1.1)
  ├─ Chain rule ─► u-substitution (§1.1) ──────────────┐
  └─ Product rule ─► Integration by parts (§1.1)       │
Factoring, long division ─► Partial fractions (§1.3)   │
                                                       ▼
            Antiderivatives ─► FTC: ∫ₐᵇ f = F(b) − F(a) (§2.4) ─► signed vs total area (split at sign changes)
                                 │
     ┌───────────────────────────┼──────────────────────────────┐
     ▼                           ▼                              ▼
Improper integrals (§2.5)   Numerical rules (§2.6)      Displacement & distance, 1D (§3.1)
[limits at ∞, one-sided]    [Riemann sums]              [v = p′, |v| split at v = 0]
     │                           │                              │
     │                           │                              ▼
     │                           │              Motion in 2D/3D (§3.3): ∫v⃗ dt (vector), ∫|v⃗| dt (number)
     │                           │              [vectors, length by Pythagoras]
     │                           │                              │
     │                           ├─────────────────────────────►▼
     │                           │              Arc length (§3.3): ∫√(x′² + y′²) dt, ∫√(1 + f′²) dx
     │                           │              [a curve = the path of a particle; Trapezoid/Simpson
     │                           │               when there's no antiderivative]
     │                           ▼
     │               Riemann sums ─► Volume by slicing (§3.5): V = ∫ A(x) dx
     │                    │              ├─► Disks & washers: V = ∫ π(R² − r²) dx   (slice ⟂ axis)
     │                    │              │     [area of a circle; distance to the axis; region between curves]
     │                    │              └─► Cylindrical shells: V = ∫ 2π r h dx    (slice ∥ axis)
     │                    │                    [circumference 2πr; r = distance to the axis; h = top − bottom;
     │                    │                     the same solid as washers, sliced the other way]
     │                    │
     │                    ├─► Mass (§3.7): M = ∫ δ(x) dx (wire), ∫ δ(x)[f − g] dx (plate); mass midpoint ∫ₐ^{xₘ} δ = ½M
     │                    │        [m = δV; area between curves; aˣ antiderivatives]
     │                    │        └─► Center of mass (§3.8): x̄ = x̄M / M, ȳ = ȳM / M
     │                    │              [seesaw m₁d₁ = m₂d₂; weighted average; strip midpoint (f + g)/2;
     │                    │               integration by parts (x e^{3x})]
     │                    │
     │                    └─► Work (§3.9): W = ∫ F(x) dx (variable force: springs F = kx, leaky bucket)
     │                             └─► W = ∫ (weight of slice)(distance it rises) dy (ropes, pumping tanks)
     │                                   [W = Fd; density × 9.8 for kg/m³; slab volume A(y)Δy (§3.5);
     │                                    similar triangles; work = Δ kinetic energy with v = x′ (§3.1)]
     └───────────────────────────────────────► solids that go out to infinity (Gabriel's horn)
```

### New prerequisite relationships (2026-10-19 update: mass, center of mass, work)
- **Mass (§3.7)** depends on:
  - Riemann sums (notes p. 34): Σδ(xᵢ)Δx, with "δ ≈ constant on each subinterval" (3.7–3.9 notes pp. 1, 3);
  - m = δV for a constant density;
  - area between curves: top minus bottom, intersections, and a sample point to decide which curve is on top (pp. 5, 13);
  - antiderivatives of exponentials aˣ (p. 4's 3ˣ, p. 13's 2ˣ).
- **Center of mass (§3.8)** depends on:
  - the mass integral (§3.7), which is every denominator;
  - the seesaw balance m₁d₁ = m₂d₂ (p. 6);
  - weighted averages;
  - the midpoint (f + g)/2 of a strip (p. 11);
  - integration by parts (p. 9: ∫2xe^{3x} dx).
- **Work (§3.9)** depends on:
  - W = Fd and the units table (p. 14);
  - Riemann sums, for "F ≈ constant on each step" (p. 20);
  - density (§3.7) and weight = mass × 9.8;
  - slab volumes A(y)Δy from slicing (§3.5);
  - similar triangles for cone radii (pp. 18–19);
  - position and velocity (§3.1) for the leaky bucket (y = 2t) and for work = Δ kinetic energy (p. 24).

### New prerequisite relationships (2026-10-14 update: shells)
- **Cylindrical shells** depend on:
  - Riemann sums (§2.6, notes p. 34): a shell is one more kind of thin slab;
  - the circumference 2πr, and the volume of a box (length × height × thickness): "cut and unroll";
  - distance from a vertical line (r = x − 1, 4 − x, 5 − x, x + 2);
  - regions between curves: which curve is on top (h = top − bottom), and where they meet (factoring);
  - the washer method (§3.5), which they are paired with on MATH1342 notes pp. 8–9.
- **Washers** gain two things: more axes (y = −2, 7, 1) and the professor's solutions to the disk and washer examples.

### Prerequisite relationships from the 2026-09-25 update
- **Arc length** depends on:
  - motion in 2D (the distance-traveled integral);
  - the Pythagorean theorem;
  - derivatives and the chain rule;
  - u-substitution with changed limits;
  - the Trapezoid Rule (§2.6), when there's no antiderivative.
- **Volume** depends on:
  - Riemann sums (§2.6, notes p. 34);
  - the FTC;
  - the area of a disk;
  - distances from a curve to a horizontal or vertical line;
  - reading a region bounded by curves (intersection points, which curve is farther from the axis).
- **Improper integrals (§2.5)** gain a new application: volumes of unbounded solids (textbook Example 3.5.14).

### New connections between topics
- Arc length **is** distance traveled: "view the curve as the trajectory of a moving particle" (`rest3.3-3.5.pdf` p. 2). The graph y = f(x) is the path (x, f(x)), with speed √(1 + f′²).
- The "perfect square under the root" move links §3.3 motion (`3.1rest-3.3.pdf` p. 7; `rest3.3-3.5.pdf` p. 1) with arc length (textbook Suggested Ex. 7).
- Numerical integration (§2.6) now has a concrete reason to exist: most arc-length integrals, such as the length of y = sin x, have no elementary antiderivative (`rest3.3-3.5.pdf` p. 4).
- Riemann sums for area, Σf(xᵢ)Δx, and for volume, ΣA(xᵢ)Δx, are the same idea (`rest3.3-3.5.pdf` p. 5 vs. `1.1-3.1(some).pdf` p. 34).
- **Washers and shells are two ways to slice one solid** (MATH1342 notes pp. 8–9). Each page takes one region and two axes: the professor uses washers (integrating dx) for the horizontal axis and shells (integrating dx) for the vertical one. In all seven "set up only" examples the integral is in x. This is a pattern in the notes, not a stated rule; the textbook (Example 3.5.11) also does shells about the x-axis with dy.
- Why have both? Textbook Examples 3.5.12 and 3.5.13: sometimes one method forces a split integral or an unsolvable equation (x as a function of y for y = x − x⁵), and the other doesn't.
- **Slice so the hard quantity is constant on each piece** (2026-10-19 update):
  - density on each wire piece or plate strip (§3.7);
  - the strip's own midpoint for ȳ (§3.8);
  - force on each small step (§3.9 springs, bucket);
  - lift distance for each slice of rope or water (§3.9 tanks).
  It is the area/volume Riemann-sum move again, with a different product in each slot.
- **The mass midpoint vs the center of mass** (3.7–3.9 notes p. 9; textbook Example 3.8.5). They're different points: xₘ splits the mass in half (like a median), x̄ balances it (like a mean).
- **Center of mass ↔ work**: pumping out a tank takes (total weight) × (how far its center of mass rises) (textbook after Example 3.9.15). §3.8 gives a check on §3.9 answers.
- **Two kinds of work integral**:
  - the force changes as the object moves (springs, the leaky bucket): ∫F dx;
  - the pieces move different distances (ropes, tanks): ∫(weight of slice)(distance) dy.
  The constant case (p. 15, a rope lifted whole) needs no integral at all.

---

## 3. Recurring problem-solving moves
1. Rewrite before integrating (split fractions, long division, algebraic tricks).
2. Split at problem points: sign changes, blow-ups, turning points.
3. Look for structure under a square root: sin² + cos² = 1, perfect squares.
4. Set up first; if there's no antiderivative, estimate with a numerical rule.
5. Slice, sum, take the limit: the Riemann-sum idea behind area, distance and volume.
6. Sanity checks:
   - distance ≥ |displacement|;
   - arc length ≥ the straight chord;
   - a volume is positive, and a solid of revolution has a known geometric special case, such as a cone.
7. Draw the axis first, then measure from it: R, r (washers) and r (shells) are distances to the axis, never "the curve" by itself.
8. Pick the slice that keeps the integral in one variable: perpendicular to the axis for washers, parallel for shells. Read the professor's "set up only" as "stop at the integral".
9. Write the product for one slice in words first: density × length/area (mass), x × mass (moment), weight × distance (work). Then make each factor a function of the slice's position.
10. Put units on every answer (3.7–3.9 notes p. 1, green): kg, ft-lb, J, N/m. Convert inches to feet first (p. 21). Multiply by 9.8 only for a mass density (kg/m³), never for a weight density (lb/ft³).

---

## 4. Scope notes for the study guide
- The lecture notes set the scope. Textbook sections are consulted only where they match the notes.
- Guide coverage:
  - §1.1 and §1.3 (U, P, R): added on 2026-09-23 at the user's request ("just add 1.1 and 1.3"). The 2026-09-25 update request asked for §1.1 and §1.3 to "remain excluded". This conflicts with the guide as it stands, so it was **flagged to the user, not acted on**. No new §1.1 or §1.3 material was added.
  - §2.4, §2.5, §2.6, §3.1, §3.3 (motion and arc length) and §3.5 (disks, washers and cylindrical shells; the shells topic S was added 2026-10-14).
  - §3.7 (K), §3.8 (G) and §3.9 (W), added 2026-10-19.
- Deliberately excluded because the notes don't cover them:
  - §1.2, §1.4, §2.1–§2.3, §3.2, §3.4;
  - arc length for x = f(y), arc-length parameterization, rectifiable curves, polar arc length;
  - surface area (§3.6) and hydrostatic pressure (§3.10);
  - the textbook's general-cone discussion (Definition 3.5.4, Proposition 3.5.5);
  - from §3.7: the density of 3D solids (Proposition 3.7.2, Examples 3.7.3–3.7.4), area density depending on y (Example 3.7.8), slugs, average density;
  - from §3.8: the centroid of a cone (Example 3.8.9) and moving systems of particles (Additional Ex. 14–16);
  - from §3.9: potential energy (Definition 3.9.10, Theorem 3.9.11), changing-mass mechanics (Remark 3.9.17), and the dW = q dF notation.
- Open question carried over, **still unresolved**: the 2026-09-25 update request said §1.1 and §1.3 should "remain excluded", while the guide includes them (topics U, P, R) because of the earlier "just add 1.1 and 1.3" request. Neither the 2026-10-14 nor the 2026-10-19 update touched them. (The new §3.8 material uses integration by parts, but that is cited, not re-taught.)

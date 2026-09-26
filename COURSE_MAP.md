# Course Map: Calc 2 (Integral Calculus)

Last updated: 2026-09-25, after `rest3.3-3.5.pdf` was added.

This is the big-picture map of the course as the lecture notes define it:
- what has been covered, in lecture order;
- what each topic depends on;
- how the topics connect.

The detailed, page-by-page record is `materials/notes/NOTES_INDEX.md`. The interactive guide is `study-guides/calc2_study_guide_1.1-3.3.html`; the filename is historical, and the guide now runs through §3.5.

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
| 9 | §3.3 | **Arc length** (parametric curves; graphs y = f(x); numerical estimate) | `rest3.3-3.5.pdf` pp. 2–4 | **L (new)** |
| 10 | §3.5 | **Volume by slicing; disks and washers** (any horizontal or vertical axis) | `rest3.3-3.5.pdf` pp. 5–7 | **V (new)** |

Quiz noted in the lectures: "Quiz Thursday 9/17: §1.1, §1.3" (`1.1-3.1(some).pdf` p. 13).

### Textbook sections the lectures skipped (so far)
| Section | Textbook title | Status |
|---|---|---|
| §1.2 | Special Trig. Integrals and Trig. Substitutions | not in the notes |
| §1.4 | Integration using Hyperbolic Sine and Cosine | not in the notes |
| §2.1–§2.3 | Sums and Differences; Prelude to the Definite Integral; The Definite Integral | not in the notes |
| §3.2 | Area in the Plane | not in the notes |
| §3.4 | Area Swept Out and Polar Coordinates | **not in the notes** (the lectures go straight from §3.3 to §3.5) |
| §3.5, part | Cylindrical shells | not in the notes (only disks and washers so far) |

Likely next in the textbook: §3.6 Surface Area, then §3.7 Mass and Density. This is a guess from the table of contents, not from the notes.

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
     │                                   └─► Disks & washers: V = ∫ π(R² − r²) dx
     │                                       [area of a circle; distance to the axis; region between curves]
     └───────────────────────────────────────► solids that go out to infinity (Gabriel's horn)
```

### New prerequisite relationships (this update)
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

---

## 4. Scope notes for the study guide
- The lecture notes set the scope. Textbook sections are consulted only where they match the notes.
- Guide coverage:
  - §1.1 and §1.3 (U, P, R): added on 2026-09-23 at the user's request ("just add 1.1 and 1.3"). The 2026-09-25 update request asked for §1.1 and §1.3 to "remain excluded". This conflicts with the guide as it stands, so it was **flagged to the user, not acted on**. No new §1.1 or §1.3 material was added.
  - §2.4, §2.5, §2.6, §3.1, §3.3 (motion and arc length) and §3.5 (disks and washers only).
- Deliberately excluded because the notes don't cover them:
  - §1.2, §1.4, §2.1–§2.3, §3.2, §3.4;
  - cylindrical shells;
  - arc length for x = f(y), arc-length parameterization, rectifiable curves, polar arc length;
  - surface area (§3.6).

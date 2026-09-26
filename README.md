# Calc 2 study guide

An interactive study guide for Calc 2 (integral calculus), built from the lecture notes for §1.1–§3.5 and the matching sections of the course textbook. It covers:
- integration techniques;
- the Fundamental Theorem and signed area;
- improper and numerical integrals;
- displacement and distance in 1D, 2D and 3D;
- arc length;
- volume by disks and washers.

Each topic teaches the idea first, then asks you to use it. Hints come one step at a time, and solutions stay hidden until you ask for them.

## Open the guide

1. Click the green **Code** button near the top of this page, choose **Download ZIP**, and unzip it. (Or `git clone` the repository.)
2. Open `study-guides/calc2_study_guide_1.1-3.3.html` in a web browser by double-clicking it. It works offline, and there's nothing to install. The filename is historical: the guide now runs through §3.5.
3. Your answers, hints used and progress are saved in that browser only. **Reset progress** in the sidebar clears them.

## Topics

| Section | Topic | Jump to |
|---|---|---|
| §1.1 | Antiderivatives and u-substitution | `#U` |
| §1.1 | Integration by parts | `#P` |
| §1.3 | Partial fractions | `#R` |
| §2.4 | The Fundamental Theorem and signed area | `#A` |
| §2.5 | Improper integrals | `#B` |
| §2.6 | Numerical integration (Midpoint, Trapezoid, Simpson) | `#C` |
| §3.1 | Displacement and distance traveled | `#D` |
| §3.3 | Motion in 2D and 3D | `#E` |
| §3.3 | Arc length | `#L` |
| §3.5 | Volume: disks and washers | `#V` |

Add the code to the end of the address to jump straight to a topic, for example `calc2_study_guide_1.1-3.3.html#L`. The guide also has:
- a concept map and a diagnostic quiz;
- mixed practice, where you choose the method yourself;
- a final exam-style mastery check;
- a mastery report.

## How each topic works

| Stage | What happens |
|---|---|
| Learn | The big idea, in plain language, before any formula |
| Understand | Prerequisites, why the method works, the formulas part by part, and how to recognize when to use it |
| Explore | An interactive explorer with presets from the lecture notes |
| Attempt | A guided example, then a problem to solve on your own |
| Compare | Tempting wrong approaches, spot-the-error exercises, and common mistakes |
| Practice | Problems from the notes, the textbook, and new variants |
| Master | Recognition and understanding checks, unfamiliar problems, and an "explain why" prompt |

## What's in this repository

- `study-guides/calc2_study_guide_1.1-3.3.html` is the guide itself, one self-contained file.
- `study-guides/_build/calc2_ftc_improper_numerical_displacement/` holds the guide's source: `parts/`, `app.js` and `styles.css`. It also holds `build.js`, which renders the math with KaTeX and writes the guide, and `test_guide.py`, a headless-browser test suite.
- `study-guides/verification/` holds the Jupyter notebooks that check every answer with SymPy/mpmath and Wolfram Language.
- `materials/notes/NOTES_INDEX.md` indexes the lecture notes by topic, with page references.
- `COURSE_MAP.md` shows the course's progression and how the topics depend on each other.
- `CLAUDE.md` and `AGENTS.md` are the study-system instructions the guide is built to follow.

## Rebuild and test

```
cd study-guides/_build/calc2_ftc_improper_numerical_displacement
npm install              # KaTeX, used to render the math at build time
node build.js            # writes study-guides/calc2_study_guide_1.1-3.3.html
python test_guide.py     # needs Playwright with Microsoft Edge, and mpmath
```

The verification notebooks need Python with SymPy and mpmath, plus Node for the check that runs the guide's own answer grader.

## What's not included

The course's source files aren't ours to publish, so `.gitignore` leaves out:
- the textbook PDF;
- the professor's lecture-note PDFs;
- the page images rendered from them.

The guide cites them by page (for example "notes p. 12" or "3.3–3.5 notes p. 4"), so you only need them to check a citation.

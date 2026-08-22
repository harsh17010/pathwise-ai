# Pathwise AI

**Pathwise AI** is an adaptive, explainable learning-path dashboard. A learner describes a goal in natural language, reviews editable profile inputs, and receives a deterministic roadmap selected from a normalized 80-course catalog. The application orders prerequisite-aware courses and an applied project milestone, explains each recommendation, responds to contextual questions, and adapts the next steps after progress or feedback.

## Product overview

The product has been designed for learners who can state a career objective but cannot reliably identify the appropriate order of skills, resources, and practice. The interface provides five connected views: Overview, My Path, Skills, Profile, and Assistant. The visual system uses a responsive dark-navy dashboard with electric-lime progress accents and restrained 3D perspective surfaces to make sequencing and momentum legible without sacrificing accessibility.

| Capability | Implementation |
|---|---|
| Natural-language goal capture | An editable goal input with a server-side structured-profile extraction route and validated fallback defaults. |
| Course catalog | A reproducible script normalizes the supplied 80-course dataset into `server/data/catalog.json`. |
| Recommendation engine | Deterministic scoring based on skill gaps, goal relevance, level fit, format fit, time budget, prerequisite dependencies, and feedback. |
| Adaptive roadmap | Completion, deferral, difficulty, and hands-on feedback reorder future eligible steps and display a clear change explanation. |
| Grounded assistant | A server-side LLM is prompted only with the current roadmap and catalog facts. A deterministic fallback is used for unavailable or invalid responses. |
| Data persistence model | Drizzle schema and migration for profiles, paths, path items, feedback, and chat messages. |

## Quick start

The project uses Node.js 22+, pnpm, and the platform-provided database and authentication environment variables. No external AI key is required for the server-side LLM helper in the hosted environment.

```bash
pnpm install
pnpm drizzle-kit generate
pnpm check
pnpm test
pnpm dev
```

The project expects the normalized course catalog at `server/data/catalog.json`. A catalog has already been generated from the supplied source data. To rebuild it from a permitted copy of the original training file, run:

```bash
node scripts/buildCatalog.mjs /path/to/train.csv server/data/catalog.json
```

The command reads only the training file and writes a compact normalized catalog. It does not copy the 57 MB raw training file into the application repository. If the source catalog is unavailable, the application retains a three-item fallback catalog in `server/data/fallbackCatalog.json`.

## Architecture

The frontend is React 19 with Tailwind CSS and typed tRPC hooks. Express and tRPC expose catalog, roadmap, profile-extraction, feedback-adaptation, and chat operations. Drizzle supplies the persistent data model. The deterministic recommendation service lives in `server/recommendation.ts`; it is deliberately separate from LLM wording so that path selection remains inspectable and reproducible.

```text
Learner goal + editable profile
            |
            v
Structured profile extraction (LLM with safe fallback)
            |
            v
Deterministic skill-gap and prerequisite-aware ranking
            |
            v
Normalized 80-course catalog + milestone generator
            |
            v
Explainable adaptive roadmap and grounded assistant
```

## Dataset provenance and constraints

The uploaded dataset contains 109,776 training reviews linked to 80 course labels, as recorded in [`docs/data-audit-summary.md`](docs/data-audit-summary.md). The original benchmark code is a review-to-course retrieval technique that uses sentence-overlap similarity and outputs training-review indices. It is not used as a learner-facing ranker because it does not produce learning sequences or resource-level reasoning. Instead, Pathwise uses the course names and technical review descriptors to form a compact catalog with system-inferred metadata. See [`docs/DATA_DICTIONARY.md`](docs/DATA_DICTIONARY.md) for the exact transformation boundaries.

> The normalized catalog describes the supplied data; it does not claim real provider URLs, ratings, completion outcomes, or unverified course facts.

## Quality checks

Run `pnpm check` for TypeScript validation and `pnpm test` for server-side unit tests. The test suite covers catalog availability, gap calculation, deterministic sequencing, explanations, feedback adaptation, and the built-in authentication logout route.

## Repository and submission handoff

Before submission, create a GitHub repository from this project, preserve the feature-oriented commit history, and make the repository accessible to evaluators. Generate the source ZIP with the documented packaging command in `docs/submission-checklist.md`; do not commit secrets, `node_modules`, build output, raw data, or virtual environments. The solution documentation PDF and demo script are included under `docs/`.

## Known limitations

The present release prioritizes a reliable demonstration persona and a compact catalog. The data model supports persistence, but the demo workspace intentionally runs without forcing evaluator sign-in. The catalog’s inferred levels, durations, formats, and prerequisites are transparent system metadata derived from course names and technical descriptors; production use should replace or verify them against authorized provider metadata.

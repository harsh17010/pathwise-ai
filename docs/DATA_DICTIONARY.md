# Pathwise AI Data Dictionary

## Source-audit summary

The supplied files consist of a training set with 109,776 labeled review rows, a test set with 10,977 review rows, a benchmark `submission.csv`, and a Python sentence-overlap retrieval solution. The training file has no missing values in the `Index`, `Reviews`, or `Course` fields and contains **80** unique course labels. The benchmark submission has matching test indices and ten valid training indices per row.

| Source field | Source type | Use in Pathwise | Retained in deployed catalog |
|---|---|---|---|
| `Index` | Integer identifier | Benchmark audit and traceability only. | No. |
| `Reviews` | Free text | The first technical descriptor sentence is used as a concise course description. | Only the one selected technical descriptor per course. |
| `Course` | Course label | Canonical catalog title and basis for inferred metadata. | Yes. |
| `Index_list` | Benchmark output | Validates the supplied retrieval task only. | No. |

## Normalized catalog contract

The deterministic transformation script at `scripts/buildCatalog.mjs` writes `server/data/catalog.json`. It creates one compact record for each distinct `Course` label. This prevents the raw 57 MB training file and repetitive review text from entering the deployable application.

| Catalog field | Type | Origin | Interpretation |
|---|---|---|---|
| `id` | String | Generated stable ID | Internal course identifier. |
| `title` | String | `Course` | Course label from the uploaded training data. |
| `description` | String | Technical sentence from a representative review | Descriptive topic fragment, not an independently verified syllabus. |
| `skills` | String array | Deterministic title-keyword rules | Inferred capability tags for skill-gap ranking. |
| `level` | Enum | Deterministic title-keyword rules | `Beginner`, `Intermediate`, or `Advanced` metadata used for sequencing. |
| `durationHours` | Integer | Deterministic level rule | Planning estimate, not a provider claim. |
| `format` | String | Deterministic title-keyword rule | `Guided course` or `Hands-on course` metadata for preference fit. |
| `prerequisites` | String array | Deterministic dependency rules | Course titles required before an eligible dependent step. |
| `catalogFact` | String | Normalized title + descriptor | Grounding context supplied to the assistant. |

## Recommendation data model

| Entity | Important fields | Purpose |
|---|---|---|
| `learner_profiles` | goal, level, known skills, weeks, weekly hours, preferred formats | Captures editable learner context. |
| `learning_paths` | goal snapshot, skill gaps, rationale, status | Preserves a generated roadmap version. |
| `path_items` | catalog ID, sequence, reason, skills, duration, status | Stores individual course, practice, project, or assessment steps. |
| `learner_feedback` | path item, rating, note | Records signals such as `too_difficult` or `prefer_hands_on`. |
| `learner_chat_messages` | role, content, path ID | Enables contextual conversation persistence. |

## Guardrails

The normalized catalog does not include external course URLs, commercial ratings, or personal learner data. No raw review is presented as a verified learner testimonial. The engine never asks an LLM to fabricate catalog entries or prerequisites. It uses deterministic path selection and only permits the LLM to phrase structured profiles or explain existing catalog and roadmap facts.

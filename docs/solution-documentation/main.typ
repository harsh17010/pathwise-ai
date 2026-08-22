// Pathwise AI competition solution documentation.
#import "report-theme.typ": report-accent, report-theme

#show: report-theme.with(
  title: "Pathwise AI",
  author: "Manus AI",
  rhythm: "report",
  running-header: true,
)

#page(margin: (top: 28%, x: 2.2cm), numbering: none, header: none)[
  #set par(first-line-indent: 0em)
  #align(center)[
    #text(size: 26pt, weight: "bold", fill: report-accent)[Pathwise AI]
    #v(0.45em)
    #text(size: 14pt, fill: luma(80))[Adaptive, Explainable Personalized Learning Paths]
    #v(1.8em)
    #line(length: 40%, stroke: 0.5pt + luma(160))
    #v(1.8em)
    #text(size: 11pt)[Competition Solution Documentation]
    #v(0.8em)
    #text(size: 10pt, fill: luma(75))[Prepared by Manus AI · #datetime.today().display("[day] [month repr:long] [year]")]
  ]
]

#page(numbering: none, header: none)[
  #outline(title: [Contents], indent: 1.4em)
]

#counter(page).update(1)

= Executive summary

Pathwise AI addresses a common failure of online learning: discovering a relevant course is easier than knowing which capabilities to build first, what to skip, and when a learner is ready to apply knowledge. The solution transforms a learner’s natural-language goal and editable profile into an adaptive, prerequisite-aware roadmap. The implementation combines a compact normalized catalog, deterministic hybrid ranking, transparent skill-gap analysis, and server-side LLM assistance that is restricted to existing catalog and roadmap facts.

The resulting application is a responsive dark-navy dashboard with overview, roadmap, skills, profile, and assistant views. It has been designed to make the decision logic inspectable rather than presenting recommendations as opaque AI output. Learners can complete, defer, mark an item as too difficult, or express a preference for hands-on work; Pathwise adjusts future eligible steps and explains the resulting change.

= Problem understanding

Online-learning ecosystems contain large resource inventories, but learner decisions are not independent. A course’s usefulness depends on current ability, desired role, available time, preferred learning format, completed work, and prerequisite relationships. Recommendation systems that simply retrieve similar courses do not solve the sequencing problem. A beginner aiming for data analysis, for example, needs a coherent progression across programming, data work, and evidence of application rather than a list of popular but unordered resources.

The product therefore focuses on five needs: collecting a meaningful learner profile, locating relevant capability gaps, sequencing resources safely, showing why each decision was made, and adapting the path as new evidence arrives. It prioritizes reliability in a demonstration setting: a deterministic fallback catalog and profile flow allow the experience to work even when an external model response is unavailable.

= Data preparation and catalog design

The supplied training data contains 109,776 rows and 80 distinct course labels. Each row combines a label with review-like text that includes a technical descriptor. The supplied Python solution is a high-performance sentence-overlap retrieval method for the original benchmark; it predicts related training-row indices from technical-sentence overlap. This is useful evidence of prior course-recommendation work, but it is not directly suitable for Pathwise because it does not construct a learner profile, choose a learning sequence, or return explainable course records.

Pathwise preserves the useful domain signal without shipping the raw data. A reproducible transformation selects one representative technical descriptor for each course and produces an 80-item JSON catalog. Deterministic rules infer skill tags, level, duration estimate, format, and prerequisite metadata from course titles and descriptors. These values are clearly treated as application metadata, not claims about provider syllabi, reviews, ratings, or completion outcomes.

#table(
  columns: (1.2fr, 2.4fr, 2fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Layer*], [*Input*], [*Output*]),
  [Source data], [Course label and technical descriptor], [One compact grounded catalog record per course],
  [Inference rules], [Course-title and descriptor patterns], [Skills, level, duration estimate, format, prerequisites],
  [Safety boundary], [No raw reviews or benchmark index lists], [No fabricated provider details or learner testimonials],
)

= Solution architecture

The system uses a React dashboard and a typed server boundary. The client gathers profile context and visualizes the current path. The server accepts profile, roadmap, adaptation, catalog, and chat operations through tRPC. The ranking service is isolated in `server/recommendation.ts`, making selection logic testable and separable from generative language. Drizzle defines storage tables for profiles, path versions, items, feedback, and chat history.

#box(width: 100%, inset: 12pt, radius: 7pt, fill: luma(247), stroke: luma(210))[
  #align(center)[
    *Learner goal and editable profile* #sym.arrow.r *Structured profile extraction* #sym.arrow.r *Deterministic skill-gap and prerequisite ranking* #sym.arrow.r *Normalized 80-course catalog* #sym.arrow.r *Explainable roadmap, progress updates, and grounded assistant*
  ]
]

The profile-extraction and assistant endpoints call a server-side LLM only when it improves the natural-language experience. Profile extraction uses a strict response schema for level, known skills, availability, timeframe, and formats. The assistant receives the learner’s current profile, selected path items, catalog facts, and sequence reasons. It is instructed not to invent URLs, providers, prerequisites, or outcomes. If a response fails or cannot be validated, a deterministic fallback produces a concise grounded answer.

= Deterministic recommendation method

Pathwise uses a hybrid score rather than allowing a language model to choose courses. First, the goal is mapped to a target capability profile. For example, a data-analyst goal resolves to Python, SQL, data analysis, visualization, statistics, and communication. The learner’s known skills are removed from this profile to calculate active gaps. The engine filters and scores catalog items with the following transparent signals.

#table(
  columns: (1.7fr, 3.9fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Signal*], [*Role in the score*]),
  [Skill-gap coverage], [Rewards courses that cover active capabilities missing from the learner profile.],
  [Goal relevance], [Rewards title terms connected to the learner’s stated objective.],
  [Level fit], [Favors a manageable distance from the current learner level.],
  [Format and time fit], [Rewards preferred formats and respects total study-time capacity.],
  [Prerequisite ordering], [Inserts known prerequisite courses before dependent work and prevents duplicate steps.],
  [Feedback adaptation], [Promotes hands-on work after that preference and favors foundational steps after difficulty feedback.],
)

After ranking, the engine selects a small set of items that fits the time budget, inserts prerequisite chains, and appends an applied project milestone. Every item carries an explanation that cites the learner’s gap, level, format, time, and dependency context. The assistant may restate this logic in natural language, but it cannot alter it.

= Key learner workflows

The first workflow starts with an open-ended goal. The learner can then review all structured fields before a path is created. This prevents the system from treating an LLM extraction as uneditable truth. The generated roadmap displays milestone groupings, estimated effort, covered skills, status, prerequisite-aware sequence number, and a concise “Why this now” rationale.

The second workflow demonstrates adaptation. A completed step unlocks the next appropriate action. A deferred or skipped item remains visible as evidence of the learner’s decision. Difficulty feedback prioritizes more foundational work, while a preference for hands-on work promotes eligible applied items. The dashboard surfaces a written reason for each change so the learner can understand the adjustment instead of guessing what the system changed.

The third workflow is contextual assistance. The learner may ask why a step was selected or what to focus on next. The assistant has access only to the selected path and its catalog facts. This grounding approach improves trust and makes it appropriate to state when a requested fact is not available.

= Experience and interface design

The dashboard uses a dark-navy surface system, an electric-lime primary action and progress color, restrained amber secondary status, compact visualizations, and visible focus styles. The key visual motif is the credible path: connected nodes, sequence traces, and milestone states repeat across the navigation, overview, and roadmap. Subtle CSS perspective transforms and orbital depth give key surfaces a three-dimensional hierarchy while preserving readable content and reduced-motion support.

Responsive layouts preserve the essential goal, path, and action information on narrow screens. Desktop users receive persistent path navigation; mobile users receive a menu trigger and stacked card layout. The interface avoids claiming learner proficiency merely from a course title: progress and skills change only from roadmap actions.

= Challenges and mitigations

#table(
  columns: (2fr, 3.6fr),
  inset: 7pt,
  stroke: luma(210),
  table.header([*Challenge*], [*Mitigation*]),
  [Benchmark data is not a learner-path dataset], [Use it only as a compact catalog/domain source; do not expose raw review retrieval as a learner recommendation.],
  [Potential LLM hallucination], [Keep selection deterministic, pass only existing facts to the model, validate profile JSON, and use fallbacks.],
  [Unknown external course metadata], [Do not invent URLs, providers, ratings, or syllabus claims; label inferred fields transparently.],
  [Short demonstration window], [Prioritize one complete persona flow and seed a compact fallback catalog for dependable startup.],
  [Need for adaptation without hidden logic], [Make feedback effects explicit and display an explanation whenever the path changes.],
)

= Quality assurance and future work

The implementation is checked with TypeScript and Vitest. Tests verify that the normalized catalog is present, skill gaps are calculated without duplicating known skills, roadmaps contain sequenced explanations and an applied milestone, and feedback changes produce a visible adaptation note. The visual dashboard has been inspected at desktop and mobile viewport sizes.

Future work would validate inferred metadata against authorized provider sources, add authenticated database persistence to the demonstration flow, learn weights from real consented learner outcomes, support richer assessments, and add instructor or administrator views. These extensions can improve personalization without weakening the current guarantees of explainability, prerequisite awareness, and catalog grounding.

= Conclusion

Pathwise AI provides a practical route from a learner’s intention to applied evidence. Its core innovation is not merely producing an AI-generated course list; it is the combination of a grounded catalog, deterministic transparent sequencing, editable learner inputs, adaptive feedback, and constrained generative assistance. The result is a credible learning system that can explain both what it recommends and why that recommendation is appropriately timed.

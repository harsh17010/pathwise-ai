import catalog from "./data/catalog.json";
import fallbackCatalog from "./data/fallbackCatalog.json";

export type LearnerLevel = "Beginner" | "Intermediate" | "Advanced";
export type LearningFormat = "Guided course" | "Hands-on course" | "Project" | "Self-paced";
export type ItemStatus = "planned" | "in_progress" | "completed" | "skipped" | "deferred";
export type FeedbackRating = "too_easy" | "just_right" | "too_difficult" | "not_relevant" | "prefer_hands_on";

export type LearnerProfileInput = {
  goal: string;
  currentLevel: LearnerLevel;
  knownSkills: string[];
  timelineWeeks: number;
  weeklyHours: number;
  preferredFormats: LearningFormat[];
};

export type CatalogItem = {
  id: string;
  title: string;
  type: "course" | "project";
  provider: string;
  source: string;
  description: string;
  skills: string[];
  level: LearnerLevel;
  durationHours: number;
  format: string;
  prerequisites: string[];
  catalogFact: string;
};

export type RoadmapItem = CatalogItem & {
  sequence: number;
  reason: string;
  status: ItemStatus;
  score: number;
  milestone: string;
};

const levels: Record<LearnerLevel, number> = { Beginner: 1, Intermediate: 2, Advanced: 3 };
const catalogItems = (catalog.length ? catalog : fallbackCatalog) as CatalogItem[];
const courseByTitle = new Map(catalogItems.map(item => [item.title, item]));

const targetSkillProfiles: Array<{ match: RegExp; skills: string[]; label: string }> = [
  { match: /data analyst|business analy/i, skills: ["Python", "SQL", "Data Analysis", "Visualization", "Statistics", "Communication"], label: "data analyst" },
  { match: /data scientist|machine learning|ml engineer/i, skills: ["Python", "SQL", "Statistics", "Machine Learning", "Modeling", "Visualization"], label: "data scientist" },
  { match: /front.?end|web developer|react/i, skills: ["JavaScript", "Frontend Development", "APIs", "Programming"], label: "front-end developer" },
  { match: /back.?end|api developer|server/i, skills: ["Programming", "Backend Development", "APIs", "SQL", "Data Modeling"], label: "back-end developer" },
  { match: /cloud|devops|platform/i, skills: ["Cloud", "Deployment", "Programming", "Security"], label: "cloud or DevOps practitioner" },
  { match: /mobile|android|ios|flutter/i, skills: ["Mobile Development", "App Development", "Programming"], label: "mobile developer" },
];

export function getCatalog() {
  return catalogItems;
}

export function resolveGoalSkills(goal: string) {
  const resolved = targetSkillProfiles.find(profile => profile.match.test(goal));
  return resolved ?? { skills: ["Programming", "Problem Solving", "Communication"], label: "technology learner" };
}

export function calculateSkillGaps(profile: LearnerProfileInput) {
  const known = new Set(profile.knownSkills.map(skill => skill.trim().toLowerCase()));
  return resolveGoalSkills(profile.goal).skills.filter(skill => !known.has(skill.toLowerCase()));
}

function scoreItem(item: CatalogItem, profile: LearnerProfileInput, gaps: string[], feedback: FeedbackRating[] = []) {
  const lowerGoal = profile.goal.toLowerCase();
  const gapHits = item.skills.filter(skill => gaps.map(x => x.toLowerCase()).includes(skill.toLowerCase())).length;
  const goalHit = item.title.toLowerCase().split(/\s+/).filter(token => token.length > 3 && lowerGoal.includes(token)).length;
  const levelDistance = Math.abs(levels[item.level] - levels[profile.currentLevel]);
  const levelFit = Math.max(0, 3 - levelDistance);
  const formatFit = profile.preferredFormats.some(format => item.format.toLowerCase().includes(format.toLowerCase().replace(" course", ""))) ? 2 : 0;
  const timeFit = item.durationHours <= Math.max(profile.weeklyHours * 3, 10) ? 1 : 0;
  const handsOnBoost = feedback.includes("prefer_hands_on") && /hands-on|project/i.test(item.format) ? 3 : 0;
  const difficultyPenalty = feedback.includes("too_difficult") && item.level === "Advanced" ? -3 : 0;
  const relevancePenalty = feedback.includes("not_relevant") && gapHits === 0 ? -4 : 0;
  return gapHits * 8 + goalHit * 3 + levelFit + formatFit + timeFit + handsOnBoost + difficultyPenalty + relevancePenalty;
}

function prerequisiteChain(item: CatalogItem, collected: CatalogItem[] = []) {
  for (const title of item.prerequisites) {
    const prerequisite = courseByTitle.get(title);
    if (prerequisite && !collected.some(existing => existing.id === prerequisite.id)) {
      prerequisiteChain(prerequisite, collected);
      collected.push(prerequisite);
    }
  }
  return collected;
}

function reasonFor(item: CatalogItem, gaps: string[], profile: LearnerProfileInput) {
  const coverage = item.skills.filter(skill => gaps.includes(skill));
  const covered = coverage.length ? coverage.join(", ") : item.skills.join(", ");
  const prerequisiteNote = item.prerequisites.length ? ` It appears before dependent work because it supports ${item.prerequisites.join(", ")}.` : "";
  return `Recommended for ${covered}. This ${item.level.toLowerCase()}-level ${item.format.toLowerCase()} is selected from the catalog because it fits your ${profile.currentLevel.toLowerCase()} starting point and stated goal.${prerequisiteNote}`;
}

export function buildRoadmap(profile: LearnerProfileInput, feedback: FeedbackRating[] = []) {
  const gaps = calculateSkillGaps(profile);
  const budget = Math.max(profile.weeklyHours * profile.timelineWeeks, 10);
  const scored = catalogItems
    .map(item => ({ item, score: scoreItem(item, profile, gaps, feedback) }))
    .filter(({ score }) => score > 2)
    .sort((a, b) => b.score - a.score || a.item.durationHours - b.item.durationHours);
  const selected: Array<{ item: CatalogItem; score: number }> = [];
  let totalHours = 0;
  for (const candidate of scored) {
    if (selected.some(existing => existing.item.id === candidate.item.id)) continue;
    const prerequisites = prerequisiteChain(candidate.item);
    for (const prerequisite of prerequisites) {
      if (!selected.some(existing => existing.item.id === prerequisite.id) && totalHours + prerequisite.durationHours <= budget) {
        selected.push({ item: prerequisite, score: scoreItem(prerequisite, profile, gaps, feedback) });
        totalHours += prerequisite.durationHours;
      }
    }
    if (selected.length < 5 && totalHours + candidate.item.durationHours <= budget) {
      selected.push(candidate);
      totalHours += candidate.item.durationHours;
    }
    if (selected.length >= 5) break;
  }
  const learningItems = selected.slice(0, 5).map(({ item, score }, index) => ({
    ...item,
    score,
    sequence: index + 1,
    reason: reasonFor(item, gaps, profile),
    status: "planned" as const,
    milestone: index < 2 ? "Foundation" : index < 4 ? "Applied practice" : "Ready to demonstrate",
  }));
  const projectSkills = gaps.slice(0, 3);
  const project: RoadmapItem = {
    id: "pathwise-applied-project",
    title: `Applied ${resolveGoalSkills(profile.goal).label} project`,
    type: "project",
    provider: "Pathwise milestone",
    source: "pathwise-generated",
    description: `Demonstrate ${projectSkills.join(", ")} through a scoped portfolio project after completing the selected catalog courses.`,
    skills: projectSkills,
    level: profile.currentLevel === "Beginner" ? "Intermediate" : profile.currentLevel,
    durationHours: Math.max(8, Math.min(20, Math.round(budget * 0.15))),
    format: "Project",
    prerequisites: learningItems.slice(-2).map(item => item.title),
    catalogFact: "Pathwise-created applied milestone; course facts are not claimed for this project.",
    score: 0,
    sequence: learningItems.length + 1,
    reason: `This milestone turns the skills from your selected courses into visible evidence of progress. It is intentionally scheduled after its stated prerequisites.`,
    status: "planned",
    milestone: "Portfolio-ready milestone",
  };
  const items = [...learningItems, project];
  return {
    goalLabel: resolveGoalSkills(profile.goal).label,
    targetSkills: resolveGoalSkills(profile.goal).skills,
    skillGaps: gaps,
    totalHours: items.reduce((sum, item) => sum + item.durationHours, 0),
    items,
    rationale: `Your roadmap prioritizes ${gaps.slice(0, 4).join(", ")} using catalog courses that match your current level, available time, preferred formats, and prerequisite dependencies.`,
  };
}

export function adaptRoadmap(items: RoadmapItem[], itemId: string, status: ItemStatus, rating?: FeedbackRating) {
  const updated = items.map(item => item.id === itemId ? { ...item, status } : item);
  const active = updated.filter(item => item.status === "planned");
  if (rating === "prefer_hands_on") active.sort((a, b) => Number(/hands-on|project/i.test(b.format)) - Number(/hands-on|project/i.test(a.format)));
  if (rating === "too_difficult") active.sort((a, b) => levels[a.level] - levels[b.level]);
  const completed = updated.filter(item => !active.some(activeItem => activeItem.id === item.id));
  const reordered = [...completed, ...active].map((item, index) => ({ ...item, sequence: index + 1 }));
  const note = rating === "prefer_hands_on"
    ? "The next applied items were promoted because you asked for more hands-on learning."
    : rating === "too_difficult"
      ? "The sequence now favors foundational steps before higher-complexity items."
      : rating === "too_easy"
        ? "The sequence now emphasizes the next eligible challenge because you indicated this item is too easy."
        : rating === "not_relevant"
          ? "Items with weaker alignment to your stated goal were deprioritized after your relevance feedback."
      : status === "skipped"
        ? "The skipped item remains recorded, and the next eligible prerequisite-aware item is now emphasized."
        : status === "completed"
          ? "Your completion unlocks the next prerequisite-aware step in the sequence."
          : "Your roadmap has been updated to reflect your learning decision.";
  return { items: reordered, note };
}

export function fallbackProfile(goal: string): LearnerProfileInput {
  return {
    goal,
    currentLevel: "Beginner",
    knownSkills: [],
    timelineWeeks: 12,
    weeklyHours: 5,
    preferredFormats: ["Hands-on course", "Project"],
  };
}

export function groundedChatReply(question: string, profile: LearnerProfileInput, items: RoadmapItem[]) {
  const next = items.find(item => item.status === "planned") ?? items[0];
  if (!next) return "Create a roadmap first so I can ground my answer in your selected catalog items.";
  return `Based on your ${profile.currentLevel.toLowerCase()} profile and the current roadmap, the next recommended step is **${next.title}**. It is sequenced because ${next.reason} The catalog fact available for this item is: ${next.catalogFact}`;
}

export type GuidedLevel = "Beginner" | "Intermediate" | "Advanced";
export type GuidedFormat = "Guided course" | "Hands-on course" | "Project" | "Self-paced";

export type GuidedProfile = {
  goal: string;
  currentLevel: GuidedLevel;
  knownSkills: string[];
  timelineWeeks: number;
  weeklyHours: number;
  preferredFormats: GuidedFormat[];
};

export const discoveryPrompts = [
  "What result do you want to achieve?",
  "Where are you starting from?",
  "How much time can you realistically protect each week?",
  "When do you want to be ready?",
  "Which learning mode will keep you moving?",
] as const;

export function profileSummary(profile: GuidedProfile) {
  return [
    profile.currentLevel,
    `${profile.weeklyHours}h/week for ${profile.timelineWeeks} weeks`,
    profile.preferredFormats.join(" + "),
  ].join(" · ");
}

export function normalizeGuidedProfile(profile: GuidedProfile): GuidedProfile {
  return {
    ...profile,
    goal: profile.goal.trim(),
    knownSkills: profile.knownSkills.map(skill => skill.trim()).filter(Boolean),
    preferredFormats: profile.preferredFormats.length ? profile.preferredFormats : ["Guided course"],
  };
}

export function nextDiscoveryStep(currentStep: number, goal: string) {
  if (currentStep === 0 && goal.trim().length < 8) return 0;
  return Math.min(currentStep + 1, discoveryPrompts.length);
}

export function isReadyToConfirm(profile: GuidedProfile) {
  return profile.goal.trim().length >= 8 && profile.weeklyHours > 0 && profile.timelineWeeks > 0 && profile.preferredFormats.length > 0;
}

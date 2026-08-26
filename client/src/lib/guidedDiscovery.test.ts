import { describe, expect, it } from "vitest";
import { isReadyToConfirm, nextDiscoveryStep, normalizeGuidedProfile, profileSummary } from "./guidedDiscovery";

describe("guided learner discovery", () => {
  const profile = {
    goal: "  Become a data analyst  ",
    currentLevel: "Beginner" as const,
    knownSkills: [" Excel ", "", "SQL"],
    timelineWeeks: 12,
    weeklyHours: 6,
    preferredFormats: ["Hands-on course" as const],
  };

  it("normalizes a confirmed learner brief before roadmap generation", () => {
    expect(normalizeGuidedProfile(profile)).toEqual({ ...profile, goal: "Become a data analyst", knownSkills: ["Excel", "SQL"] });
  });

  it("creates a concise confirmation summary", () => {
    expect(profileSummary(profile)).toContain("6h/week for 12 weeks");
  });

  it("keeps the first prompt in place until a meaningful goal is supplied", () => {
    expect(nextDiscoveryStep(0, "short")).toBe(0);
    expect(nextDiscoveryStep(0, "Become a data analyst")).toBe(1);
    expect(isReadyToConfirm(profile)).toBe(true);
  });
});

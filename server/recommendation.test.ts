import { describe, expect, it } from "vitest";
import { adaptRoadmap, buildRoadmap, calculateSkillGaps, fallbackProfile, getCatalog } from "./recommendation";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const analyst = {
  goal: "I want to become a data analyst in 12 weeks and build a portfolio.",
  currentLevel: "Beginner" as const,
  knownSkills: ["Excel"],
  timelineWeeks: 12,
  weeklyHours: 6,
  preferredFormats: ["Hands-on course", "Project"] as const,
};

describe("deterministic learning recommendations", () => {
  it("uses the normalized uploaded catalog", () => {
    expect(getCatalog()).toHaveLength(80);
    expect(getCatalog().some(item => item.title === "SQL for Beginners")).toBe(true);
  });

  it("identifies target skill gaps without repeating known skills", () => {
    expect(calculateSkillGaps({ ...analyst, knownSkills: ["Excel", "Python"] })).toContain("SQL");
    expect(calculateSkillGaps({ ...analyst, knownSkills: ["Excel", "Python"] })).not.toContain("Python");
  });

  it("builds an explainable prerequisite-aware roadmap", () => {
    const roadmap = buildRoadmap(analyst);
    expect(roadmap.items.length).toBeGreaterThanOrEqual(2);
    expect(roadmap.items.at(-1)?.type).toBe("project");
    expect(roadmap.items.every(item => item.reason.length > 40)).toBe(true);
    expect(roadmap.items.map(item => item.sequence)).toEqual([...roadmap.items.keys()].map(index => index + 1));
  });

  it("adapts order with a transparent note", () => {
    const roadmap = buildRoadmap(analyst);
    const result = adaptRoadmap(roadmap.items, roadmap.items[0].id, "completed", "prefer_hands_on");
    expect(result.note).toMatch(/hands-on/i);
    expect(result.items.find(item => item.id === roadmap.items[0].id)?.status).toBe("completed");
  });

  it("explains relevance and level feedback distinctly", () => {
    const roadmap = buildRoadmap(analyst);
    const tooEasy = adaptRoadmap(roadmap.items, roadmap.items[0].id, "planned", "too_easy");
    const notRelevant = adaptRoadmap(roadmap.items, roadmap.items[0].id, "skipped", "not_relevant");
    expect(tooEasy.note).toMatch(/challenge/i);
    expect(notRelevant.note).toMatch(/alignment/i);
  });

  it.each([
    ["too_easy", "challenge"],
    ["just_right", "learning decision"],
    ["too_difficult", "foundational"],
    ["not_relevant", "alignment"],
    ["prefer_hands_on", "hands-on"],
  ] as const)("returns an adaptation explanation for %s", (rating, expectedText) => {
    const roadmap = buildRoadmap(analyst);
    const status = rating === "not_relevant" ? "skipped" : "planned";
    const result = adaptRoadmap(roadmap.items, roadmap.items[0].id, status, rating);
    expect(result.note.toLowerCase()).toContain(expectedText);
  });

  it("provides a safe fallback profile", () => {
    expect(fallbackProfile("Learn data analysis").timelineWeeks).toBe(12);
  });

  it("exposes deterministic roadmap generation and adaptation through the typed API", async () => {
    const ctx = {
      user: null,
      req: { protocol: "https", headers: {} },
      res: { clearCookie: () => undefined },
    } as unknown as TrpcContext;
    const caller = appRouter.createCaller(ctx);
    const roadmap = await caller.learning.buildRoadmap(analyst);
    expect(roadmap.items.length).toBeGreaterThanOrEqual(2);
    const adapted = await caller.learning.adaptRoadmap({
      items: roadmap.items,
      itemId: roadmap.items[0].id,
      status: "skipped",
      rating: "prefer_hands_on",
    });
    expect(adapted.note).toMatch(/hands-on/i);
  });
});

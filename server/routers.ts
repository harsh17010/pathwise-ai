import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { z } from "zod";
import { adaptRoadmap, buildRoadmap, fallbackProfile, getCatalog, groundedChatReply, type LearnerProfileInput, type RoadmapItem } from "./recommendation";
import { getChatHistory, getFeedback, getLatestLearningPath, getLearnerProfile, getPersistedCatalog, recordProgressEvent, saveChatMessage, saveFeedback, saveLearnerProfile, saveLearningPath, syncCatalogToDatabase } from "./db";

const profileSchema = z.object({
  goal: z.string().min(8).max(600),
  currentLevel: z.enum(["Beginner", "Intermediate", "Advanced"]),
  knownSkills: z.array(z.string().min(1).max(64)).max(20),
  timelineWeeks: z.number().int().min(2).max(104),
  weeklyHours: z.number().int().min(1).max(40),
  preferredFormats: z.array(z.enum(["Guided course", "Hands-on course", "Project", "Self-paced"])).min(1),
});

function parseLlmJson(content: unknown) {
  if (typeof content !== "string") return null;
  try { return JSON.parse(content); } catch { return null; }
}

function fallbackRoadmapExplanation(items: RoadmapItem[]) {
  return {
    summary: "This path prioritizes the highest-value missing skills while preserving prerequisite order and a realistic time budget.",
    itemExplanations: items.map(item => ({ id: item.id, explanation: item.reason })),
  };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  learning: router({
    catalog: publicProcedure.query(() => getCatalog()),
    persistedCatalog: protectedProcedure.query(async () => {
      const items = await getPersistedCatalog();
      return items.length ? items : getCatalog();
    }),
    buildRoadmap: publicProcedure.input(profileSchema).mutation(({ input }) => buildRoadmap(input)),
    explainRoadmap: publicProcedure.input(z.object({ profile: profileSchema, items: z.array(z.any()).min(1).max(12) })).mutation(async ({ input }) => {
      const items = input.items as RoadmapItem[];
      const fallback = fallbackRoadmapExplanation(items);
      const facts = items.map(item => ({ id: item.id, title: item.title, catalogFact: item.catalogFact, reason: item.reason, prerequisites: item.prerequisites })).slice(0, 12);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Explain the selected Pathwise roadmap using only the supplied catalog facts and deterministic sequence reasons. Return strict JSON. Do not invent course metadata, providers, URLs, prerequisites, outcomes, or claims not in the inputs." },
            { role: "user", content: JSON.stringify({ learnerGoal: input.profile.goal, currentLevel: input.profile.currentLevel, items: facts }) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "roadmap_explanation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  summary: { type: "string" },
                  itemExplanations: { type: "array", items: { type: "object", properties: { id: { type: "string" }, explanation: { type: "string" } }, required: ["id", "explanation"], additionalProperties: false } },
                },
                required: ["summary", "itemExplanations"],
                additionalProperties: false,
              },
            },
          },
        });
        const parsed = parseLlmJson(response.choices?.[0]?.message?.content);
        const schema = z.object({ summary: z.string().min(20).max(800), itemExplanations: z.array(z.object({ id: z.string(), explanation: z.string().min(20).max(800) })).min(1).max(12) });
        const validated = schema.safeParse(parsed);
        const validIds = new Set(items.map(item => item.id));
        return { explanation: validated.success && validated.data.itemExplanations.every(item => validIds.has(item.id)) ? validated.data : fallback, source: validated.success && validated.data.itemExplanations.every(item => validIds.has(item.id)) ? "llm" : "fallback" };
      } catch {
        return { explanation: fallback, source: "fallback" };
      }
    }),
    adaptRoadmap: publicProcedure.input(z.object({
      items: z.array(z.any()).max(12),
      itemId: z.string().min(1),
      status: z.enum(["planned", "in_progress", "completed", "skipped", "deferred"]),
      rating: z.enum(["too_easy", "just_right", "too_difficult", "not_relevant", "prefer_hands_on"]).optional(),
    })).mutation(({ input }) => adaptRoadmap(input.items as RoadmapItem[], input.itemId, input.status, input.rating)),
    extractProfile: publicProcedure.input(z.object({ goal: z.string().min(8).max(600) })).mutation(async ({ input }) => {
      const fallback = fallbackProfile(input.goal);
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Extract only learner-profile facts stated or reasonably implied by the learner. Return strict JSON only. Use these exact allowed levels: Beginner, Intermediate, Advanced. Use preferred formats only from: Guided course, Hands-on course, Project, Self-paced. If unknown, choose conservative defaults." },
            { role: "user", content: input.goal },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "learner_profile",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  currentLevel: { type: "string", enum: ["Beginner", "Intermediate", "Advanced"] },
                  knownSkills: { type: "array", items: { type: "string" } },
                  timelineWeeks: { type: "integer", minimum: 2, maximum: 104 },
                  weeklyHours: { type: "integer", minimum: 1, maximum: 40 },
                  preferredFormats: { type: "array", items: { type: "string", enum: ["Guided course", "Hands-on course", "Project", "Self-paced"] } },
                },
                required: ["currentLevel", "knownSkills", "timelineWeeks", "weeklyHours", "preferredFormats"],
                additionalProperties: false,
              },
            },
          },
        });
        const extracted = parseLlmJson(response.choices?.[0]?.message?.content);
        const validated = profileSchema.omit({ goal: true }).safeParse(extracted);
        return { profile: validated.success ? { goal: input.goal, ...validated.data } : fallback, source: validated.success ? "llm" : "fallback" };
      } catch {
        return { profile: fallback, source: "fallback" };
      }
    }),
    chat: publicProcedure.input(z.object({
      question: z.string().min(1).max(800),
      profile: profileSchema,
      items: z.array(z.any()).max(12),
    })).mutation(async ({ input }) => {
      const fallback = groundedChatReply(input.question, input.profile, input.items as RoadmapItem[]);
      const facts = (input.items as RoadmapItem[]).map(item => `- ${item.title}: ${item.catalogFact}; sequence reason: ${item.reason}`).join("\n");
      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are Pathwise, a learning-path assistant. Answer only from the catalog facts and roadmap supplied. Do not invent providers, URLs, coverage, prerequisites, results, or course details. If the answer is unsupported, say so and suggest the next scheduled item. Keep answers concise." },
            { role: "user", content: `Learner goal: ${input.profile.goal}\nCurrent level: ${input.profile.currentLevel}\nRoadmap facts:\n${facts}\n\nQuestion: ${input.question}` },
          ],
        });
        const content = response.choices?.[0]?.message?.content;
        return { answer: typeof content === "string" && content.trim() ? content : fallback, source: typeof content === "string" && content.trim() ? "llm" : "fallback" };
      } catch {
        return { answer: fallback, source: "fallback" };
      }
    }),
    state: router({
      profile: protectedProcedure.input(profileSchema).mutation(({ ctx, input }) => saveLearnerProfile(ctx.user.id, input)),
      currentProfile: protectedProcedure.query(({ ctx }) => getLearnerProfile(ctx.user.id)),
      savePath: protectedProcedure.input(z.object({ roadmap: z.object({ goal: z.string(), skillGaps: z.array(z.string()), rationale: z.string(), items: z.array(z.any()).max(12) }) })).mutation(({ ctx, input }) => saveLearningPath(ctx.user.id, input.roadmap as { goal: string; skillGaps: string[]; rationale: string; items: RoadmapItem[] })),
      latestPath: protectedProcedure.query(({ ctx }) => getLatestLearningPath(ctx.user.id)),
      recordProgress: protectedProcedure.input(z.object({ pathItemId: z.number().int().positive(), eventType: z.enum(["started", "completed", "skipped", "deferred", "reopened"]) })).mutation(({ ctx, input }) => recordProgressEvent(ctx.user.id, input.pathItemId, input.eventType)),
      feedback: protectedProcedure.input(z.object({ pathItemId: z.number().int().positive(), rating: z.enum(["too_easy", "just_right", "too_difficult", "not_relevant", "prefer_hands_on"]), note: z.string().max(500).optional() })).mutation(({ ctx, input }) => saveFeedback(ctx.user.id, input.pathItemId, input.rating, input.note)),
      feedbackHistory: protectedProcedure.query(({ ctx }) => getFeedback(ctx.user.id)),
      chatMessage: protectedProcedure.input(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000), pathId: z.number().int().positive().optional() })).mutation(({ ctx, input }) => saveChatMessage(ctx.user.id, input.role, input.content, input.pathId)),
      chatHistory: protectedProcedure.query(({ ctx }) => getChatHistory(ctx.user.id)),
      syncCatalog: protectedProcedure.mutation(() => syncCatalogToDatabase()),
    }),
  }),
});

export type AppRouter = typeof appRouter;

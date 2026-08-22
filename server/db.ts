import { desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { catalogEntries, catalogSkills, InsertUser, learnerChatMessages, learnerFeedback, learnerProfiles, learningPaths, milestones, pathItems, progressEvents, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { getCatalog, type CatalogItem, type LearnerProfileInput, type RoadmapItem } from "./recommendation";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function saveLearnerProfile(userId: number, profile: LearnerProfileInput) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(learnerProfiles).values({ userId, ...profile }).onDuplicateKeyUpdate({
    set: { ...profile },
  });
  const rows = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function getLearnerProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(learnerProfiles).where(eq(learnerProfiles.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export async function saveLearningPath(userId: number, roadmap: { skillGaps: string[]; rationale: string; goal: string; items: RoadmapItem[] }) {
  const db = await getDb();
  if (!db) return null;
  const inserted = await db.insert(learningPaths).values({
    userId,
    goalSnapshot: roadmap.goal,
    skillGaps: roadmap.skillGaps,
    rationale: roadmap.rationale,
    status: "active",
  });
  const pathId = Number(inserted[0].insertId);
  await db.insert(pathItems).values(roadmap.items.map(item => ({
    pathId,
    catalogId: item.id,
    title: item.title,
    type: item.type,
    sequence: item.sequence,
    reason: item.reason,
    skills: item.skills,
    durationHours: item.durationHours,
    status: item.status,
  })));
  const uniqueMilestones = roadmap.items
    .filter((item, index, items) => items.findIndex(candidate => candidate.milestone === item.milestone) === index)
    .map(item => [item.milestone, item] as const);
  await db.insert(milestones).values(uniqueMilestones.map(([title, item], index) => ({
    pathId,
    title,
    sequence: index + 1,
    completionCriteria: `Complete the roadmap items in the ${title} milestone, including ${item.title}.`,
    status: "planned" as const,
  })));
  return pathId;
}

export async function recordProgressEvent(userId: number, pathItemId: number, eventType: "started" | "completed" | "skipped" | "deferred" | "reopened") {
  const db = await getDb();
  if (!db) return null;
  await db.insert(progressEvents).values({ userId, pathItemId, eventType });
  return true;
}

export async function getLatestLearningPath(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const paths = await db.select().from(learningPaths).where(eq(learningPaths.userId, userId)).orderBy(desc(learningPaths.createdAt)).limit(1);
  if (!paths[0]) return null;
  const items = await db.select().from(pathItems).where(eq(pathItems.pathId, paths[0].id));
  const pathMilestones = await db.select().from(milestones).where(eq(milestones.pathId, paths[0].id));
  const itemIds = items.map(item => item.id);
  const events = itemIds.length ? await db.select().from(progressEvents).where(inArray(progressEvents.pathItemId, itemIds)) : [];
  return { path: paths[0], items, milestones: pathMilestones, progressEvents: events };
}

export async function saveFeedback(userId: number, pathItemId: number, rating: "too_easy" | "just_right" | "too_difficult" | "not_relevant" | "prefer_hands_on", note?: string) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(learnerFeedback).values({ userId, pathItemId, rating, note: note ?? null });
  return true;
}

export async function getFeedback(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learnerFeedback).where(eq(learnerFeedback.userId, userId)).orderBy(desc(learnerFeedback.createdAt));
}

export async function saveChatMessage(userId: number, role: "user" | "assistant", content: string, pathId?: number) {
  const db = await getDb();
  if (!db) return null;
  await db.insert(learnerChatMessages).values({ userId, pathId: pathId ?? null, role, content });
  return true;
}

export async function getChatHistory(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(learnerChatMessages).where(eq(learnerChatMessages.userId, userId)).orderBy(desc(learnerChatMessages.createdAt));
}

export async function syncCatalogToDatabase(items: CatalogItem[] = getCatalog()) {
  const db = await getDb();
  if (!db) return { entries: 0, skills: 0 };
  let skills = 0;
  for (const item of items) {
    await db.insert(catalogEntries).values({
      externalId: item.id,
      title: item.title,
      type: item.type,
      description: item.description,
      level: item.level,
      durationHours: item.durationHours,
      format: item.format,
      source: item.source,
      catalogFact: item.catalogFact,
    }).onDuplicateKeyUpdate({
      set: { title: item.title, description: item.description, level: item.level, durationHours: item.durationHours, format: item.format, catalogFact: item.catalogFact },
    });
    const row = await db.select().from(catalogEntries).where(eq(catalogEntries.externalId, item.id)).limit(1);
    if (!row[0]) continue;
    for (const skill of item.skills) {
      const existing = await db.select().from(catalogSkills).where(eq(catalogSkills.catalogEntryId, row[0].id));
      if (!existing.some(record => record.skill === skill)) {
        await db.insert(catalogSkills).values({ catalogEntryId: row[0].id, skill, coverage: 1 });
      }
      skills += 1;
    }
  }
  return { entries: items.length, skills };
}

export async function getPersistedCatalog() {
  const db = await getDb();
  if (!db) return [];
  const entries = await db.select().from(catalogEntries).orderBy(catalogEntries.title);
  if (!entries.length) return [];
  const skills = await db.select().from(catalogSkills);
  return entries.map(entry => ({
    ...entry,
    skills: skills.filter(skill => skill.catalogEntryId === entry.id).map(skill => skill.skill),
  }));
}

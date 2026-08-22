import { int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const catalogEntries = mysqlTable("catalog_entries", {
  id: int("id").autoincrement().primaryKey(),
  externalId: varchar("externalId", { length: 96 }).notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["course", "project", "resource", "assessment"]).notNull(),
  description: text("description").notNull(),
  level: mysqlEnum("level", ["Beginner", "Intermediate", "Advanced"]).notNull(),
  durationHours: int("durationHours").notNull(),
  format: varchar("format", { length: 96 }).notNull(),
  source: varchar("source", { length: 96 }).notNull(),
  catalogFact: text("catalogFact").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const catalogSkills = mysqlTable("catalog_skills", {
  id: int("id").autoincrement().primaryKey(),
  catalogEntryId: int("catalogEntryId").notNull(),
  skill: varchar("skill", { length: 120 }).notNull(),
  coverage: int("coverage").default(1).notNull(),
});

export const learnerProfiles = mysqlTable("learner_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  goal: text("goal").notNull(),
  currentLevel: mysqlEnum("currentLevel", ["Beginner", "Intermediate", "Advanced"]).notNull(),
  knownSkills: json("knownSkills").$type<string[]>().notNull(),
  timelineWeeks: int("timelineWeeks").notNull(),
  weeklyHours: int("weeklyHours").notNull(),
  preferredFormats: json("preferredFormats").$type<string[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("learner_profile_user_idx").on(table.userId)]);

export const learningPaths = mysqlTable("learning_paths", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  goalSnapshot: text("goalSnapshot").notNull(),
  skillGaps: json("skillGaps").$type<string[]>().notNull(),
  rationale: text("rationale").notNull(),
  status: mysqlEnum("status", ["active", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const pathItems = mysqlTable("path_items", {
  id: int("id").autoincrement().primaryKey(),
  pathId: int("pathId").notNull(),
  catalogId: varchar("catalogId", { length: 96 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["course", "practice", "project", "assessment"]).notNull(),
  sequence: int("sequence").notNull(),
  reason: text("reason").notNull(),
  skills: json("skills").$type<string[]>().notNull(),
  durationHours: int("durationHours").notNull(),
  status: mysqlEnum("status", ["planned", "in_progress", "completed", "skipped", "deferred"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const milestones = mysqlTable("milestones", {
  id: int("id").autoincrement().primaryKey(),
  pathId: int("pathId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  sequence: int("sequence").notNull(),
  completionCriteria: text("completionCriteria").notNull(),
  status: mysqlEnum("status", ["planned", "in_progress", "completed"]).default("planned").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const progressEvents = mysqlTable("progress_events", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathItemId: int("pathItemId").notNull(),
  eventType: mysqlEnum("eventType", ["started", "completed", "skipped", "deferred", "reopened"]).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const learnerFeedback = mysqlTable("learner_feedback", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathItemId: int("pathItemId").notNull(),
  rating: mysqlEnum("rating", ["too_easy", "just_right", "too_difficult", "not_relevant", "prefer_hands_on"]).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const learnerChatMessages = mysqlTable("learner_chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pathId: int("pathId"),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

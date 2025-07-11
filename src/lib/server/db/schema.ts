import { uuid, pgTable, text, timestamp, integer } from "drizzle-orm/pg-core";

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  googleId: text("google_id").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  role: text("role").default("member"), // ✅ default role: member
  teamId: uuid("team_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  plan: text("plan").notNull(), // e.g. basic / pro / enterprise
  createdAt: timestamp("created_at").defaultNow(),
});

// Invites table
export const invites = pgTable("invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id").notNull(),
  email: text("email").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Files table
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  namespaceId: uuid("namespace_id").notNull(),
  type: text("type").notNull().default("file"),  // NEW: file | folder
  size: integer("size").notNull().default(0),             // NEW: file size in bytes
  status: text("status").default("pending"),     // pending | uploaded | failed
  visibility: text("visibility").notNull().default("private"), // private | team | public
  createdAt: timestamp("created_at").defaultNow(),
});
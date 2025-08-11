import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  userType: text("user_type").notNull().default("free"), // "free" | "premium" | "admin"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const telegramSessions = pgTable("telegram_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionName: text("session_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  apiId: text("api_id").notNull(),
  apiHash: text("api_hash").notNull(),
  sessionData: text("session_data"), // Telethon session string
  status: text("status").notNull().default("idle"), // "active" | "idle" | "crashed" | "stopped"
  workerId: varchar("worker_id").references(() => workers.id),
  messageCount: integer("message_count").notNull().default(0),
  lastActivity: timestamp("last_activity"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const workers = pgTable("workers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  status: text("status").notNull().default("offline"), // "online" | "offline" | "crashed"
  cpuUsage: integer("cpu_usage").notNull().default(0),
  memoryUsage: integer("memory_usage").notNull().default(0),
  activeSessions: integer("active_sessions").notNull().default(0),
  messagesPerHour: integer("messages_per_hour").notNull().default(0),
  lastHeartbeat: timestamp("last_heartbeat"),
  config: jsonb("config").default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const forwardingRules = pgTable("forwarding_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => telegramSessions.id, { onDelete: "cascade" }),
  sourceChat: text("source_chat").notNull(),
  targetChat: text("target_chat").notNull(),
  filters: jsonb("filters").default({}),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const systemLogs = pgTable("system_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  level: text("level").notNull(), // "info" | "warning" | "error"
  message: text("message").notNull(),
  component: text("component").notNull(), // "worker" | "session" | "auth" | "system"
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const systemSettings = pgTable("system_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTelegramSessionSchema = createInsertSchema(telegramSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerSchema = createInsertSchema(workers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForwardingRuleSchema = createInsertSchema(forwardingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSystemLogSchema = createInsertSchema(systemLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  id: true,
  updatedAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTelegramSession = z.infer<typeof insertTelegramSessionSchema>;
export type TelegramSession = typeof telegramSessions.$inferSelect;

export type InsertWorker = z.infer<typeof insertWorkerSchema>;
export type Worker = typeof workers.$inferSelect;

export type InsertForwardingRule = z.infer<typeof insertForwardingRuleSchema>;
export type ForwardingRule = typeof forwardingRules.$inferSelect;

export type InsertSystemLog = z.infer<typeof insertSystemLogSchema>;
export type SystemLog = typeof systemLogs.$inferSelect;

export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;

// API Response types
export type DashboardStats = {
  activeSessions: number;
  activeWorkers: number;
  messagesToday: number;
  totalUsers: number;
};

export type SystemHealth = {
  cpuUsage: number;
  memoryUsage: number;
  dbLoad: number;
  ramUsage: number;
};

export type ActivityItem = {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
  component: string;
};

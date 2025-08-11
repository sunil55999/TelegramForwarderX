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

// Phase 2: Source and Destination Management
export const sources = pgTable("sources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => telegramSessions.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(), // Telegram chat ID
  chatTitle: text("chat_title").notNull(),
  chatType: text("chat_type").notNull(), // "channel" | "group" | "supergroup"
  chatUsername: text("chat_username"), // @username if available
  isActive: boolean("is_active").notNull().default(true),
  lastMessageTime: timestamp("last_message_time"),
  totalMessages: integer("total_messages").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const destinations = pgTable("destinations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => telegramSessions.id, { onDelete: "cascade" }),
  chatId: text("chat_id").notNull(), // Telegram chat ID
  chatTitle: text("chat_title").notNull(),
  chatType: text("chat_type").notNull(), // "channel" | "group" | "supergroup"
  chatUsername: text("chat_username"), // @username if available
  isActive: boolean("is_active").notNull().default(true),
  lastForwardTime: timestamp("last_forward_time"),
  totalForwarded: integer("total_forwarded").notNull().default(0),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 2: Enhanced Forwarding Rules with Filters and Editing
export const forwardingMappings = pgTable("forwarding_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1), // Higher number = higher priority
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const messageFilters = pgTable("message_filters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mappingId: varchar("mapping_id").notNull().references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  // Keyword filters
  includeKeywords: text("include_keywords").array(), // Messages must contain at least one
  excludeKeywords: text("exclude_keywords").array(), // Messages must not contain any
  keywordMatchMode: text("keyword_match_mode").notNull().default("any"), // "any" | "all"
  caseSensitive: boolean("case_sensitive").notNull().default(false),
  
  // Message type filters
  allowedMessageTypes: text("allowed_message_types").array(), // "text" | "photo" | "video" | "document" | "voice" | "sticker"
  blockUrls: boolean("block_urls").notNull().default(false),
  blockForwards: boolean("block_forwards").notNull().default(false),
  
  // User filters
  allowedUserIds: text("allowed_user_ids").array(), // Only these users
  blockedUserIds: text("blocked_user_ids").array(), // Block these users
  
  // Content filters
  minMessageLength: integer("min_message_length").notNull().default(0),
  maxMessageLength: integer("max_message_length").notNull().default(4096),
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

export const messageEditing = pgTable("message_editing", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mappingId: varchar("mapping_id").notNull().references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  // Header and footer
  headerText: text("header_text"),
  footerText: text("footer_text"),
  
  // Content modifications
  removeSenderInfo: boolean("remove_sender_info").notNull().default(false),
  removeUrls: boolean("remove_urls").notNull().default(false),
  removeHashtags: boolean("remove_hashtags").notNull().default(false),
  removeMentions: boolean("remove_mentions").notNull().default(false),
  
  // Text replacements
  textReplacements: jsonb("text_replacements").default({}), // {find: replace} pairs
  
  // Formatting options
  preserveFormatting: boolean("preserve_formatting").notNull().default(true),
  customFormatting: text("custom_formatting"), // "plain" | "markdown" | "html"
  
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 2: Forwarding Activity and Logs
export const forwardingLogs = pgTable("forwarding_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mappingId: varchar("mapping_id").references(() => forwardingMappings.id, { onDelete: "set null" }),
  sourceId: varchar("source_id").references(() => sources.id, { onDelete: "set null" }),
  destinationId: varchar("destination_id").references(() => destinations.id, { onDelete: "set null" }),
  
  // Message details
  originalMessageId: text("original_message_id"),
  forwardedMessageId: text("forwarded_message_id"),
  messageType: text("message_type").notNull(), // "text" | "photo" | "video" | etc.
  originalText: text("original_text"),
  processedText: text("processed_text"),
  
  // Processing results
  status: text("status").notNull(), // "success" | "filtered" | "error" | "test"
  filterReason: text("filter_reason"), // Why message was filtered out
  errorMessage: text("error_message"),
  
  // Metadata
  processingTime: integer("processing_time"), // Milliseconds
  workerId: varchar("worker_id").references(() => workers.id),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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

// Phase 2 Insert Schemas
export const insertSourceSchema = createInsertSchema(sources).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDestinationSchema = createInsertSchema(destinations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForwardingMappingSchema = createInsertSchema(forwardingMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageFilterSchema = createInsertSchema(messageFilters).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageEditingSchema = createInsertSchema(messageEditing).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertForwardingLogSchema = createInsertSchema(forwardingLogs).omit({
  id: true,
  createdAt: true,
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

// Phase 2 Types
export type InsertSource = z.infer<typeof insertSourceSchema>;
export type Source = typeof sources.$inferSelect;

export type InsertDestination = z.infer<typeof insertDestinationSchema>;
export type Destination = typeof destinations.$inferSelect;

export type InsertForwardingMapping = z.infer<typeof insertForwardingMappingSchema>;
export type ForwardingMapping = typeof forwardingMappings.$inferSelect;

export type InsertMessageFilter = z.infer<typeof insertMessageFilterSchema>;
export type MessageFilter = typeof messageFilters.$inferSelect;

export type InsertMessageEditing = z.infer<typeof insertMessageEditingSchema>;
export type MessageEditing = typeof messageEditing.$inferSelect;

export type InsertForwardingLog = z.infer<typeof insertForwardingLogSchema>;
export type ForwardingLog = typeof forwardingLogs.$inferSelect;

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

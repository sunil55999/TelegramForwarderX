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

// Phase 3: Advanced Editing Rules
export const regexEditingRules = pgTable("regex_editing_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mappingId: varchar("mapping_id").references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(), // User-friendly name for the rule
  findPattern: text("find_pattern").notNull(), // Regex pattern to find
  replaceWith: text("replace_with").notNull(), // Replacement string
  isGlobal: boolean("is_global").notNull().default(true), // Global flag for regex
  isCaseSensitive: boolean("is_case_sensitive").notNull().default(false),
  
  priority: integer("priority").notNull().default(1), // Execution order (lower = first)
  isActive: boolean("is_active").notNull().default(true),
  
  // Global rule (applies to all mappings for user) or specific to mapping
  isGlobalRule: boolean("is_global_rule").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 3: Message Update & Delete Syncing
export const messageSyncSettings = pgTable("message_sync_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mappingId: varchar("mapping_id").references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  enableUpdateSync: boolean("enable_update_sync").notNull().default(false),
  enableDeleteSync: boolean("enable_delete_sync").notNull().default(false),
  updateSyncDelay: integer("update_sync_delay").notNull().default(0), // Seconds delay
  
  // Global setting (applies to all mappings for user) or specific to mapping
  isGlobalSetting: boolean("is_global_setting").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 3: Message Tracking for Sync
export const messageTracker = pgTable("message_tracker", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mappingId: varchar("mapping_id").notNull().references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  originalMessageId: text("original_message_id").notNull(), // Source message ID
  originalChatId: text("original_chat_id").notNull(), // Source chat ID
  forwardedMessageId: text("forwarded_message_id").notNull(), // Destination message ID
  forwardedChatId: text("forwarded_chat_id").notNull(), // Destination chat ID
  
  messageHash: text("message_hash"), // Hash of original content for change detection
  lastSynced: timestamp("last_synced").notNull().default(sql`now()`),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 3: Message Delay & Approval System
export const messageDelaySettings = pgTable("message_delay_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mappingId: varchar("mapping_id").references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  enableDelay: boolean("enable_delay").notNull().default(false),
  delaySeconds: integer("delay_seconds").notNull().default(10), // 5-60 seconds
  requireApproval: boolean("require_approval").notNull().default(false),
  autoApprovalTimeout: integer("auto_approval_timeout").notNull().default(300), // Auto-approve after 5 minutes
  
  // Global setting (applies to all mappings for user) or specific to mapping
  isGlobalSetting: boolean("is_global_setting").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 3: Pending Messages Queue
export const pendingMessages = pgTable("pending_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mappingId: varchar("mapping_id").notNull().references(() => forwardingMappings.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  originalMessageId: text("original_message_id").notNull(),
  originalChatId: text("original_chat_id").notNull(),
  messageContent: jsonb("message_content").notNull(), // Serialized message data
  processedContent: text("processed_content"), // After filters/editing
  
  status: text("status").notNull().default("pending"), // "pending" | "approved" | "rejected" | "expired"
  scheduledFor: timestamp("scheduled_for").notNull(), // When to forward
  expiresAt: timestamp("expires_at"), // Auto-approval timeout
  
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 3: System Statistics
export const systemStats = pgTable("system_stats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  mappingId: varchar("mapping_id").references(() => forwardingMappings.id, { onDelete: "cascade" }),
  
  statType: text("stat_type").notNull(), // "hourly" | "daily" | "total"
  statPeriod: text("stat_period").notNull(), // YYYY-MM-DD-HH or YYYY-MM-DD
  
  messagesProcessed: integer("messages_processed").notNull().default(0),
  messagesForwarded: integer("messages_forwarded").notNull().default(0),
  messagesFiltered: integer("messages_filtered").notNull().default(0),
  messagesBlocked: integer("messages_blocked").notNull().default(0),
  messagesErrored: integer("messages_errored").notNull().default(0),
  
  // Phase 3 specific stats
  messagesUpdated: integer("messages_updated").notNull().default(0),
  messagesDeleted: integer("messages_deleted").notNull().default(0),
  messagesApproved: integer("messages_approved").notNull().default(0),
  messagesRejected: integer("messages_rejected").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 3 Insert Schemas
export const insertRegexEditingRuleSchema = createInsertSchema(regexEditingRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageSyncSettingSchema = createInsertSchema(messageSyncSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMessageTrackerSchema = createInsertSchema(messageTracker).omit({
  id: true,
  createdAt: true,
});

export const insertMessageDelaySettingSchema = createInsertSchema(messageDelaySettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertPendingMessageSchema = createInsertSchema(pendingMessages).omit({
  id: true,
  createdAt: true,
});

export const insertSystemStatSchema = createInsertSchema(systemStats).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Phase 3 Types
export type InsertRegexEditingRule = z.infer<typeof insertRegexEditingRuleSchema>;
export type RegexEditingRule = typeof regexEditingRules.$inferSelect;

export type InsertMessageSyncSetting = z.infer<typeof insertMessageSyncSettingSchema>;
export type MessageSyncSetting = typeof messageSyncSettings.$inferSelect;

export type InsertMessageTracker = z.infer<typeof insertMessageTrackerSchema>;
export type MessageTracker = typeof messageTracker.$inferSelect;

export type InsertMessageDelaySetting = z.infer<typeof insertMessageDelaySettingSchema>;
export type MessageDelaySetting = typeof messageDelaySettings.$inferSelect;

export type InsertPendingMessage = z.infer<typeof insertPendingMessageSchema>;
export type PendingMessage = typeof pendingMessages.$inferSelect;

export type InsertSystemStat = z.infer<typeof insertSystemStatSchema>;
export type SystemStat = typeof systemStats.$inferSelect;

// Phase 3 API Response types
export type SystemStatsResponse = {
  hourly: {
    messagesProcessed: number;
    messagesForwarded: number;
    messagesFiltered: number;
    messagesBlocked: number;
    messagesErrored: number;
    messagesUpdated: number;
    messagesDeleted: number;
    messagesApproved: number;
    messagesRejected: number;
  };
  daily: {
    messagesProcessed: number;
    messagesForwarded: number;
    messagesFiltered: number;
    messagesBlocked: number;
    messagesErrored: number;
    messagesUpdated: number;
    messagesDeleted: number;
    messagesApproved: number;
    messagesRejected: number;
  };
  total: {
    messagesProcessed: number;
    messagesForwarded: number;
    messagesFiltered: number;
    messagesBlocked: number;
    messagesErrored: number;
    messagesUpdated: number;
    messagesDeleted: number;
    messagesApproved: number;
    messagesRejected: number;
  };
};

export type PendingMessageWithDetails = PendingMessage & {
  mapping: ForwardingMapping;
  sourceTitle: string;
  destinationTitle: string;
};

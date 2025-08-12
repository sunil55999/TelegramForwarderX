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
  workerId: text("worker_id").notNull().unique(), // Unique identifier for worker instance
  serverAddress: text("server_address").notNull(), // Worker server IP/hostname
  status: text("status").notNull().default("offline"), // "online" | "offline" | "crashed" | "maintenance"
  
  // System Resources
  totalRam: integer("total_ram").notNull().default(0), // Total RAM in MB
  usedRam: integer("used_ram").notNull().default(0), // Used RAM in MB
  cpuUsage: integer("cpu_usage").notNull().default(0), // CPU usage percentage
  
  // Capacity Management
  maxSessions: integer("max_sessions").notNull().default(20), // Maximum sessions allowed
  activeSessions: integer("active_sessions").notNull().default(0),
  
  // Performance Metrics
  loadScore: integer("load_score").notNull().default(0), // Calculated load (0-100)
  pingLatency: integer("ping_latency").notNull().default(0), // Response time in ms
  messagesPerHour: integer("messages_per_hour").notNull().default(0),
  
  // Worker Configuration
  ramThreshold: integer("ram_threshold").notNull().default(1536), // RAM limit in MB (1.5GB default)
  priority: integer("priority").notNull().default(1), // Worker priority (1=highest)
  authToken: text("auth_token").notNull(), // Secure token for worker authentication
  
  // Connection & Health
  lastHeartbeat: timestamp("last_heartbeat"),
  lastTaskAssigned: timestamp("last_task_assigned"),
  connectionCount: integer("connection_count").notNull().default(0),
  
  // Metadata
  workerVersion: text("worker_version"),
  config: jsonb("config").default({}),
  metadata: jsonb("metadata").default({}),
  
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

// Phase 4: User Role Management & Subscription Plans
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  planType: text("plan_type").notNull().default("free"), // "free" | "pro" | "elite"
  planStatus: text("plan_status").notNull().default("active"), // "active" | "expired" | "cancelled"
  
  // Limits for the plan
  maxSessions: integer("max_sessions").notNull().default(1),
  maxForwardingPairs: integer("max_forwarding_pairs").notNull().default(5),
  priority: integer("priority").notNull().default(1), // Higher = better priority
  
  // Subscription details
  startDate: timestamp("start_date").notNull().default(sql`now()`),
  expiryDate: timestamp("expiry_date"), // null = never expires for free plans
  
  // Current usage tracking
  currentSessions: integer("current_sessions").notNull().default(0),
  currentPairs: integer("current_pairs").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 4: RAM and Resource Tracking
export const resourceTracking = pgTable("resource_tracking", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => telegramSessions.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").references(() => workers.id, { onDelete: "cascade" }),
  
  // Resource usage metrics
  ramUsageBytes: integer("ram_usage_bytes").notNull().default(0),
  cpuUsagePercent: integer("cpu_usage_percent").notNull().default(0),
  messagesPerMinute: integer("messages_per_minute").notNull().default(0),
  
  // Status tracking
  isActive: boolean("is_active").notNull().default(true),
  isPaused: boolean("is_paused").notNull().default(false), // For RAM management
  lastActivity: timestamp("last_activity").notNull().default(sql`now()`),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 4: Priority Task Queue
export const taskQueue = pgTable("task_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").references(() => telegramSessions.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").references(() => workers.id, { onDelete: "set null" }),
  
  taskType: text("task_type").notNull(), // "message_forward" | "message_edit" | "sync_update"
  taskData: jsonb("task_data").notNull(), // Serialized task payload
  
  priority: integer("priority").notNull().default(1), // Based on user plan
  status: text("status").notNull().default("pending"), // "pending" | "processing" | "completed" | "failed" | "delayed"
  
  scheduledFor: timestamp("scheduled_for").notNull().default(sql`now()`),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 4: User Activity & Rate Limiting
export const userActivityLog = pgTable("user_activity_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  activityType: text("activity_type").notNull(), // "api_request" | "bot_command" | "message_forward"
  endpoint: text("endpoint"), // API endpoint or bot command
  requestCount: integer("request_count").notNull().default(1),
  
  // Rate limiting tracking
  windowStart: timestamp("window_start").notNull().default(sql`now()`),
  windowEnd: timestamp("window_end").notNull().default(sql`now() + interval '1 hour'`),
  
  // Limits based on plan
  hourlyLimit: integer("hourly_limit").notNull().default(100),
  dailyLimit: integer("daily_limit").notNull().default(1000),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 4: Worker Management & Scaling
export const workerMetrics = pgTable("worker_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  
  // Performance metrics
  tasksCompleted: integer("tasks_completed").notNull().default(0),
  tasksInQueue: integer("tasks_in_queue").notNull().default(0),
  averageTaskTime: integer("average_task_time").notNull().default(0), // milliseconds
  
  // Resource metrics  
  peakRamUsage: integer("peak_ram_usage").notNull().default(0),
  currentRamUsage: integer("current_ram_usage").notNull().default(0),
  cpuLoad: integer("cpu_load").notNull().default(0),
  
  // Capacity management
  sessionCapacity: integer("session_capacity").notNull().default(10),
  currentSessions: integer("current_sessions").notNull().default(0),
  
  // Status indicators
  isHealthy: boolean("is_healthy").notNull().default(true),
  needsScaling: boolean("needs_scaling").notNull().default(false),
  
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

// Phase 4 Insert Schemas
export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertResourceTrackingSchema = createInsertSchema(resourceTracking).omit({
  id: true,
  createdAt: true,
});

export const insertTaskQueueSchema = createInsertSchema(taskQueue).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivityLogSchema = createInsertSchema(userActivityLog).omit({
  id: true,
  createdAt: true,
});

export const insertWorkerMetricsSchema = createInsertSchema(workerMetrics).omit({
  id: true,
});

// Phase 4 Types
export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;

export type InsertResourceTracking = z.infer<typeof insertResourceTrackingSchema>;
export type ResourceTracking = typeof resourceTracking.$inferSelect;

export type InsertTaskQueue = z.infer<typeof insertTaskQueueSchema>;
export type TaskQueue = typeof taskQueue.$inferSelect;

export type InsertUserActivityLog = z.infer<typeof insertUserActivityLogSchema>;
export type UserActivityLog = typeof userActivityLog.$inferSelect;

export type InsertWorkerMetrics = z.infer<typeof insertWorkerMetricsSchema>;
export type WorkerMetrics = typeof workerMetrics.$inferSelect;

// Phase 4 API Response types
export type UserPlanDetails = {
  userId: string;
  planType: string;
  planStatus: string;
  limits: {
    maxSessions: number;
    maxForwardingPairs: number;
    priority: number;
  };
  usage: {
    currentSessions: number;
    currentPairs: number;
  };
  subscription: {
    startDate: string;
    expiryDate?: string;
  };
};

export type ResourceUsageReport = {
  userId: string;
  sessionId?: string;
  workerId?: string;
  ramUsageBytes: number;
  cpuUsagePercent: number;
  messagesPerMinute: number;
  status: {
    isActive: boolean;
    isPaused: boolean;
  };
  lastActivity: string;
};

export type QueueMetrics = {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  delayed: number;
  averageWaitTime: number;
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
};

// Phase 5: Multi-Account Management
export const telegramAccounts = pgTable("telegram_accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountName: text("account_name").notNull(), // User-friendly name
  phoneNumber: text("phone_number").notNull(),
  apiId: text("api_id").notNull(),
  apiHash: text("api_hash").notNull(),
  sessionPath: text("session_path").notNull(), // Path to session file
  status: text("status").notNull().default("inactive"), // "active" | "inactive" | "reauth_required" | "failed" | "disconnected"
  lastError: text("last_error"), // Last error message if any
  lastActivity: timestamp("last_activity"),
  isEnabled: boolean("is_enabled").notNull().default(true), // User can enable/disable forwarding
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 5: Team/Workspace Collaboration (Elite Feature)
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerId: varchar("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  memberId: varchar("member_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissions: text("permissions").notNull().default("read"), // "read" | "write"
  status: text("status").notNull().default("pending"), // "pending" | "active" | "suspended"
  invitedAt: timestamp("invited_at").notNull().default(sql`now()`),
  joinedAt: timestamp("joined_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 5: Enhanced Session Lifecycle & Error Handling
export const sessionFailures = pgTable("session_failures", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => telegramAccounts.id, { onDelete: "cascade" }),
  failureType: text("failure_type").notNull(), // "auth_error" | "flood_wait" | "network_error" | "crash" | "api_limit"
  errorMessage: text("error_message").notNull(),
  errorDetails: jsonb("error_details").default({}), // Additional error context
  retryCount: integer("retry_count").notNull().default(0),
  nextRetryAt: timestamp("next_retry_at"),
  isResolved: boolean("is_resolved").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  resolvedAt: timestamp("resolved_at"),
});

// Phase 5: Session Re-Authentication Workflow
export const reauthRequests = pgTable("reauth_requests", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => telegramAccounts.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  requestType: text("request_type").notNull().default("session_expired"), // "session_expired" | "manual_reauth" | "security_check"
  authToken: text("auth_token").notNull(), // Temporary token for re-auth process
  expiresAt: timestamp("expires_at").notNull(),
  status: text("status").notNull().default("pending"), // "pending" | "completed" | "expired" | "failed"
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 5: Account-specific Forwarding Mappings
export const accountForwardingMappings = pgTable("account_forwarding_mappings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => telegramAccounts.id, { onDelete: "cascade" }),
  sourceId: varchar("source_id").notNull().references(() => sources.id, { onDelete: "cascade" }),
  destinationId: varchar("destination_id").notNull().references(() => destinations.id, { onDelete: "cascade" }),
  isActive: boolean("is_active").notNull().default(true),
  priority: integer("priority").notNull().default(1),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Phase 5: Session Recovery & Backup
export const sessionBackups = pgTable("session_backups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountId: varchar("account_id").notNull().references(() => telegramAccounts.id, { onDelete: "cascade" }),
  backupPath: text("backup_path").notNull(), // Path to .session.bak file
  backupHash: text("backup_hash").notNull(), // File integrity check
  backupSize: integer("backup_size").notNull(), // File size in bytes
  isValid: boolean("is_valid").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 5: Real-time Sync Events (for Dashboard-Bot sync)
export const syncEvents = pgTable("sync_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(), // "source_added" | "destination_added" | "mapping_created" | "account_linked" | etc.
  eventData: jsonb("event_data").notNull(), // Event payload
  source: text("source").notNull(), // "dashboard" | "bot"
  isProcessed: boolean("is_processed").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  processedAt: timestamp("processed_at"),
});

// Phase 5 Insert Schemas
export const insertTelegramAccountSchema = createInsertSchema(telegramAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertSessionFailureSchema = createInsertSchema(sessionFailures).omit({
  id: true,
  createdAt: true,
});

export const insertReauthRequestSchema = createInsertSchema(reauthRequests).omit({
  id: true,
  createdAt: true,
});

export const insertAccountForwardingMappingSchema = createInsertSchema(accountForwardingMappings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionBackupSchema = createInsertSchema(sessionBackups).omit({
  id: true,
  createdAt: true,
});

export const insertSyncEventSchema = createInsertSchema(syncEvents).omit({
  id: true,
  createdAt: true,
});

// Phase 5 Types
export type InsertTelegramAccount = z.infer<typeof insertTelegramAccountSchema>;
export type TelegramAccount = typeof telegramAccounts.$inferSelect;

export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;

export type InsertSessionFailure = z.infer<typeof insertSessionFailureSchema>;
export type SessionFailure = typeof sessionFailures.$inferSelect;

export type InsertReauthRequest = z.infer<typeof insertReauthRequestSchema>;
export type ReauthRequest = typeof reauthRequests.$inferSelect;

export type InsertAccountForwardingMapping = z.infer<typeof insertAccountForwardingMappingSchema>;
export type AccountForwardingMapping = typeof accountForwardingMappings.$inferSelect;

export type InsertSessionBackup = z.infer<typeof insertSessionBackupSchema>;
export type SessionBackup = typeof sessionBackups.$inferSelect;

export type InsertSyncEvent = z.infer<typeof insertSyncEventSchema>;
export type SyncEvent = typeof syncEvents.$inferSelect;

// Phase 5 API Response types
export type AccountStatusInfo = {
  accountId: string;
  accountName: string;
  phoneNumber: string;
  status: string;
  lastError?: string;
  lastActivity?: string;
  isEnabled: boolean;
  forwardingPairs: number;
  totalMessages: number;
};

export type TeamInfo = {
  ownerId: string;
  members: {
    memberId: string;
    username: string;
    email: string;
    permissions: string;
    status: string;
    joinedAt?: string;
  }[];
  maxMembers: number;
  currentMembers: number;
};

export type SessionHealthReport = {
  accountId: string;
  status: string;
  lastError?: string;
  retryCount: number;
  nextRetryAt?: string;
  uptime: number;
  lastActivity?: string;
  connectionQuality: "excellent" | "good" | "poor" | "critical";
};

export type ReauthWorkflowStatus = {
  requestId: string;
  accountId: string;
  status: string;
  authToken: string;
  expiresAt: string;
  steps: {
    current: string;
    completed: string[];
    remaining: string[];
  };
};

// Phase 6: Distributed Worker System Tables

// Worker Tasks Management
export const workerTasks = pgTable("worker_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  taskType: text("task_type").notNull(), // "start_session" | "stop_session" | "update_filters" | "restart_session" | "health_check"
  taskData: jsonb("task_data").notNull(), // Task-specific parameters
  
  // Task Status
  status: text("status").notNull().default("pending"), // "pending" | "assigned" | "running" | "completed" | "failed"
  priority: integer("priority").notNull().default(1), // Higher number = higher priority
  
  // Execution Details
  assignedAt: timestamp("assigned_at"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  result: jsonb("result"), // Task execution result
  errorMessage: text("error_message"),
  
  // Retry Logic
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Session Assignment and Load Balancing
export const sessionAssignments = pgTable("session_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => telegramSessions.id, { onDelete: "cascade" }),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Assignment Details
  assignmentType: text("assignment_type").notNull(), // "manual" | "automatic" | "failover"
  priority: integer("priority").notNull().default(1), // Based on user subscription
  
  // Status and Health
  status: text("status").notNull().default("assigned"), // "assigned" | "active" | "paused" | "failed" | "migrating"
  lastHeartbeat: timestamp("last_heartbeat"),
  
  // Performance Tracking
  messagesProcessed: integer("messages_processed").notNull().default(0),
  ramUsageMb: integer("ram_usage_mb").notNull().default(0),
  avgProcessingTime: integer("avg_processing_time").notNull().default(0), // Milliseconds
  
  // Assignment History
  assignedAt: timestamp("assigned_at").notNull().default(sql`now()`),
  activatedAt: timestamp("activated_at"),
  lastMigration: timestamp("last_migration"),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Worker Session Queue for Overflow Management
export const sessionQueue = pgTable("session_queue", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sessionId: varchar("session_id").notNull().references(() => telegramSessions.id, { onDelete: "cascade" }),
  
  // Queue Management
  priority: integer("priority").notNull().default(1), // Based on user subscription
  queuePosition: integer("queue_position").notNull(),
  estimatedWaitTime: integer("estimated_wait_time").notNull().default(0), // Minutes
  
  // Queue Status
  status: text("status").notNull().default("queued"), // "queued" | "processing" | "assigned" | "expired"
  queuedAt: timestamp("queued_at").notNull().default(sql`now()`),
  processedAt: timestamp("processed_at"),
  expiredAt: timestamp("expired_at"),
  
  // Notification
  notificationSent: boolean("notification_sent").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Worker Performance Analytics
export const workerAnalytics = pgTable("worker_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  
  // Time Period
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  
  // Performance Metrics
  totalSessions: integer("total_sessions").notNull().default(0),
  totalMessages: integer("total_messages").notNull().default(0),
  avgCpuUsage: integer("avg_cpu_usage").notNull().default(0),
  avgRamUsage: integer("avg_ram_usage").notNull().default(0),
  maxRamUsage: integer("max_ram_usage").notNull().default(0),
  
  // Reliability Metrics
  uptime: integer("uptime").notNull().default(0), // Seconds
  crashCount: integer("crash_count").notNull().default(0),
  reconnectCount: integer("reconnect_count").notNull().default(0),
  avgResponseTime: integer("avg_response_time").notNull().default(0), // Milliseconds
  
  // Load Distribution
  premiumSessions: integer("premium_sessions").notNull().default(0),
  freeSessions: integer("free_sessions").notNull().default(0),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// System Scaling Events
export const scalingEvents = pgTable("scaling_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // "scale_up" | "scale_down" | "worker_added" | "worker_removed" | "overflow_detected"
  
  // Event Details
  trigger: text("trigger").notNull(), // "high_load" | "manual" | "worker_failure" | "low_resources"
  description: text("description").notNull(),
  
  // Metrics at Event Time
  totalWorkers: integer("total_workers").notNull(),
  totalSessions: integer("total_sessions").notNull(),
  queuedSessions: integer("queued_sessions").notNull(),
  avgLoadScore: integer("avg_load_score").notNull(),
  
  // Action Taken
  actionTaken: text("action_taken"),
  actionResult: text("action_result"), // "success" | "failed" | "partial"
  
  // Notification
  adminNotified: boolean("admin_notified").notNull().default(false),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Admin Worker Controls
export const workerControls = pgTable("worker_controls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workerId: varchar("worker_id").notNull().references(() => workers.id, { onDelete: "cascade" }),
  adminUserId: varchar("admin_user_id").notNull().references(() => users.id),
  
  // Control Action
  action: text("action").notNull(), // "start" | "stop" | "restart" | "maintenance" | "priority_change" | "session_reassign"
  actionData: jsonb("action_data"), // Action-specific parameters
  
  // Execution
  status: text("status").notNull().default("pending"), // "pending" | "executing" | "completed" | "failed"
  executedAt: timestamp("executed_at"),
  result: jsonb("result"),
  errorMessage: text("error_message"),
  
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Phase 6 Insert Schemas
export const insertWorkerTaskSchema = createInsertSchema(workerTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionAssignmentSchema = createInsertSchema(sessionAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSessionQueueSchema = createInsertSchema(sessionQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWorkerAnalyticsSchema = createInsertSchema(workerAnalytics).omit({
  id: true,
  createdAt: true,
});

export const insertScalingEventSchema = createInsertSchema(scalingEvents).omit({
  id: true,
  createdAt: true,
});

export const insertWorkerControlSchema = createInsertSchema(workerControls).omit({
  id: true,
  createdAt: true,
});

// Phase 6 Types
export type InsertWorkerTask = z.infer<typeof insertWorkerTaskSchema>;
export type WorkerTask = typeof workerTasks.$inferSelect;

export type InsertSessionAssignment = z.infer<typeof insertSessionAssignmentSchema>;
export type SessionAssignment = typeof sessionAssignments.$inferSelect;

export type InsertSessionQueue = z.infer<typeof insertSessionQueueSchema>;
export type SessionQueue = typeof sessionQueue.$inferSelect;

export type InsertWorkerAnalytics = z.infer<typeof insertWorkerAnalyticsSchema>;
export type WorkerAnalytics = typeof workerAnalytics.$inferSelect;

export type InsertScalingEvent = z.infer<typeof insertScalingEventSchema>;
export type ScalingEvent = typeof scalingEvents.$inferSelect;

export type InsertWorkerControl = z.infer<typeof insertWorkerControlSchema>;
export type WorkerControl = typeof workerControls.$inferSelect;

// Phase 6 API Response types
export type WorkerSystemStatus = {
  totalWorkers: number;
  onlineWorkers: number;
  totalSessions: number;
  queuedSessions: number;
  avgLoadScore: number;
  systemCapacity: {
    totalRam: number;
    usedRam: number;
    utilizationPercent: number;
  };
  lastScalingEvent?: {
    type: string;
    trigger: string;
    timestamp: string;
  };
};

export type WorkerNodeInfo = {
  id: string;
  workerId: string;
  name: string;
  serverAddress: string;
  status: string;
  resources: {
    totalRam: number;
    usedRam: number;
    ramPercent: number;
    cpuUsage: number;
  };
  capacity: {
    maxSessions: number;
    activeSessions: number;
    availableSlots: number;
  };
  performance: {
    loadScore: number;
    pingLatency: number;
    messagesPerHour: number;
    uptime: number;
  };
  lastHeartbeat?: string;
};

export type SessionAssignmentInfo = {
  sessionId: string;
  sessionName: string;
  userId: string;
  username: string;
  workerId: string;
  workerName: string;
  assignmentType: string;
  status: string;
  priority: number;
  performance: {
    messagesProcessed: number;
    ramUsageMb: number;
    avgProcessingTime: number;
  };
  assignedAt: string;
  lastActivity?: string;
};

export type QueuedSessionInfo = {
  sessionId: string;
  sessionName: string;
  userId: string;
  username: string;
  userType: string; // For priority calculation
  queuePosition: number;
  estimatedWaitTime: number;
  priority: number;
  status: string;
  queuedAt: string;
};

export type WorkerLoadBalanceResult = {
  success: boolean;
  assignedWorkerId?: string;
  workerName?: string;
  queuePosition?: number;
  estimatedWaitTime?: number;
  reason: string;
  loadBalanceStrategy: "immediate" | "queued" | "overflow";
};

import { 
  type User, type InsertUser, 
  type TelegramSession, type InsertTelegramSession, 
  type Worker, type InsertWorker, 
  type ForwardingRule, type InsertForwardingRule, 
  type SystemLog, type InsertSystemLog, 
  type SystemSetting, type InsertSystemSetting, 
  type Source, type InsertSource,
  type Destination, type InsertDestination,
  type ForwardingMapping, type InsertForwardingMapping,
  type ForwardingLog, type InsertForwardingLog,
  type DashboardStats, type SystemHealth, type ActivityItem,
  // Phase 3 imports
  type RegexEditingRule, type InsertRegexEditingRule,
  type MessageSyncSetting, type InsertMessageSyncSetting,
  type MessageTracker, type InsertMessageTracker,
  type MessageDelaySetting, type InsertMessageDelaySetting,
  type PendingMessage, type InsertPendingMessage,
  type SystemStat, type InsertSystemStat,
  type SystemStatsResponse, type PendingMessageWithDetails,
  // Phase 4 imports
  type SubscriptionPlan, type InsertSubscriptionPlan,
  type ResourceTracking, type InsertResourceTracking,
  type TaskQueue, type InsertTaskQueue,
  type UserActivityLog, type InsertUserActivityLog,
  type WorkerMetrics, type InsertWorkerMetrics,
  type UserPlanDetails, type ResourceUsageReport, type QueueMetrics
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Telegram Sessions
  getTelegramSession(id: string): Promise<TelegramSession | undefined>;
  getTelegramSessionsByUserId(userId: string): Promise<TelegramSession[]>;
  createTelegramSession(session: InsertTelegramSession): Promise<TelegramSession>;
  updateTelegramSession(id: string, updates: Partial<TelegramSession>): Promise<TelegramSession | undefined>;
  deleteTelegramSession(id: string): Promise<boolean>;
  getAllTelegramSessions(): Promise<TelegramSession[]>;

  // Workers
  getWorker(id: string): Promise<Worker | undefined>;
  createWorker(worker: InsertWorker): Promise<Worker>;
  updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | undefined>;
  deleteWorker(id: string): Promise<boolean>;
  getAllWorkers(): Promise<Worker[]>;

  // Forwarding Rules
  getForwardingRule(id: string): Promise<ForwardingRule | undefined>;
  getForwardingRulesBySessionId(sessionId: string): Promise<ForwardingRule[]>;
  createForwardingRule(rule: InsertForwardingRule): Promise<ForwardingRule>;
  updateForwardingRule(id: string, updates: Partial<ForwardingRule>): Promise<ForwardingRule | undefined>;
  deleteForwardingRule(id: string): Promise<boolean>;

  // System Logs
  createSystemLog(log: InsertSystemLog): Promise<SystemLog>;
  getSystemLogs(limit?: number): Promise<SystemLog[]>;

  // System Settings
  getSystemSetting(key: string): Promise<SystemSetting | undefined>;
  createOrUpdateSystemSetting(setting: InsertSystemSetting): Promise<SystemSetting>;
  getAllSystemSettings(): Promise<SystemSetting[]>;

  // Phase 2: Sources
  getSource(id: string): Promise<Source | undefined>;
  createSource(source: InsertSource): Promise<Source>;
  deleteSource(id: string): Promise<boolean>;
  getAllSources(): Promise<Source[]>;

  // Phase 2: Destinations
  getDestination(id: string): Promise<Destination | undefined>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  deleteDestination(id: string): Promise<boolean>;
  getAllDestinations(): Promise<Destination[]>;

  // Phase 2: Forwarding Mappings
  getForwardingMapping(id: string): Promise<ForwardingMapping | undefined>;
  createForwardingMapping(mapping: InsertForwardingMapping): Promise<ForwardingMapping>;
  deleteForwardingMapping(id: string): Promise<boolean>;
  getAllForwardingMappings(): Promise<ForwardingMapping[]>;

  // Phase 2: Forwarding Logs
  createForwardingLog(log: InsertForwardingLog): Promise<ForwardingLog>;
  getForwardingLogs(limit?: number, offset?: number, status?: string): Promise<ForwardingLog[]>;

  // Dashboard data
  getDashboardStats(): Promise<DashboardStats>;
  getSystemHealth(): Promise<SystemHealth>;
  getRecentActivity(limit?: number): Promise<ActivityItem[]>;

  // Phase 3: Regex Editing Rules
  getRegexEditingRule(id: string): Promise<RegexEditingRule | undefined>;
  getRegexEditingRulesByUserId(userId: string): Promise<RegexEditingRule[]>;
  getRegexEditingRulesByMappingId(mappingId: string): Promise<RegexEditingRule[]>;
  createRegexEditingRule(rule: InsertRegexEditingRule): Promise<RegexEditingRule>;
  updateRegexEditingRule(id: string, updates: Partial<RegexEditingRule>): Promise<RegexEditingRule | undefined>;
  deleteRegexEditingRule(id: string): Promise<boolean>;

  // Phase 3: Message Sync Settings
  getMessageSyncSetting(id: string): Promise<MessageSyncSetting | undefined>;
  getMessageSyncSettingsByUserId(userId: string): Promise<MessageSyncSetting[]>;
  getMessageSyncSettingsByMappingId(mappingId: string): Promise<MessageSyncSetting[]>;
  createMessageSyncSetting(setting: InsertMessageSyncSetting): Promise<MessageSyncSetting>;
  updateMessageSyncSetting(id: string, updates: Partial<MessageSyncSetting>): Promise<MessageSyncSetting | undefined>;
  deleteMessageSyncSetting(id: string): Promise<boolean>;

  // Phase 3: Message Tracker
  getMessageTracker(id: string): Promise<MessageTracker | undefined>;
  getMessageTrackerByOriginalMessage(originalMessageId: string, originalChatId: string): Promise<MessageTracker | undefined>;
  getMessageTrackersByMappingId(mappingId: string): Promise<MessageTracker[]>;
  createMessageTracker(tracker: InsertMessageTracker): Promise<MessageTracker>;
  updateMessageTracker(id: string, updates: Partial<MessageTracker>): Promise<MessageTracker | undefined>;
  deleteMessageTracker(id: string): Promise<boolean>;

  // Phase 3: Message Delay Settings
  getMessageDelaySetting(id: string): Promise<MessageDelaySetting | undefined>;
  getMessageDelaySettingsByUserId(userId: string): Promise<MessageDelaySetting[]>;
  getMessageDelaySettingsByMappingId(mappingId: string): Promise<MessageDelaySetting[]>;
  createMessageDelaySetting(setting: InsertMessageDelaySetting): Promise<MessageDelaySetting>;
  updateMessageDelaySetting(id: string, updates: Partial<MessageDelaySetting>): Promise<MessageDelaySetting | undefined>;
  deleteMessageDelaySetting(id: string): Promise<boolean>;

  // Phase 3: Pending Messages
  getPendingMessage(id: string): Promise<PendingMessage | undefined>;
  getPendingMessagesByUserId(userId: string): Promise<PendingMessageWithDetails[]>;
  getPendingMessagesByMappingId(mappingId: string): Promise<PendingMessage[]>;
  getExpiredPendingMessages(): Promise<PendingMessage[]>;
  getScheduledPendingMessages(): Promise<PendingMessage[]>;
  createPendingMessage(message: InsertPendingMessage): Promise<PendingMessage>;
  updatePendingMessage(id: string, updates: Partial<PendingMessage>): Promise<PendingMessage | undefined>;
  deletePendingMessage(id: string): Promise<boolean>;

  // Phase 3: System Statistics
  getSystemStat(id: string): Promise<SystemStat | undefined>;
  getSystemStatsByPeriod(statType: string, period: string, userId?: string, mappingId?: string): Promise<SystemStat[]>;
  createOrUpdateSystemStat(stat: InsertSystemStat): Promise<SystemStat>;
  getSystemStatsResponse(userId?: string): Promise<SystemStatsResponse>;
  incrementSystemStat(statType: string, period: string, field: string, amount?: number, userId?: string, mappingId?: string): Promise<void>;

  // Phase 4: Subscription Plan Management
  createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan>;
  getSubscriptionPlan(userId: string): Promise<SubscriptionPlan | null>;
  updateSubscriptionPlan(userId: string, updates: Partial<SubscriptionPlan>): Promise<void>;
  checkPlanLimits(userId: string, resourceType: 'sessions' | 'pairs'): Promise<boolean>;
  incrementUsage(userId: string, resourceType: 'sessions' | 'pairs', amount?: number): Promise<void>;

  // Phase 4: Resource Tracking
  recordResourceUsage(usage: InsertResourceTracking): Promise<void>;
  getResourceUsage(userId?: string, workerId?: string): Promise<ResourceTracking[]>;
  pauseUserSessions(userId: string, reason: string): Promise<void>;
  resumeUserSessions(userId: string): Promise<void>;
  getHighRamUsers(thresholdBytes: number): Promise<ResourceUsageReport[]>;

  // Phase 4: Task Queue Management
  addTask(task: InsertTaskQueue): Promise<TaskQueue>;
  getNextTask(workerId: string): Promise<TaskQueue | null>;
  updateTaskStatus(taskId: string, status: string, errorMessage?: string): Promise<void>;
  getQueueMetrics(): Promise<QueueMetrics>;
  cleanupCompletedTasks(olderThanHours: number): Promise<void>;

  // Phase 4: User Activity & Rate Limiting
  logUserActivity(userId: string, activityType: string, endpoint?: string): Promise<void>;
  checkRateLimit(userId: string, activityType: string): Promise<boolean>;
  getUserActivityStats(userId: string, timeframe?: 'hourly' | 'daily'): Promise<UserActivityLog[]>;

  // Phase 4: Worker Metrics & Scaling
  updateWorkerMetrics(workerId: string, metrics: Partial<WorkerMetrics>): Promise<void>;
  getWorkerMetrics(workerId?: string): Promise<WorkerMetrics[]>;
  identifyScalingNeeds(): Promise<WorkerMetrics[]>;
  
  // Phase 4: Admin Operations
  getAllUsersWithPlans(): Promise<(User & { plan?: SubscriptionPlan })[]>;
  changeUserPlan(userId: string, newPlan: string): Promise<void>;
  forceStopUserSessions(userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private telegramSessions: Map<string, TelegramSession> = new Map();
  private workers: Map<string, Worker> = new Map();
  private forwardingRules: Map<string, ForwardingRule> = new Map();
  private systemLogs: Map<string, SystemLog> = new Map();
  private systemSettings: Map<string, SystemSetting> = new Map();
  
  // Phase 2 storage
  private sources: Map<string, Source> = new Map();
  private destinations: Map<string, Destination> = new Map();
  private forwardingMappings: Map<string, ForwardingMapping> = new Map();
  private forwardingLogs: Map<string, ForwardingLog> = new Map();

  // Phase 3 storage
  private regexEditingRules: Map<string, RegexEditingRule> = new Map();
  private messageSyncSettings: Map<string, MessageSyncSetting> = new Map();
  private messageTrackers: Map<string, MessageTracker> = new Map();
  private messageDelaySettings: Map<string, MessageDelaySetting> = new Map();
  private pendingMessages: Map<string, PendingMessage> = new Map();
  private systemStats: Map<string, SystemStat> = new Map();

  // Phase 4 storage
  private subscriptionPlans: Map<string, SubscriptionPlan> = new Map();
  private resourceTracking: Map<string, ResourceTracking> = new Map();
  private taskQueue: Map<string, TaskQueue> = new Map();
  private userActivityLogs: Map<string, UserActivityLog> = new Map();
  private workerMetrics: Map<string, WorkerMetrics> = new Map();

  constructor() {
    // Initialize with some default settings
    this.initializeDefaultSettings();
    this.initializeDefaultWorkers();
    this.initializeDefaultUser();
    this.initializeDefaultSubscriptionPlans();
  }

  private initializeDefaultSettings() {
    const defaultSettings = [
      { key: "max_ram_usage", value: "80", description: "Maximum RAM usage percentage" },
      { key: "worker_auto_restart", value: "true", description: "Enable automatic worker restart" },
      { key: "free_user_delay", value: "5", description: "Free user priority delay in seconds" },
      { key: "db_pool_size", value: "20", description: "Database connection pool size" },
      { key: "query_timeout", value: "30", description: "Query timeout in seconds" },
    ];

    defaultSettings.forEach(setting => {
      const id = randomUUID();
      this.systemSettings.set(setting.key, {
        id,
        key: setting.key,
        value: setting.value,
        description: setting.description,
        updatedAt: new Date(),
      });
    });
  }

  private initializeDefaultWorkers() {
    const defaultWorkers = [
      { name: "Worker #1", status: "online", cpuUsage: 42, memoryUsage: 65, activeSessions: 5, messagesPerHour: 2341 },
      { name: "Worker #2", status: "online", cpuUsage: 38, memoryUsage: 72, activeSessions: 4, messagesPerHour: 1876 },
      { name: "Worker #3", status: "offline", cpuUsage: 0, memoryUsage: 0, activeSessions: 0, messagesPerHour: 0 },
    ];

    defaultWorkers.forEach(worker => {
      const id = randomUUID();
      this.workers.set(id, {
        id,
        name: worker.name,
        status: worker.status as any,
        cpuUsage: worker.cpuUsage,
        memoryUsage: worker.memoryUsage,
        activeSessions: worker.activeSessions,
        messagesPerHour: worker.messagesPerHour,
        lastHeartbeat: worker.status === "online" ? new Date() : null,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  private initializeDefaultUser() {
    const id = randomUUID();
    this.users.set(id, {
      id,
      username: "admin",
      email: "admin@autoforwardx.com",
      password: "$2b$10$hash", // In real app, this would be properly hashed
      userType: "admin",
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      userType: insertUser.userType || 'free',
      isActive: insertUser.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Telegram Session methods
  async getTelegramSession(id: string): Promise<TelegramSession | undefined> {
    return this.telegramSessions.get(id);
  }

  async getTelegramSessionsByUserId(userId: string): Promise<TelegramSession[]> {
    return Array.from(this.telegramSessions.values()).filter(session => session.userId === userId);
  }

  async createTelegramSession(insertSession: InsertTelegramSession): Promise<TelegramSession> {
    const id = randomUUID();
    const session: TelegramSession = {
      ...insertSession,
      id,
      status: insertSession.status || 'idle',
      sessionData: insertSession.sessionData || null,
      workerId: insertSession.workerId || null,
      messageCount: insertSession.messageCount || 0,
      lastActivity: insertSession.lastActivity || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.telegramSessions.set(id, session);
    return session;
  }

  async updateTelegramSession(id: string, updates: Partial<TelegramSession>): Promise<TelegramSession | undefined> {
    const session = this.telegramSessions.get(id);
    if (!session) return undefined;
    
    const updatedSession = { ...session, ...updates, updatedAt: new Date() };
    this.telegramSessions.set(id, updatedSession);
    return updatedSession;
  }

  async deleteTelegramSession(id: string): Promise<boolean> {
    return this.telegramSessions.delete(id);
  }

  async getAllTelegramSessions(): Promise<TelegramSession[]> {
    return Array.from(this.telegramSessions.values());
  }

  // Worker methods
  async getWorker(id: string): Promise<Worker | undefined> {
    return this.workers.get(id);
  }

  async createWorker(insertWorker: InsertWorker): Promise<Worker> {
    const id = randomUUID();
    const worker: Worker = {
      ...insertWorker,
      id,
      status: insertWorker.status || 'offline',
      cpuUsage: insertWorker.cpuUsage || 0,
      memoryUsage: insertWorker.memoryUsage || 0,
      activeSessions: insertWorker.activeSessions || 0,
      messagesPerHour: insertWorker.messagesPerHour || 0,
      lastHeartbeat: insertWorker.lastHeartbeat || null,
      config: insertWorker.config || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.workers.set(id, worker);
    return worker;
  }

  async updateWorker(id: string, updates: Partial<Worker>): Promise<Worker | undefined> {
    const worker = this.workers.get(id);
    if (!worker) return undefined;
    
    const updatedWorker = { ...worker, ...updates, updatedAt: new Date() };
    this.workers.set(id, updatedWorker);
    return updatedWorker;
  }

  async deleteWorker(id: string): Promise<boolean> {
    return this.workers.delete(id);
  }

  async getAllWorkers(): Promise<Worker[]> {
    return Array.from(this.workers.values());
  }

  // Forwarding Rule methods
  async getForwardingRule(id: string): Promise<ForwardingRule | undefined> {
    return this.forwardingRules.get(id);
  }

  async getForwardingRulesBySessionId(sessionId: string): Promise<ForwardingRule[]> {
    return Array.from(this.forwardingRules.values()).filter(rule => rule.sessionId === sessionId);
  }

  async createForwardingRule(insertRule: InsertForwardingRule): Promise<ForwardingRule> {
    const id = randomUUID();
    const rule: ForwardingRule = {
      ...insertRule,
      id,
      isActive: insertRule.isActive ?? true,
      filters: insertRule.filters || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.forwardingRules.set(id, rule);
    return rule;
  }

  async updateForwardingRule(id: string, updates: Partial<ForwardingRule>): Promise<ForwardingRule | undefined> {
    const rule = this.forwardingRules.get(id);
    if (!rule) return undefined;
    
    const updatedRule = { ...rule, ...updates, updatedAt: new Date() };
    this.forwardingRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteForwardingRule(id: string): Promise<boolean> {
    return this.forwardingRules.delete(id);
  }

  // System Log methods
  async createSystemLog(insertLog: InsertSystemLog): Promise<SystemLog> {
    const id = randomUUID();
    const log: SystemLog = {
      ...insertLog,
      id,
      metadata: insertLog.metadata || {},
      createdAt: new Date(),
    };
    this.systemLogs.set(id, log);
    return log;
  }

  async getSystemLogs(limit = 50): Promise<SystemLog[]> {
    const logs = Array.from(this.systemLogs.values());
    return logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
  }

  // System Settings methods
  async getSystemSetting(key: string): Promise<SystemSetting | undefined> {
    return this.systemSettings.get(key);
  }

  async createOrUpdateSystemSetting(insertSetting: InsertSystemSetting): Promise<SystemSetting> {
    const existing = this.systemSettings.get(insertSetting.key);
    const setting: SystemSetting = {
      id: existing?.id || randomUUID(),
      key: insertSetting.key,
      value: insertSetting.value,
      description: insertSetting.description || null,
      updatedAt: new Date(),
    };
    this.systemSettings.set(insertSetting.key, setting);
    return setting;
  }

  async getAllSystemSettings(): Promise<SystemSetting[]> {
    return Array.from(this.systemSettings.values());
  }

  // Dashboard data methods
  async getDashboardStats(): Promise<DashboardStats> {
    const sessions = Array.from(this.telegramSessions.values());
    const workers = Array.from(this.workers.values());
    const users = Array.from(this.users.values());

    return {
      activeSessions: sessions.filter(s => s.status === "active").length,
      activeWorkers: workers.filter(w => w.status === "online").length,
      messagesToday: sessions.reduce((sum, s) => sum + (s.messageCount || 0), 0),
      totalUsers: users.length,
    };
  }

  async getSystemHealth(): Promise<SystemHealth> {
    const workers = Array.from(this.workers.values());
    const onlineWorkers = workers.filter(w => w.status === "online");
    
    const avgCpu = onlineWorkers.length > 0 
      ? Math.round(onlineWorkers.reduce((sum, w) => sum + w.cpuUsage, 0) / onlineWorkers.length)
      : 0;
    
    const avgMemory = onlineWorkers.length > 0
      ? Math.round(onlineWorkers.reduce((sum, w) => sum + w.memoryUsage, 0) / onlineWorkers.length)
      : 0;

    return {
      cpuUsage: avgCpu,
      memoryUsage: avgMemory,
      dbLoad: 32, // Simulated
      ramUsage: 68, // Simulated
    };
  }

  async getRecentActivity(limit = 10): Promise<ActivityItem[]> {
    const logs = await this.getSystemLogs(limit);
    return logs.map(log => ({
      id: log.id,
      type: log.level as any,
      message: log.message,
      timestamp: log.createdAt.toISOString(),
      component: log.component,
    }));
  }

  // Phase 2: Sources methods
  async getSource(id: string): Promise<Source | undefined> {
    return this.sources.get(id);
  }

  async createSource(insertSource: InsertSource): Promise<Source> {
    const id = randomUUID();
    const source: Source = {
      ...insertSource,
      id,
      chatUsername: insertSource.chatUsername || null,
      isActive: insertSource.isActive ?? true,
      lastMessageTime: insertSource.lastMessageTime || null,
      totalMessages: insertSource.totalMessages || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sources.set(id, source);
    return source;
  }

  async deleteSource(id: string): Promise<boolean> {
    return this.sources.delete(id);
  }

  async getAllSources(): Promise<Source[]> {
    return Array.from(this.sources.values());
  }

  // Phase 2: Destinations methods
  async getDestination(id: string): Promise<Destination | undefined> {
    return this.destinations.get(id);
  }

  async createDestination(insertDestination: InsertDestination): Promise<Destination> {
    const id = randomUUID();
    const destination: Destination = {
      ...insertDestination,
      id,
      chatUsername: insertDestination.chatUsername || null,
      isActive: insertDestination.isActive ?? true,
      lastForwardTime: insertDestination.lastForwardTime || null,
      totalForwarded: insertDestination.totalForwarded || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.destinations.set(id, destination);
    return destination;
  }

  async deleteDestination(id: string): Promise<boolean> {
    return this.destinations.delete(id);
  }

  async getAllDestinations(): Promise<Destination[]> {
    return Array.from(this.destinations.values());
  }

  // Phase 2: Forwarding Mappings methods
  async getForwardingMapping(id: string): Promise<ForwardingMapping | undefined> {
    return this.forwardingMappings.get(id);
  }

  async createForwardingMapping(insertMapping: InsertForwardingMapping): Promise<ForwardingMapping> {
    const id = randomUUID();
    const mapping: ForwardingMapping = {
      ...insertMapping,
      id,
      isActive: insertMapping.isActive ?? true,
      priority: insertMapping.priority || 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.forwardingMappings.set(id, mapping);
    return mapping;
  }

  async deleteForwardingMapping(id: string): Promise<boolean> {
    return this.forwardingMappings.delete(id);
  }

  async getAllForwardingMappings(): Promise<ForwardingMapping[]> {
    return Array.from(this.forwardingMappings.values());
  }

  // Phase 2: Forwarding Logs methods
  async createForwardingLog(insertLog: InsertForwardingLog): Promise<ForwardingLog> {
    const id = randomUUID();
    const log: ForwardingLog = {
      ...insertLog,
      id,
      workerId: insertLog.workerId || null,
      sourceId: insertLog.sourceId || null,
      destinationId: insertLog.destinationId || null,
      mappingId: insertLog.mappingId || null,
      originalMessageId: insertLog.originalMessageId || null,
      forwardedMessageId: insertLog.forwardedMessageId || null,
      originalText: insertLog.originalText || null,
      processedText: insertLog.processedText || null,
      filterReason: insertLog.filterReason || null,
      errorMessage: insertLog.errorMessage || null,
      processingTime: insertLog.processingTime || null,
      createdAt: new Date(),
    };
    this.forwardingLogs.set(id, log);
    return log;
  }

  async getForwardingLogs(limit = 50, offset = 0, status?: string): Promise<ForwardingLog[]> {
    let logs = Array.from(this.forwardingLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (status) {
      logs = logs.filter(log => log.status === status);
    }
    
    return logs.slice(offset, offset + limit);
  }

  // Phase 3: Regex Editing Rules methods
  async getRegexEditingRule(id: string): Promise<RegexEditingRule | undefined> {
    return this.regexEditingRules.get(id);
  }

  async getRegexEditingRulesByUserId(userId: string): Promise<RegexEditingRule[]> {
    return Array.from(this.regexEditingRules.values())
      .filter(rule => rule.userId === userId)
      .sort((a, b) => a.priority - b.priority);
  }

  async getRegexEditingRulesByMappingId(mappingId: string): Promise<RegexEditingRule[]> {
    return Array.from(this.regexEditingRules.values())
      .filter(rule => rule.mappingId === mappingId)
      .sort((a, b) => a.priority - b.priority);
  }

  async createRegexEditingRule(insertRule: InsertRegexEditingRule): Promise<RegexEditingRule> {
    const id = randomUUID();
    const rule: RegexEditingRule = {
      ...insertRule,
      id,
      mappingId: insertRule.mappingId || null,
      isActive: insertRule.isActive ?? true,
      priority: insertRule.priority || 1,
      isGlobal: insertRule.isGlobal ?? true,
      isCaseSensitive: insertRule.isCaseSensitive ?? false,
      isGlobalRule: insertRule.isGlobalRule ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.regexEditingRules.set(id, rule);
    return rule;
  }

  async updateRegexEditingRule(id: string, updates: Partial<RegexEditingRule>): Promise<RegexEditingRule | undefined> {
    const rule = this.regexEditingRules.get(id);
    if (!rule) return undefined;
    
    const updatedRule: RegexEditingRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };
    this.regexEditingRules.set(id, updatedRule);
    return updatedRule;
  }

  async deleteRegexEditingRule(id: string): Promise<boolean> {
    return this.regexEditingRules.delete(id);
  }

  // Phase 3: Message Sync Settings methods
  async getMessageSyncSetting(id: string): Promise<MessageSyncSetting | undefined> {
    return this.messageSyncSettings.get(id);
  }

  async getMessageSyncSettingsByUserId(userId: string): Promise<MessageSyncSetting[]> {
    return Array.from(this.messageSyncSettings.values())
      .filter(setting => setting.userId === userId);
  }

  async getMessageSyncSettingsByMappingId(mappingId: string): Promise<MessageSyncSetting[]> {
    return Array.from(this.messageSyncSettings.values())
      .filter(setting => setting.mappingId === mappingId);
  }

  async createMessageSyncSetting(insertSetting: InsertMessageSyncSetting): Promise<MessageSyncSetting> {
    const id = randomUUID();
    const setting: MessageSyncSetting = {
      ...insertSetting,
      id,
      mappingId: insertSetting.mappingId || null,
      enableUpdateSync: insertSetting.enableUpdateSync ?? false,
      enableDeleteSync: insertSetting.enableDeleteSync ?? false,
      updateSyncDelay: insertSetting.updateSyncDelay || 0,
      isGlobalSetting: insertSetting.isGlobalSetting ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messageSyncSettings.set(id, setting);
    return setting;
  }

  async updateMessageSyncSetting(id: string, updates: Partial<MessageSyncSetting>): Promise<MessageSyncSetting | undefined> {
    const setting = this.messageSyncSettings.get(id);
    if (!setting) return undefined;
    
    const updatedSetting: MessageSyncSetting = {
      ...setting,
      ...updates,
      updatedAt: new Date(),
    };
    this.messageSyncSettings.set(id, updatedSetting);
    return updatedSetting;
  }

  async deleteMessageSyncSetting(id: string): Promise<boolean> {
    return this.messageSyncSettings.delete(id);
  }

  // Phase 3: Message Tracker methods
  async getMessageTracker(id: string): Promise<MessageTracker | undefined> {
    return this.messageTrackers.get(id);
  }

  async getMessageTrackerByOriginalMessage(originalMessageId: string, originalChatId: string): Promise<MessageTracker | undefined> {
    return Array.from(this.messageTrackers.values())
      .find(tracker => tracker.originalMessageId === originalMessageId && tracker.originalChatId === originalChatId);
  }

  async getMessageTrackersByMappingId(mappingId: string): Promise<MessageTracker[]> {
    return Array.from(this.messageTrackers.values())
      .filter(tracker => tracker.mappingId === mappingId);
  }

  async createMessageTracker(insertTracker: InsertMessageTracker): Promise<MessageTracker> {
    const id = randomUUID();
    const tracker: MessageTracker = {
      ...insertTracker,
      id,
      messageHash: insertTracker.messageHash || null,
      lastSynced: insertTracker.lastSynced || new Date(),
      createdAt: new Date(),
    };
    this.messageTrackers.set(id, tracker);
    return tracker;
  }

  async updateMessageTracker(id: string, updates: Partial<MessageTracker>): Promise<MessageTracker | undefined> {
    const tracker = this.messageTrackers.get(id);
    if (!tracker) return undefined;
    
    const updatedTracker: MessageTracker = {
      ...tracker,
      ...updates,
      lastSynced: updates.lastSynced || new Date(),
    };
    this.messageTrackers.set(id, updatedTracker);
    return updatedTracker;
  }

  async deleteMessageTracker(id: string): Promise<boolean> {
    return this.messageTrackers.delete(id);
  }

  // Phase 3: Message Delay Settings methods
  async getMessageDelaySetting(id: string): Promise<MessageDelaySetting | undefined> {
    return this.messageDelaySettings.get(id);
  }

  async getMessageDelaySettingsByUserId(userId: string): Promise<MessageDelaySetting[]> {
    return Array.from(this.messageDelaySettings.values())
      .filter(setting => setting.userId === userId);
  }

  async getMessageDelaySettingsByMappingId(mappingId: string): Promise<MessageDelaySetting[]> {
    return Array.from(this.messageDelaySettings.values())
      .filter(setting => setting.mappingId === mappingId);
  }

  async createMessageDelaySetting(insertSetting: InsertMessageDelaySetting): Promise<MessageDelaySetting> {
    const id = randomUUID();
    const setting: MessageDelaySetting = {
      ...insertSetting,
      id,
      mappingId: insertSetting.mappingId || null,
      enableDelay: insertSetting.enableDelay ?? false,
      delaySeconds: insertSetting.delaySeconds || 10,
      requireApproval: insertSetting.requireApproval ?? false,
      autoApprovalTimeout: insertSetting.autoApprovalTimeout || 300,
      isGlobalSetting: insertSetting.isGlobalSetting ?? false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.messageDelaySettings.set(id, setting);
    return setting;
  }

  async updateMessageDelaySetting(id: string, updates: Partial<MessageDelaySetting>): Promise<MessageDelaySetting | undefined> {
    const setting = this.messageDelaySettings.get(id);
    if (!setting) return undefined;
    
    const updatedSetting: MessageDelaySetting = {
      ...setting,
      ...updates,
      updatedAt: new Date(),
    };
    this.messageDelaySettings.set(id, updatedSetting);
    return updatedSetting;
  }

  async deleteMessageDelaySetting(id: string): Promise<boolean> {
    return this.messageDelaySettings.delete(id);
  }

  // Phase 3: Pending Messages methods
  async getPendingMessage(id: string): Promise<PendingMessage | undefined> {
    return this.pendingMessages.get(id);
  }

  async getPendingMessagesByUserId(userId: string): Promise<PendingMessageWithDetails[]> {
    const messages = Array.from(this.pendingMessages.values())
      .filter(message => message.userId === userId);
    
    const messagesWithDetails: PendingMessageWithDetails[] = [];
    for (const message of messages) {
      const mapping = await this.getForwardingMapping(message.mappingId);
      if (!mapping) continue;
      
      const source = await this.getSource(mapping.sourceId);
      const destination = await this.getDestination(mapping.destinationId);
      
      messagesWithDetails.push({
        ...message,
        mapping,
        sourceTitle: source?.chatTitle || 'Unknown Source',
        destinationTitle: destination?.chatTitle || 'Unknown Destination',
      });
    }
    
    return messagesWithDetails;
  }

  async getPendingMessagesByMappingId(mappingId: string): Promise<PendingMessage[]> {
    return Array.from(this.pendingMessages.values())
      .filter(message => message.mappingId === mappingId);
  }

  async getExpiredPendingMessages(): Promise<PendingMessage[]> {
    const now = new Date();
    return Array.from(this.pendingMessages.values())
      .filter(message => message.expiresAt && message.expiresAt <= now && message.status === 'pending');
  }

  async getScheduledPendingMessages(): Promise<PendingMessage[]> {
    const now = new Date();
    return Array.from(this.pendingMessages.values())
      .filter(message => message.scheduledFor <= now && message.status === 'approved');
  }

  async createPendingMessage(insertMessage: InsertPendingMessage): Promise<PendingMessage> {
    const id = randomUUID();
    const message: PendingMessage = {
      ...insertMessage,
      id,
      processedContent: insertMessage.processedContent || null,
      status: insertMessage.status || 'pending',
      expiresAt: insertMessage.expiresAt || null,
      approvedBy: insertMessage.approvedBy || null,
      approvedAt: insertMessage.approvedAt || null,
      createdAt: new Date(),
    };
    this.pendingMessages.set(id, message);
    return message;
  }

  async updatePendingMessage(id: string, updates: Partial<PendingMessage>): Promise<PendingMessage | undefined> {
    const message = this.pendingMessages.get(id);
    if (!message) return undefined;
    
    const updatedMessage: PendingMessage = {
      ...message,
      ...updates,
    };
    this.pendingMessages.set(id, updatedMessage);
    return updatedMessage;
  }

  async deletePendingMessage(id: string): Promise<boolean> {
    return this.pendingMessages.delete(id);
  }

  // Phase 3: System Statistics methods
  async getSystemStat(id: string): Promise<SystemStat | undefined> {
    return this.systemStats.get(id);
  }

  async getSystemStatsByPeriod(statType: string, period: string, userId?: string, mappingId?: string): Promise<SystemStat[]> {
    return Array.from(this.systemStats.values())
      .filter(stat => {
        if (stat.statType !== statType) return false;
        if (stat.statPeriod !== period) return false;
        if (userId && stat.userId !== userId) return false;
        if (mappingId && stat.mappingId !== mappingId) return false;
        return true;
      });
  }

  async createOrUpdateSystemStat(insertStat: InsertSystemStat): Promise<SystemStat> {
    // Try to find existing stat
    const existing = Array.from(this.systemStats.values())
      .find(stat => 
        stat.statType === insertStat.statType &&
        stat.statPeriod === insertStat.statPeriod &&
        stat.userId === insertStat.userId &&
        stat.mappingId === insertStat.mappingId
      );

    if (existing) {
      const updatedStat: SystemStat = {
        ...existing,
        ...insertStat,
        updatedAt: new Date(),
      };
      this.systemStats.set(existing.id, updatedStat);
      return updatedStat;
    } else {
      const id = randomUUID();
      const newStat: SystemStat = {
        ...insertStat,
        id,
        userId: insertStat.userId || null,
        mappingId: insertStat.mappingId || null,
        messagesProcessed: insertStat.messagesProcessed || 0,
        messagesForwarded: insertStat.messagesForwarded || 0,
        messagesFiltered: insertStat.messagesFiltered || 0,
        messagesBlocked: insertStat.messagesBlocked || 0,
        messagesErrored: insertStat.messagesErrored || 0,
        messagesUpdated: insertStat.messagesUpdated || 0,
        messagesDeleted: insertStat.messagesDeleted || 0,
        messagesApproved: insertStat.messagesApproved || 0,
        messagesRejected: insertStat.messagesRejected || 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.systemStats.set(id, newStat);
      return newStat;
    }
  }

  async getSystemStatsResponse(userId?: string): Promise<SystemStatsResponse> {
    const now = new Date();
    const hourlyPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}`;
    const dailyPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const hourlyStats = await this.getSystemStatsByPeriod('hourly', hourlyPeriod, userId);
    const dailyStats = await this.getSystemStatsByPeriod('daily', dailyPeriod, userId);
    const totalStats = await this.getSystemStatsByPeriod('total', 'total', userId);

    const aggregate = (stats: SystemStat[]) => {
      return stats.reduce((acc, stat) => ({
        messagesProcessed: acc.messagesProcessed + stat.messagesProcessed,
        messagesForwarded: acc.messagesForwarded + stat.messagesForwarded,
        messagesFiltered: acc.messagesFiltered + stat.messagesFiltered,
        messagesBlocked: acc.messagesBlocked + stat.messagesBlocked,
        messagesErrored: acc.messagesErrored + stat.messagesErrored,
        messagesUpdated: acc.messagesUpdated + stat.messagesUpdated,
        messagesDeleted: acc.messagesDeleted + stat.messagesDeleted,
        messagesApproved: acc.messagesApproved + stat.messagesApproved,
        messagesRejected: acc.messagesRejected + stat.messagesRejected,
      }), {
        messagesProcessed: 0, messagesForwarded: 0, messagesFiltered: 0,
        messagesBlocked: 0, messagesErrored: 0, messagesUpdated: 0,
        messagesDeleted: 0, messagesApproved: 0, messagesRejected: 0,
      });
    };

    return {
      hourly: aggregate(hourlyStats),
      daily: aggregate(dailyStats),
      total: aggregate(totalStats),
    };
  }

  async incrementSystemStat(statType: string, period: string, field: string, amount = 1, userId?: string, mappingId?: string): Promise<void> {
    const existing = Array.from(this.systemStats.values())
      .find(stat => 
        stat.statType === statType &&
        stat.statPeriod === period &&
        stat.userId === userId &&
        stat.mappingId === mappingId
      );

    if (existing) {
      const updates: Partial<SystemStat> = {};
      if (field in existing) {
        (updates as any)[field] = ((existing as any)[field] || 0) + amount;
      }
      await this.updateSystemStat(existing.id, updates);
    } else {
      const newStat: InsertSystemStat = {
        statType,
        statPeriod: period,
        userId: userId || null,
        mappingId: mappingId || null,
        messagesProcessed: field === 'messagesProcessed' ? amount : 0,
        messagesForwarded: field === 'messagesForwarded' ? amount : 0,
        messagesFiltered: field === 'messagesFiltered' ? amount : 0,
        messagesBlocked: field === 'messagesBlocked' ? amount : 0,
        messagesErrored: field === 'messagesErrored' ? amount : 0,
        messagesUpdated: field === 'messagesUpdated' ? amount : 0,
        messagesDeleted: field === 'messagesDeleted' ? amount : 0,
        messagesApproved: field === 'messagesApproved' ? amount : 0,
        messagesRejected: field === 'messagesRejected' ? amount : 0,
      };
      await this.createOrUpdateSystemStat(newStat);
    }
  }

  private async updateSystemStat(id: string, updates: Partial<SystemStat>): Promise<SystemStat | undefined> {
    const stat = this.systemStats.get(id);
    if (!stat) return undefined;
    
    const updatedStat: SystemStat = {
      ...stat,
      ...updates,
      updatedAt: new Date(),
    };
    this.systemStats.set(id, updatedStat);
    return updatedStat;
  }

  // Phase 4: Subscription Plan Management
  async createSubscriptionPlan(plan: InsertSubscriptionPlan): Promise<SubscriptionPlan> {
    const id = randomUUID();
    const subscriptionPlan: SubscriptionPlan = {
      ...plan,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.subscriptionPlans.set(plan.userId, subscriptionPlan);
    return subscriptionPlan;
  }

  async getSubscriptionPlan(userId: string): Promise<SubscriptionPlan | null> {
    return this.subscriptionPlans.get(userId) || null;
  }

  async updateSubscriptionPlan(userId: string, updates: Partial<SubscriptionPlan>): Promise<void> {
    const plan = this.subscriptionPlans.get(userId);
    if (plan) {
      const updatedPlan: SubscriptionPlan = {
        ...plan,
        ...updates,
        updatedAt: new Date(),
      };
      this.subscriptionPlans.set(userId, updatedPlan);
    }
  }

  async checkPlanLimits(userId: string, resourceType: 'sessions' | 'pairs'): Promise<boolean> {
    const plan = await this.getSubscriptionPlan(userId);
    if (!plan) return false;

    if (resourceType === 'sessions') {
      return plan.currentSessions < plan.maxSessions;
    } else {
      return plan.currentPairs < plan.maxForwardingPairs;
    }
  }

  async incrementUsage(userId: string, resourceType: 'sessions' | 'pairs', amount = 1): Promise<void> {
    const plan = this.subscriptionPlans.get(userId);
    if (plan) {
      const updates: Partial<SubscriptionPlan> = {};
      if (resourceType === 'sessions') {
        updates.currentSessions = Math.max(0, plan.currentSessions + amount);
      } else {
        updates.currentPairs = Math.max(0, plan.currentPairs + amount);
      }
      await this.updateSubscriptionPlan(userId, updates);
    }
  }

  // Phase 4: Resource Tracking
  async recordResourceUsage(usage: InsertResourceTracking): Promise<void> {
    const id = randomUUID();
    const resource: ResourceTracking = {
      ...usage,
      id,
      createdAt: new Date(),
    };
    this.resourceTracking.set(id, resource);
  }

  async getResourceUsage(userId?: string, workerId?: string): Promise<ResourceTracking[]> {
    const resources = Array.from(this.resourceTracking.values());
    return resources.filter(r => 
      (!userId || r.userId === userId) &&
      (!workerId || r.workerId === workerId)
    );
  }

  async pauseUserSessions(userId: string, reason: string): Promise<void> {
    const resources = await this.getResourceUsage(userId);
    for (const resource of resources) {
      if (resource.id) {
        const updated: ResourceTracking = {
          ...resource,
          isPaused: true,
          lastActivity: new Date(),
        };
        this.resourceTracking.set(resource.id, updated);
      }
    }
  }

  async resumeUserSessions(userId: string): Promise<void> {
    const resources = await this.getResourceUsage(userId);
    for (const resource of resources) {
      if (resource.id) {
        const updated: ResourceTracking = {
          ...resource,
          isPaused: false,
          lastActivity: new Date(),
        };
        this.resourceTracking.set(resource.id, updated);
      }
    }
  }

  async getHighRamUsers(thresholdBytes: number): Promise<ResourceUsageReport[]> {
    const resources = Array.from(this.resourceTracking.values())
      .filter(r => r.ramUsageBytes > thresholdBytes)
      .map(r => ({
        userId: r.userId || '',
        sessionId: r.sessionId || undefined,
        workerId: r.workerId || undefined,
        ramUsageBytes: r.ramUsageBytes,
        cpuUsagePercent: r.cpuUsagePercent,
        messagesPerMinute: r.messagesPerMinute,
        status: {
          isActive: r.isActive,
          isPaused: r.isPaused,
        },
        lastActivity: r.lastActivity.toISOString(),
      }));
    return resources;
  }

  // Phase 4: Task Queue Management
  async addTask(task: InsertTaskQueue): Promise<TaskQueue> {
    const id = randomUUID();
    const queueTask: TaskQueue = {
      ...task,
      id,
      createdAt: new Date(),
    };
    this.taskQueue.set(id, queueTask);
    return queueTask;
  }

  async getNextTask(workerId: string): Promise<TaskQueue | null> {
    const tasks = Array.from(this.taskQueue.values())
      .filter(t => t.status === 'pending')
      .sort((a, b) => b.priority - a.priority || a.scheduledFor.getTime() - b.scheduledFor.getTime());
    
    const nextTask = tasks[0];
    if (nextTask) {
      const updatedTask: TaskQueue = {
        ...nextTask,
        workerId: workerId,
        status: 'processing',
        startedAt: new Date(),
      };
      this.taskQueue.set(nextTask.id, updatedTask);
      return updatedTask;
    }
    return null;
  }

  async updateTaskStatus(taskId: string, status: string, errorMessage?: string): Promise<void> {
    const task = this.taskQueue.get(taskId);
    if (task) {
      const updatedTask: TaskQueue = {
        ...task,
        status,
        errorMessage: errorMessage || task.errorMessage,
        completedAt: (status === 'completed' || status === 'failed') ? new Date() : task.completedAt,
      };
      this.taskQueue.set(taskId, updatedTask);
    }
  }

  async getQueueMetrics(): Promise<QueueMetrics> {
    const tasks = Array.from(this.taskQueue.values());
    const total = tasks.length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const processing = tasks.filter(t => t.status === 'processing').length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const failed = tasks.filter(t => t.status === 'failed').length;
    const delayed = tasks.filter(t => t.status === 'delayed').length;

    const completedTasks = tasks.filter(t => t.completedAt && t.startedAt);
    const averageWaitTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, t) => sum + (t.startedAt!.getTime() - t.createdAt.getTime()), 0) / completedTasks.length
      : 0;

    const high = tasks.filter(t => t.priority >= 3).length;
    const medium = tasks.filter(t => t.priority === 2).length;
    const low = tasks.filter(t => t.priority <= 1).length;

    return {
      total, pending, processing, completed, failed, delayed,
      averageWaitTime,
      priorityBreakdown: { high, medium, low }
    };
  }

  async cleanupCompletedTasks(olderThanHours: number): Promise<void> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    const tasksToDelete = Array.from(this.taskQueue.entries())
      .filter(([, task]) => 
        (task.status === 'completed' || task.status === 'failed') &&
        task.completedAt && task.completedAt < cutoff
      );
    
    for (const [id] of tasksToDelete) {
      this.taskQueue.delete(id);
    }
  }

  // Phase 4: User Activity & Rate Limiting
  async logUserActivity(userId: string, activityType: string, endpoint?: string): Promise<void> {
    const id = randomUUID();
    const activity: UserActivityLog = {
      id,
      userId,
      activityType,
      endpoint: endpoint || null,
      requestCount: 1,
      windowStart: new Date(),
      windowEnd: new Date(Date.now() + 60 * 60 * 1000), // 1 hour window
      hourlyLimit: 100,
      dailyLimit: 1000,
      createdAt: new Date(),
    };
    this.userActivityLogs.set(id, activity);
  }

  async checkRateLimit(userId: string, activityType: string): Promise<boolean> {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const activities = Array.from(this.userActivityLogs.values())
      .filter(a => a.userId === userId && a.activityType === activityType);

    const hourlyCount = activities
      .filter(a => a.createdAt >= hourAgo)
      .reduce((sum, a) => sum + a.requestCount, 0);

    const dailyCount = activities
      .filter(a => a.createdAt >= dayAgo)
      .reduce((sum, a) => sum + a.requestCount, 0);

    const plan = await this.getSubscriptionPlan(userId);
    const hourlyLimit = plan ? (plan.planType === 'elite' ? 500 : plan.planType === 'pro' ? 300 : 100) : 100;
    const dailyLimit = plan ? (plan.planType === 'elite' ? 10000 : plan.planType === 'pro' ? 5000 : 1000) : 1000;

    return hourlyCount < hourlyLimit && dailyCount < dailyLimit;
  }

  async getUserActivityStats(userId: string, timeframe: 'hourly' | 'daily' = 'hourly'): Promise<UserActivityLog[]> {
    const now = new Date();
    const cutoff = timeframe === 'hourly' 
      ? new Date(now.getTime() - 60 * 60 * 1000)
      : new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return Array.from(this.userActivityLogs.values())
      .filter(a => a.userId === userId && a.createdAt >= cutoff);
  }

  // Phase 4: Worker Metrics & Scaling
  async updateWorkerMetrics(workerId: string, metrics: Partial<WorkerMetrics>): Promise<void> {
    const existing = this.workerMetrics.get(workerId);
    const workerMetric: WorkerMetrics = {
      id: existing?.id || randomUUID(),
      workerId,
      tasksCompleted: metrics.tasksCompleted || existing?.tasksCompleted || 0,
      tasksInQueue: metrics.tasksInQueue || existing?.tasksInQueue || 0,
      averageTaskTime: metrics.averageTaskTime || existing?.averageTaskTime || 0,
      peakRamUsage: metrics.peakRamUsage || existing?.peakRamUsage || 0,
      currentRamUsage: metrics.currentRamUsage || existing?.currentRamUsage || 0,
      cpuLoad: metrics.cpuLoad || existing?.cpuLoad || 0,
      sessionCapacity: metrics.sessionCapacity || existing?.sessionCapacity || 10,
      currentSessions: metrics.currentSessions || existing?.currentSessions || 0,
      isHealthy: metrics.isHealthy !== undefined ? metrics.isHealthy : (existing?.isHealthy || true),
      needsScaling: metrics.needsScaling !== undefined ? metrics.needsScaling : (existing?.needsScaling || false),
      timestamp: new Date(),
    };
    this.workerMetrics.set(workerId, workerMetric);
  }

  async getWorkerMetrics(workerId?: string): Promise<WorkerMetrics[]> {
    const metrics = Array.from(this.workerMetrics.values());
    return workerId ? metrics.filter(m => m.workerId === workerId) : metrics;
  }

  async identifyScalingNeeds(): Promise<WorkerMetrics[]> {
    return Array.from(this.workerMetrics.values())
      .filter(m => m.needsScaling || m.currentSessions >= m.sessionCapacity * 0.8);
  }

  // Phase 4: Admin Operations
  async getAllUsersWithPlans(): Promise<(User & { plan?: SubscriptionPlan })[]> {
    const users = Array.from(this.users.values());
    const usersWithPlans = await Promise.all(
      users.map(async user => {
        const plan = await this.getSubscriptionPlan(user.id);
        return { ...user, plan: plan || undefined };
      })
    );
    return usersWithPlans;
  }

  async changeUserPlan(userId: string, newPlan: string): Promise<void> {
    const planLimits = {
      free: { maxSessions: 1, maxForwardingPairs: 5, priority: 1 },
      pro: { maxSessions: 3, maxForwardingPairs: 999999, priority: 2 },
      elite: { maxSessions: 5, maxForwardingPairs: 999999, priority: 3 }
    };

    const limits = planLimits[newPlan as keyof typeof planLimits] || planLimits.free;
    
    await this.updateSubscriptionPlan(userId, {
      planType: newPlan,
      ...limits,
    });
  }

  async forceStopUserSessions(userId: string): Promise<void> {
    await this.pauseUserSessions(userId, 'Admin forced stop');
    await this.incrementUsage(userId, 'sessions', -999); // Reset session count
  }

  private initializeDefaultSubscriptionPlans() {
    // Initialize subscription plans for existing users
    for (const user of this.users.values()) {
      if (!this.subscriptionPlans.has(user.id)) {
        const defaultPlan: SubscriptionPlan = {
          id: randomUUID(),
          userId: user.id,
          planType: 'free',
          planStatus: 'active',
          maxSessions: 1,
          maxForwardingPairs: 5,
          priority: 1,
          startDate: new Date(),
          expiryDate: null, // Free plans never expire
          currentSessions: 0,
          currentPairs: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.subscriptionPlans.set(user.id, defaultPlan);
      }
    }
  }
}

export const storage = new MemStorage();

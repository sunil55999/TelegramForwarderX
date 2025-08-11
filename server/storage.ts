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
  type DashboardStats, type SystemHealth, type ActivityItem 
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

  constructor() {
    // Initialize with some default settings
    this.initializeDefaultSettings();
    this.initializeDefaultWorkers();
    this.initializeDefaultUser();
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
}

export const storage = new MemStorage();

import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { 
  insertUserSchema, 
  insertTelegramSessionSchema, 
  insertWorkerSchema,
  insertSourceSchema,
  insertDestinationSchema,
  insertForwardingMappingSchema,
  // Phase 3 schemas
  insertRegexEditingRuleSchema,
  insertMessageSyncSettingSchema,
  insertMessageTrackerSchema,
  insertMessageDelaySettingSchema,
  insertPendingMessageSchema,
  insertSystemStatSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth endpoints
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ message: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || !user.isActive) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // In a real app, you'd verify the password hash here
      // For now, we'll accept any password for the admin user
      if (username === "admin") {
        return res.json({
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            userType: user.userType,
          },
          token: "fake-jwt-token", // In real app, generate proper JWT
        });
      }

      return res.status(401).json({ message: "Invalid credentials" });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    // In a real app, you'd invalidate the JWT token
    res.json({ message: "Logged out successfully" });
  });

  // Dashboard endpoints
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  app.get("/api/dashboard/health", async (req, res) => {
    try {
      const health = await storage.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ message: "Failed to fetch system health" });
    }
  });

  app.get("/api/dashboard/activity", async (req, res) => {
    try {
      const activity = await storage.getRecentActivity();
      res.json(activity);
    } catch (error) {
      console.error("Recent activity error:", error);
      res.status(500).json({ message: "Failed to fetch recent activity" });
    }
  });

  // Sessions endpoints
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllTelegramSessions();
      const users = await storage.getAllUsers();
      const workers = await storage.getAllWorkers();

      const sessionsWithDetails = sessions.map(session => {
        const user = users.find(u => u.id === session.userId);
        const worker = workers.find(w => w.id === session.workerId);
        return {
          ...session,
          userDetails: user ? { username: user.username, userType: user.userType } : null,
          workerDetails: worker ? { name: worker.name } : null,
        };
      });

      res.json(sessionsWithDetails);
    } catch (error) {
      console.error("Sessions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.post("/api/sessions", async (req, res) => {
    try {
      const sessionData = insertTelegramSessionSchema.parse(req.body);
      const session = await storage.createTelegramSession(sessionData);
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid session data", errors: error.errors });
      }
      console.error("Session creation error:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  app.put("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const session = await storage.updateTelegramSession(id, updates);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json(session);
    } catch (error) {
      console.error("Session update error:", error);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteTelegramSession(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Session not found" });
      }
      
      res.json({ message: "Session deleted successfully" });
    } catch (error) {
      console.error("Session deletion error:", error);
      res.status(500).json({ message: "Failed to delete session" });
    }
  });

  // Workers endpoints
  app.get("/api/workers", async (req, res) => {
    try {
      const workers = await storage.getAllWorkers();
      res.json(workers);
    } catch (error) {
      console.error("Workers fetch error:", error);
      res.status(500).json({ message: "Failed to fetch workers" });
    }
  });

  app.post("/api/workers", async (req, res) => {
    try {
      const workerData = insertWorkerSchema.parse(req.body);
      const worker = await storage.createWorker(workerData);
      res.status(201).json(worker);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid worker data", errors: error.errors });
      }
      console.error("Worker creation error:", error);
      res.status(500).json({ message: "Failed to create worker" });
    }
  });

  app.put("/api/workers/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const worker = await storage.updateWorker(id, updates);
      
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }
      
      res.json(worker);
    } catch (error) {
      console.error("Worker update error:", error);
      res.status(500).json({ message: "Failed to update worker" });
    }
  });

  // Users endpoints
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Don't send passwords
      const safeUsers = users.map(({ password, ...user }) => user);
      res.json(safeUsers);
    } catch (error) {
      console.error("Users fetch error:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      // Don't send password
      const { password, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      console.error("User creation error:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.put("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("User update error:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteUser(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("User deletion error:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Settings endpoints
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getAllSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings/:key", async (req, res) => {
    try {
      const { key } = req.params;
      const { value, description } = req.body;
      
      const setting = await storage.createOrUpdateSystemSetting({
        key,
        value,
        description,
      });
      
      res.json(setting);
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // Phase 2: Sources endpoints
  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getAllSources();
      res.json(sources);
    } catch (error) {
      console.error("Sources fetch error:", error);
      res.status(500).json({ message: "Failed to fetch sources" });
    }
  });

  app.post("/api/sources", async (req, res) => {
    try {
      const sourceData = insertSourceSchema.parse(req.body);
      const source = await storage.createSource(sourceData);
      res.status(201).json(source);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid source data", errors: error.errors });
      }
      console.error("Source creation error:", error);
      res.status(500).json({ message: "Failed to create source" });
    }
  });

  app.delete("/api/sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteSource(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Source not found" });
      }
      
      res.json({ message: "Source deleted successfully" });
    } catch (error) {
      console.error("Source deletion error:", error);
      res.status(500).json({ message: "Failed to delete source" });
    }
  });

  // Phase 2: Destinations endpoints
  app.get("/api/destinations", async (req, res) => {
    try {
      const destinations = await storage.getAllDestinations();
      res.json(destinations);
    } catch (error) {
      console.error("Destinations fetch error:", error);
      res.status(500).json({ message: "Failed to fetch destinations" });
    }
  });

  app.post("/api/destinations", async (req, res) => {
    try {
      const destinationData = insertDestinationSchema.parse(req.body);
      const destination = await storage.createDestination(destinationData);
      res.status(201).json(destination);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid destination data", errors: error.errors });
      }
      console.error("Destination creation error:", error);
      res.status(500).json({ message: "Failed to create destination" });
    }
  });

  app.delete("/api/destinations/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteDestination(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Destination not found" });
      }
      
      res.json({ message: "Destination deleted successfully" });
    } catch (error) {
      console.error("Destination deletion error:", error);
      res.status(500).json({ message: "Failed to delete destination" });
    }
  });

  // Phase 2: Forwarding mappings endpoints
  app.get("/api/forwarding/mappings", async (req, res) => {
    try {
      const mappings = await storage.getAllForwardingMappings();
      res.json(mappings);
    } catch (error) {
      console.error("Mappings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch mappings" });
    }
  });

  app.post("/api/forwarding/mappings", async (req, res) => {
    try {
      const mappingData = insertForwardingMappingSchema.parse(req.body);
      const mapping = await storage.createForwardingMapping(mappingData);
      res.status(201).json(mapping);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid mapping data", errors: error.errors });
      }
      console.error("Mapping creation error:", error);
      res.status(500).json({ message: "Failed to create mapping" });
    }
  });

  app.delete("/api/forwarding/mappings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteForwardingMapping(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      
      res.json({ message: "Mapping deleted successfully" });
    } catch (error) {
      console.error("Mapping deletion error:", error);
      res.status(500).json({ message: "Failed to delete mapping" });
    }
  });

  // Phase 2: Forwarding logs endpoints
  app.get("/api/forwarding/logs", async (req, res) => {
    try {
      const { limit = 50, offset = 0, status } = req.query;
      const logs = await storage.getForwardingLogs(
        parseInt(limit as string), 
        parseInt(offset as string),
        status as string
      );
      res.json(logs);
    } catch (error) {
      console.error("Logs fetch error:", error);
      res.status(500).json({ message: "Failed to fetch logs" });
    }
  });

  // Phase 3: Regex Editing Rules endpoints
  app.get("/api/regex-rules", async (req, res) => {
    try {
      const { userId, mappingId } = req.query;
      let rules;
      
      if (userId) {
        rules = await storage.getRegexEditingRulesByUserId(userId as string);
      } else if (mappingId) {
        rules = await storage.getRegexEditingRulesByMappingId(mappingId as string);
      } else {
        return res.status(400).json({ message: "userId or mappingId required" });
      }
      
      res.json(rules);
    } catch (error) {
      console.error("Regex rules fetch error:", error);
      res.status(500).json({ message: "Failed to fetch regex rules" });
    }
  });

  app.post("/api/regex-rules", async (req, res) => {
    try {
      const ruleData = insertRegexEditingRuleSchema.parse(req.body);
      const rule = await storage.createRegexEditingRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid regex rule data", errors: error.errors });
      }
      console.error("Regex rule creation error:", error);
      res.status(500).json({ message: "Failed to create regex rule" });
    }
  });

  app.put("/api/regex-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const rule = await storage.updateRegexEditingRule(id, updates);
      
      if (!rule) {
        return res.status(404).json({ message: "Regex rule not found" });
      }
      
      res.json(rule);
    } catch (error) {
      console.error("Regex rule update error:", error);
      res.status(500).json({ message: "Failed to update regex rule" });
    }
  });

  app.delete("/api/regex-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteRegexEditingRule(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Regex rule not found" });
      }
      
      res.json({ message: "Regex rule deleted successfully" });
    } catch (error) {
      console.error("Regex rule deletion error:", error);
      res.status(500).json({ message: "Failed to delete regex rule" });
    }
  });

  // Phase 3: Message Sync Settings endpoints
  app.get("/api/sync-settings", async (req, res) => {
    try {
      const { userId, mappingId } = req.query;
      let settings;
      
      if (userId) {
        settings = await storage.getMessageSyncSettingsByUserId(userId as string);
      } else if (mappingId) {
        settings = await storage.getMessageSyncSettingsByMappingId(mappingId as string);
      } else {
        return res.status(400).json({ message: "userId or mappingId required" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Sync settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch sync settings" });
    }
  });

  app.post("/api/sync-settings", async (req, res) => {
    try {
      const settingData = insertMessageSyncSettingSchema.parse(req.body);
      const setting = await storage.createMessageSyncSetting(settingData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sync setting data", errors: error.errors });
      }
      console.error("Sync setting creation error:", error);
      res.status(500).json({ message: "Failed to create sync setting" });
    }
  });

  app.put("/api/sync-settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const setting = await storage.updateMessageSyncSetting(id, updates);
      
      if (!setting) {
        return res.status(404).json({ message: "Sync setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Sync setting update error:", error);
      res.status(500).json({ message: "Failed to update sync setting" });
    }
  });

  // Phase 3: Message Delay Settings endpoints
  app.get("/api/delay-settings", async (req, res) => {
    try {
      const { userId, mappingId } = req.query;
      let settings;
      
      if (userId) {
        settings = await storage.getMessageDelaySettingsByUserId(userId as string);
      } else if (mappingId) {
        settings = await storage.getMessageDelaySettingsByMappingId(mappingId as string);
      } else {
        return res.status(400).json({ message: "userId or mappingId required" });
      }
      
      res.json(settings);
    } catch (error) {
      console.error("Delay settings fetch error:", error);
      res.status(500).json({ message: "Failed to fetch delay settings" });
    }
  });

  app.post("/api/delay-settings", async (req, res) => {
    try {
      const settingData = insertMessageDelaySettingSchema.parse(req.body);
      const setting = await storage.createMessageDelaySetting(settingData);
      res.status(201).json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid delay setting data", errors: error.errors });
      }
      console.error("Delay setting creation error:", error);
      res.status(500).json({ message: "Failed to create delay setting" });
    }
  });

  app.put("/api/delay-settings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const setting = await storage.updateMessageDelaySetting(id, updates);
      
      if (!setting) {
        return res.status(404).json({ message: "Delay setting not found" });
      }
      
      res.json(setting);
    } catch (error) {
      console.error("Delay setting update error:", error);
      res.status(500).json({ message: "Failed to update delay setting" });
    }
  });

  // Phase 3: Pending Messages endpoints
  app.get("/api/pending-messages", async (req, res) => {
    try {
      const { userId } = req.query;
      
      if (!userId) {
        return res.status(400).json({ message: "userId required" });
      }
      
      const messages = await storage.getPendingMessagesByUserId(userId as string);
      res.json(messages);
    } catch (error) {
      console.error("Pending messages fetch error:", error);
      res.status(500).json({ message: "Failed to fetch pending messages" });
    }
  });

  app.put("/api/pending-messages/:id/approve", async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;
      
      const message = await storage.updatePendingMessage(id, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
      });
      
      if (!message) {
        return res.status(404).json({ message: "Pending message not found" });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Message approval error:", error);
      res.status(500).json({ message: "Failed to approve message" });
    }
  });

  app.put("/api/pending-messages/:id/reject", async (req, res) => {
    try {
      const { id } = req.params;
      const { approvedBy } = req.body;
      
      const message = await storage.updatePendingMessage(id, {
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
      });
      
      if (!message) {
        return res.status(404).json({ message: "Pending message not found" });
      }
      
      res.json(message);
    } catch (error) {
      console.error("Message rejection error:", error);
      res.status(500).json({ message: "Failed to reject message" });
    }
  });

  // Phase 3: System Statistics endpoints
  app.get("/api/statistics", async (req, res) => {
    try {
      const { userId } = req.query;
      const stats = await storage.getSystemStatsResponse(userId as string | undefined);
      res.json(stats);
    } catch (error) {
      console.error("Statistics fetch error:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.post("/api/statistics/increment", async (req, res) => {
    try {
      const { statType, period, field, amount = 1, userId, mappingId } = req.body;
      
      if (!statType || !period || !field) {
        return res.status(400).json({ message: "statType, period, and field are required" });
      }
      
      await storage.incrementSystemStat(statType, period, field, amount, userId, mappingId);
      res.json({ message: "Statistic incremented successfully" });
    } catch (error) {
      console.error("Statistics increment error:", error);
      res.status(500).json({ message: "Failed to increment statistic" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

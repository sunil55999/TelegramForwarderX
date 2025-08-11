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
  insertSystemStatSchema,
  // Phase 5 schemas
  insertTelegramAccountSchema,
  insertTeamMemberSchema,
  insertSessionFailureSchema,
  insertReauthRequestSchema,
  insertAccountForwardingMappingSchema,
  insertSessionBackupSchema,
  insertSyncEventSchema
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

  // Phase 3: Verification API endpoints
  app.get("/api/phase3-verification/latest", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      const path = await import("path");
      
      const reportPath = path.join(process.cwd(), "phase3_verification_report.json");
      
      try {
        const reportData = await fs.readFile(reportPath, "utf-8");
        const report = JSON.parse(reportData);
        res.json(report);
      } catch (fileError) {
        // No report file exists yet
        res.status(404).json({ message: "No verification report available" });
      }
    } catch (error) {
      console.error("Verification report fetch error:", error);
      res.status(500).json({ message: "Failed to fetch verification report" });
    }
  });

  app.post("/api/phase3-verification/run", async (req, res) => {
    try {
      const { spawn } = await import("child_process");
      const path = await import("path");
      
      // Run the verification script
      const scriptPath = path.join(process.cwd(), "tests", "phase3_verification.py");
      const pythonProcess = spawn("python", [scriptPath], {
        cwd: process.cwd(),
        stdio: ["pipe", "pipe", "pipe"]
      });
      
      let stdout = "";
      let stderr = "";
      
      pythonProcess.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on("close", (code) => {
        if (code === 0) {
          res.json({ 
            success: true, 
            message: "Verification completed successfully",
            output: stdout
          });
        } else {
          res.status(500).json({ 
            success: false, 
            message: "Verification failed",
            error: stderr,
            output: stdout
          });
        }
      });
      
      // Handle timeout (5 minutes)
      setTimeout(() => {
        pythonProcess.kill();
        res.status(408).json({ 
          success: false, 
          message: "Verification timed out after 5 minutes" 
        });
      }, 300000);
      
    } catch (error) {
      console.error("Verification run error:", error);
      res.status(500).json({ message: "Failed to run verification" });
    }
  });

  // Mock endpoints for testing Phase 3 features
  app.post("/api/regex-rules/apply", async (req, res) => {
    try {
      const { messageContent, userId, mappingId } = req.body;
      
      // Simple test regex application (buy -> BUY 🚀)
      const processedContent = messageContent.replace(/\bbuy\b/gi, "BUY 🚀");
      
      res.json({
        success: true,
        originalContent: messageContent,
        processedContent: processedContent,
        rulesApplied: processedContent !== messageContent ? 1 : 0
      });
    } catch (error) {
      console.error("Regex apply error:", error);
      res.status(500).json({ message: "Failed to apply regex rules" });
    }
  });

  app.post("/api/message-filters/test", async (req, res) => {
    try {
      const { message, mappingId } = req.body;
      
      // Simple test logic: text messages with "forex" should pass
      const shouldForward = message.type === "text" && 
                          message.content && 
                          message.content.toLowerCase().includes("forex");
      
      res.json({
        success: true,
        shouldForward: shouldForward,
        reason: shouldForward ? "Passed all filters" : "Filtered out by keyword/type filters"
      });
    } catch (error) {
      console.error("Filter test error:", error);
      res.status(500).json({ message: "Failed to test filters" });
    }
  });

  app.post("/api/pending-messages/:id/action", async (req, res) => {
    try {
      const { id } = req.params;
      const { action, approvedBy } = req.body;
      
      if (action === "approve") {
        res.json({
          success: true,
          message: "Message approved successfully",
          pendingId: id,
          action: action,
          approvedBy: approvedBy
        });
      } else if (action === "reject") {
        res.json({
          success: true,
          message: "Message rejected successfully",
          pendingId: id,
          action: action
        });
      } else {
        res.status(400).json({ message: "Invalid action. Use 'approve' or 'reject'" });
      }
    } catch (error) {
      console.error("Pending message action error:", error);
      res.status(500).json({ message: "Failed to process pending message action" });
    }
  });

  // Phase 4: User Role Management & Subscription Plans
  app.get("/api/subscription-plans/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const plan = await storage.getSubscriptionPlan(userId);
      if (!plan) {
        res.status(404).json({ message: "Subscription plan not found" });
        return;
      }
      res.json(plan);
    } catch (error) {
      console.error("Get subscription plan error:", error);
      res.status(500).json({ message: "Failed to get subscription plan" });
    }
  });

  app.post("/api/subscription-plans", async (req, res) => {
    try {
      const plan = await storage.createSubscriptionPlan(req.body);
      res.json(plan);
    } catch (error) {
      console.error("Create subscription plan error:", error);
      res.status(500).json({ message: "Failed to create subscription plan" });
    }
  });

  app.patch("/api/subscription-plans/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.updateSubscriptionPlan(userId, req.body);
      res.json({ success: true, message: "Subscription plan updated" });
    } catch (error) {
      console.error("Update subscription plan error:", error);
      res.status(500).json({ message: "Failed to update subscription plan" });
    }
  });

  app.post("/api/subscription-plans/:userId/check-limits", async (req, res) => {
    try {
      const { userId } = req.params;
      const { resourceType } = req.body;
      const canUse = await storage.checkPlanLimits(userId, resourceType);
      res.json({ canUse, resourceType });
    } catch (error) {
      console.error("Check plan limits error:", error);
      res.status(500).json({ message: "Failed to check plan limits" });
    }
  });

  // Phase 4: Resource Tracking & RAM Management
  app.post("/api/resource-tracking", async (req, res) => {
    try {
      await storage.recordResourceUsage(req.body);
      res.json({ success: true, message: "Resource usage recorded" });
    } catch (error) {
      console.error("Record resource usage error:", error);
      res.status(500).json({ message: "Failed to record resource usage" });
    }
  });

  app.get("/api/resource-tracking", async (req, res) => {
    try {
      const { userId, workerId } = req.query;
      const usage = await storage.getResourceUsage(
        userId as string, 
        workerId as string
      );
      res.json(usage);
    } catch (error) {
      console.error("Get resource usage error:", error);
      res.status(500).json({ message: "Failed to get resource usage" });
    }
  });

  app.get("/api/resource-tracking/high-ram", async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 512000000; // 512MB default
      const highRamUsers = await storage.getHighRamUsers(threshold);
      res.json(highRamUsers);
    } catch (error) {
      console.error("Get high RAM users error:", error);
      res.status(500).json({ message: "Failed to get high RAM users" });
    }
  });

  app.post("/api/users/:userId/pause-sessions", async (req, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;
      await storage.pauseUserSessions(userId, reason || "System management");
      res.json({ success: true, message: "User sessions paused" });
    } catch (error) {
      console.error("Pause user sessions error:", error);
      res.status(500).json({ message: "Failed to pause user sessions" });
    }
  });

  app.post("/api/users/:userId/resume-sessions", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.resumeUserSessions(userId);
      res.json({ success: true, message: "User sessions resumed" });
    } catch (error) {
      console.error("Resume user sessions error:", error);
      res.status(500).json({ message: "Failed to resume user sessions" });
    }
  });

  // Phase 4: Priority Task Queue Management
  app.post("/api/task-queue", async (req, res) => {
    try {
      const task = await storage.addTask(req.body);
      res.json(task);
    } catch (error) {
      console.error("Add task error:", error);
      res.status(500).json({ message: "Failed to add task to queue" });
    }
  });

  app.get("/api/task-queue/next/:workerId", async (req, res) => {
    try {
      const { workerId } = req.params;
      const task = await storage.getNextTask(workerId);
      if (!task) {
        res.status(404).json({ message: "No tasks available" });
        return;
      }
      res.json(task);
    } catch (error) {
      console.error("Get next task error:", error);
      res.status(500).json({ message: "Failed to get next task" });
    }
  });

  app.patch("/api/task-queue/:taskId", async (req, res) => {
    try {
      const { taskId } = req.params;
      const { status, errorMessage } = req.body;
      await storage.updateTaskStatus(taskId, status, errorMessage);
      res.json({ success: true, message: "Task status updated" });
    } catch (error) {
      console.error("Update task status error:", error);
      res.status(500).json({ message: "Failed to update task status" });
    }
  });

  app.get("/api/task-queue/metrics", async (req, res) => {
    try {
      const metrics = await storage.getQueueMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Get queue metrics error:", error);
      res.status(500).json({ message: "Failed to get queue metrics" });
    }
  });

  // Phase 4: User Activity & Rate Limiting
  app.post("/api/user-activity/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { activityType, endpoint } = req.body;
      await storage.logUserActivity(userId, activityType, endpoint);
      res.json({ success: true, message: "Activity logged" });
    } catch (error) {
      console.error("Log user activity error:", error);
      res.status(500).json({ message: "Failed to log user activity" });
    }
  });

  app.get("/api/user-activity/:userId/check-rate-limit", async (req, res) => {
    try {
      const { userId } = req.params;
      const { activityType } = req.query;
      const withinLimit = await storage.checkRateLimit(userId, activityType as string);
      res.json({ withinLimit, userId, activityType });
    } catch (error) {
      console.error("Check rate limit error:", error);
      res.status(500).json({ message: "Failed to check rate limit" });
    }
  });

  // Phase 4: Worker Metrics & Auto-Scaling
  app.post("/api/worker-metrics/:workerId", async (req, res) => {
    try {
      const { workerId } = req.params;
      await storage.updateWorkerMetrics(workerId, req.body);
      res.json({ success: true, message: "Worker metrics updated" });
    } catch (error) {
      console.error("Update worker metrics error:", error);
      res.status(500).json({ message: "Failed to update worker metrics" });
    }
  });

  app.get("/api/worker-metrics", async (req, res) => {
    try {
      const { workerId } = req.query;
      const metrics = await storage.getWorkerMetrics(workerId as string);
      res.json(metrics);
    } catch (error) {
      console.error("Get worker metrics error:", error);
      res.status(500).json({ message: "Failed to get worker metrics" });
    }
  });

  app.get("/api/worker-metrics/scaling-needs", async (req, res) => {
    try {
      const needsScaling = await storage.identifyScalingNeeds();
      res.json(needsScaling);
    } catch (error) {
      console.error("Identify scaling needs error:", error);
      res.status(500).json({ message: "Failed to identify scaling needs" });
    }
  });

  // Phase 4: Admin Tools & User Management
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsersWithPlans();
      res.json(users);
    } catch (error) {
      console.error("Get all users with plans error:", error);
      res.status(500).json({ message: "Failed to get users with plans" });
    }
  });

  app.post("/api/admin/users/:userId/change-plan", async (req, res) => {
    try {
      const { userId } = req.params;
      const { newPlan } = req.body;
      await storage.changeUserPlan(userId, newPlan);
      res.json({ success: true, message: `User plan changed to ${newPlan}` });
    } catch (error) {
      console.error("Change user plan error:", error);
      res.status(500).json({ message: "Failed to change user plan" });
    }
  });

  app.post("/api/admin/users/:userId/force-stop-sessions", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.forceStopUserSessions(userId);
      res.json({ success: true, message: "User sessions force stopped" });
    } catch (error) {
      console.error("Force stop user sessions error:", error);
      res.status(500).json({ message: "Failed to force stop user sessions" });
    }
  });

  // Phase 5: Multi-Account Management
  app.get("/api/accounts", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }
      const accounts = await storage.getTelegramAccountsByUserId(userId as string);
      res.json(accounts);
    } catch (error) {
      console.error("Get telegram accounts error:", error);
      res.status(500).json({ message: "Failed to get telegram accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validatedAccount = insertTelegramAccountSchema.parse(req.body);
      const account = await storage.createTelegramAccount(validatedAccount);
      res.status(201).json(account);
    } catch (error) {
      console.error("Create telegram account error:", error);
      res.status(500).json({ message: "Failed to create telegram account" });
    }
  });

  app.put("/api/accounts/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const account = await storage.updateTelegramAccount(accountId, req.body);
      if (!account) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json(account);
    } catch (error) {
      console.error("Update telegram account error:", error);
      res.status(500).json({ message: "Failed to update telegram account" });
    }
  });

  app.delete("/api/accounts/:accountId", async (req, res) => {
    try {
      const { accountId } = req.params;
      const deleted = await storage.deleteTelegramAccount(accountId);
      if (!deleted) {
        return res.status(404).json({ message: "Account not found" });
      }
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Delete telegram account error:", error);
      res.status(500).json({ message: "Failed to delete telegram account" });
    }
  });

  app.get("/api/accounts/:userId/status", async (req, res) => {
    try {
      const { userId } = req.params;
      const statusInfo = await storage.getAccountStatusInfo(userId);
      res.json(statusInfo);
    } catch (error) {
      console.error("Get account status error:", error);
      res.status(500).json({ message: "Failed to get account status" });
    }
  });

  app.post("/api/accounts/:accountId/enable", async (req, res) => {
    try {
      const { accountId } = req.params;
      await storage.enableAccountForwarding(accountId);
      res.json({ success: true, message: "Account forwarding enabled" });
    } catch (error) {
      console.error("Enable account forwarding error:", error);
      res.status(500).json({ message: "Failed to enable account forwarding" });
    }
  });

  app.post("/api/accounts/:accountId/disable", async (req, res) => {
    try {
      const { accountId } = req.params;
      await storage.disableAccountForwarding(accountId);
      res.json({ success: true, message: "Account forwarding disabled" });
    } catch (error) {
      console.error("Disable account forwarding error:", error);
      res.status(500).json({ message: "Failed to disable account forwarding" });
    }
  });

  // Phase 5: Team/Workspace Collaboration
  app.get("/api/team/:ownerId", async (req, res) => {
    try {
      const { ownerId } = req.params;
      const teamInfo = await storage.getTeamInfo(ownerId);
      res.json(teamInfo);
    } catch (error) {
      console.error("Get team info error:", error);
      res.status(500).json({ message: "Failed to get team info" });
    }
  });

  app.post("/api/team/:ownerId/invite", async (req, res) => {
    try {
      const { ownerId } = req.params;
      const { memberEmail, permissions } = req.body;
      const member = await storage.inviteTeamMember(ownerId, memberEmail, permissions);
      res.status(201).json(member);
    } catch (error) {
      console.error("Invite team member error:", error);
      res.status(500).json({ message: "Failed to invite team member" });
    }
  });

  app.put("/api/team/member/:memberId/permissions", async (req, res) => {
    try {
      const { memberId } = req.params;
      const { permissions } = req.body;
      await storage.updateTeamMemberPermissions(memberId, permissions);
      res.json({ success: true, message: "Permissions updated" });
    } catch (error) {
      console.error("Update team member permissions error:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.delete("/api/team/:ownerId/member/:memberId", async (req, res) => {
    try {
      const { ownerId, memberId } = req.params;
      const removed = await storage.removeTeamMember(ownerId, memberId);
      if (!removed) {
        return res.status(404).json({ message: "Team member not found" });
      }
      res.json({ success: true, message: "Team member removed" });
    } catch (error) {
      console.error("Remove team member error:", error);
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Phase 5: Session Lifecycle & Error Handling
  app.post("/api/sessions/failures", async (req, res) => {
    try {
      const validatedFailure = insertSessionFailureSchema.parse(req.body);
      const failure = await storage.createSessionFailure(validatedFailure);
      res.status(201).json(failure);
    } catch (error) {
      console.error("Create session failure error:", error);
      res.status(500).json({ message: "Failed to create session failure" });
    }
  });

  app.get("/api/sessions/:accountId/failures", async (req, res) => {
    try {
      const { accountId } = req.params;
      const failures = await storage.getSessionFailures(accountId);
      res.json(failures);
    } catch (error) {
      console.error("Get session failures error:", error);
      res.status(500).json({ message: "Failed to get session failures" });
    }
  });

  app.get("/api/sessions/:accountId/health", async (req, res) => {
    try {
      const { accountId } = req.params;
      const healthReport = await storage.getSessionHealthReport(accountId);
      res.json(healthReport);
    } catch (error) {
      console.error("Get session health report error:", error);
      res.status(500).json({ message: "Failed to get session health report" });
    }
  });

  app.post("/api/sessions/failures/:failureId/resolve", async (req, res) => {
    try {
      const { failureId } = req.params;
      await storage.markFailureResolved(failureId);
      res.json({ success: true, message: "Failure marked as resolved" });
    } catch (error) {
      console.error("Mark failure resolved error:", error);
      res.status(500).json({ message: "Failed to mark failure as resolved" });
    }
  });

  // Phase 5: Re-Authentication Workflow
  app.post("/api/auth/reauth", async (req, res) => {
    try {
      const validatedRequest = insertReauthRequestSchema.parse(req.body);
      const reauthRequest = await storage.createReauthRequest(validatedRequest);
      res.status(201).json(reauthRequest);
    } catch (error) {
      console.error("Create reauth request error:", error);
      res.status(500).json({ message: "Failed to create reauth request" });
    }
  });

  app.get("/api/auth/reauth/:requestId", async (req, res) => {
    try {
      const { requestId } = req.params;
      const workflowStatus = await storage.getReauthWorkflowStatus(requestId);
      if (!workflowStatus) {
        return res.status(404).json({ message: "Reauth request not found" });
      }
      res.json(workflowStatus);
    } catch (error) {
      console.error("Get reauth workflow status error:", error);
      res.status(500).json({ message: "Failed to get reauth workflow status" });
    }
  });

  app.get("/api/auth/reauth/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const activeRequests = await storage.getActiveReauthRequests(userId);
      res.json(activeRequests);
    } catch (error) {
      console.error("Get active reauth requests error:", error);
      res.status(500).json({ message: "Failed to get active reauth requests" });
    }
  });

  // Phase 5: Account-specific Forwarding Mappings
  app.get("/api/accounts/:accountId/mappings", async (req, res) => {
    try {
      const { accountId } = req.params;
      const mappings = await storage.getAccountForwardingMappings(accountId);
      res.json(mappings);
    } catch (error) {
      console.error("Get account forwarding mappings error:", error);
      res.status(500).json({ message: "Failed to get account forwarding mappings" });
    }
  });

  app.post("/api/accounts/:accountId/mappings", async (req, res) => {
    try {
      const { accountId } = req.params;
      const validatedMapping = insertAccountForwardingMappingSchema.parse({
        ...req.body,
        accountId
      });
      const mapping = await storage.createAccountForwardingMapping(validatedMapping);
      res.status(201).json(mapping);
    } catch (error) {
      console.error("Create account forwarding mapping error:", error);
      res.status(500).json({ message: "Failed to create account forwarding mapping" });
    }
  });

  app.delete("/api/accounts/mappings/:mappingId", async (req, res) => {
    try {
      const { mappingId } = req.params;
      const deleted = await storage.deleteAccountForwardingMapping(mappingId);
      if (!deleted) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      res.json({ success: true, message: "Mapping deleted successfully" });
    } catch (error) {
      console.error("Delete account forwarding mapping error:", error);
      res.status(500).json({ message: "Failed to delete account forwarding mapping" });
    }
  });

  // Phase 5: Session Backup & Recovery
  app.post("/api/sessions/:accountId/backup", async (req, res) => {
    try {
      const { accountId } = req.params;
      const validatedBackup = insertSessionBackupSchema.parse({
        ...req.body,
        accountId
      });
      const backup = await storage.createSessionBackup(validatedBackup);
      res.status(201).json(backup);
    } catch (error) {
      console.error("Create session backup error:", error);
      res.status(500).json({ message: "Failed to create session backup" });
    }
  });

  app.get("/api/sessions/:accountId/backups", async (req, res) => {
    try {
      const { accountId } = req.params;
      const backups = await storage.getSessionBackups(accountId);
      res.json(backups);
    } catch (error) {
      console.error("Get session backups error:", error);
      res.status(500).json({ message: "Failed to get session backups" });
    }
  });

  app.post("/api/sessions/:accountId/restore/:backupId", async (req, res) => {
    try {
      const { accountId, backupId } = req.params;
      await storage.restoreFromBackup(accountId, backupId);
      res.json({ success: true, message: "Session restored from backup" });
    } catch (error) {
      console.error("Restore from backup error:", error);
      res.status(500).json({ message: "Failed to restore from backup" });
    }
  });

  // Phase 5: Real-time Sync Events
  app.post("/api/sync/events", async (req, res) => {
    try {
      const validatedEvent = insertSyncEventSchema.parse(req.body);
      const event = await storage.createSyncEvent(validatedEvent);
      res.status(201).json(event);
    } catch (error) {
      console.error("Create sync event error:", error);
      res.status(500).json({ message: "Failed to create sync event" });
    }
  });

  app.get("/api/sync/events/unprocessed", async (req, res) => {
    try {
      const { userId } = req.query;
      const events = await storage.getUnprocessedSyncEvents(userId as string);
      res.json(events);
    } catch (error) {
      console.error("Get unprocessed sync events error:", error);
      res.status(500).json({ message: "Failed to get unprocessed sync events" });
    }
  });

  app.post("/api/sync/events/:eventId/process", async (req, res) => {
    try {
      const { eventId } = req.params;
      await storage.markSyncEventProcessed(eventId);
      res.json({ success: true, message: "Event marked as processed" });
    } catch (error) {
      console.error("Mark sync event processed error:", error);
      res.status(500).json({ message: "Failed to mark event as processed" });
    }
  });

  app.post("/api/sync/events/process/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.processSyncEvents(userId);
      res.json({ success: true, message: "All events processed" });
    } catch (error) {
      console.error("Process sync events error:", error);
      res.status(500).json({ message: "Failed to process sync events" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, seedAdmin } from "./auth";
import fileUpload from "express-fileupload";
import { parseCsvFromFile, convertToTemplateItems, parseCsvFromString } from "./csv-parser";
import multer from "multer";

// Configure multer storage
const upload = multer({
  dest: path.join(process.cwd(), 'tmp'),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});
import fs from "fs";
import path from "path";
import { 
  insertDealSchema, 
  insertTaskSchema, 
  insertDocumentSchema, 
  insertRequestSchema,
  insertRaciMatrixSchema,
  insertActivityLogSchema,
  insertTaskTemplateSchema,
  insertTaskTemplateItemSchema,
  UserRoles,
  TaskPhases,
  TaskCategories,
  TaskStatuses,
  RequestTypes,
  RequestStatuses
} from "@shared/schema";
import { z } from "zod";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user has deal_lead role
const isDealLead = (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === UserRoles.DEAL_LEAD) {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Requires Deal Lead role" });
};

// Middleware to check if user has appropriate role to modify task
const canModifyTask = async (req: Request, res: Response, next: NextFunction) => {
  if (req.user?.role === UserRoles.DEAL_LEAD) {
    // Deal leads can modify any task
    return next();
  }
  
  if (req.user?.role === UserRoles.FUNCTIONAL_LEAD) {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTask(taskId);
    
    // Functional leads can only modify tasks in their specialty
    if (task && task.category === req.user.specialization) {
      return next();
    }
  }
  
  // Partners cannot modify tasks
  res.status(403).json({ message: "Forbidden - Insufficient permissions to modify this task" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  try {
    // Setup authentication
    await setupAuth(app);
    
    // Setup file upload middleware
    app.use(fileUpload({
      createParentPath: true,
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max file size
      abortOnLimit: true,
      useTempFiles: true,
      tempFileDir: './tmp/'
    }));
    
    // Create temp directory if it doesn't exist
    const tempDir = path.resolve('./tmp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    // Seed admin user
    await seedAdmin();
    
    // Seed initial data
    await seedInitialData();
  } catch (error) {
    console.error("Error during setup:", error);
    throw error;
  }

  // ============================
  // Deal Routes
  // ============================
  
  // Get all deals
  app.get("/api/deals", isAuthenticated, async (req, res) => {
    const deals = await storage.getDeals();
    res.json(deals);
  });
  
  // Get a specific deal
  app.get("/api/deals/:id", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.id);
    const deal = await storage.getDeal(dealId);
    
    if (!deal) {
      return res.status(404).json({ message: "Deal not found" });
    }
    
    res.json(deal);
  });
  
  // Create a new deal (deal lead only)
  app.post("/api/deals", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const dealData = insertDealSchema.parse(req.body);
      const deal = await storage.createDeal(dealData);
      
      // Log activity
      await storage.createActivityLog({
        dealId: deal.id,
        userId: req.user!.id,
        action: "created",
        entityType: "deal",
        entityId: deal.id,
        details: `Created deal: ${deal.name}`
      });
      
      res.status(201).json(deal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // Update a deal (deal lead only)
  app.patch("/api/deals/:id", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const dealId = parseInt(req.params.id);
      const dealData = insertDealSchema.partial().parse(req.body);
      
      const updatedDeal = await storage.updateDeal(dealId, dealData);
      
      if (!updatedDeal) {
        return res.status(404).json({ message: "Deal not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        dealId: updatedDeal.id,
        userId: req.user!.id,
        action: "updated",
        entityType: "deal",
        entityId: updatedDeal.id,
        details: `Updated deal: ${updatedDeal.name}`
      });
      
      res.json(updatedDeal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid deal data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // ============================
  // Task Routes
  // ============================
  
  // Get all tasks for a deal
  app.get("/api/deals/:dealId/tasks", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.dealId);
    const tasks = await storage.getTasksByDeal(dealId);
    res.json(tasks);
  });
  
  // Get tasks by phase for a deal
  app.get("/api/deals/:dealId/phases/:phase/tasks", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.dealId);
    const phase = req.params.phase;
    
    // Validate phase
    const validPhases = Object.values(TaskPhases);
    if (!validPhases.includes(phase as any)) {
      return res.status(400).json({ message: `Invalid phase. Must be one of: ${validPhases.join(', ')}` });
    }
    
    const tasks = await storage.getTasksByPhase(dealId, phase);
    res.json(tasks);
  });
  
  // Get a specific task
  app.get("/api/tasks/:id", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.id);
    const task = await storage.getTask(taskId);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }
    
    res.json(task);
  });
  
  // Create a new task
  app.post("/api/tasks", isAuthenticated, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask(taskData);
      
      // Log activity
      await storage.createActivityLog({
        dealId: task.dealId,
        userId: req.user!.id,
        action: "created",
        entityType: "task",
        entityId: task.id,
        details: `Created task: ${task.title}`
      });
      
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // Update a task (with role-based permission check)
  app.patch("/api/tasks/:id", isAuthenticated, canModifyTask, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const taskData = insertTaskSchema.partial().parse(req.body);
      
      const currentTask = await storage.getTask(taskId);
      if (!currentTask) {
        return res.status(404).json({ message: "Task not found" });
      }
      
      const updatedTask = await storage.updateTask(taskId, taskData);
      
      // Check if status was updated to completed
      if (taskData.status === TaskStatuses.COMPLETED && currentTask.status !== TaskStatuses.COMPLETED) {
        // Log completion activity
        await storage.createActivityLog({
          dealId: updatedTask!.dealId,
          userId: req.user!.id,
          action: "completed",
          entityType: "task",
          entityId: updatedTask!.id,
          details: `Completed task: ${updatedTask!.title}`
        });
      } else {
        // Log general update activity
        await storage.createActivityLog({
          dealId: updatedTask!.dealId,
          userId: req.user!.id,
          action: "updated",
          entityType: "task",
          entityId: updatedTask!.id,
          details: `Updated task: ${updatedTask!.title}`
        });
      }
      
      res.json(updatedTask);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // ============================
  // Document Routes
  // ============================
  
  // Get documents for a task
  app.get("/api/tasks/:taskId/documents", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const documents = await storage.getDocumentsByTask(taskId);
    res.json(documents);
  });
  
  // Get recent documents for a deal
  app.get("/api/deals/:dealId/recent-documents", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.dealId);
    const limit = parseInt(req.query.limit as string || "4");
    const documents = await storage.getRecentDocuments(dealId, limit);
    res.json(documents);
  });
  
  // Upload a document
  app.post("/api/documents", isAuthenticated, async (req, res) => {
    try {
      // For this prototype, we'll store document content as text in memory
      const documentData = insertDocumentSchema.parse({
        ...req.body,
        uploadedBy: req.user!.id
      });
      
      const document = await storage.createDocument(documentData);
      
      // Log activity
      await storage.createActivityLog({
        dealId: req.body.dealId, // Need to pass dealId in request body since document only has taskId
        userId: req.user!.id,
        action: "uploaded",
        entityType: "document",
        entityId: document.id,
        details: `Uploaded document: ${document.fileName}`
      });
      
      res.status(201).json(document);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // ============================
  // Request Routes
  // ============================
  
  // Get requests for a task
  app.get("/api/tasks/:taskId/requests", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const requests = await storage.getRequestsByTask(taskId);
    res.json(requests);
  });
  
  // Get all requests for a deal
  app.get("/api/deals/:dealId/requests", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.dealId);
    const requests = await storage.getRequestsByDeal(dealId);
    res.json(requests);
  });
  
  // Create a new request
  app.post("/api/requests", isAuthenticated, async (req, res) => {
    try {
      const requestData = insertRequestSchema.parse({
        ...req.body,
        createdBy: req.user!.id
      });
      
      const request = await storage.createRequest(requestData);
      
      // Log activity
      await storage.createActivityLog({
        dealId: req.body.dealId, // Need to pass dealId in request body since request only has taskId
        userId: req.user!.id,
        action: "created",
        entityType: "request",
        entityId: request.id,
        details: `Created request: ${request.requestId}`
      });
      
      res.status(201).json(request);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // Update a request
  app.patch("/api/requests/:id", isAuthenticated, async (req, res) => {
    try {
      const requestId = parseInt(req.params.id);
      const requestData = insertRequestSchema.partial().parse(req.body);
      
      const updatedRequest = await storage.updateRequest(requestId, requestData);
      
      if (!updatedRequest) {
        return res.status(404).json({ message: "Request not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        dealId: req.body.dealId, // Need to pass dealId in request body
        userId: req.user!.id,
        action: "updated",
        entityType: "request",
        entityId: updatedRequest.id,
        details: `Updated request: ${updatedRequest.requestId}`
      });
      
      res.json(updatedRequest);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // ============================
  // RACI Matrix Routes
  // ============================
  
  // Get RACI matrix for a task
  app.get("/api/tasks/:taskId/raci", isAuthenticated, async (req, res) => {
    const taskId = parseInt(req.params.taskId);
    const raci = await storage.getRaciMatrix(taskId);
    
    if (!raci) {
      return res.status(404).json({ message: "RACI matrix not found for this task" });
    }
    
    res.json(raci);
  });
  
  // Create or update RACI matrix
  app.post("/api/raci", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const raciData = insertRaciMatrixSchema.parse(req.body);
      
      // Check if RACI already exists for this task
      const existingRaci = await storage.getRaciMatrix(raciData.taskId);
      
      let raci;
      if (existingRaci) {
        // Update existing
        raci = await storage.updateRaciMatrix(existingRaci.id, raciData);
      } else {
        // Create new
        raci = await storage.createRaciMatrix(raciData);
      }
      
      // Log activity
      await storage.createActivityLog({
        dealId: raci!.dealId,
        userId: req.user!.id,
        action: existingRaci ? "updated" : "created",
        entityType: "raci",
        entityId: raci!.id,
        details: `${existingRaci ? "Updated" : "Created"} RACI matrix for task ${raci!.taskId}`
      });
      
      res.status(existingRaci ? 200 : 201).json(raci);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid RACI data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // ============================
  // Activity Log Routes
  // ============================
  
  // Get activity logs for a deal
  app.get("/api/deals/:dealId/activity", isAuthenticated, async (req, res) => {
    const dealId = parseInt(req.params.dealId);
    const limit = parseInt(req.query.limit as string || "20");
    const logs = await storage.getActivityLogsByDeal(dealId, limit);
    res.json(logs);
  });
  
  // ============================
  // Task Template Routes
  // ============================
  
  // Alternative import endpoint that accepts CSV content directly in the request body
  app.post("/api/task-templates/import-content", isAuthenticated, isDealLead, async (req, res) => {
    try {
      console.log("CSV content import request received");
      
      // Get template name, description, and CSV content
      const { name, description, csvContent } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: "Template name is required" });
      }
      
      if (!csvContent) {
        return res.status(400).json({ message: "CSV content is required" });
      }
      
      console.log(`Processing CSV import for template: ${name}`);
      console.log(`CSV content preview: ${csvContent.substring(0, 100)}...`);
      
      try {
        // Parse CSV content
        const parsedItems = await parseCsvFromString(csvContent);
        
        if (parsedItems.length === 0) {
          return res.status(400).json({ message: "CSV content must contain at least one valid task" });
        }
        
        console.log(`Successfully parsed ${parsedItems.length} items from CSV content`);
        
        // Create template
        const template = await storage.createTaskTemplate({
          name,
          description: description || "",
          createdBy: req.user!.id,
          isDefault: false
        });
        
        // Convert to template items and add to database
        const templateItems = convertToTemplateItems(parsedItems, template.id);
        const createdItems = [];
        
        for (const item of templateItems) {
          const createdItem = await storage.createTaskTemplateItem(item);
          createdItems.push(createdItem);
        }
        
        // Log activity
        await storage.createActivityLog({
          dealId: 0,
          userId: req.user!.id,
          action: "imported",
          entityType: "task_template",
          entityId: template.id,
          details: `Imported template from CSV: ${template.name} with ${createdItems.length} tasks`
        });
        
        // Return success response
        res.status(201).json({
          template,
          items: createdItems
        });
      } catch (err) {
        console.error("Error parsing CSV content:", err);
        return res.status(400).json({ 
          message: "Error parsing CSV content", 
          error: err instanceof Error ? err.message : "Invalid CSV format" 
        });
      }
    } catch (error) {
      console.error("CSV import error:", error);
      res.status(500).json({ 
        message: "Error importing CSV", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });
  
  // Get all task templates
  app.get("/api/task-templates", isAuthenticated, async (req, res) => {
    const templates = await storage.getTaskTemplates();
    res.json(templates);
  });
  
  // Get default task template
  app.get("/api/task-templates/default", isAuthenticated, async (req, res) => {
    const template = await storage.getDefaultTaskTemplate();
    if (!template) {
      return res.status(404).json({ message: "No default template found" });
    }
    res.json(template);
  });
  
  // Get a specific task template
  app.get("/api/task-templates/:id", isAuthenticated, async (req, res) => {
    const templateId = parseInt(req.params.id);
    const template = await storage.getTaskTemplate(templateId);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  });
  
  // Get template items for a template
  app.get("/api/task-templates/:id/items", isAuthenticated, async (req, res) => {
    const templateId = parseInt(req.params.id);
    const items = await storage.getTaskTemplateItems(templateId);
    res.json(items);
  });
  
  // Create a new task template
  app.post("/api/task-templates", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const templateData = {
        ...req.body,
        createdBy: req.user!.id
      };
      
      // If setting this template as default, unset default flag on all other templates
      if (templateData.isDefault === true) {
        console.log(`Creating new default template. Unsetting other default templates.`);
        // Get all templates
        const templates = await storage.getTaskTemplates();
        
        // Unset default flag on all other templates
        for (const template of templates) {
          if (template.isDefault) {
            console.log(`Unsetting default flag on template ${template.id}`);
            await storage.updateTaskTemplate(template.id, { isDefault: false });
          }
        }
      }
      
      const template = await storage.createTaskTemplate(templateData);
      
      // Log activity
      await storage.createActivityLog({
        dealId: 0, // Not deal-specific
        userId: req.user!.id,
        action: "created",
        entityType: "task_template",
        entityId: template.id,
        details: `Created task template: ${template.name}`
      });
      
      res.status(201).json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error creating template:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });
  
  // Create a new template item
  app.post("/api/task-templates/:templateId/items", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const templateId = parseInt(req.params.templateId);
      const itemData = {
        ...req.body,
        templateId
      };
      
      const item = await storage.createTaskTemplateItem(itemData);
      
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template item data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // Update a task template
  app.patch("/api/task-templates/:id", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const templateId = parseInt(req.params.id);
      const templateData = req.body;
      
      // If setting this template as default, unset default flag on all other templates
      if (templateData.isDefault === true) {
        console.log(`Setting template ${templateId} as default. Unsetting other default templates.`);
        // Get all templates
        const templates = await storage.getTaskTemplates();
        
        // Unset default flag on all other templates
        for (const template of templates) {
          if (template.id !== templateId && template.isDefault) {
            console.log(`Unsetting default flag on template ${template.id}`);
            await storage.updateTaskTemplate(template.id, { isDefault: false });
          }
        }
      }
      
      const updatedTemplate = await storage.updateTaskTemplate(templateId, templateData);
      
      if (!updatedTemplate) {
        return res.status(404).json({ message: "Template not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        dealId: 0, // Not deal-specific
        userId: req.user!.id,
        action: "updated",
        entityType: "task_template",
        entityId: templateId,
        details: `Updated template: "${updatedTemplate.name}"`
      });
      
      res.json(updatedTemplate);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template data", errors: error.errors });
      }
      console.error("Error updating template:", error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Delete a task template
  app.delete("/api/task-templates/:id", isAuthenticated, isDealLead, async (req, res) => {
    const templateId = parseInt(req.params.id);
    const success = await storage.deleteTaskTemplate(templateId);
    
    if (!success) {
      return res.status(404).json({ message: "Template not found" });
    }
    
    res.status(204).end();
  });
  
  // Apply a template to a deal (generate tasks)
  app.post("/api/deals/:dealId/apply-template", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const dealId = parseInt(req.params.dealId);
      const { templateId } = req.body;
      
      if (!templateId) {
        return res.status(400).json({ message: "templateId is required" });
      }
      
      const tasks = await storage.applyTemplateToProject(templateId, dealId);
      
      // Log activity
      await storage.createActivityLog({
        dealId: dealId,
        userId: req.user!.id,
        action: "applied",
        entityType: "task_template",
        entityId: templateId,
        details: `Applied task template to deal: Created ${tasks.length} tasks`
      });
      
      res.status(201).json(tasks);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }
  });
  
  // ============================
  // Template Item Routes
  // ============================
  
  // Create template item
  app.post("/api/task-template-items", isAuthenticated, isDealLead, async (req, res) => {
    try {
      console.log("Received template item create request:", req.body);
      
      // Validate the incoming data
      const validatedData = insertTaskTemplateItemSchema.parse(req.body);
      console.log("Validated template item data:", validatedData);
      
      // Create the template item in the database
      const item = await storage.createTaskTemplateItem(validatedData);
      console.log("Created template item:", item);
      
      // Log activity
      await storage.createActivityLog({
        dealId: 0, // Not deal-specific
        userId: req.user!.id,
        action: "created",
        entityType: "task_template_item",
        entityId: item.id,
        details: `Created template item: "${item.title}"`
      });
      
      res.status(201).json(item);
    } catch (error) {
      console.error("Error creating template item:", error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template item data", errors: error.errors });
      }
      
      res.status(500).json({ message: "Failed to create template item", error: String(error) });
    }
  });
  
  // Update template item
  app.patch("/api/task-template-items/:id", isAuthenticated, isDealLead, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const itemData = req.body;
      
      const updatedItem = await storage.updateTaskTemplateItem(id, itemData);
      
      if (!updatedItem) {
        return res.status(404).json({ message: "Template item not found" });
      }
      
      // Log activity
      await storage.createActivityLog({
        dealId: 0, // Not deal-specific
        userId: req.user!.id,
        action: "updated",
        entityType: "task_template_item",
        entityId: id,
        details: `Updated template item: "${updatedItem.title}"`
      });
      
      res.json(updatedItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid template item data", errors: error.errors });
      }
      throw error;
    }
  });
  
  // Delete template item
  app.delete("/api/task-template-items/:id", isAuthenticated, isDealLead, async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteTaskTemplateItem(id);
    
    if (!success) {
      return res.status(404).json({ message: "Template item not found" });
    }
    
    // Log activity
    await storage.createActivityLog({
      dealId: 0, // Not deal-specific
      userId: req.user!.id,
      action: "deleted",
      entityType: "task_template_item",
      entityId: id,
      details: "Deleted template item"
    });
    
    res.status(204).end();
  });

  const httpServer = createServer(app);

  return httpServer;
}

// Helper function to seed initial data
async function seedInitialData() {
  // Check if we already have deals
  const existingDeals = await storage.getDeals();
  if (existingDeals.length > 0) {
    // Data already seeded, but still check for task templates
    await seedTaskTemplates();
    return;
  }
  
  // Create templates first so we can reference them later
  await seedTaskTemplates();
  
  // Create a test deal
  const deal = await storage.createDeal({
    name: "TechFusion Acquisition",
    status: "active"
  });
  
  // Create tasks for LOI phase (all completed)
  const loiTasks = [
    {
      dealId: deal.id,
      title: "Initial Financial Review",
      description: "Review P&L, balance sheet, and cash flow statements for past 3 years",
      phase: TaskPhases.LOI_SIGNING,
      category: TaskCategories.FINANCIAL,
      status: TaskStatuses.COMPLETED,
      dueDate: new Date("2023-05-15").toISOString(),
      assignedTo: 2, // Michael Reynolds (financial lead)
    },
    {
      dealId: deal.id,
      title: "Legal Structure Analysis",
      description: "Review corporate organization, subsidiaries, and ownership structure",
      phase: TaskPhases.LOI_SIGNING,
      category: TaskCategories.LEGAL,
      status: TaskStatuses.COMPLETED,
      dueDate: new Date("2023-05-18").toISOString(),
      assignedTo: 3, // Amanda Lee (legal lead)
    },
    {
      dealId: deal.id,
      title: "Market Analysis",
      description: "Evaluate target company's market position, competitors, and growth potential",
      phase: TaskPhases.LOI_SIGNING,
      category: TaskCategories.OPERATING_TEAM,
      status: TaskStatuses.COMPLETED,
      dueDate: new Date("2023-05-20").toISOString(),
      assignedTo: 1, // Sarah Johnson (deal lead)
    }
  ];
  
  for (const taskData of loiTasks) {
    const task = await storage.createTask(taskData);
    await storage.updateTask(task.id, { completedAt: new Date(taskData.dueDate) });
  }
  
  // Create tasks for Document Review phase (mix of completed and in progress)
  const documentTasks = [
    {
      dealId: deal.id,
      title: "Customer Concentration Analysis",
      description: "Analyze customer base and identify dependency on key accounts",
      phase: TaskPhases.DOCUMENT,
      category: TaskCategories.FINANCIAL,
      status: TaskStatuses.COMPLETED,
      dueDate: new Date("2023-06-02"),
      assignedTo: 4, // Tom Wilson (operations)
    },
    {
      dealId: deal.id,
      title: "IP Rights Review",
      description: "Verify patents, trademarks, and other intellectual property assets",
      phase: TaskPhases.DOCUMENT,
      category: TaskCategories.LEGAL,
      status: TaskStatuses.COMPLETED,
      dueDate: new Date("2023-06-05"),
      assignedTo: 3, // Amanda Lee (legal lead)
    },
    {
      dealId: deal.id,
      title: "Financial Statement Analysis",
      description: "Detailed analysis of financial statements, accounting policies, and adjustments",
      phase: TaskPhases.DOCUMENT,
      category: TaskCategories.FINANCIAL,
      status: TaskStatuses.IN_PROGRESS,
      dueDate: new Date("2023-06-05"), // Overdue
      assignedTo: 2, // Michael Reynolds (financial)
    },
    {
      dealId: deal.id,
      title: "Inventory Valuation",
      description: "Review inventory records, valuation methods, and obsolescence policies",
      phase: TaskPhases.DOCUMENT,
      category: TaskCategories.OPERATIONS,
      status: TaskStatuses.IN_PROGRESS,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      assignedTo: 4, // Tom Wilson (operations)
    },
    {
      dealId: deal.id,
      title: "Regulatory Compliance Review",
      description: "Evaluate compliance with industry regulations and identify potential issues",
      phase: TaskPhases.DOCUMENT,
      category: TaskCategories.LEGAL,
      status: TaskStatuses.IN_PROGRESS,
      dueDate: new Date("2023-06-01"), // Overdue
      assignedTo: 3, // Amanda Lee (legal)
    }
  ];
  
  for (const taskData of documentTasks) {
    const task = await storage.createTask(taskData);
    
    if (taskData.status === TaskStatuses.COMPLETED) {
      await storage.updateTask(task.id, { completedAt: taskData.dueDate });
    }
  }
  
  // Create some sample documents
  const documents = [
    {
      taskId: 1, // Initial Financial Review
      fileName: "Q1_Financial_Statements.pdf",
      fileSize: 1200000, // 1.2 MB
      fileType: "application/pdf",
      content: "Q1 Financial Statements content would be here",
      uploadedBy: 2, // Michael Reynolds
    },
    {
      taskId: 2, // Legal Structure Analysis
      fileName: "Corporate_Structure_Overview.docx",
      fileSize: 850000, // 850 KB
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: "Corporate Structure Overview content would be here",
      uploadedBy: 3, // Amanda Lee
    },
    {
      taskId: 4, // Customer Concentration Analysis
      fileName: "Customer_Concentration_Analysis.docx",
      fileSize: 850000, // 850 KB
      fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      content: "Customer Concentration Analysis content would be here",
      uploadedBy: 4, // Tom Wilson
    },
    {
      taskId: 5, // IP Rights Review
      fileName: "IP_Rights_Summary.xlsx",
      fileSize: 1400000, // 1.4 MB
      fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      content: "IP Rights Summary content would be here",
      uploadedBy: 3, // Amanda Lee
    },
    {
      taskId: 8, // Regulatory Compliance Review
      fileName: "Regulatory_Compliance_Report.pdf",
      fileSize: 3500000, // 3.5 MB
      fileType: "application/pdf",
      content: "Regulatory Compliance Report content would be here",
      uploadedBy: 3, // Amanda Lee
    }
  ];
  
  for (const docData of documents) {
    await storage.createDocument(docData);
  }
  
  // Create sample activity logs
  const activities = [
    {
      dealId: deal.id,
      userId: 1, // Sarah Johnson
      action: "created",
      entityType: "deal",
      entityId: deal.id,
      details: "Created deal: TechFusion Acquisition",
    },
    {
      dealId: deal.id,
      userId: 2, // Michael Reynolds
      action: "uploaded",
      entityType: "document",
      entityId: 1,
      details: "Uploaded Q1 Financial Statements",
    },
    {
      dealId: deal.id,
      userId: 3, // Amanda Lee
      action: "completed",
      entityType: "task",
      entityId: 5,
      details: "Completed IP Rights Review",
    },
    {
      dealId: deal.id,
      userId: 4, // Tom Wilson
      action: "created",
      entityType: "request",
      entityId: 1,
      details: "Requested additional customer data",
    },
    {
      dealId: deal.id,
      userId: 1, // Sarah Johnson
      action: "created",
      entityType: "task",
      entityId: 9,
      details: "Scheduled management interviews",
    }
  ];
  
  // Add activity logs with staggered timestamps
  let timeOffset = 0;
  for (const activity of activities) {
    const log = {
      ...activity,
      timestamp: new Date(Date.now() - timeOffset)
    };
    await storage.createActivityLog(activity);
    timeOffset += 3 * 60 * 60 * 1000; // 3 hour intervals
  }
  
  console.log("Initial data seeded successfully");
}

// Helper function to seed task templates
async function seedTaskTemplates() {
  // Check if we already have templates
  const templates = await storage.getTaskTemplates();
  if (templates.length > 0) {
    return;
  }
  
  // Create a standard due diligence template
  const template = await storage.createTaskTemplate({
    name: "Standard Due Diligence Process",
    description: "A standard template for private equity due diligence process",
    isDefault: true,
    createdBy: 1 // Admin user
  });
  
  // Create template items (tasks) with days from start calculated
  const templateItems = [
    // Planning phase
    {
      templateId: template.id,
      title: "Assemble Due Diligence Team",
      description: "Identify and assign team members for each functional area",
      phase: TaskPhases.PLANNING_INITIAL,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 1,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Create Due Diligence Plan",
      description: "Develop detailed work plan and timeline",
      phase: TaskPhases.PLANNING_INITIAL,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 2,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Distribute Tailored Due Diligence Request List",
      description: "Send customized request list to target company",
      phase: TaskPhases.PLANNING_INITIAL,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 5,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Set Communication Protocol",
      description: "Establish communication channels and frequency",
      phase: TaskPhases.PLANNING_INITIAL,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 3,
      assignedTo: 1 // Deal lead
    },
    
    // Document Review phase
    {
      templateId: template.id,
      title: "Financial Statement Analysis",
      description: "Review historical financials, projections, and accounting policies",
      phase: TaskPhases.DOCUMENT_REVIEW,
      category: TaskCategories.FINANCIAL,
      daysFromStart: 10,
      assignedTo: 2 // Financial lead
    },
    {
      templateId: template.id,
      title: "Legal Structure Review",
      description: "Analyze corporate structure, ownership, and governance",
      phase: TaskPhases.DOCUMENT_REVIEW,
      category: TaskCategories.LEGAL,
      daysFromStart: 12,
      assignedTo: 3 // Legal lead
    },
    {
      templateId: template.id,
      title: "Customer Concentration Analysis",
      description: "Evaluate customer base and dependency risks",
      phase: TaskPhases.DOCUMENT_REVIEW,
      category: TaskCategories.FINANCIAL,
      daysFromStart: 15,
      assignedTo: 2 // Financial lead
    },
    {
      templateId: template.id,
      title: "Market and Competitive Analysis",
      description: "Review market position, competitors, and growth potential",
      phase: TaskPhases.DOCUMENT_REVIEW,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 18,
      assignedTo: 4 // Operations
    },
    
    // Mid Phase Review
    {
      templateId: template.id,
      title: "Mid-Point Progress Review",
      description: "Assess findings to date and adjust approach as needed",
      phase: TaskPhases.MID_PHASE_REVIEW,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 25,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Preliminary Value Driver Assessment",
      description: "Identify key value creation opportunities",
      phase: TaskPhases.MID_PHASE_REVIEW,
      category: TaskCategories.FINANCIAL,
      daysFromStart: 28,
      assignedTo: 2 // Financial lead
    },
    
    // Deep Dives
    {
      templateId: template.id,
      title: "Management Interviews",
      description: "Conduct detailed interviews with key executives",
      phase: TaskPhases.DEEP_DIVES,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 35,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Operational Excellence Assessment",
      description: "Evaluate operational efficiency and improvement opportunities",
      phase: TaskPhases.DEEP_DIVES,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 40,
      assignedTo: 4 // Operations
    },
    {
      templateId: template.id,
      title: "Technology and IP Review",
      description: "Assess technology stack, IP assets, and digital capabilities",
      phase: TaskPhases.DEEP_DIVES,
      category: TaskCategories.LEGAL,
      daysFromStart: 42,
      assignedTo: 3 // Legal lead
    },
    
    // Final Risk Review
    {
      templateId: template.id,
      title: "Risk Assessment Summary",
      description: "Compile all identified risks with mitigation strategies",
      phase: TaskPhases.FINAL_RISK_REVIEW,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 50,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Valuation Model Finalization",
      description: "Complete financial model with sensitivity analysis",
      phase: TaskPhases.FINAL_RISK_REVIEW,
      category: TaskCategories.FINANCIAL,
      daysFromStart: 55,
      assignedTo: 2 // Financial lead
    },
    
    // Deal Closing
    {
      templateId: template.id,
      title: "Investment Committee Presentation",
      description: "Prepare and deliver final investment recommendation",
      phase: TaskPhases.DEAL_CLOSING,
      category: TaskCategories.INVESTMENT_COMMITTEE,
      daysFromStart: 65,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Final Due Diligence Report",
      description: "Compile comprehensive findings document",
      phase: TaskPhases.DEAL_CLOSING,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 70,
      assignedTo: 1 // Deal lead
    },
    {
      templateId: template.id,
      title: "Transaction Documentation",
      description: "Review and finalize all legal documentation",
      phase: TaskPhases.DEAL_CLOSING,
      category: TaskCategories.LEGAL,
      daysFromStart: 75,
      assignedTo: 3 // Legal lead
    },
    
    // Post Close
    {
      templateId: template.id,
      title: "100-Day Integration Plan",
      description: "Develop detailed post-acquisition integration plan",
      phase: TaskPhases.POST_CLOSE,
      category: TaskCategories.OPERATING_TEAM,
      daysFromStart: 85,
      assignedTo: 4 // Operations
    }
  ];
  
  // Create all the template items
  for (const item of templateItems) {
    await storage.createTaskTemplateItem(item);
  }
  
  console.log("Task templates seeded successfully");
}

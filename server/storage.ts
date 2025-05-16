import { 
  User, InsertUser, 
  Deal, InsertDeal, 
  Task, InsertTask, 
  Document, InsertDocument, 
  Request, InsertRequest, 
  RaciMatrix, InsertRaciMatrix, 
  ActivityLog, InsertActivityLog,
  TaskTemplate, InsertTaskTemplate,
  TaskTemplateItem, InsertTaskTemplateItem
} from "@shared/schema";
import session from "express-session";
import { Store } from "express-session";
import { eq, and, desc, sql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { db, pool } from "./db";
import connectPg from "connect-pg-simple";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Deal operations
  getDeal(id: number): Promise<Deal | undefined>;
  getDeals(): Promise<Deal[]>;
  createDeal(deal: InsertDeal): Promise<Deal>;
  updateDeal(id: number, deal: Partial<InsertDeal>): Promise<Deal | undefined>;
  
  // Task operations
  getTask(id: number): Promise<Task | undefined>;
  getTasksByDeal(dealId: number): Promise<Task[]>;
  getTasksByPhase(dealId: number, phase: string): Promise<Task[]>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task | undefined>;
  
  // Document operations
  getDocument(id: number): Promise<Document | undefined>;
  getDocumentsByTask(taskId: number): Promise<Document[]>;
  getRecentDocuments(dealId: number, limit: number): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Request operations
  getRequest(id: number): Promise<Request | undefined>;
  getRequestsByTask(taskId: number): Promise<Request[]>;
  getRequestsByDeal(dealId: number): Promise<Request[]>;
  createRequest(request: InsertRequest): Promise<Request>;
  updateRequest(id: number, request: Partial<InsertRequest>): Promise<Request | undefined>;
  
  // RACI Matrix operations
  getRaciMatrix(taskId: number): Promise<RaciMatrix | undefined>;
  createRaciMatrix(raci: InsertRaciMatrix): Promise<RaciMatrix>;
  updateRaciMatrix(id: number, raci: Partial<InsertRaciMatrix>): Promise<RaciMatrix | undefined>;
  
  // Activity Log operations
  getActivityLogsByDeal(dealId: number, limit: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
  
  // Task Template operations
  getTaskTemplate(id: number): Promise<TaskTemplate | undefined>;
  getTaskTemplates(): Promise<TaskTemplate[]>;
  getDefaultTaskTemplate(): Promise<TaskTemplate | undefined>;
  createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate>;
  updateTaskTemplate(id: number, template: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined>;
  deleteTaskTemplate(id: number): Promise<boolean>;
  
  // Task Template Item operations
  getTaskTemplateItems(templateId: number): Promise<TaskTemplateItem[]>;
  createTaskTemplateItem(item: InsertTaskTemplateItem): Promise<TaskTemplateItem>;
  updateTaskTemplateItem(id: number, item: Partial<InsertTaskTemplateItem>): Promise<TaskTemplateItem | undefined>;
  deleteTaskTemplateItem(id: number): Promise<boolean>;
  
  // Apply template to deal (create tasks from template)
  applyTemplateToProject(templateId: number, dealId: number): Promise<Task[]>;
  
  // Session store
  sessionStore: Store;
}

const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'sessions' 
    });
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(schema.users).where(eq(schema.users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(schema.users).values(insertUser).returning();
    return user;
  }
  
  async getDeal(id: number): Promise<Deal | undefined> {
    const [deal] = await db.select().from(schema.deals).where(eq(schema.deals.id, id));
    return deal;
  }
  
  async getDeals(): Promise<Deal[]> {
    return await db.select().from(schema.deals).orderBy(desc(schema.deals.createdAt));
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const [deal] = await db.insert(schema.deals).values(insertDeal).returning();
    return deal;
  }
  
  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const [updatedDeal] = await db
      .update(schema.deals)
      .set(dealUpdate)
      .where(eq(schema.deals.id, id))
      .returning();
    return updatedDeal;
  }
  
  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(schema.tasks).where(eq(schema.tasks.id, id));
    return task;
  }
  
  async getTasksByDeal(dealId: number): Promise<Task[]> {
    return await db
      .select()
      .from(schema.tasks)
      .where(eq(schema.tasks.dealId, dealId))
      .orderBy(desc(schema.tasks.createdAt));
  }
  
  async getTasksByPhase(dealId: number, phase: string): Promise<Task[]> {
    return await db
      .select()
      .from(schema.tasks)
      .where(and(eq(schema.tasks.dealId, dealId), eq(schema.tasks.phase, phase)))
      .orderBy(desc(schema.tasks.createdAt));
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    // Handle date string conversion properly
    const taskData = {
      ...insertTask,
      // If dueDate is a string, convert it to a Date object for the database
      // If it's null/undefined, keep it as is
      dueDate: insertTask.dueDate ? new Date(insertTask.dueDate) : insertTask.dueDate
    };
    
    const [task] = await db.insert(schema.tasks).values(taskData).returning();
    return task;
  }
  
  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    // Set completedAt if status is being changed to completed
    const task = await this.getTask(id);
    if (!task) return undefined;
    
    let completedAt = task.completedAt;
    if (taskUpdate.status === 'completed' && task.status !== 'completed') {
      completedAt = new Date();
    } else if (taskUpdate.status && taskUpdate.status !== 'completed') {
      completedAt = null;
    }
    
    // Handle dueDate conversion if it's provided as a string
    const taskData = {
      ...taskUpdate,
      // Convert dueDate string to Date if present
      dueDate: taskUpdate.dueDate ? new Date(taskUpdate.dueDate) : taskUpdate.dueDate,
      completedAt
    };
    
    const [updatedTask] = await db
      .update(schema.tasks)
      .set(taskData)
      .where(eq(schema.tasks.id, id))
      .returning();
    
    return updatedTask;
  }
  
  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(schema.documents).where(eq(schema.documents.id, id));
    return document;
  }
  
  async getDocumentsByTask(taskId: number): Promise<Document[]> {
    return await db
      .select()
      .from(schema.documents)
      .where(eq(schema.documents.taskId, taskId))
      .orderBy(desc(schema.documents.uploadedAt));
  }
  
  async getRecentDocuments(dealId: number, limit: number): Promise<Document[]> {
    // Get documents for all tasks related to this deal, ordered by upload time
    return await db.select({
      id: schema.documents.id,
      taskId: schema.documents.taskId,
      fileName: schema.documents.fileName,
      fileSize: schema.documents.fileSize,
      fileType: schema.documents.fileType,
      content: schema.documents.content,
      uploadedBy: schema.documents.uploadedBy,
      uploadedAt: schema.documents.uploadedAt
    })
    .from(schema.documents)
    .innerJoin(schema.tasks, eq(schema.documents.taskId, schema.tasks.id))
    .where(eq(schema.tasks.dealId, dealId))
    .orderBy(desc(schema.documents.uploadedAt))
    .limit(limit);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const [document] = await db.insert(schema.documents).values(insertDocument).returning();
    return document;
  }
  
  async getRequest(id: number): Promise<Request | undefined> {
    const [request] = await db.select().from(schema.requests).where(eq(schema.requests.id, id));
    return request;
  }
  
  async getRequestsByTask(taskId: number): Promise<Request[]> {
    return await db
      .select()
      .from(schema.requests)
      .where(eq(schema.requests.taskId, taskId))
      .orderBy(desc(schema.requests.createdAt));
  }
  
  async getRequestsByDeal(dealId: number): Promise<Request[]> {
    return await db.select({
      id: schema.requests.id,
      taskId: schema.requests.taskId,
      requestId: schema.requests.requestId,
      requestType: schema.requests.requestType,
      details: schema.requests.details,
      status: schema.requests.status,
      recipient: schema.requests.recipient,
      sendDate: schema.requests.sendDate,
      priority: schema.requests.priority,
      createdBy: schema.requests.createdBy,
      createdAt: schema.requests.createdAt,
      responseDate: schema.requests.responseDate,
      response: schema.requests.response
    })
    .from(schema.requests)
    .innerJoin(schema.tasks, eq(schema.requests.taskId, schema.tasks.id))
    .where(eq(schema.tasks.dealId, dealId))
    .orderBy(desc(schema.requests.createdAt));
  }
  
  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const [request] = await db.insert(schema.requests).values(insertRequest).returning();
    return request;
  }
  
  async updateRequest(id: number, requestUpdate: Partial<InsertRequest>): Promise<Request | undefined> {
    // Set responseDate if status is being changed to answered
    const request = await this.getRequest(id);
    if (!request) return undefined;
    
    let responseDate = request.responseDate;
    if (requestUpdate.status === 'answered' && request.status !== 'answered') {
      responseDate = new Date();
    }
    
    const [updatedRequest] = await db
      .update(schema.requests)
      .set({ ...requestUpdate, responseDate })
      .where(eq(schema.requests.id, id))
      .returning();
    
    return updatedRequest;
  }
  
  async getRaciMatrix(taskId: number): Promise<RaciMatrix | undefined> {
    const [raci] = await db
      .select()
      .from(schema.raciMatrix)
      .where(eq(schema.raciMatrix.taskId, taskId));
    
    return raci;
  }
  
  async createRaciMatrix(insertRaci: InsertRaciMatrix): Promise<RaciMatrix> {
    const [raci] = await db.insert(schema.raciMatrix).values(insertRaci).returning();
    return raci;
  }
  
  async updateRaciMatrix(id: number, raciUpdate: Partial<InsertRaciMatrix>): Promise<RaciMatrix | undefined> {
    const [updatedRaci] = await db
      .update(schema.raciMatrix)
      .set(raciUpdate)
      .where(eq(schema.raciMatrix.id, id))
      .returning();
    
    return updatedRaci;
  }
  
  async getActivityLogsByDeal(dealId: number, limit: number): Promise<ActivityLog[]> {
    return await db
      .select()
      .from(schema.activityLogs)
      .where(eq(schema.activityLogs.dealId, dealId))
      .orderBy(desc(schema.activityLogs.timestamp))
      .limit(limit);
  }
  
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const [log] = await db.insert(schema.activityLogs).values(insertLog).returning();
    return log;
  }

  // Task Template operations
  async getTaskTemplate(id: number): Promise<TaskTemplate | undefined> {
    const [template] = await db
      .select()
      .from(schema.taskTemplates)
      .where(eq(schema.taskTemplates.id, id));
    
    return template;
  }
  
  async getTaskTemplates(): Promise<TaskTemplate[]> {
    return await db
      .select()
      .from(schema.taskTemplates)
      .orderBy(schema.taskTemplates.name);
  }
  
  async getDefaultTaskTemplate(): Promise<TaskTemplate | undefined> {
    const [template] = await db
      .select()
      .from(schema.taskTemplates)
      .where(eq(schema.taskTemplates.isDefault, true))
      .limit(1);
    
    return template;
  }
  
  async createTaskTemplate(template: InsertTaskTemplate): Promise<TaskTemplate> {
    const [newTemplate] = await db
      .insert(schema.taskTemplates)
      .values(template)
      .returning();
    
    return newTemplate;
  }
  
  async updateTaskTemplate(id: number, templateUpdate: Partial<InsertTaskTemplate>): Promise<TaskTemplate | undefined> {
    const [updatedTemplate] = await db
      .update(schema.taskTemplates)
      .set(templateUpdate)
      .where(eq(schema.taskTemplates.id, id))
      .returning();
    
    return updatedTemplate;
  }
  
  async deleteTaskTemplate(id: number): Promise<boolean> {
    // First, delete all template items
    await db
      .delete(schema.taskTemplateItems)
      .where(eq(schema.taskTemplateItems.templateId, id));
    
    // Then delete the template
    const result = await db
      .delete(schema.taskTemplates)
      .where(eq(schema.taskTemplates.id, id));
    
    return result.rowCount > 0;
  }
  
  // Task Template Item operations
  async getTaskTemplateItems(templateId: number): Promise<TaskTemplateItem[]> {
    return await db
      .select()
      .from(schema.taskTemplateItems)
      .where(eq(schema.taskTemplateItems.templateId, templateId))
      .orderBy(schema.taskTemplateItems.daysFromStart);
  }
  
  async createTaskTemplateItem(item: InsertTaskTemplateItem): Promise<TaskTemplateItem> {
    const [newItem] = await db
      .insert(schema.taskTemplateItems)
      .values(item)
      .returning();
    
    return newItem;
  }
  
  async updateTaskTemplateItem(id: number, itemUpdate: Partial<InsertTaskTemplateItem>): Promise<TaskTemplateItem | undefined> {
    const [updatedItem] = await db
      .update(schema.taskTemplateItems)
      .set(itemUpdate)
      .where(eq(schema.taskTemplateItems.id, id))
      .returning();
    
    return updatedItem;
  }
  
  async deleteTaskTemplateItem(id: number): Promise<boolean> {
    const result = await db
      .delete(schema.taskTemplateItems)
      .where(eq(schema.taskTemplateItems.id, id));
    
    return result.rowCount > 0;
  }
  
  // Apply template to a deal (creates tasks from template)
  async applyTemplateToProject(templateId: number, dealId: number): Promise<Task[]> {
    console.log(`[Template Application] Starting application of template ID ${templateId} to deal ID ${dealId}`);
    
    // Get the template
    const template = await this.getTaskTemplate(templateId);
    if (!template) {
      console.error(`[Template Application] Template with ID ${templateId} not found`);
      throw new Error("Template not found");
    }
    console.log(`[Template Application] Found template: "${template.name}"`);
    
    // Get the deal to access its start date
    const deal = await this.getDeal(dealId);
    if (!deal) {
      console.error(`[Template Application] Deal with ID ${dealId} not found`);
      throw new Error("Deal not found");
    }
    console.log(`[Template Application] Found deal: "${deal.name}" with start date: ${deal.startDate}`);
    
    // Get all template items
    const templateItems = await this.getTaskTemplateItems(templateId);
    console.log(`[Template Application] Found ${templateItems.length} template items to process`);
    
    if (templateItems.length === 0) {
      console.warn(`[Template Application] No items found for template ID ${templateId}`);
      return [];
    }
    
    // Create tasks from template items
    const createdTasks: Task[] = [];
    
    for (const item of templateItems) {
      try {
        console.log(`[Template Application] Processing template item: "${item.title}", phase: ${item.phase}, category: ${item.category}, days from start: ${item.daysFromStart}`);
        
        // Calculate due date based on deal start date and days from start
        let dueDate: Date | null = null;
        
        if (deal.startDate) {
          const startDate = new Date(deal.startDate);
          dueDate = new Date(startDate);
          dueDate.setDate(startDate.getDate() + item.daysFromStart);
          console.log(`[Template Application] Calculated due date: ${dueDate.toISOString()} (${item.daysFromStart} days from start date ${startDate.toISOString()})`);
        } else {
          console.log(`[Template Application] No start date for deal, setting due date to null`);
        }
        
        // Create the task with the calculated due date
        const taskData: InsertTask = {
          dealId,
          title: item.title,
          description: item.description || null,
          phase: item.phase,
          category: item.category,
          status: schema.TaskStatuses.NOT_STARTED,
          assignedTo: item.assignedTo || null,
        };
        
        // Only add the dueDate if it's not null
        if (dueDate) {
          taskData.dueDate = dueDate.toISOString();
        }
        
        console.log(`[Template Application] Creating task with data:`, JSON.stringify(taskData));
        const task = await this.createTask(taskData);
        console.log(`[Template Application] Successfully created task ID ${task.id}: "${task.title}"`);
        
        createdTasks.push(task);
      } catch (error) {
        console.error(`[Template Application] Error creating task from template item "${item.title}":`, error);
        // Continue with other items even if one fails
      }
    }
    
    console.log(`[Template Application] Completed template application, created ${createdTasks.length} tasks`);
    return createdTasks;
  }
}

export const storage = new DatabaseStorage();
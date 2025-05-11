import { 
  users, type User, type InsertUser,
  deals, type Deal, type InsertDeal,
  tasks, type Task, type InsertTask,
  documents, type Document, type InsertDocument,
  requests, type Request, type InsertRequest,
  raciMatrix, type RaciMatrix, type InsertRaciMatrix,
  activityLogs, type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  
  // Session store
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private deals: Map<number, Deal>;
  private tasks: Map<number, Task>;
  private documents: Map<number, Document>;
  private requests: Map<number, Request>;
  private raciMatrices: Map<number, RaciMatrix>;
  private activityLogs: Map<number, ActivityLog>;
  
  userCurrentId: number;
  dealCurrentId: number;
  taskCurrentId: number;
  documentCurrentId: number;
  requestCurrentId: number;
  raciCurrentId: number;
  activityLogCurrentId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.deals = new Map();
    this.tasks = new Map();
    this.documents = new Map();
    this.requests = new Map();
    this.raciMatrices = new Map();
    this.activityLogs = new Map();
    
    this.userCurrentId = 1;
    this.dealCurrentId = 1;
    this.taskCurrentId = 1;
    this.documentCurrentId = 1;
    this.requestCurrentId = 1;
    this.raciCurrentId = 1;
    this.activityLogCurrentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
    
    // Seed some initial users
    this.seedInitialData();
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userCurrentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  // Deal operations
  async getDeal(id: number): Promise<Deal | undefined> {
    return this.deals.get(id);
  }
  
  async getDeals(): Promise<Deal[]> {
    return Array.from(this.deals.values());
  }
  
  async createDeal(insertDeal: InsertDeal): Promise<Deal> {
    const id = this.dealCurrentId++;
    const deal: Deal = { 
      ...insertDeal, 
      id, 
      createdAt: new Date() 
    };
    this.deals.set(id, deal);
    return deal;
  }
  
  async updateDeal(id: number, dealUpdate: Partial<InsertDeal>): Promise<Deal | undefined> {
    const deal = this.deals.get(id);
    if (!deal) return undefined;
    
    const updatedDeal = { ...deal, ...dealUpdate };
    this.deals.set(id, updatedDeal);
    return updatedDeal;
  }
  
  // Task operations
  async getTask(id: number): Promise<Task | undefined> {
    return this.tasks.get(id);
  }
  
  async getTasksByDeal(dealId: number): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.dealId === dealId,
    );
  }
  
  async getTasksByPhase(dealId: number, phase: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.dealId === dealId && task.phase === phase,
    );
  }
  
  async createTask(insertTask: InsertTask): Promise<Task> {
    const id = this.taskCurrentId++;
    const task: Task = { 
      ...insertTask, 
      id, 
      createdAt: new Date(),
      completedAt: null 
    };
    this.tasks.set(id, task);
    return task;
  }
  
  async updateTask(id: number, taskUpdate: Partial<InsertTask>): Promise<Task | undefined> {
    const task = this.tasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...taskUpdate };
    
    // If status is being updated to "completed", set completedAt
    if (taskUpdate.status === "completed" && task.status !== "completed") {
      updatedTask.completedAt = new Date();
    }
    
    this.tasks.set(id, updatedTask);
    return updatedTask;
  }
  
  // Document operations
  async getDocument(id: number): Promise<Document | undefined> {
    return this.documents.get(id);
  }
  
  async getDocumentsByTask(taskId: number): Promise<Document[]> {
    return Array.from(this.documents.values()).filter(
      (doc) => doc.taskId === taskId,
    );
  }
  
  async getRecentDocuments(dealId: number, limit: number): Promise<Document[]> {
    // Get all tasks for the deal
    const dealTasks = await this.getTasksByDeal(dealId);
    const taskIds = dealTasks.map(task => task.id);
    
    // Get all documents for those tasks
    const dealDocs = Array.from(this.documents.values()).filter(
      (doc) => taskIds.includes(doc.taskId),
    );
    
    // Sort by uploadedAt descending and limit
    return dealDocs
      .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
      .slice(0, limit);
  }
  
  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = this.documentCurrentId++;
    const document: Document = { 
      ...insertDocument, 
      id, 
      uploadedAt: new Date() 
    };
    this.documents.set(id, document);
    return document;
  }
  
  // Request operations
  async getRequest(id: number): Promise<Request | undefined> {
    return this.requests.get(id);
  }
  
  async getRequestsByTask(taskId: number): Promise<Request[]> {
    return Array.from(this.requests.values()).filter(
      (req) => req.taskId === taskId,
    );
  }
  
  async getRequestsByDeal(dealId: number): Promise<Request[]> {
    // Get all tasks for the deal
    const dealTasks = await this.getTasksByDeal(dealId);
    const taskIds = dealTasks.map(task => task.id);
    
    // Get all requests for those tasks
    return Array.from(this.requests.values()).filter(
      (req) => taskIds.includes(req.taskId),
    );
  }
  
  async createRequest(insertRequest: InsertRequest): Promise<Request> {
    const id = this.requestCurrentId++;
    const request: Request = { 
      ...insertRequest, 
      id, 
      createdAt: new Date(),
      responseDate: null,
      response: null
    };
    this.requests.set(id, request);
    return request;
  }
  
  async updateRequest(id: number, requestUpdate: Partial<InsertRequest>): Promise<Request | undefined> {
    const request = this.requests.get(id);
    if (!request) return undefined;
    
    const updatedRequest = { ...request, ...requestUpdate };
    this.requests.set(id, updatedRequest);
    return updatedRequest;
  }
  
  // RACI Matrix operations
  async getRaciMatrix(taskId: number): Promise<RaciMatrix | undefined> {
    return Array.from(this.raciMatrices.values()).find(
      (raci) => raci.taskId === taskId,
    );
  }
  
  async createRaciMatrix(insertRaci: InsertRaciMatrix): Promise<RaciMatrix> {
    const id = this.raciCurrentId++;
    const raci: RaciMatrix = { ...insertRaci, id };
    this.raciMatrices.set(id, raci);
    return raci;
  }
  
  async updateRaciMatrix(id: number, raciUpdate: Partial<InsertRaciMatrix>): Promise<RaciMatrix | undefined> {
    const raci = this.raciMatrices.get(id);
    if (!raci) return undefined;
    
    const updatedRaci = { ...raci, ...raciUpdate };
    this.raciMatrices.set(id, updatedRaci);
    return updatedRaci;
  }
  
  // Activity Log operations
  async getActivityLogsByDeal(dealId: number, limit: number): Promise<ActivityLog[]> {
    return Array.from(this.activityLogs.values())
      .filter((log) => log.dealId === dealId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  async createActivityLog(insertLog: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogCurrentId++;
    const log: ActivityLog = { 
      ...insertLog, 
      id, 
      timestamp: new Date() 
    };
    this.activityLogs.set(id, log);
    return log;
  }
  
  // Helper to seed initial data
  private seedInitialData() {
    // Seed users
    const users = [
      {
        username: "sarah.johnson@example.com",
        password: "password123", // This will be hashed in auth.ts
        name: "Sarah Johnson",
        role: "deal_lead",
        specialization: null,
      },
      {
        username: "michael.reynolds@example.com",
        password: "password123",
        name: "Michael Reynolds",
        role: "functional_lead",
        specialization: "financial",
      },
      {
        username: "amanda.lee@example.com",
        password: "password123",
        name: "Amanda Lee",
        role: "functional_lead",
        specialization: "legal",
      },
      {
        username: "tom.wilson@example.com",
        password: "password123",
        name: "Tom Wilson",
        role: "functional_lead",
        specialization: "operations",
      },
      {
        username: "james.partner@example.com",
        password: "password123",
        name: "James Partner",
        role: "partner",
        specialization: null,
      },
    ];
    
    for (const user of users) {
      this.createUser(user as InsertUser);
    }
    
    // We'll add more seed data in the routes.ts file after authentication is set up
  }
}

export const storage = new MemStorage();

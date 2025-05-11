import { pgTable, text, serial, integer, boolean, timestamp, json, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull(), // "deal_lead", "functional_lead", "partner"
  specialization: text("specialization"), // For functional leads: "financial", "legal", "operations"
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  role: true,
  specialization: true,
});

// Deals model
export const deals = pgTable("deals", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(), // "active", "completed", "cancelled"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDealSchema = createInsertSchema(deals).pick({
  name: true,
  status: true,
});

// Tasks model
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  phase: text("phase").notNull(), // "loi", "document", "deepdive", "final"
  category: text("category").notNull(), // "financial", "legal", "operations", "hr", "tech"
  status: text("status").notNull(), // "not_started", "in_progress", "pending", "completed"
  dueDate: timestamp("due_date"),
  assignedTo: integer("assigned_to"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertTaskSchema = createInsertSchema(tasks).pick({
  dealId: true,
  title: true,
  description: true,
  phase: true,
  category: true,
  status: true,
  dueDate: true,
  assignedTo: true,
});

// Documents model
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  fileName: text("file_name").notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: text("file_type").notNull(),
  content: text("content").notNull(), // For the purpose of this prototype, store content as text
  uploadedBy: integer("uploaded_by").notNull(),
  uploadedAt: timestamp("uploaded_at").notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  taskId: true,
  fileName: true,
  fileSize: true,
  fileType: true,
  content: true,
  uploadedBy: true,
});

// Requests model
export const requests = pgTable("requests", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").notNull(),
  requestId: text("request_id").notNull(), // Custom ID like "FR-2023-001"
  requestType: text("request_type").notNull(), // "information", "clarification", "document", "meeting"
  details: text("details").notNull(),
  status: text("status").notNull(), // "pending", "sent", "awaiting_response", "answered"
  recipient: text("recipient").notNull(), // "seller", "management", "advisor", "legal"
  sendDate: timestamp("send_date"),
  priority: integer("priority").notNull(), // 1, 2, 3 (low, medium, high)
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  responseDate: timestamp("response_date"),
  response: text("response"),
});

export const insertRequestSchema = createInsertSchema(requests).pick({
  taskId: true,
  requestId: true,
  requestType: true,
  details: true,
  status: true,
  recipient: true,
  sendDate: true,
  priority: true,
  createdBy: true,
});

// RACI Matrix model
export const raciMatrix = pgTable("raci_matrix", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  taskId: integer("task_id").notNull(),
  responsible: integer("responsible"), // User ID who is responsible
  accountable: integer("accountable"), // User ID who is accountable
  consulted: json("consulted").notNull(), // Array of User IDs who are consulted
  informed: json("informed").notNull(), // Array of User IDs who are informed
});

export const insertRaciMatrixSchema = createInsertSchema(raciMatrix).pick({
  dealId: true,
  taskId: true,
  responsible: true,
  accountable: true,
  consulted: true,
  informed: true,
});

// Activity Log model
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  dealId: integer("deal_id").notNull(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // "created", "updated", "completed", "uploaded", etc.
  entityType: text("entity_type").notNull(), // "task", "document", "request", etc.
  entityId: integer("entity_id").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertActivityLogSchema = createInsertSchema(activityLogs).pick({
  dealId: true,
  userId: true,
  action: true,
  entityType: true,
  entityId: true,
  details: true,
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  assignedTasks: many(tasks, { relationName: "user_tasks" }),
  uploadedDocuments: many(documents),
  createdRequests: many(requests),
  activityLogs: many(activityLogs),
}));

export const dealsRelations = relations(deals, ({ many }) => ({
  tasks: many(tasks),
  raciMatrices: many(raciMatrix),
  activityLogs: many(activityLogs),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  deal: one(deals, {
    fields: [tasks.dealId],
    references: [deals.id],
  }),
  assignee: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
    relationName: "user_tasks",
  }),
  documents: many(documents),
  requests: many(requests),
  raciMatrix: one(raciMatrix, {
    fields: [tasks.id],
    references: [raciMatrix.taskId],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  task: one(tasks, {
    fields: [documents.taskId],
    references: [tasks.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const requestsRelations = relations(requests, ({ one }) => ({
  task: one(tasks, {
    fields: [requests.taskId],
    references: [tasks.id],
  }),
  creator: one(users, {
    fields: [requests.createdBy],
    references: [users.id],
  }),
}));

export const raciMatrixRelations = relations(raciMatrix, ({ one }) => ({
  deal: one(deals, {
    fields: [raciMatrix.dealId],
    references: [deals.id],
  }),
  task: one(tasks, {
    fields: [raciMatrix.taskId],
    references: [tasks.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  deal: one(deals, {
    fields: [activityLogs.dealId],
    references: [deals.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Deal = typeof deals.$inferSelect;
export type InsertDeal = z.infer<typeof insertDealSchema>;

export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type Request = typeof requests.$inferSelect;
export type InsertRequest = z.infer<typeof insertRequestSchema>;

export type RaciMatrix = typeof raciMatrix.$inferSelect;
export type InsertRaciMatrix = z.infer<typeof insertRaciMatrixSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;

// Enums for consistent reference
export const UserRoles = {
  DEAL_LEAD: "deal_lead",
  FUNCTIONAL_LEAD: "functional_lead",
  PARTNER: "partner",
} as const;

export const TaskPhases = {
  LOI: "loi",
  DOCUMENT: "document",
  DEEPDIVE: "deepdive",
  FINAL: "final",
} as const;

export const TaskCategories = {
  FINANCIAL: "financial",
  LEGAL: "legal",
  OPERATIONS: "operations",
  HR: "hr",
  TECH: "tech",
} as const;

export const TaskStatuses = {
  NOT_STARTED: "not_started",
  IN_PROGRESS: "in_progress",
  PENDING: "pending",
  COMPLETED: "completed",
} as const;

export const RequestTypes = {
  INFORMATION: "information",
  CLARIFICATION: "clarification",
  DOCUMENT: "document",
  MEETING: "meeting",
} as const;

export const RequestStatuses = {
  PENDING: "pending",
  SENT: "sent",
  AWAITING_RESPONSE: "awaiting_response",
  ANSWERED: "answered",
} as const;

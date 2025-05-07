import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Since we're storing all data locally in the browser, we don't need server-side models
// But we'll define our data models here for consistency and type safety

export const medicationSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  instructions: z.string().optional(),
  imageUrl: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const scheduleSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  frequency: z.enum(["daily", "multiple_daily", "specific_days", "every_x_days", "as_needed"]),
  times: z.array(z.string()),
  specificDays: z.array(z.number()).optional(),
  everyXDays: z.number().optional(),
  startDate: z.date(),
  endDate: z.date().optional(),
  active: z.boolean().default(true),
});

export const doseSchema = z.object({
  id: z.string(),
  medicationId: z.string(),
  scheduleId: z.string(),
  status: z.enum(["pending", "taken", "missed", "snoozed"]),
  scheduledTime: z.date(),
  actualTime: z.date().optional(),
  snoozeCount: z.number().default(0),
});

export type Medication = z.infer<typeof medicationSchema>;
export type Schedule = z.infer<typeof scheduleSchema>;
export type Dose = z.infer<typeof doseSchema>;

// For form validation with react-hook-form
export const medicationFormSchema = z.object({
  name: z.string().min(1, "Medication name is required"),
  dosage: z.string().min(1, "Dosage is required"),
  instructions: z.string().optional(),
});

export const scheduleFormSchema = z.object({
  frequency: z.enum(["daily", "multiple_daily", "specific_days", "every_x_days", "as_needed"]),
  times: z.array(z.string()).min(1, "At least one time is required"),
  specificDays: z.array(z.number()).optional(),
  everyXDays: z.number().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  enableReminders: z.boolean().default(true),
});

// The existing users table is kept for compatibility but not used in this application
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

import { z } from 'zod';

export const ROLES = ['admin', 'teacher', 'student'] as const;
export const roleSchema = z.enum(ROLES);
export type Role = (typeof ROLES)[number];

export const SUBMISSION_STATUSES = ['submitted', 'graded'] as const;
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number];

// Derived state shown in the UI (not stored)
export type AssignmentState =
  | 'not_started'
  | 'submitted'
  | 'graded'
  | 'due_soon'
  | 'late'
  | 'missing';

const id = z.string().uuid();
const email = z.string().email();
const name = z.string().min(1).max(120);

// ---- Auth ----
export const loginSchema = z.object({
  email,
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof loginSchema>;

// ---- Users (admin) ----
export const createUserSchema = z.object({
  email,
  name,
  role: roleSchema,
  password: z.string().min(8).max(200),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z.object({
  name: name.optional(),
  role: roleSchema.optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// ---- Teacher groups (admin) ----
export const teacherGroupSchema = z.object({
  name,
  teacherIds: z.array(id).default([]),
});
export type TeacherGroupInput = z.infer<typeof teacherGroupSchema>;

// ---- Classes (teacher) ----
export const classSchema = z.object({ name });
export type ClassInput = z.infer<typeof classSchema>;

export const enrollmentSchema = z.object({ studentId: id });
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;

// ---- Assignments (teacher) ----
export const assignmentSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).default(''),
  dueAt: z.string().datetime(),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

// ---- Submissions (student) ----
export const submissionSchema = z.object({
  content: z.string().min(1).max(20000),
});
export type SubmissionInput = z.infer<typeof submissionSchema>;

// ---- Grading (teacher) ----
export const gradeSchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string().max(5000).default(''),
});
export type GradeInput = z.infer<typeof gradeSchema>;

// ---- Chatbot ----
export const chatSchema = z.object({
  message: z.string().min(1).max(2000),
});
export type ChatInput = z.infer<typeof chatSchema>;

// ---- Response DTOs (shared with web) ----
export interface UserDTO {
  id: string;
  email: string;
  name: string;
  role: Role;
  suspended: boolean;
}

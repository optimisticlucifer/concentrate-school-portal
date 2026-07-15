import type { AssignmentState } from '@concentrate/shared';

export interface StudentAssignment {
  id: string;
  title: string;
  description: string;
  className: string;
  dueAt: string;
  state: AssignmentState;
  content: string | null;
  score: number | null;
  feedback: string | null;
}

export interface StudentDashboard {
  assignments: StudentAssignment[];
  average: number | null;
  classes: { id: string; name: string; teacherName: string }[];
}

export interface TeacherClass {
  id: string;
  name: string;
  teacherId: string;
  studentCount: number;
}

export interface TeacherDashboard {
  classes: TeacherClass[];
  pending: number;
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueAt: string;
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
  status: 'submitted' | 'graded';
  score: number | null;
  feedback: string | null;
}

export interface Person {
  id: string;
  name: string;
  email: string;
}

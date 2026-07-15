import type { ColumnType, Generated } from 'kysely';
import type { Role, SubmissionStatus } from '@concentrate/shared';

type Timestamp = ColumnType<Date, string | Date | undefined, string | Date>;

interface UsersTable {
  id: Generated<string>;
  email: string;
  name: string;
  role: Role;
  password_hash: string | null;
  oauth_provider: string | null;
  oauth_subject: string | null;
  suspended: ColumnType<boolean, boolean | undefined, boolean>;
  created_at: Timestamp;
}

interface TeacherGroupsTable {
  id: Generated<string>;
  name: string;
  created_at: Timestamp;
}

interface TeacherGroupMembersTable {
  group_id: string;
  teacher_id: string;
}

interface ClassesTable {
  id: Generated<string>;
  name: string;
  teacher_id: string;
  created_at: Timestamp;
}

interface EnrollmentsTable {
  class_id: string;
  student_id: string;
}

interface AssignmentsTable {
  id: Generated<string>;
  class_id: string;
  title: string;
  description: string;
  due_at: Timestamp;
  created_at: Timestamp;
}

interface SubmissionsTable {
  id: Generated<string>;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: Timestamp;
  status: SubmissionStatus;
}

interface GradesTable {
  submission_id: string;
  score: number;
  feedback: string;
  graded_at: Timestamp;
}

export interface Database {
  users: UsersTable;
  teacher_groups: TeacherGroupsTable;
  teacher_group_members: TeacherGroupMembersTable;
  classes: ClassesTable;
  enrollments: EnrollmentsTable;
  assignments: AssignmentsTable;
  submissions: SubmissionsTable;
  grades: GradesTable;
}

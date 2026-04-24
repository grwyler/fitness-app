import type { EnrollmentStatus } from "@fitness/shared";

export type EnrollmentRecord = {
  id: string;
  userId: string;
  programId: string;
  status: EnrollmentStatus;
  startedAt: Date;
  completedAt: Date | null;
  currentWorkoutTemplateId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UpdateEnrollmentNextTemplateInput = {
  enrollmentId: string;
  nextWorkoutTemplateId: string;
};


import type { ProgressionAggressiveness, TrainingBlockStatus, TrainingGoal } from "@fitness/shared";
import type { RepositoryOptions } from "../models/persistence-context.js";

export type TrainingBlockRecord = {
  id: string;
  userId: string;
  programId: string;
  programTrainingContextId: string | null;
  name: string;
  goalType: TrainingGoal | null;
  source: "manual";
  status: TrainingBlockStatus;
  startDate: Date;
  plannedWeeks: number;
  targetWorkoutsPerWeek: number;
  progressionStyle: ProgressionAggressiveness | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateTrainingBlockInput = {
  userId: string;
  programId: string;
  programTrainingContextId?: string | null;
  name: string;
  goalType: TrainingGoal | null;
  source: "manual";
  status: TrainingBlockStatus;
  startDate: Date;
  plannedWeeks: number;
  targetWorkoutsPerWeek: number;
  progressionStyle: ProgressionAggressiveness | null;
};

export type UpdateTrainingBlockInput = Partial<Pick<
  TrainingBlockRecord,
  "programTrainingContextId" | "name" | "goalType" | "status" | "plannedWeeks" | "targetWorkoutsPerWeek" | "progressionStyle"
>>;

export interface TrainingBlockRepository {
  findActiveByUserProgram(
    input: { userId: string; programId: string },
    options?: RepositoryOptions
  ): Promise<TrainingBlockRecord | null>;

  create(input: CreateTrainingBlockInput, options?: RepositoryOptions): Promise<TrainingBlockRecord>;

  updateById(id: string, input: UpdateTrainingBlockInput, options?: RepositoryOptions): Promise<TrainingBlockRecord>;
}


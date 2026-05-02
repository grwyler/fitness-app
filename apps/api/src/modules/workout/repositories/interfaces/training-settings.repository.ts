import type {
  ExperienceLevel,
  ProgressionAggressiveness,
  ProgressionConfidence,
  RecoveryState,
  TrainingGoal,
  UnitSystem
} from "@fitness/shared";
import type { RepositoryOptions } from "../models/persistence-context.js";

export type UserTrainingSettingsRecord = {
  userId: string;
  trainingGoal: TrainingGoal | null;
  experienceLevel: ExperienceLevel | null;
  unitSystem: UnitSystem;
  progressionAggressiveness: ProgressionAggressiveness;
  defaultBarbellIncrementLbs: number;
  defaultDumbbellIncrementLbs: number;
  defaultMachineIncrementLbs: number;
  defaultCableIncrementLbs: number;
  useRecoveryAdjustments: boolean;
  defaultRecoveryState: RecoveryState;
  allowAutoDeload: boolean;
  allowRecalibration: boolean;
  preferRepProgressionBeforeWeight: boolean;
  minimumConfidenceForIncrease: ProgressionConfidence;
};

export type UpdateUserTrainingSettingsInput = Partial<Omit<UserTrainingSettingsRecord, "userId">>;

export interface TrainingSettingsRepository {
  findOrCreateByUserId(userId: string, options?: RepositoryOptions): Promise<UserTrainingSettingsRecord>;
  updateByUserId(
    userId: string,
    update: UpdateUserTrainingSettingsInput,
    options?: RepositoryOptions
  ): Promise<UserTrainingSettingsRecord>;
}


import { userTrainingSettings, users } from "@fitness/db";
import { and, eq, normalizeNumeric, resolveExecutor } from "../db/drizzle-helpers.js";
import type {
  TrainingSettingsRepository,
  UpdateUserTrainingSettingsInput,
  UserTrainingSettingsRecord
} from "../../repositories/interfaces/training-settings.repository.js";
import type { RepositoryOptions } from "../../repositories/models/persistence-context.js";

function mapRow(row: any): UserTrainingSettingsRecord {
  return {
    userId: row.userId,
    trainingGoal: row.trainingGoal ?? null,
    experienceLevel: row.experienceLevel ?? null,
    unitSystem: row.unitSystem,
    progressionAggressiveness: row.progressionAggressiveness,
    defaultBarbellIncrementLbs: normalizeNumeric(row.defaultBarbellIncrementLbs),
    defaultDumbbellIncrementLbs: normalizeNumeric(row.defaultDumbbellIncrementLbs),
    defaultMachineIncrementLbs: normalizeNumeric(row.defaultMachineIncrementLbs),
    defaultCableIncrementLbs: normalizeNumeric(row.defaultCableIncrementLbs),
    useRecoveryAdjustments: row.useRecoveryAdjustments,
    defaultRecoveryState: row.defaultRecoveryState,
    allowAutoDeload: row.allowAutoDeload,
    allowRecalibration: row.allowRecalibration,
    preferRepProgressionBeforeWeight: row.preferRepProgressionBeforeWeight,
    minimumConfidenceForIncrease: row.minimumConfidenceForIncrease
  };
}

export class DrizzleTrainingSettingsRepository implements TrainingSettingsRepository {
  public constructor(private readonly db: any) {}

  public async findOrCreateByUserId(userId: string, options?: RepositoryOptions): Promise<UserTrainingSettingsRecord> {
    const executor = resolveExecutor(this.db, options);

    await executor
      .insert(userTrainingSettings)
      .values({
        userId
      })
      .onConflictDoNothing({
        target: userTrainingSettings.userId
      });

    const rows = await executor
      .select({
        userId: users.id,
        trainingGoal: users.trainingGoal,
        experienceLevel: users.experienceLevel,
        unitSystem: users.unitSystem,
        deletedAt: users.deletedAt,
        progressionAggressiveness: userTrainingSettings.progressionAggressiveness,
        defaultBarbellIncrementLbs: userTrainingSettings.defaultBarbellIncrementLbs,
        defaultDumbbellIncrementLbs: userTrainingSettings.defaultDumbbellIncrementLbs,
        defaultMachineIncrementLbs: userTrainingSettings.defaultMachineIncrementLbs,
        defaultCableIncrementLbs: userTrainingSettings.defaultCableIncrementLbs,
        useRecoveryAdjustments: userTrainingSettings.useRecoveryAdjustments,
        defaultRecoveryState: userTrainingSettings.defaultRecoveryState,
        allowAutoDeload: userTrainingSettings.allowAutoDeload,
        allowRecalibration: userTrainingSettings.allowRecalibration,
        preferRepProgressionBeforeWeight: userTrainingSettings.preferRepProgressionBeforeWeight,
        minimumConfidenceForIncrease: userTrainingSettings.minimumConfidenceForIncrease
      })
      .from(users)
      .innerJoin(userTrainingSettings, eq(userTrainingSettings.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);

    const [row] = rows;
    if (!row) {
      throw new Error("Unable to resolve user training settings.");
    }

    if (row.deletedAt) {
      throw new Error("Unable to resolve user training settings.");
    }

    return mapRow(row);
  }

  public async updateByUserId(
    userId: string,
    update: UpdateUserTrainingSettingsInput,
    options?: RepositoryOptions
  ): Promise<UserTrainingSettingsRecord> {
    const executor = resolveExecutor(this.db, options);

    await executor
      .insert(userTrainingSettings)
      .values({ userId })
      .onConflictDoNothing({
        target: userTrainingSettings.userId
      });

    const { trainingGoal, experienceLevel, unitSystem, ...settingsUpdate } = update;

    if (trainingGoal !== undefined || experienceLevel !== undefined || unitSystem !== undefined) {
      await executor
        .update(users)
        .set({
          trainingGoal: trainingGoal === undefined ? undefined : trainingGoal,
          experienceLevel: experienceLevel === undefined ? undefined : experienceLevel,
          unitSystem: unitSystem === undefined ? undefined : unitSystem
        })
        .where(eq(users.id, userId));
    }

    const hasSettingsUpdate = Object.keys(settingsUpdate).length > 0;
    if (hasSettingsUpdate) {
      await executor
        .update(userTrainingSettings)
        .set({
          progressionAggressiveness: settingsUpdate.progressionAggressiveness,
          defaultBarbellIncrementLbs: settingsUpdate.defaultBarbellIncrementLbs,
          defaultDumbbellIncrementLbs: settingsUpdate.defaultDumbbellIncrementLbs,
          defaultMachineIncrementLbs: settingsUpdate.defaultMachineIncrementLbs,
          defaultCableIncrementLbs: settingsUpdate.defaultCableIncrementLbs,
          useRecoveryAdjustments: settingsUpdate.useRecoveryAdjustments,
          defaultRecoveryState: settingsUpdate.defaultRecoveryState,
          allowAutoDeload: settingsUpdate.allowAutoDeload,
          allowRecalibration: settingsUpdate.allowRecalibration,
          preferRepProgressionBeforeWeight: settingsUpdate.preferRepProgressionBeforeWeight,
          minimumConfidenceForIncrease: settingsUpdate.minimumConfidenceForIncrease,
          updatedAt: new Date()
        })
        .where(eq(userTrainingSettings.userId, userId));
    }

    return this.findOrCreateByUserId(userId, options);
  }
}

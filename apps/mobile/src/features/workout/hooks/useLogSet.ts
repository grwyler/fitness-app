import type { GetCurrentWorkoutSessionResponse, LogSetRequest, SetDto } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logSet } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { isMaterialOverperformanceLog } from "../utils/set-logging.shared";
import { workoutQueryKeys } from "./query-keys";

function applyLoggedSet(
  currentWorkout: GetCurrentWorkoutSessionResponse | undefined,
  input: {
    setId: string;
    request: LogSetRequest;
    completedAt: string;
  }
): GetCurrentWorkoutSessionResponse | undefined {
  if (!currentWorkout?.activeWorkoutSession) {
    return currentWorkout;
  }

  return {
    activeWorkoutSession: {
      ...currentWorkout.activeWorkoutSession,
      exercises: currentWorkout.activeWorkoutSession.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set): SetDto => {
          if (set.id !== input.setId) {
            return set;
          }

          const modality = exercise.loggingModality;
          const completedAt = input.request.completedAt ?? input.completedAt;
          const setType = input.request.setType ?? set.setType;

          if (modality === "reps_load" || modality === "reps_only") {
            const actualReps = input.request.actualReps ?? set.actualReps ?? null;
            const actualWeight = input.request.actualWeight ?? set.actualWeight ?? set.targetWeight ?? null;

            const targetReps = set.targetReps ?? null;
            const targetWeightValue = set.targetWeight?.value ?? null;
            const actualWeightValue = actualWeight?.value ?? null;

            const isOverperformanceSet =
              modality === "reps_load" &&
              typeof actualReps === "number" &&
              actualWeightValue !== null &&
              targetWeightValue !== null
                ? isMaterialOverperformanceLog({
                    actualReps,
                    actualWeightValue,
                    targetWeightValue
                  })
                : false;

            const status =
              targetReps === null || actualReps === null
                ? "completed"
                : actualReps >= targetReps || isOverperformanceSet
                  ? "completed"
                  : "failed";

            return {
              ...set,
              setType,
              actualReps,
              actualWeight,
              completedAt,
              status
            };
          }

          return {
            ...set,
            setType,
            actualReps: null,
            actualWeight: null,
            actualDurationSeconds: input.request.durationSeconds ?? set.actualDurationSeconds ?? null,
            actualDistanceMeters: input.request.distanceMeters ?? set.actualDistanceMeters ?? null,
            actualRounds: input.request.rounds ?? set.actualRounds ?? null,
            completedAt,
            status: "completed"
          };
        })
      }))
    }
  };
}

export function useLogSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const clearSetLogDraft = useActiveWorkoutStore((state) => state.clearSetLogDraft);

  return useMutation({
    mutationFn: async (input: { setId: string; request: LogSetRequest }) => {
      const scope = `log-set:${input.setId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await logSet({
        setId: input.setId,
        request: input.request,
        idempotencyKey
      });
      return {
        response,
        input,
        scope
      };
    },
    async onMutate(input) {
      await queryClient.cancelQueries({ queryKey: workoutQueryKeys.currentWorkout });
      const previousCurrentWorkout = queryClient.getQueryData<GetCurrentWorkoutSessionResponse>(
        workoutQueryKeys.currentWorkout
      );
      queryClient.setQueryData<GetCurrentWorkoutSessionResponse>(
        workoutQueryKeys.currentWorkout,
        applyLoggedSet(previousCurrentWorkout, {
          setId: input.setId,
          request: input.request,
          completedAt: new Date().toISOString()
        })
      );

      return {
        previousCurrentWorkout
      };
    },
    onError(_error, _input, context) {
      if (context?.previousCurrentWorkout) {
        queryClient.setQueryData(workoutQueryKeys.currentWorkout, context.previousCurrentWorkout);
      }
    },
    onSuccess(result) {
      clearMutationKey(result.scope);
      clearSetLogDraft(result.input.setId);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
    }
  });
}

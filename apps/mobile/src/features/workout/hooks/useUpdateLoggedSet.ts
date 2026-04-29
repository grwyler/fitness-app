import type { GetCurrentWorkoutSessionResponse, LogSetRequest, SetDto } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateLoggedSet } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { isMaterialOverperformanceLog } from "../utils/set-logging.shared";
import { workoutQueryKeys } from "./query-keys";

function applyUpdatedSet(
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

          const actualWeight = input.request.actualWeight ?? set.actualWeight ?? set.targetWeight;
          const isOverperformanceSet = isMaterialOverperformanceLog({
            actualReps: input.request.actualReps,
            actualWeightValue: actualWeight.value,
            targetWeightValue: set.targetWeight.value
          });

          return {
            ...set,
            actualReps: input.request.actualReps,
            actualWeight,
            completedAt: input.request.completedAt ?? set.completedAt ?? input.completedAt,
            status: input.request.actualReps >= set.targetReps || isOverperformanceSet ? "completed" : "failed"
          };
        })
      }))
    }
  };
}

export function useUpdateLoggedSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const clearSetLogDraft = useActiveWorkoutStore((state) => state.clearSetLogDraft);

  return useMutation({
    mutationFn: async (input: { setId: string; request: LogSetRequest }) => {
      const scope = `update-logged-set:${input.setId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await updateLoggedSet({
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
        applyUpdatedSet(previousCurrentWorkout, {
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


import type { AddCustomWorkoutExerciseRequest, GetCurrentWorkoutSessionResponse } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addCustomWorkoutExercise } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export const CUSTOM_WORKOUT_DEFAULT_TARGET_SETS = 3;
export const CUSTOM_WORKOUT_DEFAULT_TARGET_REPS = 8;

export function buildDefaultCustomWorkoutExerciseRequest(
  exerciseId: string
): AddCustomWorkoutExerciseRequest {
  return {
    exerciseId,
    targetSets: CUSTOM_WORKOUT_DEFAULT_TARGET_SETS,
    targetReps: CUSTOM_WORKOUT_DEFAULT_TARGET_REPS
  };
}

export function useAddCustomWorkoutExercise() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);

  return useMutation({
    mutationFn: async (input: { sessionId: string; request: AddCustomWorkoutExerciseRequest }) => {
      const request = input.request;
      const scope = `add-custom-workout-exercise:${input.sessionId}:${request.exerciseId}`;
      const idempotencyKey = getMutationKey(scope, request);
      const response = await addCustomWorkoutExercise({
        sessionId: input.sessionId,
        request,
        idempotencyKey
      });

      return {
        response,
        scope
      };
    },
    onSuccess(result) {
      queryClient.setQueryData<GetCurrentWorkoutSessionResponse>(workoutQueryKeys.currentWorkout, {
        activeWorkoutSession: result.response.data
      });
      clearMutationKey(result.scope);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
    }
  });
}

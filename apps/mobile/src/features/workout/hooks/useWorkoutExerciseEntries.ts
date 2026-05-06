import type { DeleteWorkoutExerciseEntryRequest, GetCurrentWorkoutSessionResponse, UpdateWorkoutExerciseEntryRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteWorkoutExerciseEntry, updateWorkoutExerciseEntry } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useUpdateWorkoutExerciseEntry() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);

  return useMutation({
    mutationFn: async (input: { sessionId: string; exerciseEntryId: string; request: UpdateWorkoutExerciseEntryRequest }) => {
      const scope = `update-workout-exercise-entry:${input.exerciseEntryId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await updateWorkoutExerciseEntry({
        sessionId: input.sessionId,
        exerciseEntryId: input.exerciseEntryId,
        request: input.request,
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
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs });
    }
  });
}

export function useDeleteWorkoutExerciseEntry() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);

  return useMutation({
    mutationFn: async (input: { sessionId: string; exerciseEntryId: string; request: DeleteWorkoutExerciseEntryRequest }) => {
      const scope = `delete-workout-exercise-entry:${input.exerciseEntryId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await deleteWorkoutExerciseEntry({
        sessionId: input.sessionId,
        exerciseEntryId: input.exerciseEntryId,
        request: input.request,
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
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs });
    }
  });
}


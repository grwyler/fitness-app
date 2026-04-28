import type { GetCurrentWorkoutSessionResponse } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addWorkoutSet, deleteWorkoutSet } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useAddWorkoutSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);

  return useMutation({
    mutationFn: async (input: { sessionId: string; exerciseEntryId: string }) => {
      const request = {};
      const scope = `add-workout-set:${input.exerciseEntryId}`;
      const idempotencyKey = getMutationKey(scope, request);
      const response = await addWorkoutSet({
        sessionId: input.sessionId,
        exerciseEntryId: input.exerciseEntryId,
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

export function useDeleteWorkoutSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const clearSetLogDraft = useActiveWorkoutStore((state) => state.clearSetLogDraft);

  return useMutation({
    mutationFn: async (input: { setId: string }) => {
      const request = {};
      const scope = `delete-workout-set:${input.setId}`;
      const idempotencyKey = getMutationKey(scope, request);
      const response = await deleteWorkoutSet({
        setId: input.setId,
        request,
        idempotencyKey
      });

      return {
        response,
        input,
        scope
      };
    },
    onSuccess(result) {
      queryClient.setQueryData<GetCurrentWorkoutSessionResponse>(workoutQueryKeys.currentWorkout, {
        activeWorkoutSession: result.response.data
      });
      clearSetLogDraft(result.input.setId);
      clearMutationKey(result.scope);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
    }
  });
}

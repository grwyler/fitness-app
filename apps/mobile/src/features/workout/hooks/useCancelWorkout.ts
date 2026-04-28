import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelWorkoutSession } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useCancelWorkout() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const resetForDiscardedWorkout = useActiveWorkoutStore((state) => state.resetForDiscardedWorkout);

  return useMutation({
    mutationFn: async (input: { sessionId: string }) => {
      const scope = `cancel-workout:${input.sessionId}`;
      const idempotencyKey = getMutationKey(scope, {});
      const response = await cancelWorkoutSession({
        sessionId: input.sessionId,
        idempotencyKey
      });
      return {
        response,
        scope
      };
    },
    onSuccess(result) {
      resetForDiscardedWorkout();
      clearMutationKey(result.scope);
      queryClient.setQueryData(workoutQueryKeys.currentWorkout, {
        activeWorkoutSession: null
      });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.workoutHistory });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.progression });
    }
  });
}

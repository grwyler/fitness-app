import type { LogSetRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logSet } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useLogSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);

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
        scope
      };
    },
    onSuccess(result) {
      clearMutationKey(result.scope);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
    }
  });
}

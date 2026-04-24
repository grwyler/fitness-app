import type { StartWorkoutSessionRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { startWorkoutSession } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useStartWorkout() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const setActiveSessionId = useActiveWorkoutStore((state) => state.setActiveSessionId);

  return useMutation({
    mutationFn: async (request: StartWorkoutSessionRequest) => {
      const idempotencyKey = getMutationKey("start-workout", request);
      const response = await startWorkoutSession({
        request,
        idempotencyKey
      });
      return response;
    },
    onSuccess(response) {
      setActiveSessionId(response.data.id);
      clearMutationKey("start-workout");
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
    }
  });
}

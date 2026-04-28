import { useMutation, useQueryClient } from "@tanstack/react-query";
import { resetTestUserData } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

export function useResetTestUserData() {
  const queryClient = useQueryClient();
  const resetForDiscardedWorkout = useActiveWorkoutStore((state) => state.resetForDiscardedWorkout);
  const setLatestSummary = useActiveWorkoutStore((state) => state.setLatestSummary);

  return useMutation({
    mutationFn: resetTestUserData,
    onSuccess: async () => {
      resetForDiscardedWorkout();
      setLatestSummary(null);
      await Promise.all([
        queryClient.resetQueries({ queryKey: workoutQueryKeys.dashboard }),
        queryClient.resetQueries({ queryKey: workoutQueryKeys.currentWorkout }),
        queryClient.resetQueries({ queryKey: workoutQueryKeys.progression }),
        queryClient.resetQueries({ queryKey: workoutQueryKeys.programs }),
        queryClient.resetQueries({ queryKey: workoutQueryKeys.workoutHistory })
      ]);
      queryClient.removeQueries({ queryKey: workoutQueryKeys.workoutHistoryDetail });
    }
  });
}

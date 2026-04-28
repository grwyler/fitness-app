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
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.progression }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.workoutHistory }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.workoutHistoryDetail })
      ]);
    }
  });
}

import { queryClient } from "../providers/query-client";
import { useActiveWorkoutStore } from "../../features/workout/store/active-workout-store";

export function resetClientState() {
  queryClient.clear();

  const workoutStore = useActiveWorkoutStore.getState();
  workoutStore.resetForCompletedWorkout();
  workoutStore.setLatestSummary(null);
}


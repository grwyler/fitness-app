import { useQuery } from "@tanstack/react-query";
import { fetchCurrentWorkoutSession } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useCurrentWorkout() {
  return useQuery({
    queryKey: workoutQueryKeys.currentWorkout,
    queryFn: async () => {
      const response = await fetchCurrentWorkoutSession();
      return response.data;
    }
  });
}

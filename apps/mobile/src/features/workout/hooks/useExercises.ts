import { useQuery } from "@tanstack/react-query";
import { fetchExercises } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useExercises(enabled = true) {
  return useQuery({
    enabled,
    queryKey: workoutQueryKeys.exercises,
    queryFn: async () => {
      const response = await fetchExercises();
      return response.data.exercises;
    }
  });
}

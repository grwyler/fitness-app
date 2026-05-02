import { useQuery } from "@tanstack/react-query";
import { fetchExerciseProgressionSettings } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useExerciseProgressionSettings(exerciseId: string | null) {
  const auth = useAppAuth();

  return useQuery({
    enabled:
      Boolean(exerciseId) &&
      isDashboardQueryEnabled({
        status: auth.status,
        tokenPresent: auth.authDebug.tokenPresent
      }),
    queryKey: exerciseId ? workoutQueryKeys.exerciseProgressionSettings(exerciseId) : ["exercise-progression-settings", "none"],
    queryFn: async () => {
      if (!exerciseId) {
        throw new Error("exerciseId is required");
      }
      const response = await fetchExerciseProgressionSettings(exerciseId);
      return response.data;
    }
  });
}


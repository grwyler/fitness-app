import { useQuery } from "@tanstack/react-query";
import { fetchWorkoutHistory } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useWorkoutHistory(limit = 20) {
  const auth = useAppAuth();

  return useQuery({
    enabled: isDashboardQueryEnabled({
      status: auth.status,
      tokenPresent: auth.authDebug.tokenPresent
    }),
    queryKey: [...workoutQueryKeys.workoutHistory, limit],
    queryFn: async () => {
      const response = await fetchWorkoutHistory(limit);
      return response.data;
    }
  });
}

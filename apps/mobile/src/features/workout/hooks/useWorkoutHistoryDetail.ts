import { useQuery } from "@tanstack/react-query";
import { fetchWorkoutHistoryDetail } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useWorkoutHistoryDetail(sessionId: string) {
  const auth = useAppAuth();

  return useQuery({
    enabled:
      Boolean(sessionId) &&
      isDashboardQueryEnabled({
        status: auth.status,
        tokenPresent: auth.authDebug.tokenPresent
      }),
    queryKey: [...workoutQueryKeys.workoutHistoryDetail, sessionId],
    queryFn: async () => {
      const response = await fetchWorkoutHistoryDetail(sessionId);
      return response.data.workoutSession;
    }
  });
}

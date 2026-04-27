import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useDashboard() {
  const auth = useAppAuth();

  return useQuery({
    enabled: isDashboardQueryEnabled({
      status: auth.status,
      tokenPresent: auth.authDebug.tokenPresent
    }),
    queryKey: workoutQueryKeys.dashboard,
    queryFn: async () => {
      const response = await fetchDashboard();
      return response.data;
    }
  });
}

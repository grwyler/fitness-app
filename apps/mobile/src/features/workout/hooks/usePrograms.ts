import { useQuery } from "@tanstack/react-query";
import { fetchPrograms } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function usePrograms(enabled = true) {
  const auth = useAppAuth();

  return useQuery({
    enabled:
      enabled &&
      isDashboardQueryEnabled({
        status: auth.status,
        tokenPresent: auth.authDebug.tokenPresent
      }),
    queryKey: workoutQueryKeys.programs,
    queryFn: async () => {
      const response = await fetchPrograms();
      return response.data.programs;
    }
  });
}

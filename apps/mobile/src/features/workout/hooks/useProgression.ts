import { useQuery } from "@tanstack/react-query";
import { fetchProgression } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useProgression() {
  const auth = useAppAuth();

  return useQuery({
    enabled: isDashboardQueryEnabled({
      status: auth.status,
      tokenPresent: auth.authDebug.tokenPresent
    }),
    queryKey: workoutQueryKeys.progression,
    queryFn: async () => {
      const response = await fetchProgression();
      return response.data;
    }
  });
}

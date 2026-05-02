import { useQuery } from "@tanstack/react-query";
import { fetchTrainingSettings } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useTrainingSettings() {
  const auth = useAppAuth();

  return useQuery({
    enabled: isDashboardQueryEnabled({
      status: auth.status,
      tokenPresent: auth.authDebug.tokenPresent
    }),
    queryKey: workoutQueryKeys.trainingSettings,
    queryFn: async () => {
      const response = await fetchTrainingSettings();
      return response.data;
    }
  });
}


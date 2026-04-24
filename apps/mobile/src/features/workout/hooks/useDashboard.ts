import { useQuery } from "@tanstack/react-query";
import { fetchDashboard } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useDashboard() {
  return useQuery({
    queryKey: workoutQueryKeys.dashboard,
    queryFn: async () => {
      const response = await fetchDashboard();
      return response.data;
    }
  });
}

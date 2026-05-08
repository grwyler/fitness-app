import { useQuery } from "@tanstack/react-query";
import { fetchProgramTrainingContext } from "../../../api/workouts";
import { useAppAuth } from "../../../core/auth/AuthProvider";
import { isDashboardQueryEnabled } from "./dashboard-query.shared";
import { workoutQueryKeys } from "./query-keys";

export function useProgramTrainingContext(programId: string | null) {
  const auth = useAppAuth();

  return useQuery({
    enabled:
      Boolean(programId) &&
      isDashboardQueryEnabled({
        status: auth.status,
        tokenPresent: auth.authDebug.tokenPresent
      }),
    queryKey: programId ? workoutQueryKeys.programTrainingContext(programId) : ["program-training-context", "none"],
    queryFn: async () => {
      if (!programId) {
        throw new Error("programId is required");
      }
      const response = await fetchProgramTrainingContext(programId);
      return response.data;
    }
  });
}


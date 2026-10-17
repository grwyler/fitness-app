import { useQuery } from "@tanstack/react-query";
import { fetchProgramCoachReview } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useProgramCoachReview(programId?: string | null) {
  return useQuery({
    queryKey: programId ? workoutQueryKeys.programCoachReview(programId) : ["program-coach-review", "none"],
    enabled: Boolean(programId),
    queryFn: async () => {
      if (!programId) {
        throw new Error("programId is required");
      }
      const response = await fetchProgramCoachReview(programId);
      return response.data;
    }
  });
}

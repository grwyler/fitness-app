import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ResolveProgressionRecommendationRequest } from "@fitness/shared";
import { resolveProgressionRecommendation } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useResolveProgressionRecommendation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      sessionId: string;
      eventId: string;
      request: ResolveProgressionRecommendationRequest;
    }) => {
      const response = await resolveProgressionRecommendation(input);
      return response.data;
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [...workoutQueryKeys.workoutHistoryDetail, variables.sessionId]
      });
    }
  });
}


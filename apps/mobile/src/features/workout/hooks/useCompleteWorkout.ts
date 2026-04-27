import type { CompleteWorkoutSessionRequest, DashboardDto, GetWorkoutHistoryResponse } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { completeWorkoutSession } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import {
  applyCompletedWorkoutToDashboard,
  getCompletedWorkoutDetail,
  upsertCompletedWorkoutIntoHistory
} from "../utils/completion-cache.shared";
import { workoutQueryKeys } from "./query-keys";

export function useCompleteWorkout() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const setLatestSummary = useActiveWorkoutStore((state) => state.setLatestSummary);
  const resetForCompletedWorkout = useActiveWorkoutStore((state) => state.resetForCompletedWorkout);

  return useMutation({
    mutationFn: async (input: { sessionId: string; request: CompleteWorkoutSessionRequest }) => {
      const scope = `complete-workout:${input.sessionId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await completeWorkoutSession({
        sessionId: input.sessionId,
        request: input.request,
        idempotencyKey
      });
      return {
        response,
        scope
      };
    },
    onSuccess(result) {
      setLatestSummary(result.response.data);
      queryClient.setQueryData(
        [...workoutQueryKeys.workoutHistoryDetail, result.response.data.workoutSession.id],
        getCompletedWorkoutDetail(result.response.data)
      );
      queryClient.setQueriesData<GetWorkoutHistoryResponse | undefined>(
        { queryKey: workoutQueryKeys.workoutHistory },
        (current) => upsertCompletedWorkoutIntoHistory(current, result.response.data)
      );
      queryClient.setQueryData<DashboardDto | undefined>(workoutQueryKeys.dashboard, (current) =>
        applyCompletedWorkoutToDashboard(current, result.response.data)
      );
      resetForCompletedWorkout();
      clearMutationKey(result.scope);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.workoutHistory });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.progression });
    }
  });
}

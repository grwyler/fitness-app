import type { UpdateManualProgramGoalContextRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateManualProgramGoalContext } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useUpdateManualProgramGoalContext() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { programId: string; request: UpdateManualProgramGoalContextRequest }) => {
      const response = await updateManualProgramGoalContext(input);
      return response.data;
    },
    onSuccess(_data, input) {
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programTrainingContext(input.programId) });
    }
  });
}


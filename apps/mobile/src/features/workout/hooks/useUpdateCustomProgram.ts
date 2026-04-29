import type { UpdateCustomProgramRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateCustomProgram } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useUpdateCustomProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { programId: string; request: UpdateCustomProgramRequest }) =>
      updateCustomProgram(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard })
      ]);
    }
  });
}

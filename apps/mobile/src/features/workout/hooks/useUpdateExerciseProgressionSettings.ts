import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateExerciseProgressionSettingsRequest } from "@fitness/shared";
import { updateExerciseProgressionSettings } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useUpdateExerciseProgressionSettings(exerciseId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateExerciseProgressionSettingsRequest) => {
      const response = await updateExerciseProgressionSettings(request);
      return response.data;
    },
    onSuccess: async () => {
      if (exerciseId) {
        await queryClient.invalidateQueries({ queryKey: workoutQueryKeys.exerciseProgressionSettings(exerciseId) });
      }
    }
  });
}


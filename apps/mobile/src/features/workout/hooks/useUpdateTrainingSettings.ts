import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateTrainingSettingsRequest } from "@fitness/shared";
import { updateTrainingSettings } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useUpdateTrainingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: UpdateTrainingSettingsRequest) => {
      const response = await updateTrainingSettings(request);
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: workoutQueryKeys.trainingSettings });
    }
  });
}


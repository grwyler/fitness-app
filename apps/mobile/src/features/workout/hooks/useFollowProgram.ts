import { useMutation, useQueryClient } from "@tanstack/react-query";
import { followProgram } from "../../../api/workouts";
import { workoutQueryKeys } from "./query-keys";

export function useFollowProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: followProgram,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs })
      ]);
    }
  });
}

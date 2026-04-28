import type { CreateCustomProgramRequest } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createCustomProgram } from "../../../api/workouts";
import { createIdempotencyKey } from "../utils/idempotency";
import { workoutQueryKeys } from "./query-keys";

export function useCreateCustomProgram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: CreateCustomProgramRequest) =>
      createCustomProgram({
        request,
        idempotencyKey: createIdempotencyKey("create-custom-program")
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.programs }),
        queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard })
      ]);
    }
  });
}

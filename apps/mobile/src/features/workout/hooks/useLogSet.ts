import type { GetCurrentWorkoutSessionResponse, LogSetRequest, SetDto } from "@fitness/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logSet } from "../../../api/workouts";
import { useActiveWorkoutStore } from "../store/active-workout-store";
import { workoutQueryKeys } from "./query-keys";

function applyLoggedSet(
  currentWorkout: GetCurrentWorkoutSessionResponse | undefined,
  input: {
    setId: string;
    request: LogSetRequest;
    completedAt: string;
  }
): GetCurrentWorkoutSessionResponse | undefined {
  if (!currentWorkout?.activeWorkoutSession) {
    return currentWorkout;
  }

  return {
    activeWorkoutSession: {
      ...currentWorkout.activeWorkoutSession,
      exercises: currentWorkout.activeWorkoutSession.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set): SetDto => {
          if (set.id !== input.setId) {
            return set;
          }

          return {
            ...set,
            actualReps: input.request.actualReps,
            actualWeight: input.request.actualWeight ?? set.targetWeight,
            completedAt: input.request.completedAt ?? input.completedAt,
            status: input.request.actualReps >= set.targetReps ? "completed" : "failed"
          };
        })
      }))
    }
  };
}

export function useLogSet() {
  const queryClient = useQueryClient();
  const getMutationKey = useActiveWorkoutStore((state) => state.getMutationKey);
  const clearMutationKey = useActiveWorkoutStore((state) => state.clearMutationKey);
  const clearSetLogDraft = useActiveWorkoutStore((state) => state.clearSetLogDraft);

  return useMutation({
    mutationFn: async (input: { setId: string; request: LogSetRequest }) => {
      const scope = `log-set:${input.setId}`;
      const idempotencyKey = getMutationKey(scope, input.request);
      const response = await logSet({
        setId: input.setId,
        request: input.request,
        idempotencyKey
      });
      return {
        response,
        input,
        scope
      };
    },
    async onMutate(input) {
      await queryClient.cancelQueries({ queryKey: workoutQueryKeys.currentWorkout });
      const previousCurrentWorkout = queryClient.getQueryData<GetCurrentWorkoutSessionResponse>(
        workoutQueryKeys.currentWorkout
      );
      queryClient.setQueryData<GetCurrentWorkoutSessionResponse>(
        workoutQueryKeys.currentWorkout,
        applyLoggedSet(previousCurrentWorkout, {
          setId: input.setId,
          request: input.request,
          completedAt: new Date().toISOString()
        })
      );

      return {
        previousCurrentWorkout
      };
    },
    onError(_error, _input, context) {
      if (context?.previousCurrentWorkout) {
        queryClient.setQueryData(workoutQueryKeys.currentWorkout, context.previousCurrentWorkout);
      }
    },
    onSuccess(result) {
      clearMutationKey(result.scope);
      clearSetLogDraft(result.input.setId);
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.currentWorkout });
      void queryClient.invalidateQueries({ queryKey: workoutQueryKeys.dashboard });
    }
  });
}

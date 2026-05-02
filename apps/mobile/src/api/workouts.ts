import type {
  AddCustomWorkoutExerciseRequest,
  AddWorkoutSetRequest,
  CancelWorkoutSessionResponse,
  CompleteWorkoutSessionRequest,
  CompleteWorkoutSessionResponse,
  CreateCustomProgramRequest,
  CreateCustomProgramResponse,
  DeleteWorkoutSetRequest,
  FollowProgramResponse,
  GetExerciseProgressionSettingsResponse,
  GetCurrentWorkoutSessionResponse,
  GetDashboardResponse,
  GetProgressionResponse,
  GetTrainingSettingsResponse,
  ListExercisesResponse,
  GetWorkoutHistoryDetailResponse,
  GetWorkoutHistoryResponse,
  ListProgramsResponse,
  LogSetRequest,
  LogSetResponse,
  StartWorkoutSessionRequest,
  UpdateCustomProgramRequest,
  UpdateCustomProgramResponse,
  UpdateExerciseProgressionSettingsRequest,
  UpdateExerciseProgressionSettingsResponse,
  UpdateTrainingSettingsRequest,
  UpdateTrainingSettingsResponse,
  WorkoutSessionDto
} from "@fitness/shared";
import { apiRequest } from "./client";

export async function fetchDashboard() {
  return apiRequest<GetDashboardResponse>("/dashboard");
}

export async function fetchPrograms() {
  return apiRequest<ListProgramsResponse>("/programs");
}

export async function createCustomProgram(input: {
  request: CreateCustomProgramRequest;
  idempotencyKey: string;
}) {
  return apiRequest<CreateCustomProgramResponse, { replayed: boolean }>("/programs", {
    method: "POST",
    body: input.request,
    idempotencyKey: input.idempotencyKey
  });
}

export async function updateCustomProgram(input: {
  programId: string;
  request: UpdateCustomProgramRequest;
}) {
  return apiRequest<UpdateCustomProgramResponse>(`/programs/${input.programId}`, {
    method: "PUT",
    body: input.request
  });
}

export async function fetchExercises() {
  return apiRequest<ListExercisesResponse>("/exercises");
}

export async function fetchTrainingSettings() {
  return apiRequest<GetTrainingSettingsResponse>("/training-settings");
}

export async function updateTrainingSettings(request: UpdateTrainingSettingsRequest) {
  return apiRequest<UpdateTrainingSettingsResponse>("/training-settings", {
    method: "PUT",
    body: request
  });
}

export async function fetchExerciseProgressionSettings(exerciseId: string) {
  return apiRequest<GetExerciseProgressionSettingsResponse>(`/exercise-progression-settings?exerciseId=${exerciseId}`);
}

export async function updateExerciseProgressionSettings(request: UpdateExerciseProgressionSettingsRequest) {
  return apiRequest<UpdateExerciseProgressionSettingsResponse>("/exercise-progression-settings", {
    method: "PUT",
    body: request
  });
}

export async function followProgram(programId: string) {
  return apiRequest<FollowProgramResponse>(`/programs/${programId}/follow`, {
    method: "POST",
    body: {}
  });
}

export async function fetchWorkoutHistory(limit = 20) {
  return apiRequest<GetWorkoutHistoryResponse>(`/workout-history?limit=${limit}&status=completed`);
}

export async function fetchWorkoutHistoryDetail(sessionId: string) {
  return apiRequest<GetWorkoutHistoryDetailResponse>(`/workout-history/${sessionId}`);
}

export async function fetchProgression() {
  return apiRequest<GetProgressionResponse>("/progression");
}

export async function fetchCurrentWorkoutSession() {
  return apiRequest<GetCurrentWorkoutSessionResponse>("/workout-sessions/current");
}

export async function startWorkoutSession(input: {
  request: StartWorkoutSessionRequest;
  idempotencyKey: string;
}) {
  return apiRequest<WorkoutSessionDto, { replayed: boolean }>("/workout-sessions/start", {
    method: "POST",
    body: input.request,
    idempotencyKey: input.idempotencyKey
  });
}

export async function addCustomWorkoutExercise(input: {
  sessionId: string;
  request: AddCustomWorkoutExerciseRequest;
  idempotencyKey: string;
}) {
  return apiRequest<WorkoutSessionDto, { replayed: boolean }>(
    `/workout-sessions/${input.sessionId}/exercises`,
    {
      method: "POST",
      body: input.request,
      idempotencyKey: input.idempotencyKey
    }
  );
}

export async function addWorkoutSet(input: {
  sessionId: string;
  exerciseEntryId: string;
  request: AddWorkoutSetRequest;
  idempotencyKey: string;
}) {
  return apiRequest<WorkoutSessionDto, { replayed: boolean }>(
    `/workout-sessions/${input.sessionId}/exercises/${input.exerciseEntryId}/sets`,
    {
      method: "POST",
      body: input.request,
      idempotencyKey: input.idempotencyKey
    }
  );
}

export async function deleteWorkoutSet(input: {
  setId: string;
  request: DeleteWorkoutSetRequest;
  idempotencyKey: string;
}) {
  return apiRequest<WorkoutSessionDto, { replayed: boolean }>(`/sets/${input.setId}`, {
    method: "DELETE",
    body: input.request,
    idempotencyKey: input.idempotencyKey
  });
}

export async function logSet(input: {
  setId: string;
  request: LogSetRequest;
  idempotencyKey: string;
}) {
  return apiRequest<LogSetResponse, { replayed: boolean }>(`/sets/${input.setId}/log`, {
    method: "POST",
    body: input.request,
    idempotencyKey: input.idempotencyKey
  });
}

export async function updateLoggedSet(input: {
  setId: string;
  request: LogSetRequest;
  idempotencyKey: string;
}) {
  return apiRequest<LogSetResponse, { replayed: boolean }>(`/sets/${input.setId}`, {
    method: "PUT",
    body: input.request,
    idempotencyKey: input.idempotencyKey
  });
}

export async function completeWorkoutSession(input: {
  sessionId: string;
  request: CompleteWorkoutSessionRequest;
  idempotencyKey: string;
}) {
  return apiRequest<CompleteWorkoutSessionResponse, { replayed: boolean }>(
    `/workout-sessions/${input.sessionId}/complete`,
    {
      method: "POST",
      body: input.request,
      idempotencyKey: input.idempotencyKey
    }
  );
}

export async function cancelWorkoutSession(input: {
  sessionId: string;
  idempotencyKey: string;
}) {
  return apiRequest<CancelWorkoutSessionResponse, { replayed: boolean }>(
    `/workout-sessions/${input.sessionId}/cancel`,
    {
      method: "POST",
      body: {},
      idempotencyKey: input.idempotencyKey
    }
  );
}

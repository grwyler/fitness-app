import type {
  CompleteWorkoutSessionRequest,
  CompleteWorkoutSessionResponse,
  FollowProgramResponse,
  GetCurrentWorkoutSessionResponse,
  GetDashboardResponse,
  ListProgramsResponse,
  LogSetRequest,
  LogSetResponse,
  StartWorkoutSessionRequest,
  WorkoutSessionDto
} from "@fitness/shared";
import { apiRequest } from "./client";

export async function fetchDashboard() {
  return apiRequest<GetDashboardResponse>("/dashboard");
}

export async function fetchPrograms() {
  return apiRequest<ListProgramsResponse>("/programs");
}

export async function followProgram(programId: string) {
  return apiRequest<FollowProgramResponse>(`/programs/${programId}/follow`, {
    method: "POST",
    body: {}
  });
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

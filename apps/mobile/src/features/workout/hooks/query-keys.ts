export const workoutQueryKeys = {
  dashboard: ["dashboard"] as const,
  currentWorkout: ["current-workout"] as const,
  exercises: ["exercises"] as const,
  progression: ["progression"] as const,
  programs: ["programs"] as const,
  workoutHistory: ["workout-history"] as const,
  workoutHistoryDetail: ["workout-history-detail"] as const,
  trainingSettings: ["training-settings"] as const,
  exerciseProgressionSettings: (exerciseId: string) => ["exercise-progression-settings", exerciseId] as const
};

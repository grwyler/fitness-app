export const TEST_USER_EMAIL = "test@test.com";

export function isTestUserEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === TEST_USER_EMAIL;
}

export function shouldShowReviewFeedbackButton(input: {
  isDev: boolean;
  userEmail: string | null | undefined;
}) {
  return input.isDev && isTestUserEmail(input.userEmail);
}

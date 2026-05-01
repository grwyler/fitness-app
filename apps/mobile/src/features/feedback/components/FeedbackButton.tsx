import { useState } from "react";
import Constants from "expo-constants";
import { useRoute } from "@react-navigation/native";
import { Alert, Platform } from "react-native";
import { PrimaryButton } from "../../../components/PrimaryButton";
import { submitFeedbackEntry } from "../../../api/feedback";
import { buildFeedbackContext } from "../utils/build-feedback-context";
import { createFeedbackEntry, type FeedbackDraft } from "../types";
import { FeedbackModal } from "./FeedbackModal";

type FeedbackButtonProps = {
  screenName: string;
  workoutSessionId?: string | null;
  lastAction?: string | null;
  label?: string;
};

export function FeedbackButton({
  screenName,
  workoutSessionId,
  lastAction,
  label = "Report issue"
}: FeedbackButtonProps) {
  const route = useRoute();
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(draft: FeedbackDraft) {
    setIsSaving(true);
    setErrorMessage(null);

    try {
      const context = buildFeedbackContext({
        screenName,
        routeName: String(route.name),
        platform: Platform.OS,
        workoutSessionId,
        appVersion: Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? null,
        lastAction
      });

      const entry = createFeedbackEntry({
        draft,
        context
      });

      await submitFeedbackEntry(entry);
      setIsOpen(false);
      Alert.alert("Feedback submitted", "Thanks! Your note is available on any device.");
    } catch (error) {
      console.error("Unable to save feedback entry", error);
      setErrorMessage("We couldn't submit your feedback. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PrimaryButton label={label} onPress={() => setIsOpen(true)} tone="secondary" />
      <FeedbackModal
        visible={isOpen}
        saving={isSaving}
        errorMessage={errorMessage}
        onClose={() => {
          setErrorMessage(null);
          setIsOpen(false);
        }}
        onSubmit={handleSubmit}
      />
    </>
  );
}

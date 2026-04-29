# Rest timer completion alerts + blocking UI

## User impact
- During an active workout, users can miss the end of the rest timer because they are setting up/racking weights and the timer is only visual.
- Users asked for stronger affordances: an always-visible timer, a blocking modal, and an alert (sound/vibration/notification) when rest completes.

## Suspected area
- `apps/mobile/src/screens/ActiveWorkoutScreen.tsx` (rest timer UX + state handling)
- Potential platform services:
  - Web: Notifications API + permissions + service worker considerations
  - Native (Expo): `expo-notifications` and/or background task constraints

## Suggested next step
- Decide on an MVP-safe alert behavior:
  - Option A (lowest scope): in-app sound/vibration when the app is foregrounded and the timer reaches 0.
  - Option B (higher scope): local notification scheduled for the rest timer end time (requires permissions and platform-specific setup).
- If pursuing Option B, validate feasibility for:
  - Web (mobile Safari/Chrome) notification support + permission UX
  - iOS background/scheduling behavior (reliability constraints)
  - Android behavior and required Expo config


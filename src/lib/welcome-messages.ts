/** Rotating subtitles for the "welcome back" toast — picked randomly so a
 * returning user sees something different most times they open the app. */
export const WELCOME_BACK_MESSAGES = [
  "Let's see how you did today.",
  "Ready to log some trades?",
  "Discipline compounds — let's go.",
  "Your edge is waiting for you.",
  "Time to review the tape.",
  "Green day or red day, let's find out.",
  "Consistency beats intensity.",
  "The market doesn't care, but your journal does.",
  "Let's turn data into discipline.",
  "Another day, another data point.",
  "Small edges, tracked consistently, add up.",
  "Let's see what the numbers say.",
] as const;

export function pickWelcomeBackMessage(random: () => number = Math.random): string {
  const index = Math.floor(random() * WELCOME_BACK_MESSAGES.length);
  return WELCOME_BACK_MESSAGES[index];
}

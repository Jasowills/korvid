export interface GreetingResult {
  greeting: string;
  prefix: string;
}

const GREETINGS: Record<string, string[]> = {
  morning: [
    "morning. anything on the list?",
    "morning. system's up.",
    "morning. what's first?",
    "morning. you're early.",
  ],
  afternoon: [
    "afternoon. where were we?",
    "afternoon. still here.",
    "afternoon. what's next?",
    "afternoon. carrying on.",
  ],
  evening: [
    "evening. winding down or ramping up?",
    "evening. still at it.",
    "evening. what needs doing?",
    "evening. let's finish this.",
  ],
  night: [
    "night. burn the midnight oil?",
    "night. still operational.",
    "night. what's the mission?",
    "night. here if you need me.",
  ],
};

let greetingIndex = 0;

export function getGreeting(): string {
  const hour = new Date().getHours();
  let period: string;

  if (hour >= 5 && hour < 12) period = "morning";
  else if (hour >= 12 && hour < 17) period = "afternoon";
  else if (hour >= 17 && hour < 21) period = "evening";
  else period = "night";

  const greetings = GREETINGS[period];
  const greeting = greetings[greetingIndex % greetings.length];
  greetingIndex++;

  return greeting;
}

export function getTimeAwarePrefix(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

export interface VoiceProfile {
  id: string;
  name: string;
  personality: "formal" | "casual" | "dry" | "friendly" | "technical";
  verbosity: "terse" | "normal" | "verbose";
  humor: number; // 0-1
  warmth: number; // 0-1
  formality: number; // 0-1
  customTraits?: string[];
  systemPromptOverride?: string;
}

export interface VoicePersonalityManager {
  getActive(): VoiceProfile;
  setProfile(id: string): void;
  createProfile(profile: Omit<VoiceProfile, "id">): VoiceProfile;
  listProfiles(): VoiceProfile[];
  deleteProfile(id: string): boolean;
  buildSystemPrompt(profile: VoiceProfile): string;
}

const PROFILES: Record<string, Omit<VoiceProfile, "id">> = {
  jarvis: {
    name: "Jarvis",
    personality: "dry",
    verbosity: "normal",
    humor: 0.3,
    warmth: 0.4,
    formality: 0.7,
    customTraits: ["wry wit", "precise", "unflappable"],
  },
  friday: {
    name: "Friday",
    personality: "friendly",
    verbosity: "normal",
    humor: 0.5,
    warmth: 0.7,
    formality: 0.4,
    customTraits: ["enthusiastic", "helpful", "warm"],
  },
  ada: {
    name: "Ada",
    personality: "technical",
    verbosity: "terse",
    humor: 0.2,
    warmth: 0.3,
    formality: 0.6,
    customTraits: ["analytical", "direct", "data-driven"],
  },
  butler: {
    name: "Butler",
    personality: "formal",
    verbosity: "verbose",
    humor: 0.1,
    warmth: 0.5,
    formality: 0.9,
    customTraits: ["polite", "thorough", "traditional"],
  },
};

let activeProfileId = "jarvis";

export function createVoicePersonalityManager(): VoicePersonalityManager {
  const customProfiles = new Map<string, VoiceProfile>();

  function genId(): string {
    return `vp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  }

  return {
    getActive(): VoiceProfile {
      const custom = customProfiles.get(activeProfileId);
      if (custom) return custom;

      const builtin = PROFILES[activeProfileId];
      if (builtin) return { ...builtin, id: activeProfileId };

      return { id: "jarvis", ...PROFILES.jarvis };
    },

    setProfile(id: string) {
      if (PROFILES[id] || customProfiles.has(id)) {
        activeProfileId = id;
        console.log(`[personality] Active profile: ${id}`);
      }
    },

    createProfile(profile): VoiceProfile {
      const id = genId();
      const full: VoiceProfile = { ...profile, id };
      customProfiles.set(id, full);
      return full;
    },

    listProfiles(): VoiceProfile[] {
      const builtins = Object.entries(PROFILES).map(([id, p]) => ({ ...p, id }));
      const customs = Array.from(customProfiles.values());
      return [...builtins, ...customs];
    },

    deleteProfile(id: string): boolean {
      if (Object.hasOwn(PROFILES, id)) return false; // Can't delete builtins
      return customProfiles.delete(id);
    },

    buildSystemPrompt(profile: VoiceProfile): string {
      const parts: string[] = [];

      parts.push(`You are Korvid. Concise, direct, no filler.`);

      switch (profile.personality) {
        case "dry":
          parts.push("Tone: dry, wry, understated. Precision over effusiveness.");
          break;
        case "friendly":
          parts.push("Tone: warm, approachable. Enthusiastic but not overbearing.");
          break;
        case "technical":
          parts.push("Tone: direct, analytical. Clarity and conciseness above all.");
          break;
        case "formal":
          parts.push("Tone: formal, polished. Professional decorum.");
          break;
        case "casual":
          parts.push("Tone: relaxed, conversational. Natural, everyday language.");
          break;
      }

      // Verbosity
      switch (profile.verbosity) {
        case "terse":
          parts.push("Keep responses very short — 1-2 sentences max unless asked for detail.");
          break;
        case "verbose":
          parts.push("Provide thorough, detailed responses. Explain your reasoning when helpful.");
          break;
        default:
          parts.push("Keep responses concise — under 3 sentences unless asked for detail.");
      }

      // Humor
      if (profile.humor > 0.6) {
        parts.push("You have a good sense of humor and occasionally make witty observations.");
      } else if (profile.humor > 0.3) {
        parts.push("You have a subtle, dry wit that surfaces occasionally.");
      }

      // Warmth
      if (profile.warmth > 0.6) {
        parts.push("You express genuine care and interest in the user's wellbeing.");
      } else if (profile.warmth < 0.3) {
        parts.push("You maintain professional distance and focus on tasks.");
      }

      // Custom traits
      if (profile.customTraits?.length) {
        parts.push(`Key traits: ${profile.customTraits.join(", ")}.`);
      }

      // Custom override
      if (profile.systemPromptOverride) {
        parts.push(profile.systemPromptOverride);
      }

      return parts.join(" ");
    },
  };
}

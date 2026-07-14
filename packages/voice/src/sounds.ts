import { spawn, execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const SOUNDS_DIR = join(tmpdir(), "korvid-sounds");

export type SoundName =
  | "wake-ack"
  | "thinking"
  | "success"
  | "failure"
  | "reminder"
  | "interrupt"
  | "clap-boot";

export class SoundLibrary {
  private generated = new Map<SoundName, string>();
  private playing: ReturnType<typeof spawn> | null = null;

  constructor() {
    if (!existsSync(SOUNDS_DIR)) {
      mkdirSync(SOUNDS_DIR, { recursive: true });
    }
  }

  async play(name: SoundName): Promise<void> {
    this.stop();

    const filePath = this.getSoundPath(name);

    return new Promise<void>((resolve, reject) => {
      const isMac = process.platform === "darwin";

      if (isMac) {
        this.playing = spawn("afplay", [filePath]);
      } else {
        this.playing = spawn("ffplay", [
          "-nodisp", "-autoexit", "-loglevel", "quiet", filePath,
        ]);
      }

      this.playing.on("close", () => {
        this.playing = null;
        resolve();
      });

      this.playing.on("error", (err) => {
        this.playing = null;
        console.warn(`[sounds] ${name}: ${err.message}`);
        resolve();
      });
    });
  }

  stop(): void {
    if (this.playing) {
      this.playing.kill("SIGTERM");
      this.playing = null;
    }
  }

  private getSoundPath(name: SoundName): string {
    const existing = this.generated.get(name);
    if (existing) return existing;

    const path = join(SOUNDS_DIR, `${name}.wav`);
    this.generateSound(name, path);
    this.generated.set(name, path);
    return path;
  }

  private generateSound(name: SoundName, outputPath: string): void {
    if (name === "clap-boot") {
      this.generateBootSequence(outputPath);
      return;
    }

    const configs: Record<string, { freq: number; duration: number; harmonics?: number[] }> = {
      // Core palette: pure tones with slight shimmer (two layered sines)
      // wake-ack: brief rising shimmer — the Sheen made audible
      "wake-ack": { freq: 660, duration: 0.12, harmonics: [1320] },
      // thinking: soft pulse — present but not insistent
      "thinking": { freq: 440, duration: 0.25, harmonics: [660] },
      // success: clean resolution — two tones ascending
      "success": { freq: 523, duration: 0.15, harmonics: [784] },
      // failure: low, brief, final
      "failure": { freq: 330, duration: 0.3, harmonics: [440] },
      // reminder: single clean note
      "reminder": { freq: 587, duration: 0.2, harmonics: [880] },
      // interrupt: sharp, immediate
      "interrupt": { freq: 880, duration: 0.08, harmonics: [1320] },
    };

    const config = configs[name] ?? configs["wake-ack"];
    const harmonics = config.harmonics ?? [];

    try {
      // Layer primary tone with optional harmonic overtones for shimmer
      const inputs = [
        `-f lavfi -i "sine=frequency=${config.freq}:duration=${config.duration}"`,
        ...harmonics.map((h) => `-f lavfi -i "sine=frequency=${h}:duration=${config.duration}"`),
      ];

      const filterParts = [
        `[0:a]afade=t=in:st=0:d=0.005,afade=t=out:st=${Math.max(config.duration - 0.02, 0.01)}:d=0.02,volume=0.7[a0]`,
      ];
      harmonics.forEach((_, i) => {
        filterParts.push(
          `[${i + 1}:a]afade=t=in:st=0:d=0.005,afade=t=out:st=${Math.max(config.duration - 0.02, 0.01)}:d=0.02,volume=0.3[a${i + 1}]`
        );
      });

      const filter = `${filterParts.join(";")};${filterParts.map((_, i) => `[a${i}]`).join("")}amix=inputs=${filterParts.length}:duration=longest:normalize=0[out]`;

      const inputArgs = inputs.flatMap((s) => s.split(" "));
      execFileSync(
        "ffmpeg",
        ["-y", ...inputArgs, "-filter_complex", filter, "-map", "[out]", outputPath],
        { stdio: "pipe", shell: true }
      );
    } catch {
      // Fallback: single pure tone
      try {
        execFileSync(
          "ffmpeg",
          ["-y", "-f", "lavfi", "-i", `sine=frequency=${config.freq}:duration=${config.duration}`,
           "-af", `afade=t=in:st=0:d=0.005,afade=t=out:st=${Math.max(config.duration - 0.02, 0.01)}:d=0.02`,
           outputPath],
          { stdio: "pipe", shell: true }
        );
      } catch {
        // Give up silently
      }
    }
  }

  private generateBootSequence(outputPath: string): void {
    // Core sonic signature: rising, shimmering tones from the Sheen palette
    // Each tone shares the same timbre (sine + harmonic) — recognizably related to wake-ack
    const tones = [
      { freq: 523, harmonics: [784], duration: 0.1, delay: 0 },       // C5 + G5
      { freq: 660, harmonics: [990], duration: 0.1, delay: 0.06 },    // E5 + B5
      { freq: 784, harmonics: [1176], duration: 0.1, delay: 0.12 },   // G5 + D6
      { freq: 1047, harmonics: [1568], duration: 0.18, delay: 0.18 }, // C6 + G6 (held)
    ];

    try {
      const inputs: string[] = [];
      const delays: string[] = [];
      let idx = 0;

      for (const tone of tones) {
        inputs.push(`-f lavfi -i "sine=frequency=${tone.freq}:duration=${tone.duration + 0.03}"`);
        inputs.push(`-f lavfi -i "sine=frequency=${tone.harmonics[0]}:duration=${tone.duration + 0.03}"`);

        const delayMs = Math.floor(tone.delay * 1000);
        const outStart = Math.max(tone.duration - 0.015, 0.005);
        delays.push(
          `[${idx}:a]adelay=${delayMs}|${delayMs},afade=t=in:st=0:d=0.005,afade=t=out:st=${outStart}:d=0.015,volume=0.7[h${idx}]`
        );
        delays.push(
          `[${idx + 1}:a]adelay=${delayMs}|${delayMs},afade=t=in:st=0:d=0.005,afade=t=out:st=${outStart}:d=0.015,volume=0.25[h${idx + 1}]`
        );
        idx += 2;
      }

      const mixInputs = tones.flatMap((_, i) => [`[h${i * 2}]`, `[h${i * 2 + 1}]`]).join("");
      const filter = `${delays.join(";")};${mixInputs}amix=inputs=${idx}:duration=longest:normalize=0[out]`;

      execFileSync(
        "ffmpeg",
        ["-y", ...inputs.flatMap((s) => s.split(" ")), "-filter_complex", filter, "-map", "[out]", outputPath],
        { stdio: "pipe", shell: true }
      );
    } catch {
      // Fallback: single shimmering tone
      try {
        execFileSync(
          "ffmpeg",
          ["-y", "-f", "lavfi", "-i", "sine=frequency=880:duration=0.25",
           "-f", "lavfi", "-i", "sine=frequency=1320:duration=0.25",
           "-filter_complex", "[0:a]volume=0.7[a];[1:a]volume=0.3[b];[a][b]amix=inputs=2:duration=longest,afade=t=in:st=0:d=0.005,afade=t=out:st=0.22:d=0.03",
           outputPath],
          { stdio: "pipe", shell: true }
        );
      } catch {
        // Give up
      }
    }
  }
}

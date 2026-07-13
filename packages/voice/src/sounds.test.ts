import { describe, it, expect } from "vitest";
import { SoundLibrary } from "./sounds.js";

describe("SoundLibrary", () => {
  it("can be instantiated", () => {
    const lib = new SoundLibrary();
    expect(lib).toBeDefined();
  });

  it("stop does not throw when nothing is playing", () => {
    const lib = new SoundLibrary();
    expect(() => lib.stop()).not.toThrow();
  });
});

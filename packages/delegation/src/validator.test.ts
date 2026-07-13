import { describe, it, expect } from "vitest";
import { createValidator } from "./validator.js";

describe("createValidator", () => {
  it("creates a validator instance", () => {
    const validator = createValidator();
    expect(validator).toBeDefined();
    expect(typeof validator.validate).toBe("function");
  });
});

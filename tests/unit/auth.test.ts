import { describe, it, expect } from "vitest";
import bcrypt from "bcryptjs";
describe("authentication logic", () => {
  it("hashes and verifies passwords", async () => {
    const h = await bcrypt.hash("Password123!", 12);
    expect(await bcrypt.compare("Password123!", h)).toBe(true);
    expect(await bcrypt.compare("bad", h)).toBe(false);
  });
});

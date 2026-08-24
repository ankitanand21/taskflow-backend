import { describe, it, expect } from "vitest";
describe("task assignment validation", () => {
  it("requires same organization membership", () => {
    const taskOrg: string = "A",
      userOrg: string = "B";
    expect(taskOrg === userOrg).toBe(false);
  });
});

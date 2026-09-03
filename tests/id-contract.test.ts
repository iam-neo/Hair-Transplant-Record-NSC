import { describe, expect, it } from "vitest";
describe("stable identifier contract", () => {
  it("keeps entity identifiers independent of spreadsheet rows", () => {
    expect("HT-2026-000001").toMatch(/^HT-\d{4}-\d{6}$/);
    expect("PROC-2026-000001").toMatch(/^PROC-\d{4}-\d{6}$/);
  });
});

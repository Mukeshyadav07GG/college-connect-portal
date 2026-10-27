import { describe, it, expect } from "vitest";
import { semFromCode } from "./semesters";
describe("semFromCode", () => {
  it("1xx is Sem I", () => expect(semFromCode("101")).toBe("I"));
  it("KCS-601 is Sem VI", () => expect(semFromCode("KCS-601")).toBe("VI"));
  it("BCS-801 is Sem VIII", () => expect(semFromCode("BCS-801")).toBe("VIII"));
  it("KCS-062 has no sem digit", () => expect(semFromCode("KCS-062")).toBeNull());
});

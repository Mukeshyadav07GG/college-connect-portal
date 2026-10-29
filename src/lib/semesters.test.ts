import { describe, it, expect } from "vitest";
import { semFromCode } from "./semesters";
describe("semFromCode", () => {
  it("1xx is Sem I", () => expect(semFromCode("101")).toBe("I"));
  it("KCS-601 is Sem VI", () => expect(semFromCode("KCS-601")).toBe("VI"));
  it("KCS-703 is Sem VII (letters ignored)", () => expect(semFromCode("KCS-703")).toBe("VII"));
  it("BCS-702 is Sem VII", () => expect(semFromCode("BCS-702")).toBe("VII"));
  it("BCS-801 is Sem VIII", () => expect(semFromCode("BCS-801")).toBe("VIII"));
  it("elective KCS-062 is Sem VI", () => expect(semFromCode("KCS-062")).toBe("VI"));
});

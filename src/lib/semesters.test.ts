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

import { defaultSectionForSem, normDay, normExam } from "./semesters";
describe("section, day and exam mapping", () => {
  it("maps semesters to batch sections", () => {
    expect(defaultSectionForSem("I")).toBe("CS11");
    expect(defaultSectionForSem("II")).toBe("CS11");
    expect(defaultSectionForSem("IV")).toBe("CS21");
    expect(defaultSectionForSem("V")).toBe("CS31");
    expect(defaultSectionForSem("VI")).toBe("CS31");
    expect(defaultSectionForSem("VII")).toBe("CS41");
    expect(defaultSectionForSem("VIII")).toBe("CS41");
  });
  it("normalizes short day names", () => { expect(normDay("Mon")).toBe("Monday"); expect(normDay("Tuesday")).toBe("Tuesday"); });
  it("normalizes exam types", () => { expect(normExam("sessional1")).toBe("Sessional 1"); expect(normExam("put")).toBe("PUT"); });
});

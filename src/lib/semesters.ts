export const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
export const semLabel = (s: string) => `Sem ${SEMESTERS.indexOf(s as any) + 1 || s}`;

/** Detects semester from a subject code: first digit of the 3-digit number (KCS-601 → VI, 101 → I). */
export const semFromCode = (code?: string | null): string | null => {
  const m = String(code ?? "").match(/(\d)\d{2}/);
  const n = m ? Number(m[1]) : 0;
  return n >= 1 && n <= 8 ? SEMESTERS[n - 1] : null;
};

/** Semester of a subject: from its code, falling back to the stored semester. */
export const subjectSem = (s: { code: string; semester?: string | null }) => semFromCode(s.code) ?? s.semester ?? null;

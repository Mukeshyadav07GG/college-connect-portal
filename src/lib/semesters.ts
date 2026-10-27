export const SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;
export const semLabel = (s: string) => `Sem ${SEMESTERS.indexOf(s as any) + 1 || s}`;

# AGENTS.md

- Avatar uploads must NOT use `upsert: true` on the storage client — storage upsert fails RLS with "new row violates row-level security policy" even inside the user's own folder; upload paths are timestamped so they are unique anyway.
- Exam-type values are stored lowercase (`sessional1`, `sessional2`, `put`, `semester`); always normalize through `normExam()` from `src/lib/semesters.ts` before matching UI card names (Sessional 1 / Sessional 2 / PUT / Semester).
- Timetable day names are stored as full names (`Monday`…`Saturday`); always match through `normDay()`.

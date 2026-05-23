import { Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { StudentLayout } from "@/components/student/StudentLayout";

const Profile = lazy(() => import("@/components/student/Profile").then(m => ({ default: m.Profile })));
const Timetable = lazy(() => import("@/components/student/Timetable").then(m => ({ default: m.Timetable })));
const FacultyDirectory = lazy(() => import("@/components/student/FacultyDirectory").then(m => ({ default: m.FacultyDirectory })));
const Assignments = lazy(() => import("@/components/student/Assignments").then(m => ({ default: m.Assignments })));
const AttendanceHistory = lazy(() => import("@/components/student/AttendanceHistory").then(m => ({ default: m.AttendanceHistory })));
const Syllabus = lazy(() => import("@/components/student/Syllabus").then(m => ({ default: m.Syllabus })));
const Result = lazy(() => import("@/components/student/Result").then(m => ({ default: m.Result })));
const HostelStudent = lazy(() => import("@/components/student/HostelStudent").then(m => ({ default: m.HostelStudent })));
const Events = lazy(() => import("@/components/student/Events").then(m => ({ default: m.Events })));
const Announcements = lazy(() => import("@/components/student/Announcements").then(m => ({ default: m.Announcements })));
const StudentFees = lazy(() => import("@/components/student/StudentFees").then(m => ({ default: m.StudentFees })));

const Fallback = () => (
  <div className="p-6 text-sm text-muted-foreground">Loading…</div>
);

const StudentDashboard = () => {
  return (
    <StudentLayout>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route index element={<Profile />} />
          <Route path="timetable" element={<Timetable />} />
          <Route path="faculty" element={<FacultyDirectory />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="attendance" element={<AttendanceHistory />} />
          <Route path="syllabus" element={<Syllabus />} />
          <Route path="result" element={<Result />} />
          <Route path="hostel" element={<HostelStudent />} />
          <Route path="events" element={<Events />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="fees" element={<StudentFees />} />
        </Routes>
      </Suspense>
    </StudentLayout>
  );
};

export default StudentDashboard;

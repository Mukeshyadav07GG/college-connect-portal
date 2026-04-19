import { Routes, Route } from "react-router-dom";
import { StudentLayout } from "@/components/student/StudentLayout";
import { Profile } from "@/components/student/Profile";
import { Timetable } from "@/components/student/Timetable";
import { FacultyDirectory } from "@/components/student/FacultyDirectory";
import { Assignments } from "@/components/student/Assignments";
import { AttendanceHistory } from "@/components/student/AttendanceHistory";
import { Syllabus } from "@/components/student/Syllabus";
import { Result } from "@/components/student/Result";
import { HostelStudent } from "@/components/student/HostelStudent";
import { Events } from "@/components/student/Events";
import { Announcements } from "@/components/student/Announcements";

const StudentDashboard = () => {
  return (
    <StudentLayout>
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
      </Routes>
    </StudentLayout>
  );
};

export default StudentDashboard;
